from app.db.database import engine, Base
# Import model để SQLAlchemy biết cần tạo bảng nào
from app.db.models import PriorityVehicleLog

def initialize_database():
    print("--- Đang bắt đầu quá trình khởi tạo Database ---")
    try:
        # Lệnh này quét toàn bộ Model và tạo bảng trong SQLite
        Base.metadata.create_all(bind=engine)
        print("Chúc mừng! File 'vehicle_detection.db' đã được tạo thành công.")
        print("Bảng 'priority_logs' đã sẵn sàng lưu dữ liệu.")
    except Exception as e:
        print(f"Có lỗi xảy ra: {e}")

if __name__ == "__main__":
    initialize_database()