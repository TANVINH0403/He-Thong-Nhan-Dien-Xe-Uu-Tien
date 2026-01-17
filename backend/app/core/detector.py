import cv2
import os
import time
from ultralytics import YOLO

class VehicleDetector:
    def __init__(self, model_path="models/yolov8n.pt"):
        """
        Khởi tạo Detector
        :param model_path: Đường dẫn tới file model .pt trong thư mục models/
        """
        # 1. Nạp model AI
        if not os.path.exists(model_path):
            print(f"Cảnh báo: Không tìm thấy file {model_path}. Hệ thống sẽ tự tải bản mặc định.")
        self.model = YOLO(model_path)

        # 2. Định nghĩa các loại xe ưu tiên cần bắt (tùy vào model bạn dùng)
        # Với YOLOv8 mặc định, 'ambulance' và 'fire truck' thường không có sẵn, 
        # bạn có thể cần train thêm hoặc dùng model chuyên dụng.
        # Ở đây tôi liệt kê các nhãn phổ biến để bạn dễ hình dung.
        self.priority_labels = ["ambulance", "fire truck", "police car"]
        
        # Ngưỡng tin cậy (Chỉ bắt xe khi chắc chắn trên 50%)
        self.confidence_threshold = 0.5

    def process_frame(self, frame):
        """
        Hàm chính: Nhận khung hình từ video và trả về dữ liệu xe ưu tiên
        """
        # Chạy AI nhận diện
        results = self.model(frame)[0]
        
        detections = []
        
        # Mapping simulation for standard YOLOv8n model
        # bus -> ambulance
        # truck -> fire truck
        # car -> police car (simulated)
        
        for box in results.boxes:
            # Lấy thông tin cơ bản
            cls_id = int(box.cls[0])
            raw_label = self.model.names[cls_id].lower()
            conf = float(box.conf[0])

            # Simulation Logic
            mapped_label = None
            if raw_label == "bus":
                mapped_label = "ambulance"
            elif raw_label == "truck":
                mapped_label = "fire truck"
            elif raw_label == "motorcycle": # Use motorcycle for police to vary it
                mapped_label = "police car"
            elif raw_label == "car" and conf > 0.7: # Simulate some cars as police if high confidence
                 # Just for demo variety, maybe skip cars to avoid noise or map specific ones
                 pass 

            if mapped_label and conf >= self.confidence_threshold:
                # Lấy tọa độ ô vuông (Bounding Box) [x1, y1, x2, y2]
                bbox = box.xyxy[0].tolist()
                
                # Chỉnh định dạng dữ liệu trả về cho API /detections/live
                detections.append({
                    "type": mapped_label.upper(),
                    "confidence": round(conf * 100, 2),
                    "bbox": [int(coord) for coord in bbox], 
                    "timestamp": time.time()
                })
        
        return detections

    def save_snapshot(self, frame, detection, folder="static/snapshots"):
        """
        Chụp ảnh xe ưu tiên và lưu vào thư mục static để làm nhật ký (analytics/logs)
        """
        if not os.path.exists(folder):
            os.makedirs(folder)

        # Tạo tên file độc nhất: loại_xe_thời_gian.jpg
        timestamp = time.strftime("%Y%m%d-%H%M%S")
        filename = f"{detection['type']}_{timestamp}.jpg"
        filepath = os.path.join(folder, filename)

        # Vẽ ô vuông lên ảnh trước khi lưu (để làm bằng chứng trực quan)
        x1, y1, x2, y2 = detection['bbox']
        snapshot_frame = frame.copy()
        cv2.rectangle(snapshot_frame, (x1, y1), (x2, y2), (0, 0, 255), 2) # Vẽ khung đỏ
        cv2.putText(snapshot_frame, f"{detection['type']} {detection['confidence']}%", 
                    (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 255), 2)

        # Lưu file
        cv2.imwrite(filepath, snapshot_frame)
        
        return filename

        return filename