import os
import cv2
import shutil
import asyncio
from fastapi import APIRouter, UploadFile, File, Depends, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from concurrent.futures import ThreadPoolExecutor

from app.db.database import get_db, SessionLocal
from app.db import models
from app.core.detector import VehicleDetector

router = APIRouter(prefix="/detections", tags=["Detections"])

# Khởi tạo detector và bộ thực thi luồng riêng cho DB
detector = VehicleDetector()
executor = ThreadPoolExecutor(max_workers=4) 
UPLOAD_DIR = "static/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

current_video_path = None
# Dictionary để quản lý trạng thái stream: {video_path: is_active (bool)}
active_streams = {}

@router.post("/upload")
async def upload_video(file: UploadFile = File(...)):
    global current_video_path
    file_path = os.path.join(UPLOAD_DIR, file.filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    current_video_path = file_path
    return {"filename": file.filename, "status": "Uploaded"}


@router.get("/stream")
async def stream_video(video_name: str):
    video_path = os.path.join(UPLOAD_DIR, video_name)
    if not os.path.exists(video_path):
        return {"error": "Video not found"}

    return StreamingResponse(
        frame_generator(video_path),
        media_type="multipart/x-mixed-replace; boundary=frame"
    )



@router.post("/stop")
def stop_stream(video_name: str):
    """Endpoint để dừng stream của một video cụ thể"""
    video_path = os.path.join(UPLOAD_DIR, video_name)
    if video_path in active_streams:
        active_streams[video_path] = False # Set flag to False to break loop
        return {"status": "Stopped", "video": video_name}
    return {"status": "Not found or already stopped", "video": video_name}

import time

# Dictionary to track last snapshot time per vehicle type
# Key: vehicle_type (str), Value: timestamp (float)
last_snapshot_time = {}


async def frame_generator(video_path: str):
    cap = cv2.VideoCapture(video_path)
    active_streams[video_path] = True
    
    while cap.isOpened() and active_streams.get(video_path, True):
        ret, frame = cap.read()
        if not ret:
            break

        # 1. Gọi detector
        detections = detector.process_frame(frame)

        # 2. Xử lý vẽ khung (SỬA Ở ĐÂY)
        for det in detections:
            # detector.py mới trả về [x, y, w, h]
            x, y, w, h = det['bbox']
            label = det['class'] # Đổi từ 'type' sang 'class' cho khớp detector.py
            conf = det['confidence']

            # Vẽ ô vuông: (x, y) đến (x+w, y+h)
            cv2.rectangle(frame, (x, y), (x + w, y + h), (0, 255, 0), 2)
            cv2.putText(frame, f"{label} {conf:.1f}%", 
                        (x, y - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)
            
            # 3. Lưu vào DB (Đổi det['type'] thành det['class'])
            executor.submit(save_to_db, SessionLocal, det, frame)

        # 4. Mã hóa ảnh
        _, buffer = cv2.imencode('.jpg', frame)
        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + buffer.tobytes() + b'\r\n')
        
        await asyncio.sleep(0.01) # Tăng tốc độ stream

    cap.release()

def save_to_db(db_session_factory, det, frame):
    current_time = time.time()
    vehicle_type = det['class'] # SỬA TỪ 'type' THÀNH 'class'
    
    # Chỉ lưu nếu là xe ưu tiên và cách nhau 2 giây
    priority_list = ["ambulance", "fire truck", "police"]
    if vehicle_type not in priority_list:
        return

    if current_time - last_snapshot_time.get(vehicle_type, 0) < 2.0:
        return 
    
    last_snapshot_time[vehicle_type] = current_time
    db = db_session_factory()
    try:
        image_name = detector.save_snapshot(frame, det)
        new_log = models.PriorityVehicleLog(
            vehicle_type=vehicle_type, # Khớp key
            confidence=det['confidence'],
            image_path=image_name,
            bbox=str(det['bbox'])
        )
        db.add(new_log)
        db.commit()
    except Exception as e:
        print(f"DB Error: {e}")
    finally:
        db.close()