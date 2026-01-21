import { useRef, useEffect, useState } from "react";
import { io } from "socket.io-client";
import "./VideoPlayer.css";

export default function SmartVideoPlayer() {
  const imgRef = useRef(null);
  const canvasRef = useRef(null);
  const socketRef = useRef(null);

  const [videoId, setVideoId] = useState(null);
  const [fileName, setFileName] = useState("");
  const [localVideoUrl, setLocalVideoUrl] = useState(null);
  const [isAiActive, setIsAiActive] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef(null);

  useEffect(() => {
    socketRef.current = io("http://127.0.0.1:8000");

    // 1. Lắng nghe ảnh (frame)
    socketRef.current.on("frame", (base64Image) => {
      setIsAiActive(true);
      if (imgRef.current) {
        imgRef.current.src = "data:image/jpeg;base64," + base64Image;
      }
    });

    // 2. Lắng nghe dữ liệu tọa độ (ai_data)
    socketRef.current.on("ai_data", (boxes) => {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        drawBoxes(ctx, boxes); // Gọi hàm vẽ với đầy đủ ctx và boxes
      }
    });

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, []);

  // 2️⃣ Control video playback based on isPlaying
  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;
    if (isPlaying) {
      videoEl.play().catch((e) => console.warn('Play prevented:', e));
    } else {
      videoEl.pause();
      videoEl.currentTime = 0;
    }
  }, [isPlaying]);

  // 3. Hàm vẽ Box (Sửa lại để khớp với ảnh 480x480)
  const drawBoxes = (ctx, boxes) => {
    // Xóa khung cũ trước khi vẽ khung mới
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    boxes.forEach(box => {
      const { x1, y1, x2, y2, label } = box;

      // Tính toán kích thước
      const width = x2 - x1;
      const height = y2 - y1;

      // Vẽ khung hình chữ nhật (Màu hồng giống video mẫu)
      ctx.strokeStyle = "#FF00FF";
      ctx.lineWidth = 4;
      ctx.strokeRect(x1, y1, width, height);

      // Vẽ nhãn chữ nền hồng
      ctx.fillStyle = "#FF00FF";
      ctx.font = "bold 18px Arial";
      const textWidth = ctx.measureText(label).width;

      // Vẽ background cho chữ
      ctx.fillRect(x1 - 2, y1 - 30, textWidth + 10, 30);

      // Vẽ chữ (Tên xe + Score)
      ctx.fillStyle = "white";
      ctx.fillText(label, x1 + 3, y1 - 8);
    });
  };


  // 3️⃣ Upload video
  const uploadVideo = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFileName(file.name);

    // Tạo preview URL cục bộ
    const url = URL.createObjectURL(file);
    setLocalVideoUrl(url);
    setIsAiActive(false);
    setIsPlaying(false);

    const form = new FormData();
    form.append("file", file);
    try {
      const res = await fetch("http://127.0.0.1:8000/upload", {
        method: "POST",
        body: form
      });

      const data = await res.json();
      if (data.video_id) {
        setVideoId(data.video_id);
        console.log("Đã nhận ID:", data.video_id);
      }
    } catch (error) {
      console.error("Lỗi upload:", error);
    }
  };

  // 4️⃣ Bắt đầu AI
  const handleStart = async () => {
    if (!videoId) return alert("Upload video trước");
    setIsPlaying(true);

    await fetch(`http://127.0.0.1:8000/start-ai/${encodeURIComponent(videoId)}`, {
      method: "POST"
    });
  };

  // 5️⃣ Dừng AI
  const handleStop = async () => {
    setIsPlaying(false);
    setIsAiActive(false);

    // Xóa nội dung canvas
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    try {
      await fetch("http://127.0.0.1:8000/stop-ai", {
        method: "POST"
      });
    } catch (error) {
      console.error("Lỗi khi dừng AI:", error);
    }
  };

  return (
    <div className="video-player-container">
      <div className="controls-bar">
        <div className="file-input-wrapper">
          <button className="btn-upload" type="button">
            <span className="material-symbols-outlined">upload_file</span>
            {fileName || "Chọn Video Nguồn"}
          </button>
          {/* Input thật nằm đè lên trên và ẩn đi */}
          <input
            type="file"
            accept="video/*"
            onChange={uploadVideo}
            style={{ opacity: 0, position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', cursor: 'pointer', zIndex: 10 }}
          />
        </div>

        {!isPlaying ? (
          <button className="btn-start" onClick={handleStart}>
            <span className="material-symbols-outlined">play_circle</span>
            BẮT ĐẦU
          </button>
        ) : (
          <button className="btn-stop" onClick={handleStop}>
            <span className="material-symbols-outlined">stop_circle</span>
            DỪNG
          </button>
        )}
      </div>

      <div className="video-view-wrapper">
        {/* Hiển thị video preview cục bộ khi chưa chạy AI */}
        {localVideoUrl && !isAiActive && (
          <video
            ref={videoRef}
            src={localVideoUrl}
            controls={false}
            // autoPlay removed to control playback manually
            muted
            loop
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
          />
        )}

        {/* Hiển thị stream từ AI socket */}
        <img
          ref={imgRef}
          alt="Live feed"
          style={{ display: isAiActive ? 'block' : 'none', width: '100%', height: '100%', objectFit: 'contain' }}
        />

        <canvas
          ref={canvasRef}
          width={480}   // PHẢI LÀ 480 để khớp với imgsz của AI
          height={480}  // PHẢI LÀ 480
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            objectFit: 'contain' // Đảm bảo canvas giãn nở giống hệt thẻ <img>
          }}
        />

        {!localVideoUrl && !videoId && (
          <div className="no-feed">
            <span className="material-symbols-outlined">videocam_off</span>
            <p>Chưa có tín hiệu camera</p>
          </div>
        )}
      </div>
    </div>
  );
}
