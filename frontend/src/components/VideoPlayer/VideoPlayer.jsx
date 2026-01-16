import React, { useRef, useState, useEffect } from "react";
import "./VideoPlayer.css";

const FRAME_WIDTH = 960;
const FRAME_HEIGHT = 540;

export default function VideoPlayer(props) {
  const fileInputRef = useRef(null); // Ref cho input chọn file
  const videoRef = useRef(null); // Ref cho thẻ video để điều khiển play/pause

  const [isPlaying, setIsPlaying] = useState(false);
  const [videoSource, setVideoSource] = useState("RTMP_STREAM_HD_04");
  const [videoUrl, setVideoUrl] = useState(null); // Lưu đường dẫn video để phát
  const [boundingBoxes, setBoundingBoxes] = useState([]); // State lưu danh sách box

  // Refs for logic
  const seenVehiclesRef = useRef(new Set());
  const lastFrameTimeRef = useRef(performance.now());
  const frameCountRef = useRef(0);

  // 1. Xử lý khi chọn file từ máy tính
  const [status, setStatus] = useState("");

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (file) {
      console.log("File đã chọn:", file.name);
      const formData = new FormData();
      formData.append("file", file);
      setStatus("Đang upload...");

      try {
        const response = await fetch("http://127.0.0.1:8000/videos/upload", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) throw new Error("Upload thất bại");

        const data = await response.json();
        setStatus("Upload thành công! video_id: " + data.video_id);

        setVideoSource(file.name);
        setVideoUrl(URL.createObjectURL(file));
        setIsPlaying(false);
        setBoundingBoxes([]);
        seenVehiclesRef.current.clear();
        connectWebsocket(data.video_id);
      } catch (err) {
        setStatus("Lỗi khi upload: " + err.message);
      }
    }
  };


  function connectWebsocket(videoId) {
    const socket = new WebSocket(`ws://127.0.0.1:8000/ws/process/${videoId}`);

    socket.onopen = () => {
      console.log("Websocket connected");
      lastFrameTimeRef.current = performance.now();
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);

      // Calculate FPS
      const now = performance.now();
      const delta = now - lastFrameTimeRef.current;
      lastFrameTimeRef.current = now;
      const currentFps = delta > 0 ? Math.round(1000 / delta) : 0;

      // Throttle stats updates (every 10 frames)
      frameCountRef.current += 1;
      if (frameCountRef.current % 10 === 0) {
        if (props.onStatsUpdate) {
          props.onStatsUpdate({
            fps: currentFps > 60 ? 60 : currentFps, // Cap at 60 for sanity
            latency: Math.round(delta), // Rough frame time as latency
          });
        }
      }

      // data format: { frame_index, vehicles: [{ vehicle_id, class, direction, score, bbox: [x1, y1, x2, y2] }] }
      if (data.vehicles) {
        setBoundingBoxes(data.vehicles);

        // Check for new detections
        data.vehicles.forEach(vehicle => {
          const vid = vehicle.vehicle_id;
          const cls = vehicle.class.toLowerCase();

          // Should be a priority vehicle
          const isPriority = ["ambulance", "police", "fire_truck", "fire", "firetruck"].some(p => cls.includes(p));

          if (isPriority && !seenVehiclesRef.current.has(vid)) {
            seenVehiclesRef.current.add(vid);

            if (props.onNewDetection) {
              props.onNewDetection({
                id: vid,
                vehicle_id: vid,
                class: vehicle.class,
                score: vehicle.score || 0.0,
                direction: vehicle.direction,
                time: new Date().toLocaleTimeString('vi-VN', { hour12: false })
              });
            }
          }
        });
      }
    };

    socket.onclose = () => {
      console.log("Websocket closed");
    };

    socket.onerror = (error) => {
      console.error("Websocket error:", error);
    };
  }

  async function getVideoInfo(videoId) {
    const response = await fetch(`http://127.0.0.1:8000/videos/info/${videoId}`);
    const data = await response.json();
    console.log("thông tin video:", data);
  }

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
          <div style={{ position: "relative", width: "100%", height: "100%" }}>
            <video
              ref={videoRef}
              src={videoUrl}
              className="real-video"
              onEnded={handleVideoEnded}
              onClick={handleStart} // Click vào video để pause/play
              playsInline
            />
            {/* OVERLAY BOUNDING BOXES */}
            {boundingBoxes.map((box, index) => {
              const [x1, y1, x2, y2] = box.bbox;
              // Tính toán vị trí theo % để responsive
              const left = (x1 / FRAME_WIDTH) * 100 + "%";
              const top = (y1 / FRAME_HEIGHT) * 100 + "%";
              const width = ((x2 - x1) / FRAME_WIDTH) * 100 + "%";
              const height = ((y2 - y1) / FRAME_HEIGHT) * 100 + "%";

              const isPriority = ["ambulance", "police", "fire_truck"].includes(
                box.class
              );

              return (
                <div
                  key={index}
                  className={`bounding-box ${isPriority ? "box-ambulance" : ""}`}
                  style={{
                    left,
                    top,
                    width,
                    height,
                    borderColor: isPriority ? "var(--emergency-red)" : "#00ff00",
                    position: "absolute", // Ensure it's absolute within the relative wrapper
                  }}
                >
                  <div className={`box-label ${isPriority ? "red-bg" : ""}`} style={{ backgroundColor: isPriority ? "" : "#00ff00" }}>
                    <span>
                      {box.class} {box.score ? Math.round(box.score * 100) + "%" : ""} {box.direction ? `(${box.direction})` : ""}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
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
