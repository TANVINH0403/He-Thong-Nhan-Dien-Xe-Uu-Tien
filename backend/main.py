import os, cv2, base64, asyncio, shutil
import torch
import numpy as np
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import socketio
from ultralytics import YOLO
from urllib.parse import unquote

app = FastAPI()
sio = socketio.AsyncServer(async_mode='asgi', cors_allowed_origins='*', ping_timeout=300, ping_interval=50)
socket_app = socketio.ASGIApp(sio, app)

app.add_middleware(
    CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"],
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

PT_MODEL_PATH = os.path.join(BASE_DIR, "models", "best.pt")
STOP_SIGNAL = False
device = '0' if torch.cuda.is_available() else 'cpu'

# Load Model
print(f"🚀 Loading Model on {device}...")
model = YOLO(PT_MODEL_PATH) 
# Warmup nhẹ
model.predict(source=np.zeros((320, 320, 3), dtype=np.uint8), imgsz=320, device=device, verbose=False)
print("✅ Server Ready!")

@app.post("/upload")
async def upload_video(file: UploadFile = File(...)):
    file_path = os.path.join(UPLOAD_DIR, file.filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    return {"video_id": file.filename}

@app.post("/start-ai/{video_id}")
async def start_ai(video_id: str):
    # 1. Reset ngay lập tức tín hiệu dừng
    global STOP_SIGNAL
    STOP_SIGNAL = False
    
    decoded_name = unquote(video_id)
    video_path = os.path.join(UPLOAD_DIR, decoded_name)
    
    print(f"\n--- YÊU CẦU CHẠY VIDEO: {decoded_name} ---")

    # 2. Kiểm tra file có tồn tại không (Nguyên nhân chính gây lỗi nháy màn hình)
    if not os.path.exists(video_path):
        print(f"❌ LỖI: File không tồn tại! Có thể đã bị xóa ở lần chạy trước.")
        return {"status": "error", "message": "Video file missing. Please re-upload."}

    cap = cv2.VideoCapture(video_path)
    
    # 3. Kiểm tra xem OpenCV có mở được file không
    if not cap.isOpened():
        print(f"❌ LỖI: OpenCV không mở được file video.")
        return {"status": "error", "message": "Cannot open video"}
    
    # Cấu hình
    PROCESS_SIZE = 320 
    SKIP_FRAMES = 3 if device == 'cpu' else 1
    CONF_THRESHOLD = 0.6
    frame_count = 0
    cached_boxes = [] 

    print(f"▶️ Bắt đầu loop xử lý...")

    try:
        while cap.isOpened():
            # Ưu tiên kiểm tra tín hiệu dừng
            if STOP_SIGNAL: 
                print("🛑 Đã dừng theo yêu cầu (Nút bấm).")
                break
            
            success, frame = cap.read()
            
            # Hết video -> Break để dừng lại (cho phép chạy lại lần sau)
            if not success: 
                print("🏁 Đã hết video (Tự động dừng).")
                break 
            
            frame_count += 1
            frame_resized = cv2.resize(frame, (PROCESS_SIZE, PROCESS_SIZE))

            # --- AI DETECT ---
            if frame_count % SKIP_FRAMES == 0 or frame_count == 1:
                results = model.predict(source=frame_resized, imgsz=PROCESS_SIZE, device=device, verbose=False, conf=CONF_THRESHOLD)
                
                cached_boxes = [] 
                if results and len(results[0].boxes) > 0:
                    for result in results[0].boxes:
                        x1, y1, x2, y2 = result.xyxy[0].tolist()
                        label = model.names[int(result.cls[0])]
                        conf = float(result.conf[0])
                        cached_boxes.append((int(x1), int(y1), int(x2), int(y2), label, conf))

            # --- VẼ ---
            for (x1, y1, x2, y2, label, conf) in cached_boxes:
                cv2.rectangle(frame_resized, (x1, y1), (x2, y2), (0, 0, 255), 2)
                cv2.putText(frame_resized, f"{label} {conf:.2f}", (x1, y1 - 5), 
                            cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)

            # --- GỬI ---
            _, buffer = cv2.imencode('.jpg', frame_resized, [cv2.IMWRITE_JPEG_QUALITY, 35])
            img_base64 = base64.b64encode(buffer).decode('utf-8')

            await sio.emit("frame", img_base64)
            await asyncio.sleep(0.0001)

    except Exception as e:
        print(f"❌ Exception: {e}")
        
    finally:
        cap.release()
        # --- TUYỆT ĐỐI KHÔNG XÓA FILE ---
        # (Đảm bảo dòng os.remove(video_path) ĐÃ BỊ XÓA HOẶC COMMENT LẠI)
        print(f"✅ Kết thúc session. File vẫn được giữ lại: {os.path.exists(video_path)}")

    return {"status": "completed"}

@app.post("/stop-ai")
async def stop_ai():
    global STOP_SIGNAL
    STOP_SIGNAL = True
    return {"status": "stopping"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(socket_app, host="127.0.0.1", port=8000)