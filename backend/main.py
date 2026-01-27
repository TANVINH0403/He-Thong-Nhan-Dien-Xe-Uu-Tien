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
from fastapi import FastAPI, UploadFile, File, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import socketio
from ultralytics import YOLO
from urllib.parse import unquote

from db.database import init_db, log_detection, get_recent_history, clear_history, DB_NAME

# --- CẤU HÌNH ---
DISPLAY_WIDTH = 854
DISPLAY_HEIGHT = 480
CONF_THRESHOLD = 0.50

app = FastAPI()
init_db()

sio = socketio.AsyncServer(async_mode='asgi', cors_allowed_origins='*')
socket_app = socketio.ASGIApp(sio, app)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
# QUAN TRỌNG: Dùng folder uploads theo ảnh bạn gửi
VIDEO_DIR = os.path.join(BASE_DIR, "uploads")
os.makedirs(VIDEO_DIR, exist_ok=True)
UPLOAD_DIR = VIDEO_DIR

PT_MODEL_PATH = os.path.join(BASE_DIR, "models", "best.pt")
try:
    model = YOLO(PT_MODEL_PATH)
except Exception as e:
    print(f"⚠️ Lỗi load model: {e}")
    torch.serialization.add_safe_globals([np.core.multiarray._reconstruct])
    model = YOLO(PT_MODEL_PATH)

STOP_SIGNAL = False

# --- API MỚI: LẤY ẢNH ĐẠI DIỆN VIDEO ---
@app.get("/api/video-preview/{video_filename}")
async def get_video_preview(video_filename: str):
    try:
        decoded_name = unquote(video_filename)
        video_path = os.path.join(VIDEO_DIR, decoded_name)

        if not os.path.exists(video_path):
            return Response(status_code=404)

        # Đọc frame đầu tiên
        cap = cv2.VideoCapture(video_path)
        success, frame = cap.read()
        cap.release()

        if success:
            frame = cv2.resize(frame, (DISPLAY_WIDTH, DISPLAY_HEIGHT))
            _, buffer = cv2.imencode('.jpg', frame)
            return Response(content=buffer.tobytes(), media_type="image/jpeg")
        return Response(status_code=500)
    except Exception as e:
        print(f"Preview Error: {e}")
        return Response(status_code=500)

@app.get("/api/list-videos")
async def list_videos_api():
    try:
        files = sorted([f for f in os.listdir(VIDEO_DIR) if f.lower().endswith(('.mp4', '.avi', '.mov', '.mkv'))])
        return {"videos": files}
    except Exception as e:
        return {"videos": []}

@app.get("/api/stats")
async def get_stats_api():
    try:
        conn = sqlite3.connect(DB_NAME)
        c = conn.cursor()
        today = datetime.now().strftime("%d/%m/%Y")
        c.execute("SELECT COUNT(*) FROM vehicle_logs WHERE timestamp LIKE ?", (f"%{today}%",))
        total = c.fetchone()[0]
        c.execute("SELECT COUNT(*) FROM vehicle_logs WHERE timestamp LIKE ? AND vehicle_type LIKE '%CỨU THƯƠNG%'", (f"%{today}%",))
        amb = c.fetchone()[0]
        c.execute("SELECT COUNT(*) FROM vehicle_logs WHERE timestamp LIKE ? AND vehicle_type LIKE '%CỨU HỎA%'", (f"%{today}%",))
        fir = c.fetchone()[0]
        c.execute("SELECT COUNT(*) FROM vehicle_logs WHERE timestamp LIKE ? AND vehicle_type LIKE '%CẢNH SÁT%'", (f"%{today}%",))
        pol = c.fetchone()[0]
        conn.close()
        return { "today": total, "ambulance": amb, "firetruck": fir, "police": pol }
    except Exception:
        return {"today": 0, "ambulance": 0, "firetruck": 0, "police": 0}

@app.delete("/api/reset-data")
async def reset_data_api():
    clear_history()
    return {"status": "success"}

class LogSchema(BaseModel):
    vehicle_type: str
    plate_id: str
    confidence: float

@app.post("/api/save-log")
async def save_log_api(data: LogSchema):
    log_detection(data.vehicle_type, data.confidence, data.plate_id)
    return {"status": "success"}

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

@app.post("/start-ai/{video_filename}")
async def start_ai(video_filename: str):
    global STOP_SIGNAL
    STOP_SIGNAL = False

    decoded_name = unquote(video_filename)
    video_path = os.path.join(VIDEO_DIR, decoded_name)

    if not os.path.exists(video_path):
        return {"status": "error", "message": "Video not found"}

    cap = cv2.VideoCapture(video_path)

    try:
        while cap.isOpened():
            if STOP_SIGNAL: break

            cap.grab()
            cap.grab()
            success, frame = cap.read()

            if not success:
                cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                continue

            frame_resized = cv2.resize(frame, (DISPLAY_WIDTH, DISPLAY_HEIGHT))

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

            encode_param = [int(cv2.IMWRITE_JPEG_QUALITY), 60]
            _, buffer = cv2.imencode('.jpg', frame_resized, encode_param)
            img_base64 = base64.b64encode(buffer).decode('utf-8')

            await sio.emit("frame_packet", {"image": img_base64, "boxes": detections})
            await asyncio.sleep(0.01)

    except Exception as e:
        print(f"Error: {e}")
    finally:
        cap.release()

    return {"status": "completed"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(socket_app, host="127.0.0.1", port=8000)