import React, { useRef, useState, useEffect } from "react";
import "./VideoPlayer.css";

export default function VideoPlayer() {
  const fileInputRef = useRef(null); // Ref cho input chọn file
  const videoRef = useRef(null); // Ref cho thẻ video để điều khiển play/pause

  const [isPlaying, setIsPlaying] = useState(false);
  const [videoSource, setVideoSource] = useState("RTMP_STREAM_HD_04");
  const [videoUrl, setVideoUrl] = useState(null); // Lưu đường dẫn video để phát

  // 1. Xử lý khi chọn file từ máy tính
  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      console.log("File đã chọn:", file.name);

      // Tạo URL tạm thời cho file video để trình duyệt có thể phát
      const url = URL.createObjectURL(file);
      setVideoUrl(url);
      setVideoSource(file.name);

      // Reset trạng thái nút về "Bắt đầu" khi tải video mới
      setIsPlaying(false);
    }
  };

  // 2. Xử lý nút Bắt Đầu / Dừng Lại
  const handleStart = () => {
    if (!videoRef.current && !videoUrl) {
      alert("Vui lòng tải video lên trước!");
      return;
    }

    if (isPlaying) {
      // Đang chạy -> Muốn dừng
      videoRef.current.pause();
    } else {
      // Đang dừng -> Muốn chạy
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  // Xử lý sự kiện khi video kết thúc
  const handleVideoEnded = () => {
    setIsPlaying(false);
  };

  // Dọn dẹp bộ nhớ khi component bị hủy (tránh rò rỉ bộ nhớ)
  useEffect(() => {
    return () => {
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl);
      }
    };
  }, [videoUrl]);

  return (
    <div className="player-wrapper">
      <div className="video-screen">
        {/* Input ẩn */}
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: "none" }}
          accept="video/*"
          onChange={handleFileChange}
        />

        {/* THẺ VIDEO THẬT */}
        {videoUrl ? (
          <video
            ref={videoRef}
            src={videoUrl}
            className="real-video"
            onEnded={handleVideoEnded}
            onClick={handleStart} // Click vào video để pause/play
            playsInline
          />
        ) : (
          // Nếu chưa có video thì hiện nền đen placeholder
          <div className="placeholder-bg"></div>
        )}

        {/* Overlay Controls (Thanh điều khiển trên video) */}
        <div className="controls-overlay">
          <div className="control-row">
            <button
              style={{
                background: "none",
                border: "none",
                color: "white",
                cursor: "pointer",
              }}
              onClick={handleStart}
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: "32px" }}
              >
                {isPlaying ? "pause" : "play_arrow"}
              </span>
            </button>
            <span className="cam-name">CAM-04: {videoSource}</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="player-footer">
        <div className="footer-left">
          <span className="label">Nguồn dữ liệu:</span>
          <span className="source-tag">{videoSource}</span>
        </div>
        <div className="footer-right">
          <button
            className="btn btn-secondary"
            onClick={() => fileInputRef.current.click()}
          >
            <span className="material-symbols-outlined">file_upload</span> Tải
            video
          </button>

          <button
            className="btn btn-primary"
            onClick={handleStart}
            style={{
              backgroundColor: isPlaying ? "#ef4444" : "var(--primary)",
            }}
          >
            <span className="material-symbols-outlined">
              {isPlaying ? "stop_circle" : "play_circle"}
            </span>
            {isPlaying ? "Dừng lại" : "Bắt đầu"}
          </button>
        </div>
      </div>
    </div>
  );
}
