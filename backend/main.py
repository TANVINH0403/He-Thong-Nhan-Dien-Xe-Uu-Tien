import os
import cv2
import asyncio
import shutil
import base64
import time
import torch
import numpy as np
import sqlite3
from datetime import datetime
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import socketio
from ultralytics import YOLO
from urllib.parse import unquote

# Import các hàm từ module database
from db.database import init_db, log_detection, get_recent_history, clear_history, DB_NAME

# --- CẤU HÌNH ---
DISPLAY_WIDTH = 854
DISPLAY_HEIGHT = 480
CONF_THRESHOLD = 0.25

# Khởi tạo App & DB
app = FastAPI()
init_db()

# Cấu hình Socket.IO
sio = socketio.AsyncServer(async_mode='asgi', cors_allowed_origins='*')
socket_app = socketio.ASGIApp(sio, app)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Đường dẫn thư mục
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Load Model
PT_MODEL_PATH = os.path.join(BASE_DIR, "models", "best.pt")
try:
    model = YOLO(PT_MODEL_PATH)
except Exception as e:
    print(f"⚠️ Lỗi load model: {e}")
    torch.serialization.add_safe_globals([np.core.multiarray._reconstruct])
    model = YOLO(PT_MODEL_PATH)

# Biến toàn cục
STOP_SIGNAL = False

# --- PHẦN 1: API THỐNG KÊ (CHO HEADER) ---
@app.get("/api/stats")
async def get_stats_api():
    try:
        conn = sqlite3.connect(DB_NAME)
        c = conn.cursor()

        # Lấy ngày hiện tại (Format: dd/mm/yyyy)
        today = datetime.now().strftime("%d/%m/%Y")

        # 1. Đếm tổng xe hôm nay
        c.execute("SELECT COUNT(*) FROM vehicle_logs WHERE timestamp LIKE ?", (f"%{today}%",))
        total = c.fetchone()[0]

        # 2. Đếm từng loại
        c.execute("SELECT COUNT(*) FROM vehicle_logs WHERE timestamp LIKE ? AND vehicle_type LIKE '%CỨU THƯƠNG%'", (f"%{today}%",))
        amb = c.fetchone()[0]

        c.execute("SELECT COUNT(*) FROM vehicle_logs WHERE timestamp LIKE ? AND vehicle_type LIKE '%CỨU HỎA%'", (f"%{today}%",))
        fir = c.fetchone()[0]

        c.execute("SELECT COUNT(*) FROM vehicle_logs WHERE timestamp LIKE ? AND vehicle_type LIKE '%CẢNH SÁT%'", (f"%{today}%",))
        pol = c.fetchone()[0]

        conn.close()
        return { "today": total, "ambulance": amb, "firetruck": fir, "police": pol }
    except Exception as e:
        print(f"Stats Error: {e}")
        return {"today": 0, "ambulance": 0, "firetruck": 0, "police": 0}

@app.delete("/api/reset-data")
async def reset_data_api():
    try:
        clear_history() # Gọi hàm xóa sạch trong database.py
        return {"status": "success", "message": "All data cleared"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

# --- PHẦN 2: API QUẢN LÝ ---
class LogSchema(BaseModel):
    vehicle_type: str
    plate_id: str
    confidence: float

@app.post("/api/save-log")
async def save_log_api(data: LogSchema):
    try:
        log_detection(data.vehicle_type, data.confidence, data.plate_id)
        return {"status": "success"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/api/history")
async def get_history_api():
    return get_recent_history()

@app.post("/upload")
async def upload_video(file: UploadFile = File(...)):
    file_path = os.path.join(UPLOAD_DIR, file.filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    return {"video_id": file.filename}

@app.post("/stop-ai")
async def stop_ai():
    global STOP_SIGNAL
    STOP_SIGNAL = True
    return {"status": "stopping"}

# --- PHẦN 3: XỬ LÝ VIDEO & AI (ĐÃ TỐI ƯU CHỐNG LAG) ---
@app.post("/start-ai/{video_id}")
async def start_ai(video_id: str):
    global STOP_SIGNAL
    STOP_SIGNAL = False

    decoded_name = unquote(video_id)
    video_path = os.path.join(UPLOAD_DIR, decoded_name)

    if not os.path.exists(video_path):
        return {"status": "error", "message": "Video file not found"}

    cap = cv2.VideoCapture(video_path)

    try:
        while cap.isOpened():
            if STOP_SIGNAL: break

            # --- 1. KỸ THUẬT SKIP FRAME (GIẢM LAG) ---
            # Đọc bỏ 2 frame, chỉ lấy frame thứ 3 để xử lý.
            # Giúp giảm 66% tải CPU và mạng, video sẽ mượt hơn.
            cap.grab()
            cap.grab()
            success, frame = cap.read()

            if not success:
                cap.set(cv2.CAP_PROP_POS_FRAMES, 0) # Loop video
                continue

            # --- 2. RESIZE ẢNH (TĂNG TỐC AI) ---
            frame_resized = cv2.resize(frame, (DISPLAY_WIDTH, DISPLAY_HEIGHT))

            # Chạy AI
            results = model.predict(source=frame_resized, imgsz=640, verbose=False, conf=CONF_THRESHOLD)
            detections = []

            if results and len(results[0].boxes) > 0:
                for r in results[0].boxes:
                    x1, y1, x2, y2 = r.xyxy[0].tolist()
                    label = model.names[int(r.cls[0])]
                    conf = float(r.conf[0])
                    detections.append({
                        "x1": int(x1), "y1": int(y1), "x2": int(x2), "y2": int(y2),
                        "label": label, "conf": conf
                    })

            # --- 3. NÉN JPEG MẠNH (GIẢM BĂNG THÔNG MẠNG) ---
            # Giảm chất lượng xuống 60% để gửi qua Socket nhanh hơn
            encode_param = [int(cv2.IMWRITE_JPEG_QUALITY), 60]
            _, buffer = cv2.imencode('.jpg', frame_resized, encode_param)
            img_base64 = base64.b64encode(buffer).decode('utf-8')

            await sio.emit("frame_packet", {"image": img_base64, "boxes": detections})

            # Ngủ cực ngắn để nhường CPU
            await asyncio.sleep(0.01)

    except Exception as e:
        print(f"Error: {e}")
    finally:
        cap.release()

    return {"status": "completed"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(socket_app, host="127.0.0.1", port=8000)