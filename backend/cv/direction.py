from typing import List, Tuple
import numpy as np

class DirectionEstimator:
    """
    Dựa vào chuỗi centroid, tính vector trung bình và phân loại hướng.
    """
    def __init__(self, min_points: int = 5, smooth_window: int = 10, threshold: float = 5.0):
        self.min_points = min_points
        self.smooth_window = smooth_window
        self.threshold = threshold

    def estimate(self, history: List[Tuple[float, float]]) -> str:
        if len(history) < self.min_points:
            return ""

        # Use last window
        data = np.array(history[-self.smooth_window:])
        deltas = np.diff(data, axis=0)
        if len(deltas) == 0:
            return ""

        avg = deltas.mean(axis=0)  # (dx, dy)
        dx, dy = float(avg[0]), float(avg[1])

        # Threshold to avoid jitter
        if abs(dx) < self.threshold and abs(dy) < self.threshold:
            return ""

        # Map to NSEW (note: y increases downward in images)
        # dy > 0 => moving South; dy < 0 => moving North
        # dx > 0 => moving East; dx < 0 => moving West
        if abs(dx) > abs(dy):
            return "East" if dx > 0 else "West"
        else:
            return "South" if dy > 0 else "North"
