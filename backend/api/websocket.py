import json
import time
import logging
import asyncio
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException

from config.settings import settings
from services.video_service import VideoService
from services.detection_service import DetectionService
from services.tracking_service import TrackingService
from services.direction_service import DirectionService

router = APIRouter()
logger = logging.getLogger("api.websocket")

@router.websocket("/ws/process/{video_id}")
async def ws_process(websocket: WebSocket, video_id: str):
    await websocket.accept()
    path = settings.VIDEOS_DIR / f"{video_id}.mp4"
    if not path.exists():
        await websocket.send_json({"error": "Video không tồn tại"})
        await websocket.close()
        return

    logger.info(f"[START] Processing video_id={video_id} via WebSocket")

    # Initialize services
    cap = VideoService.open_capture(str(path))
    if not cap or not cap.isOpened():
        await websocket.send_json({"error": "Không mở được video"})
        await websocket.close()
        return

    detector = DetectionService()
    tracker = TrackingService()
    direction = DirectionService()

    writer = None
    if settings.WRITE_ANNOTATED_VIDEO:
        writer = VideoService.create_writer(
            str(settings.OUTPUTS_DIR / f"{video_id}_annotated.mp4"),
            (settings.FRAME_WIDTH, settings.FRAME_HEIGHT),
            settings.ANNOTATED_FPS,
        )

    last_send = 0.0
    frame_index = 0

    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                logger.info(f"[STOP] Video ended for video_id={video_id}")
                break

            frame_resized = VideoService.resize_frame(frame,
                                                      settings.FRAME_WIDTH,
                                                      settings.FRAME_HEIGHT)

            detections = detector.detect(frame_resized)
            # detections: list of dict: {bbox:[x1,y1,x2,y2], score:float, class:str}

            tracked_objs = tracker.update(detections)
            # tracked_objs: list of dict:
            # {vehicle_id:int, class:str, bbox:[x1,y1,x2,y2], centroid:[cx,cy], history:list}

            # Determine direction only for priority vehicles
            for obj in tracked_objs:
                if obj.get("class", "").lower() in settings.PRIORITY_CLASSES:
                    obj["direction"] = direction.estimate(obj.get("history", []))
                else:
                    obj["direction"] = None

            # Optional drawing
            VideoService.draw_annotations(frame_resized, tracked_objs)

            if writer is not None:
                writer.write(frame_resized)

            # Throttle sending by MAX_FPS_SEND
            now = time.time()
            if now - last_send >= 1.0 / settings.MAX_FPS_SEND:
                payload = {
                    "frame_index": frame_index,
                    "vehicles": [
                        {
                            "vehicle_id": o["vehicle_id"],
                            "class": o["class"],
                            "direction": o["direction"] if o["direction"] else "",
                            "bbox": o["bbox"],
                        }
                        for o in tracked_objs
                    ],
                }
                await websocket.send_text(json.dumps(payload))
                last_send = now

            frame_index += 1
            # Avoid busy loop
            await asyncio.sleep(0)

    except WebSocketDisconnect:
        logger.info(f"[DISCONNECT] WebSocket closed for video_id={video_id}")
    except Exception as e:
        logger.exception("Processing error")
        try:
            await websocket.send_json({"error": "Lỗi xử lý video"})
        except Exception:
            pass
    finally:
        cap.release()
        if writer is not None:
            writer.release()
        await websocket.close()
        logger.info(f"[CLEANUP] Released resources for video_id={video_id}")
