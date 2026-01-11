from ultralytics import YOLO
import numpy as np

class YOLODetector:
    def __init__(self):
        # Dùng model có sẵn hoặc best.pt nếu có
        self.model = YOLO("yolov8n.pt")

        self.emergency_classes = [
            "ambulance",
            "fire truck",
            "police car"
        ]

        # Lưu vị trí cũ để tính hướng
        self.track_history = {}

    def detect_and_track(self, frame):
        results = self.model.track(
            frame,
            persist=True,
            tracker="bytetrack.yaml",
            verbose=False
        )[0]

        detections = []
        is_emergency = False

        if results.boxes is None:
            return {
                "detections": [],
                "isEmergency": False
            }

        for box in results.boxes:
            cls_id = int(box.cls[0])
            label = self.model.names[cls_id]
            conf = float(box.conf[0])

            if box.id is None:
                continue

            track_id = int(box.id[0])

            x1, y1, x2, y2 = map(int, box.xyxy[0])
            cx = (x1 + x2) // 2
            cy = (y1 + y2) // 2

            # ====== XÁC ĐỊNH HƯỚNG ======
            direction = "unknown"
            if track_id in self.track_history:
                prev_x, prev_y = self.track_history[track_id]
                if cy < prev_y:
                    direction = "forward"
                elif cy > prev_y:
                    direction = "backward"

            self.track_history[track_id] = (cx, cy)

            detections.append({
                "track_id": track_id,
                "label": label,
                "confidence": round(conf, 2),
                "bbox": {
                    "x": x1,
                    "y": y1,
                    "w": x2 - x1,
                    "h": y2 - y1
                },
                "direction": direction
            })

            if label in self.emergency_classes:
                is_emergency = True

        return {
            "detections": detections,
            "isEmergency": is_emergency
        }
