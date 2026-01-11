import os
import logging
from typing import List, Dict, Tuple
import numpy as np

logger = logging.getLogger("cv.detector")

class Detector:
    """
    YOLO Ultralytics nếu có models/best.pt, ngược lại dùng mock.
    Output: list of {bbox:[x1,y1,x2,y2], score:float, class:str}
    """
    def __init__(self, model_path: str, input_size: Tuple[int, int] = (960, 540)):
        self.input_size = input_size
        self.mock_mode = True
        self.model = None
        self.class_map = None

        if os.path.exists(model_path):
            try:
                from ultralytics import YOLO  # lazy import
                self.model = YOLO(model_path)
                self.mock_mode = False
                # Nếu model có names
                self.class_map = getattr(self.model, "names", None)
                logger.info("[YOLO] Model loaded successfully")
            except Exception as e:
                logger.warning(f"[YOLO] Cannot load model, fallback to mock: {e}")
                self.mock_mode = True
        else:
            logger.info("[YOLO] best.pt not found, using mock detector")

        # state for mock
        self._mock_t = 0

    def detect(self, frame: np.ndarray) -> List[Dict]:
        if self.mock_mode:
            return self._mock_detect(frame)
        else:
            return self._yolo_detect(frame)

    def _yolo_detect(self, frame: np.ndarray) -> List[Dict]:
        results = self.model.predict(source=frame, imgsz=max(self.input_size), verbose=False)
        detections: List[Dict] = []
        for r in results:
            if not hasattr(r, "boxes"):
                continue
            boxes = r.boxes
            for b in boxes:
                # xyxy
                xyxy = b.xyxy[0].cpu().numpy().tolist()
                x1, y1, x2, y2 = [int(v) for v in xyxy]
                score = float(b.conf[0].cpu().numpy()) if getattr(b, "conf", None) is not None else 0.0
                cls_id = int(b.cls[0].cpu().numpy()) if getattr(b, "cls", None) is not None else -1
                cls_name = (
                    self.class_map.get(cls_id, "vehicle")
                    if isinstance(self.class_map, dict) else
                    str(cls_id)
                )
                detections.append({
                    "bbox": [x1, y1, x2, y2],
                    "score": score,
                    "class": cls_name.lower(),
                })
        return detections

    def _mock_detect(self, frame: np.ndarray) -> List[Dict]:
        """
        Giả lập detection: sinh bbox di chuyển theo thời gian để đảm bảo tracking thấy xe di chuyển.
        Cứ mỗi frame dịch chuyển nhẹ để tạo chuyển động.
        """
        h, w = frame.shape[:2]
        self._mock_t += 1

        # Simulate 3 vehicles: ambulance (priority), police (priority), car (normal)
        # Move them sinusoidally across frames
        t = self._mock_t
        # Ambulance moves East
        ax = int(50 + 3 * t)
        ay = int(h * 0.3 + 20 * np.sin(t / 10))
        # Police moves South
        px = int(w * 0.5 + 30 * np.sin(t / 15))
        py = int(60 + 2 * t)
        # Car moves West
        cx = int(w - (50 + 2 * t))
        cy = int(h * 0.7 + 25 * np.sin(t / 12))

        boxes = [
            {"center": (ax, ay), "size": (80, 50), "class": "ambulance"},
            {"center": (px, py), "size": (90, 60), "class": "police"},
            {"center": (cx, cy), "size": (100, 60), "class": "car"},
        ]

        detections: List[Dict] = []
        for b in boxes:
            x, y = b["center"]
            bw, bh = b["size"]
            x1 = max(0, x - bw // 2)
            y1 = max(0, y - bh // 2)
            x2 = min(w - 1, x + bw // 2)
            y2 = min(h - 1, y + bh // 2)
            detections.append({
                "bbox": [x1, y1, x2, y2],
                "score": 0.9,
                "class": b["class"].lower(),
            })

        return detections
