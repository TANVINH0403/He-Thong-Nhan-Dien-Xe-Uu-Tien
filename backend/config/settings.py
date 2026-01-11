import os
from pathlib import Path
from pydantic import BaseModel
from typing import ClassVar, Set

class Settings(BaseModel):
    # Directories
    BASE_DIR: Path = Path(__file__).resolve().parent.parent
    VIDEOS_DIR: Path = BASE_DIR / "videos"
    OUTPUTS_DIR: Path = BASE_DIR / "outputs"
    MODELS_DIR: Path = BASE_DIR / "models"

    # Model path
    YOLO_MODEL_PATH: Path = MODELS_DIR / "best.pt"

    # Video processing
    FRAME_WIDTH: int = 960   # resize width
    FRAME_HEIGHT: int = 540  # resize height
    MAX_FPS_SEND: float = 20.0  # throttle sending via websocket

    # Tracking
    MAX_DISAPPEARED: int = 20
    MAX_DISTANCE: int = 80

    # Direction estimation
    DIRECTION_HISTORY_MIN: int = 5  # min points to decide direction
    DIRECTION_SMOOTH_WINDOW: int = 10
    DIRECTION_THRESHOLD: float = 5.0  # pixels threshold for movement

    # Output annotate video
    WRITE_ANNOTATED_VIDEO: bool = False
    ANNOTATED_FPS: int = 20

    # Priority classes (lowercase)
    PRIORITY_CLASSES: Set[str] = {"ambulance", "police", "fire_truck", "firetruck", "fire"}

settings = Settings()

# Ensure directories
os.makedirs(settings.VIDEOS_DIR, exist_ok=True)
os.makedirs(settings.OUTPUTS_DIR, exist_ok=True)
os.makedirs(settings.MODELS_DIR, exist_ok=True)
