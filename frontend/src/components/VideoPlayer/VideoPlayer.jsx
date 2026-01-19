import React, { useRef, useState, useEffect } from "react";
import "./VideoPlayer.css";

import Modal from "../Modal/Modal.jsx";

export default function VideoPlayer(props) {
  const fileInputRef = useRef(null); // Input file ẩn
  const videoRef = useRef(null);     // Thẻ video
  const eventSourceRef = useRef(null); // SSE Connection

  // Refs for tracking logic
  const seenVehiclesRef = useRef(new Set());
  const lastFrameTimeRef = useRef(performance.now());
  const frameCountRef = useRef(0);

  const [isPlaying, setIsPlaying] = useState(false);
  const [videoSource, setVideoSource] = useState("Sẵn sàng"); // Tên file
  const [videoUrl, setVideoUrl] = useState(null); // Blob URL để play video
  const [boundingBoxes, setBoundingBoxes] = useState([]); // Box vẽ đè lên
  const [status, setStatus] = useState("Chưa chọn video");
  const [confidenceThreshold, setConfidenceThreshold] = useState(50); // Default 50%

  // Alert Modal State
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");

  const showAlert = (msg) => {
    setAlertMessage(msg);
    setAlertOpen(true);
  };

  const closeAlert = () => setAlertOpen(false);

  // Cleanup cleanup
  useEffect(() => {
    return () => {
      if (videoUrl) URL.revokeObjectURL(videoUrl);
      if (eventSourceRef.current) eventSourceRef.current.close();
    };
  }, [videoUrl]);

  const canvasRef = useRef(null);

  // Render Loop for Canvas
  useEffect(() => {
    let animationFrameId;

    const render = () => {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      if (!canvas || !video) return;

      const ctx = canvas.getContext('2d');
      // Sync canvas size to display size if needed
      if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (boundingBoxes.length > 0) {
        boundingBoxes.forEach(box => {
          if ((box.score * 100) < confidenceThreshold) return;

          const [x, y, w, h] = box.bbox;

          // Color Logic
          let color = "#00ff00"; // Green for normal
          let label = "PHƯƠNG TIỆN";
          let bgColor = "rgba(0, 255, 0, 0.2)";

          if (box.class.includes("ambulance")) {
            color = "#ef4444"; // Red
            label = "XE CỨU THƯƠNG";
            bgColor = "rgba(239, 68, 68, 0.2)";
          } else if (box.class.includes("fire")) {
            color = "#f97316"; // Orange
            label = "XE CỨU HỎA";
            bgColor = "rgba(249, 115, 22, 0.2)";
          } else if (box.class.includes("police")) {
            color = "#3b82f6"; // Blue
            label = "XE CẢNH SÁT";
            bgColor = "rgba(59, 130, 246, 0.2)";
          }

          // Draw Box
          ctx.strokeStyle = color;
          ctx.lineWidth = 4; // Bold line for better visibility
          ctx.strokeRect(x, y, w, h);

          // Draw Fill
          ctx.fillStyle = bgColor;
          ctx.fillRect(x, y, w, h);

          // Draw Label
          ctx.font = "bold 16px Inter, sans-serif";
          const text = `${label} ${(box.score * 100).toFixed(0)}%`;
          const textMetrics = ctx.measureText(text);
          const textPadding = 8;

          ctx.fillStyle = color;
          ctx.fillRect(x, y - 30, textMetrics.width + (textPadding * 2), 30);

          ctx.fillStyle = "#ffffff";
          ctx.fillText(text, x + textPadding, y - 9);
        });
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animationFrameId);
  }, [boundingBoxes, confidenceThreshold]);

  // 1. Upload File
  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (file) {
      console.log("File selected:", file.name);

      // 1. Set local video preview
      const objectUrl = URL.createObjectURL(file);
      setVideoUrl(objectUrl);
      setVideoSource(file.name);
      setIsPlaying(false);
      setBoundingBoxes([]);
      seenVehiclesRef.current.clear();
      setStatus("Đang tải lên...");

      // 2. Upload to Backend
      const formData = new FormData();
      formData.append("file", file);

      try {
        const response = await fetch("http://127.0.0.1:8000/detections/upload", {
          method: "POST",
          body: formData,
        });
        if (!response.ok) throw new Error("Tải lên thất bại");

        // Upload success
        setStatus("Sẵn sàng. Nhấn Bắt đầu.");
      } catch (err) {
        console.error(err);
        setStatus("Lỗi tải lên: " + err.message);
        showAlert("Lỗi tải lên: " + err.message);
      }
    }
  };

  // 2. Control Logic
  const handleStart = () => {
    if (!videoUrl) {
      showAlert("Vui lòng tải video lên trước!");
      return;
    }

    if (isPlaying) {
      // STOP
      handleStop();
    } else {
      // START
      setIsPlaying(true);
      if (videoRef.current) videoRef.current.play();
      connectSSE(videoSource);
      setStatus("Đang xử lý trực tiếp...");
    }
  };

  const handleStop = () => {
    setIsPlaying(false);
    if (videoRef.current) videoRef.current.pause();
    if (eventSourceRef.current) eventSourceRef.current.close();
    setStatus("Đã dừng.");
  };

  const handleVideoEnded = () => {
    handleStop();
    setStatus("Video kết thúc.");
  };

  // 3. SSE Connection
  function connectSSE(filename) {
    if (eventSourceRef.current) eventSourceRef.current.close();

    console.log(`Connecting SSE: http://127.0.0.1:8000/sse/stream/${filename}`);
    const sse = new EventSource(`http://127.0.0.1:8000/sse/stream/${filename}`);
    eventSourceRef.current = sse;

    sse.onopen = () => {
      console.log("Đã kết nối SSE");
      lastFrameTimeRef.current = performance.now();
    };

    sse.addEventListener("detection", (event) => {
      try {
        const data = JSON.parse(event.data);

        // --- FPS Calc ---
        const now = performance.now();
        const delta = now - lastFrameTimeRef.current;
        lastFrameTimeRef.current = now;
        const currentFps = delta > 0 ? Math.round(1000 / delta) : 0;

        frameCountRef.current++;
        if (frameCountRef.current % 10 === 0 && props.onStatsUpdate) {
          props.onStatsUpdate({
            fps: currentFps > 60 ? 60 : currentFps,
            latency: Math.round(delta)
          });
        }

        // --- Bounding Boxes ---
        if (data.detections && Array.isArray(data.detections)) {
          // Map backend (yolo) -> frontend
          const mapped = data.detections.map(d => ({
            ...d,
            class: (d.class || "không xác định").toLowerCase(),
            score: (d.confidence || 0) / 100.0
          }));
          setBoundingBoxes(mapped);

          // --- Notify New Detections ---
          mapped.forEach(veh => {
            const cls = veh.class;
            const [x, y, w, h] = veh.bbox;

            // Simple hash based on center to avoid spam
            const cx = Math.floor((x + w / 2) / 50);
            const cy = Math.floor((y + h / 2) / 50);
            const id = `${cls}-${cx}-${cy}`;

            const isPriority = ["ambulance", "police", "fire"].some(k => cls.includes(k));

            if (isPriority && !seenVehiclesRef.current.has(id)) {
              seenVehiclesRef.current.add(id);
              setTimeout(() => seenVehiclesRef.current.delete(id), 5000);

              if (props.onNewDetection) {
                props.onNewDetection({
                  id: id,
                  vehicle_id: "Không có ID",
                  class: cls,
                  score: veh.score,
                  direction: "Đang di chuyển",
                  time: new Date().toLocaleTimeString('vi-VN')
                });
              }
            }
          });
        } else {
          setBoundingBoxes([]); // Reset if nothing
        }

      } catch (e) {
        console.error("Lỗi phân tích dữ liệu SSE", e);
      }
    });

    sse.addEventListener("status", (e) => {
      const d = JSON.parse(e.data);
      if (d.status === "ended") handleStop();
    });

    sse.onerror = (err) => {
      console.error("Lỗi kết nối SSE", err);
      // Browser auto-reconnects usually. 
      // If critical: handleStop(); setStatus("Mất kết nối server");
    };
  }

  // State for video dimensions
  const [videoSize, setVideoSize] = useState({ width: '100%', height: '100%', aspectRatio: 'auto' });

  const handleLoadedMetadata = () => {
    const video = videoRef.current;
    if (video) {
      setVideoSize({
        width: '100%',
        height: 'auto',
        aspectRatio: `${video.videoWidth} / ${video.videoHeight}`
      });

      // Also update canvas immediately
      if (canvasRef.current) {
        canvasRef.current.width = video.videoWidth;
        canvasRef.current.height = video.videoHeight;
      }
    }
  };

  return (
    <div className="player-wrapper">
      {/* Alert Modal */}
      <Modal isOpen={alertOpen} onClose={closeAlert} title="Thông báo" type="alert">
        <p>{alertMessage}</p>
      </Modal>

      <div className="video-screen">
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: "none" }}
          accept="video/*"
          onChange={handleFileChange}
        />

        {videoUrl ? (
          <div style={{ position: "relative", width: "100%", maxWidth: "100%", height: "100%", display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <video
              ref={videoRef}
              src={videoUrl}
              className="real-video"
              onEnded={handleVideoEnded}
              onLoadedMetadata={handleLoadedMetadata}
              playsInline
              muted
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
            {/* CANVAS OVERLAY */}
            <canvas
              ref={canvasRef}
              className="overlay-canvas"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
                zIndex: 10,
                objectFit: 'contain'
              }}
            />


          </div>
        ) : (
          <div className="placeholder-bg">
            <p>{status}</p>
          </div>
        )}

        <div className="controls-overlay">
          <div className="control-row">
            <button className="icon-btn" onClick={handleStart}>
              <span className="material-symbols-outlined">
                {isPlaying ? "pause" : "play_arrow"}
              </span>
            </button>
            <span className="cam-name">{videoSource}</span>
          </div>
        </div>
      </div>

      <div className="player-footer">
        <div className="footer-left" style={{ flex: 1 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span className="label">Trạng thái: </span>
              <span className="source-tag">{status}</span>
            </div>
          </div>

          {/* Slider Moved Here for Visibility */}
          <div className="slider-control" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginLeft: '32px', background: 'var(--bg-base)', padding: '8px 16px', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
            <span className="label" style={{ fontSize: '10px' }}>ĐỘ TIN CẬY: {confidenceThreshold}%</span>
            <input
              type="range"
              min="0"
              max="100"
              value={confidenceThreshold}
              onChange={(e) => setConfidenceThreshold(Number(e.target.value))}
              className="conf-slider"
            />
          </div>
        </div>
        <div className="footer-right">
          <button className="btn btn-secondary" onClick={() => fileInputRef.current.click()}>
            <span className="material-symbols-outlined">upload</span> Tải Video
          </button>
          <button className="btn btn-primary" onClick={handleStart}>
            <span className="material-symbols-outlined">{isPlaying ? "stop" : "play_arrow"}</span>
            {isPlaying ? "Dừng" : "Bắt đầu"}
          </button>
        </div>
      </div>
    </div>
  );
}