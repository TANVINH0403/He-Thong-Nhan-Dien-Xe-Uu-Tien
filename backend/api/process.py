import logging
from fastapi import APIRouter, HTTPException

from config.settings import settings
from services.video_service import VideoService

router = APIRouter()
logger = logging.getLogger("api.process")

@router.get("/exists/{video_id}", summary="Kiểm tra video có tồn tại không")
def video_exists(video_id: str):
    path = settings.VIDEOS_DIR / f"{video_id}.mp4"
    exists = path.exists()
    logger.info(f"[CHECK] video_id={video_id} exists={exists}")
    return {"video_id": video_id, "exists": exists}

@router.get("/info/{video_id}", summary="Thông tin cơ bản của video")
def video_info(video_id: str):
    path = settings.VIDEOS_DIR / f"{video_id}.mp4"
    if not path.exists():
        raise HTTPException(status_code=404, detail="Video không tồn tại")
    cap = VideoService.open_capture(str(path))
    if not cap or not cap.isOpened():
        raise HTTPException(status_code=500, detail="Không mở được video")
    fps = cap.get(5)  # cv2.CAP_PROP_FPS
    width = cap.get(3)  # cv2.CAP_PROP_FRAME_WIDTH
    height = cap.get(4)  # cv2.CAP_PROP_FRAME_HEIGHT
    count = int(cap.get(7))  # cv2.CAP_PROP_FRAME_COUNT
    cap.release()
    return {"video_id": video_id, "fps": fps, "width": width, "height": height, "frame_count": count}
