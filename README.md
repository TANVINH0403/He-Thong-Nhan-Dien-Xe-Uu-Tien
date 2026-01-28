🚑 Hệ Thống Nhận Diện Xe Ưu Tiên Thông Minh  - Nhóm Thanh Hải , Tấn Vinh , Tấn Triều - Đại Học Giao Thông Vận Tải TP-HCM
Hệ thống sử dụng Trí tuệ nhân tạo (AI) để nhận diện và theo dõi các loại xe ưu tiên (Cứu thương, Cứu hỏa, Cảnh sát, Quân đội) từ camera giao thông hoặc video tải lên. Hệ thống giúp điều phối đèn tín hiệu giao thông thông minh.
🚀 Tính năng chính
Nhận diện đa lớp: Phân loại chính xác xe Cứu thương, Cứu hỏa, Cảnh sát, Quân sự.

Bộ lọc thông minh (Dual Filter): Loại bỏ nhận diện sai (xe taxi, xe con màu trắng) dựa trên phân tích Tỷ lệ (Ratio) và Diện tích (Area).

Xử lý đa luồng (Multi-threading): Đảm bảo video chạy mượt mà 30-60 FPS ngay cả khi AI đang xử lý nặng.

Tracking thời gian thực: Bám sát đối tượng và gán ID định danh.

Giao diện trực quan: Hiển thị cảnh báo, đèn tín hiệu giả lập và thống kê lịch sử.

🛠️ Yêu cầu hệ thống
Trước khi cài đặt, hãy đảm bảo máy tính của bạn đã cài:

Node.js (v16 trở lên) - Cho Frontend.

Python (v3.9 trở lên) - Cho Backend.

Git (Để tải mã nguồn).

📦 Hướng dẫn Cài đặt & Chạy
Cấu trúc dự án giả định:

project-folder/
├── backend/   (Mã nguồn Python)
└── frontend/  (Mã nguồn ReactJS)
Bước 1: Cài đặt Backend (Python)
Mở Terminal (CMD/PowerShell) và trỏ vào thư mục backend:

Bash
cd backend
(Khuyên dùng) Tạo môi trường ảo Python (Virtual Environment):

Bash
python -m venv venv
# Kích hoạt môi trường ảo:
# Trên Windows:
.\venv\Scripts\activate
# Trên Mac/Linux:
source venv/bin/activate
Cài đặt các thư viện cần thiết: Bạn hãy tạo file requirements.txt trong thư mục backend với nội dung sau:

Plaintext
fastapi
uvicorn
python-socketio
python-multipart
ultralytics
opencv-python
numpy
Sau đó chạy lệnh cài đặt:

Bash
pip install -r requirements.txt
QUAN TRỌNG: Chuẩn bị Model và Thư mục

Tạo thư mục uploads bên trong backend/.

Tạo thư mục models bên trong backend/.

Copy file model AI đã train (best.pt) vào thư mục backend/models/.

Chạy Server Backend:

Bash
python main.py
Server sẽ chạy tại: http://127.0.0.1:8000

Bước 2: Cài đặt Frontend (ReactJS)
Mở một Terminal mới, trỏ vào thư mục frontend:

Bash
cd frontend
Cài đặt các gói Node modules:

Bash
npm install
Chạy giao diện web:

Bash
npm run dev
Web sẽ chạy tại: http://localhost:5173

🖥️ Hướng dẫn Sử dụng
Truy cập: Mở trình duyệt và vào http://localhost:5173.

Chuẩn bị Video:

Copy các file video mẫu (mp4, avi...) vào thư mục backend/uploads/.

F5 lại trang web để hệ thống nhận diện danh sách video.

Vận hành:

Nhấn nút BẮT ĐẦU để chạy AI.

Hệ thống sẽ vẽ khung xanh/đỏ quanh xe ưu tiên.

Đèn tín hiệu bên phải sẽ chuyển XANH khi phát hiện xe ưu tiên.

👨‍💻 Công nghệ sử dụng
Frontend: ReactJS, Vite, Socket.IO Client.

Backend: FastAPI, Python, Socket.IO Server (Async).

AI Core: Ultralytics YOLOv8 (Tracking & Detection).

Database: SQLite (Lưu lịch sử nhận diện).
