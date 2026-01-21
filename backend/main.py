import os, cv2, base64, asyncio, shutil
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import socketio
from ultralytics import YOLO
from urllib.parse import unquote

app = FastAPI()
sio = socketio.AsyncServer(async_mode='asgi', cors_allowed_origins='*')
socket_app = socketio.ASGIApp(sio, app)

# 1. Cấu hình CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 2. Khởi tạo Model (OpenVINO)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "models", "best_openvino_model")
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

STOP_SIGNAL = False

try:
    # Ưu tiên load OpenVINO
    model = YOLO(MODEL_PATH, task='detect')
    print("🚀 Đã kích hoạt Intel OpenVINO Engine!")
except Exception as e:
    print(f"⚠️ Đang dùng file .pt gốc vì: {e}")
    model = YOLO(os.path.join(BASE_DIR, "models", "best.pt"))

# 3. Hàm Upload Video
@app.post("/upload")
async def upload_video(file: UploadFile = File(...)):
    file_path = os.path.join(UPLOAD_DIR, file.filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    print(f"📁 Đã lưu file: {file.filename}")
    return {"video_id": file.filename}

# 4. Hàm Chạy AI (Xử lý chính)
@app.post("/start-ai/{video_id}")
async def start_ai(video_id: str):
    global STOP_SIGNAL
    STOP_SIGNAL = False
    
    decoded_name = unquote(video_id)
    video_path = os.path.join(UPLOAD_DIR, decoded_name)
    
    if not os.path.exists(video_path):
        print(f"❌ Không tìm thấy file: {video_path}")
        return {"status": "error", "message": "File not found"}

    cap = cv2.VideoCapture(video_path)
    boxes_data = []
    frame_count = 0

    try:
        while cap.isOpened():
            if STOP_SIGNAL: 
                print("🛑 Dừng xử lý theo yêu cầu.")
                break
                
            success, frame = cap.read()
            if not success: break
            
            frame_count += 1

            # Resize về 480 để khớp với model export imgsz=480
            frame_resized = cv2.resize(frame, (480, 480))
            
            # Predict với imgsz=480
            results = model.predict(
                source=frame_resized, 
                imgsz=480, 
                device='cpu', 
                verbose=False
            )

            if results and len(results) > 0:
                new_boxes = []
                for result in results[0].boxes:
                    x1, y1, x2, y2 = result.xyxy[0].tolist()
                    cls_id = int(result.cls[0])
                    label = model.names[cls_id]
                    conf = float(result.conf[0])

                    # Chỉ lấy kết quả có độ tin tưởng > 30%
                    if conf > 0.3:
                        # --- ĐÂY LÀ PHẦN SỬA ĐỔI QUAN TRỌNG ---
                        # Tạo nhãn hiển thị kèm điểm số: "xe cuu thuong 0.75"
                        display_label = f"{label} {conf:.2f}"
                        
                        new_boxes.append({
                            "x1": x1, "y1": y1, "x2": x2, "y2": y2,
                            "label": display_label, # Gửi chuỗi đã format qua React
                            "score": conf,
                            "alert": "xe" in label.lower()
                        })
                        
                        # In ra Terminal để kiểm tra
                        print(f"🎯 Frame {frame_count}: {display_label}")
                        
                boxes_data = new_boxes 

            # Encode ảnh gửi qua Socket
            _, buffer = cv2.imencode('.jpg', frame_resized, [cv2.IMWRITE_JPEG_QUALITY, 50])
            img_base64 = base64.b64encode(buffer).decode('utf-8')

            await sio.emit("frame", img_base64)
            await sio.emit("ai_data", boxes_data)
            
            # Giúp server có thời gian xử lý request khác
            await asyncio.sleep(0.001)

    finally:
        cap.release()
        if os.path.exists(video_path):
            try:
                os.remove(video_path)
                print(f"🗑️ Đã dọn dẹp file: {decoded_name}")
            except:
                pass

    return {"status": "completed"}

# 5. Hàm Dừng AI
@app.post("/stop-ai")
async def stop_ai():
    global STOP_SIGNAL
    STOP_SIGNAL = True
    print("🚩 Đã đặt tín hiệu STOP")
    return {"status": "stopping"}

# 6. Chạy Server
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(socket_app, host="127.0.0.1", port=8000)