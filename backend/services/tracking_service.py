import logging
from typing import List, Dict
import numpy as np

from cv.tracker import CentroidTracker

logger = logging.getLogger("services.tracking")

class TrackingService:
    def __init__(self, max_disappeared=20, max_distance=80):
        self.tracker = CentroidTracker(maxDisappeared=max_disappeared, maxDistance=max_distance)
        self.histories = {}  # vehicle_id -> list of (cx, cy)

    def update(self, detections: List[Dict]) -> List[Dict]:
        # Convert detections to rects and classes
        rects = [d["bbox"] for d in detections]
        classes = [d.get("class", "vehicle") for d in detections]
        # Update tracker with rects
        objects = self.tracker.update(rects)

        tracked_objs = []
        for idx, (objectID, centroid) in enumerate(objects.items()):
            # Map objectID to detection class via nearest rect index
            # We use simple mapping by order: centroid distance to rect centroid
            if rects:
                rect_centroids = [((r[0]+r[2])//2, (r[1]+r[3])//2) for r in rects]
                dists = [np.linalg.norm(np.array(centroid) - np.array(rc)) for rc in rect_centroids]
                min_idx = int(np.argmin(dists))
                assigned_class = classes[min_idx]
                assigned_bbox = rects[min_idx]
            else:
                assigned_class = "vehicle"
                assigned_bbox = [int(centroid[0]-20), int(centroid[1]-20), int(centroid[0]+20), int(centroid[1]+20)]

            # Update history
            hist = self.histories.get(objectID, [])
            hist.append((float(centroid[0]), float(centroid[1])))
            self.histories[objectID] = hist

            tracked_objs.append({
                "vehicle_id": int(objectID),
                "class": assigned_class,
                "bbox": [int(assigned_bbox[0]), int(assigned_bbox[1]), int(assigned_bbox[2]), int(assigned_bbox[3])],
                "centroid": [float(centroid[0]), float(centroid[1])],
                "history": hist[-50:],  # keep last 50 for direction
            })

        return tracked_objs
