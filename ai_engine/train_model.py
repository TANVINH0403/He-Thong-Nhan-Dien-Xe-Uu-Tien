from ultralytics import YOLO

# 1. Khởi tạo mô hình
# 'yolov8n.pt' là bản nhẹ nhất (nano), chạy nhanh, phù hợp máy yếu.
# Nếu máy mạnh (có GPU), bạn có thể đổi thành 'yolov8s.pt' hoặc 'yolov8m.pt'
model = YOLO('yolov8n.pt')

# 2. Bắt đầu huấn luyện
if __name__ == '__main__':
    results = model.train(
        data='data.yaml',   # File cấu hình vừa tạo
        epochs=50,          # Học 50 lần (bạn có thể tăng lên 100 nếu cần)
        imgsz=640,          # Kích thước ảnh đầu vào
        batch=16,           # Số lượng ảnh học cùng lúc
        name='xe_uu_tien_model' # Tên folder lưu kết quả
    )

    # 3. Xuất kết quả tốt nhất
    print("Huấn luyện xong! Kiểm tra folder runs/detect/xe_uu_tien_model/weights/best.pt")