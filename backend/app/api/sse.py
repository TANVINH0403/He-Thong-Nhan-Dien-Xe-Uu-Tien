import json
import asyncio
import cv2
import time
import os
from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import StreamingResponse

# Import detector instance to share model memory
# We accept the risk of importing from a sibling API module for this refactor
from app.api.detections import detector, UPLOAD_DIR

router = APIRouter(prefix="/sse", tags=["SSE"])

def format_sse(data: str, event: str = "message") -> str:
    """Helper to format data as Server-Sent Event"""
    return f"event: {event}\ndata: {data}\n\n"

@router.get("/stream/{filename}")
async def sse_stream(filename: str, request: Request):
    video_path = os.path.join(UPLOAD_DIR, filename)
    
    if not os.path.exists(video_path):
        raise HTTPException(status_code=404, detail="Video not found")

    async def event_generator():
        cap = cv2.VideoCapture(video_path)
        fps = cap.get(cv2.CAP_PROP_FPS)
        # Fallback if FPS is not detected
        if fps <= 0: fps = 30.0
        
        frame_delay = 1.0 / fps
        next_frame_target = time.time()
        
        frame_count = 0
        
        try:
            while cap.isOpened():
                # check for client disconnect
                if await request.is_disconnected():
                    print(f"Client disconnected from SSE stream: {filename}")
                    break

                # FPS Synchronization
                # Calculate how long to sleep to match original FPS
                now = time.time()
                sleep_time = next_frame_target - now
                if sleep_time > 0:
                    await asyncio.sleep(sleep_time)
                
                # Update target for next frame
                next_frame_target += frame_delay

                ret, frame = cap.read()
                if not ret:
                    # Video ended
                    yield format_sse(json.dumps({"status": "ended"}), event="status")
                    break

                # Skip frames if needed to reduce CPU load (optional, but requested 'match FPS' so we try to process all or skip smart)
                # To purely match FPS speed, we just process. If processing is slow, we naturally lag.
                # If we want to skip frames to keep up with REAL time (wall clock), that's different.
                # "Force the stream speed to match the FPS" usually means "don't go faster".
                
                # Process frame
                detections = detector.process_frame(frame)
                
                # Yield detection event
                payload = json.dumps({
                    "frame": frame_count,
                    "timestamp": time.time(),
                    "detections": detections
                })
                yield format_sse(payload, event="detection")
                
                frame_count += 1
                
                # Yield control to event loop
                await asyncio.sleep(0.001)

        except Exception as e:
            print(f"Error in SSE stream: {e}")
            yield format_sse(json.dumps({"error": str(e)}), event="error")
        finally:
            cap.release()

    return StreamingResponse(event_generator(), media_type="text/event-stream")
