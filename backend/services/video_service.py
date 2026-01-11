import cv2
import logging
from typing import Tuple, List

logger = logging.getLogger("services.video")

class VideoService:
    @staticmethod
    def open_capture(path: str):
        cap = cv2.VideoCapture(path)
        return cap

    @staticmethod
    def resize_frame(frame, width: int, height: int):
        return cv2.resize(frame, (width, height))

    @staticmethod
    def create_writer(path: str, size: Tuple[int, int], fps: int):
        fourcc = cv2.VideoWriter_fourcc(*"mp4v")
        writer = cv2.VideoWriter(path, fourcc, fps, size)
        logger.info(f"[OUTPUT] Annotated video writer created: {path}")
        return writer

    @staticmethod
    def draw_annotations(frame, tracked_objs: List[dict]):
        for o in tracked_objs:
            x1, y1, x2, y2 = map(int, o["bbox"])
            vehicle_id = o["vehicle_id"]
            label = f"{o['class']}#{vehicle_id}"
            if o.get("direction"):
                label += f" {o['direction']}"
            # draw bbox
            color = (0, 255, 0) if o["class"].lower() in {"ambulance", "police", "fire_truck", "firetruck", "fire"} else (255, 255, 0)
            cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
            # draw label
            cv2.putText(frame, label, (x1, max(0, y1 - 5)), cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 1)
            # draw centroid
            cx, cy = map(int, o["centroid"])
            cv2.circle(frame, (cx, cy), 3, (255, 0, 0), -1)
