import os
import cv2
import shutil
from fastapi import APIRouter, UploadFile, File, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db import models
from app.core.detector import VehicleDetector

router = APIRouter(prefix="/detections", tags=["Detections"])

# Khởi tạo detector
detector = VehicleDetector(model_path="models/yolov8n.pt")
UPLOAD_DIR = "static/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

current_video_path = None

@router.post("/upload")
async def upload_video(file: UploadFile = File(...)):
    global current_video_path
    file_path = os.path.join(UPLOAD_DIR, file.filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    current_video_path = file_path
    return {"filename": file.filename, "status": "Uploaded"}

def generate_frames(video_path, db: Session):
    cap = cv2.VideoCapture(video_path)
    while cap.isOpened():
        success, frame = cap.read()
        if not success: break
        
        # Nhận diện
        results = detector.process_frame(frame)
        
        # Lưu vào DB nếu phát hiện xe ưu tiên
        for det in results:
            image_name = detector.save_snapshot(frame, det)
            new_log = models.PriorityVehicleLog(
                vehicle_type=det['type'],
                confidence=det['confidence'],
                image_path=image_name,
                bbox=str(det['bbox'])
            )
            db.add(new_log)
            db.commit()

        # Vẽ lên frame và stream
        frame = detector.draw_on_frame(frame, results)
        _, buffer = cv2.imencode('.jpg', frame)
        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + buffer.tobytes() + b'\r\n')
    cap.release()

@router.get("/stream/{video_name}")
def video_stream(video_name: str, db: Session = Depends(get_db)):
    video_path = os.path.join(UPLOAD_DIR, video_name)
    return StreamingResponse(generate_frames(video_path, db), 
                             media_type="multipart/x-mixed-replace; boundary=frame")