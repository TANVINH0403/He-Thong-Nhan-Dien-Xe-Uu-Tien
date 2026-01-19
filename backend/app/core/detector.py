import cv2
import os
import time
from ultralytics import YOLO  

class VehicleDetector:
    def __init__(self):
        current_dir = os.path.dirname(os.path.abspath(__file__))
        model_path = os.path.join(current_dir, "models", "best.pt")
        
        # Dòng 'if' phải thẳng hàng với 'model_path' ở trên
        if not os.path.exists(model_path):
            raise FileNotFoundError(f" Không tìm thấy file model tại: {model_path}")
            
        # 2. Khởi tạo model YOLOv8 từ file local
        self.model = YOLO(model_path)
        print("Đã khởi tạo YOLOv8 Local thành công")

    def process_frame(self, frame):
        # 3. Chạy nhận diện trực tiếp trên frame (Local)
        # conf=0.5: Chỉ lấy những xe AI chắc chắn trên 50%
        # imgsz=640: Giữ chất lượng ảnh cao để video rõ nét
        results = self.model(frame, conf=0.5, imgsz=640, verbose=False)[0]
        
        detections = []
        
        # 4. Duyệt qua kết quả trả về từ YOLO
        for box in results.boxes:
            # Lấy tọa độ dạng [x1, y1, x2, y2]
            coords = box.xyxy[0].tolist()
            x1, y1, x2, y2 = coords
            
            # Tính toán w, h để khớp với cấu trúc code cũ của bạn
            w = int(x2 - x1)
            h = int(y2 - y1)
            x = int(x1)
            y = int(y1)

            conf = float(box.conf[0] * 100)
            
            # Vì bạn đã gộp nhãn, nên class sẽ là "Xe uu tien"
            detections.append({
                "class": "xe uu tien", 
                "confidence": conf,
                "bbox": [x, y, w, h] 
            })
            
        return detections

    def save_snapshot(self, frame, detection, folder="static/snapshots"):
        """
        Lưu ảnh bằng chứng khi phát hiện xe ưu tiên (Giữ nguyên logic cũ)
        """
        if not os.path.exists(folder):
            os.makedirs(folder)

        timestamp = time.strftime("%Y%m%d-%H%M%S")
        label = detection['class'].replace(" ", "_") # Thay dấu cách bằng gạch dưới cho tên file
        filename = f"{label}_{timestamp}.jpg"
        filepath = os.path.join(folder, filename)

        # Lấy tọa độ để vẽ
        x, y, w, h = detection['bbox']
        snapshot_frame = frame.copy()
        
        # Vẽ ô vuông màu đỏ (0, 0, 255)
        cv2.rectangle(snapshot_frame, (x, y), (x + w, y + h), (0, 0, 255), 3) 
        
        # Ghi chữ lên ảnh
        text = f"{label.upper()} {int(detection['confidence'])}%"
        cv2.putText(snapshot_frame, text, (x, y - 10), 
                    cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 255), 2)

        cv2.imwrite(filepath, snapshot_frame)
        print(f"📸 Đã lưu bằng chứng Local: {filepath}")
        return filename