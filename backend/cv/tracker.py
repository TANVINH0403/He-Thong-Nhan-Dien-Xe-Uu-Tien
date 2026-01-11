from typing import List, Dict, Tuple
import numpy as np
from scipy.spatial import distance as dist

# Simple centroid tracker implementation
class CentroidTracker:
    def __init__(self, maxDisappeared: int = 50, maxDistance: int = 80):
        # next object ID and dicts
        self.nextObjectID = 1
        self.objects: Dict[int, Tuple[int, int]] = {}
        self.disappeared: Dict[int, int] = {}
        self.maxDisappeared = maxDisappeared
        self.maxDistance = maxDistance

    def register(self, centroid: Tuple[int, int]):
        self.objects[self.nextObjectID] = centroid
        self.disappeared[self.nextObjectID] = 0
        self.nextObjectID += 1

    def deregister(self, objectID: int):
        if objectID in self.objects:
            del self.objects[objectID]
        if objectID in self.disappeared:
            del self.disappeared[objectID]

    def update(self, rects: List[List[int]]) -> Dict[int, Tuple[int, int]]:
        # If no rects, mark disappeared
        if len(rects) == 0:
            for objectID in list(self.disappeared.keys()):
                self.disappeared[objectID] += 1
                if self.disappeared[objectID] > self.maxDisappeared:
                    self.deregister(objectID)
            return self.objects

        # compute input centroids
        inputCentroids = np.zeros((len(rects), 2), dtype="int")
        for (i, (x1, y1, x2, y2)) in enumerate(rects):
            cX = int((x1 + x2) / 2.0)
            cY = int((y1 + y2) / 2.0)
            inputCentroids[i] = (cX, cY)

        # no existing objects => register all
        if len(self.objects) == 0:
            for i in range(0, len(inputCentroids)):
                self.register(tuple(inputCentroids[i]))
            return self.objects

        # match existing objects to input centroids
        objectIDs = list(self.objects.keys())
        objectCentroids = list(self.objects.values())

        D = dist.cdist(np.array(objectCentroids), inputCentroids)
        rows = D.min(axis=1).argsort()
        cols = D.argmin(axis=1)[rows]

        usedRows = set()
        usedCols = set()

        for (row, col) in zip(rows, cols):
            if row in usedRows or col in usedCols:
                continue
            if D[row, col] > self.maxDistance:
                continue

            objectID = objectIDs[row]
            self.objects[objectID] = tuple(inputCentroids[col])
            self.disappeared[objectID] = 0
            usedRows.add(row)
            usedCols.add(col)

        # find unused rows
        unusedRows = set(range(0, D.shape[0])).difference(usedRows)
        unusedCols = set(range(0, D.shape[1])).difference(usedCols)

        # increase disappeared for unmatched existing objects
        for row in unusedRows:
            objectID = objectIDs[row]
            self.disappeared[objectID] += 1
            if self.disappeared[objectID] > self.maxDisappeared:
                self.deregister(objectID)

        # register new objects for unmatched input centroids
        for col in unusedCols:
            self.register(tuple(inputCentroids[col]))

        return self.objects
