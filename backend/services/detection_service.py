import logging
from typing import List, Dict
import numpy as np

from config.settings import settings
from cv.detector import Detector

logger = logging.getLogger("services.detection")

class DetectionService:
    def __init__(self):
        self.detector = Detector(
            model_path=str(settings.YOLO_MODEL_PATH),
            input_size=(settings.FRAME_WIDTH, settings.FRAME_HEIGHT),
        )
        logger.info(f"[DETECTOR] Initialized (mock={self.detector.mock_mode})")

    def detect(self, frame: np.ndarray) -> List[Dict]:
        """
        Returns: list of dict with keys: bbox [x1,y1,x2,y2], score, class
        """
        detections = self.detector.detect(frame)
        # Filter unknown classes or low score if needed (optional)
        return detections
