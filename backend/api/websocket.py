from fastapi import APIRouter, WebSocket
import cv2
import asyncio
from yolo.detector import YOLODetector

router = APIRouter()
detector = YOLODetector()

@router.websocket("/ws/detect/{video_id}")
async def detect_video(websocket: WebSocket, video_id: str):
    await websocket.accept()

    cap = cv2.VideoCapture(f"temp_videos/{video_id}.mp4")

    try:
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break

            result = detector.detect(frame)

            await websocket.send_json(result)
            await asyncio.sleep(0.03)  # ~30 FPS

    except Exception as e:
        await websocket.send_json({"error": str(e)})

    finally:
        cap.release()
        await websocket.close()
