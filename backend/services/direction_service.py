import logging
from typing import List, Tuple

from config.settings import settings
from cv.direction import DirectionEstimator

logger = logging.getLogger("services.direction")

class DirectionService:
    def __init__(self):
        self.estimator = DirectionEstimator(
            min_points=settings.DIRECTION_HISTORY_MIN,
            smooth_window=settings.DIRECTION_SMOOTH_WINDOW,
            threshold=settings.DIRECTION_THRESHOLD,
        )

    def estimate(self, history: List[Tuple[float, float]]) -> str:
        return self.estimator.estimate(history)
