import json
import asyncio
import cv2
import time
import os
from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import StreamingResponse

# Import instance detector và đường dẫn upload
from app.api.detections import detector, UPLOAD_DIR

router = APIRouter(prefix="/sse", tags=["SSE"])

def format_sse(data: str, event: str = "message") -> str:
    """Chuẩn hóa dữ liệu theo Server-Sent Events"""
    return f"event: {event}\ndata: {data}\n\n"

@router.get("/stream/{filename}")
async def sse_stream(filename: str, request: Request):
    video_path = os.path.join(UPLOAD_DIR, filename)
    
    if not os.path.exists(video_path):
        raise HTTPException(status_code=404, detail="Video not found")

    async def event_generator():
        cap = cv2.VideoCapture(video_path)
        fps = cap.get(cv2.CAP_PROP_FPS)
        if fps <= 0: fps = 30.0
        
        frame_delay = 1.0 / fps
        frame_count = 0
        
        # Cấu hình: Xử lý mỗi 2 frame để tăng độ mượt
        process_every_n_frames = 10
        current_detections = []
        
        # Danh sách các loại xe cần chụp ảnh lưu lại
        priority_classes = ["ambulance", "fire truck", "police"]

        try:
            while cap.isOpened():
                if await request.is_disconnected():
                    break

                start_time = time.time()
                ret, frame = cap.read()
                
                if not ret:
                    yield format_sse(json.dumps({"status": "ended"}), event="status")
                    break

                # 1. Xử lý nhận diện AI
                if frame_count % process_every_n_frames == 0:
                    try:
                        current_detections = detector.process_frame(frame)
                        
                        # 2. Logic tự động lưu ảnh khi phát hiện xe ưu tiên
                        for det in current_detections:
                            if any(p_cls in det['class'].lower() for p_cls in priority_classes):
                                # Chạy lưu ảnh trong background (không làm lag stream)
                                # detector.save_snapshot đã được bạn sửa lại dùng key 'class'
                                try:
                                    detector.save_snapshot(frame, det)
                                except Exception as snap_err:
                                    print(f"Snapshot Error: {snap_err}")
                                    
                    except Exception as ai_err:
                        print(f"AI Processing Error: {ai_err}")

                # 3. Gửi dữ liệu về Frontend
                payload = json.dumps({
                    "frame": frame_count,
                    "timestamp": time.time(),
                    "detections": current_detections
                })
                yield format_sse(payload, event="detection")
                
                frame_count += 1

                # 4. Kiểm soát FPS để video không chạy quá nhanh
                elapsed_time = time.time() - start_time
                wait_time = max(0, frame_delay - elapsed_time)
                await asyncio.sleep(wait_time)

        except Exception as e:
            print(f"Error in SSE stream: {e}")
            yield format_sse(json.dumps({"error": str(e)}), event="error")
        finally:
            cap.release()
            print(f"Closed video stream: {filename}")

    return StreamingResponse(event_generator(), media_type="text/event-stream")