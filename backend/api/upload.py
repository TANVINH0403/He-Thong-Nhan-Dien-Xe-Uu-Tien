from fastapi import APIRouter, UploadFile, File
import shutil
import os
import uuid

router = APIRouter(prefix="/api", tags=["Upload"])

UPLOAD_DIR = "temp_videos"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/upload-video")
async def upload_video(file: UploadFile = File(...)):
    video_id = str(uuid.uuid4())
    file_path = f"{UPLOAD_DIR}/{video_id}.mp4"

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    return {
        "video_id": video_id,
        "message": "Upload successful"
    }
