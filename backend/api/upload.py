import uuid
import logging
from fastapi import APIRouter, UploadFile, File, HTTPException

from config.settings import settings

logger = logging.getLogger("api.upload")
router = APIRouter()

@router.post("/upload", summary="Upload video mp4, lưu và trả video_id")
async def upload_video(file: UploadFile = File(...)):
    if not file.filename.lower().endswith(".mp4"):
        raise HTTPException(status_code=400, detail="Chỉ hỗ trợ .mp4")

    video_id = str(uuid.uuid4())
    output_path = settings.VIDEOS_DIR / f"{video_id}.mp4"

    # Save streamed file
    try:
        with open(output_path, "wb") as f:
            content = await file.read()
            f.write(content)
    except Exception as e:
        logger.exception("Upload failed")
        raise HTTPException(status_code=500, detail="Không thể lưu video")

    logger.info(f"[UPLOAD] video_id={video_id}, filename={file.filename}, path={output_path}")
    return {"video_id": video_id, "message": "Upload successful"}
