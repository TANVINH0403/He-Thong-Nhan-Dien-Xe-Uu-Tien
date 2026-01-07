from ultralytics import YOLO

class YOLODetector:
    def __init__(self):
        self.model = YOLO("models/best.pt")
        self.emergency_classes = ["ambulance", "fire_truck", "police_car"]

    def detect(self, frame):
        results = self.model(frame, verbose=False)[0]

        detections = []
        is_emergency = False

        for box in results.boxes:
            cls_id = int(box.cls[0])
            label = self.model.names[cls_id]
            conf = float(box.conf[0])

            x1, y1, x2, y2 = map(int, box.xyxy[0])
            w = x2 - x1
            h = y2 - y1

            detections.append({
                "label": label,
                "confidence": conf,
                "x": x1,
                "y": y1,
                "w": w,
                "h": h
            })

            if label in self.emergency_classes:
                is_emergency = True

        return {
            "boxes": detections,
            "isEmergency": is_emergency
        }
