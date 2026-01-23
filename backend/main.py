import os
import cv2
import asyncio
import shutil
import base64
import time
import torch
import numpy as np
from fastapi import FastAPI, UploadFile, File
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
import socketio
from ultralytics import YOLO
from urllib.parse import unquote
from db.database import init_db

# --- CẤU HÌNH ---
DISPLAY_WIDTH = 854
DISPLAY_HEIGHT = 480
# Giữ ngưỡng thấp để vẫn vẽ khung cho bạn xem, nhưng không xử lý
CONF_THRESHOLD = 0.25

app = FastAPI()
init_db()

sio = socketio.AsyncServer(async_mode='asgi', cors_allowed_origins='*')
socket_app = socketio.ASGIApp(sio, app)

app.add_middleware(
    CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"],
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

PT_MODEL_PATH = os.path.join(BASE_DIR, "models", "best.pt")
try:
    model = YOLO(PT_MODEL_PATH)
except:
    torch.serialization.add_safe_globals([np.core.multiarray._reconstruct])
    model = YOLO(PT_MODEL_PATH)

STOP_SIGNAL = False

last_priority_time = 0
current_priority_label = ""

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

@app.post("/start-ai/{video_id}")
async def start_ai(video_id: str):
    global STOP_SIGNAL, last_priority_time, current_priority_label
    STOP_SIGNAL = False

    decoded_name = unquote(video_id)
    video_path = os.path.join(UPLOAD_DIR, decoded_name)
    cap = cv2.VideoCapture(video_path)

    frame_count = 0

    try:
        while cap.isOpened():
            if STOP_SIGNAL: break
            success, frame = cap.read()
            if not success: break

            frame_count += 1
            frame_resized = cv2.resize(frame, (DISPLAY_WIDTH, DISPLAY_HEIGHT))
            detections = []

            # Chạy AI
            if frame_count % 3 == 0:
                results = model.predict(source=frame_resized, imgsz=640, verbose=False, conf=CONF_THRESHOLD)

                if results and len(results[0].boxes) > 0:
                    for r in results[0].boxes:
                        x1, y1, x2, y2 = r.xyxy[0].tolist()
                        label_raw = model.names[int(r.cls[0])]
                        label_clean = label_raw.lower()
                        conf = float(r.conf[0])

                        # Kiểm tra từ khóa ưu tiên
                        keywords = ['ambu', 'fire', 'police', 'xe', 'cuu', 'thuong', 'uu tien']
                        is_priority_obj = any(k in label_clean for k in keywords)

                        # --- LOGIC QUAN TRỌNG: CHỈ KÍCH HOẠT NẾU TRÊN 90% ---
                        if is_priority_obj and conf >= 0.90:
                            current_priority_label = label_raw
                            last_priority_time = time.time() # Reset bộ đếm giữ đèn xanh

                        detections.append({
                            "x1": int(x1), "y1": int(y1),
                            "x2": int(x2), "y2": int(y2),
                            "label": label_raw,
                            "conf": conf,
                            "is_priority": is_priority_obj # Cái này để frontend biết mà tô màu
                        })

            # Logic giữ đèn xanh 3 giây (chống nhấp nháy)
            # Chỉ khi last_priority_time được cập nhật (do conf >= 90) thì mới vào đây
            is_system_priority = (time.time() - last_priority_time) < 3.0

            _, buffer = cv2.imencode('.jpg', frame_resized, [cv2.IMWRITE_JPEG_QUALITY, 70])
            img_base64 = base64.b64encode(buffer).decode('utf-8')

            packet = {
                "image": img_base64,
                "boxes": detections,
                "system_status": "PRIORITY" if is_system_priority else "NORMAL",
                "priority_label": current_priority_label if is_system_priority else ""
            }

            await sio.emit("frame_packet", packet)
            await asyncio.sleep(0.01)

    finally:
        cap.release()

    return {"status": "completed"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(socket_app, host="127.0.0.1", port=8000)