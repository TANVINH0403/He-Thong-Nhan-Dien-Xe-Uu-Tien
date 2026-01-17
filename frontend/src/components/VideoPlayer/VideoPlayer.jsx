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
        if (!response.ok) throw new Error("Upload failed");

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
      setStatus("Đang xử lý Real-time...");
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
      console.log("SSE Connected");
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
        if (data.detections) {
          // Map backend (yolo) -> frontend
          const mapped = data.detections.map(d => ({
            ...d,
            class: d.type.toLowerCase(),
            score: d.confidence / 100.0
          }));
          setBoundingBoxes(mapped);

          // --- Notify New Detections ---
          mapped.forEach(veh => {
            const cls = veh.class;
            // Simple hash for ID-less detection to avoid spam
            // e.g. "ambulance-300-200"
            const cx = Math.floor((veh.bbox[0] + veh.bbox[2]) / 2 / 50);
            const cy = Math.floor((veh.bbox[1] + veh.bbox[3]) / 2 / 50);
            const id = `${cls}-${cx}-${cy}`;

            const isPriority = ["ambulance", "police", "fire"].some(k => cls.includes(k));

            if (isPriority && !seenVehiclesRef.current.has(id)) {
              seenVehiclesRef.current.add(id);
              // Auto forget after 5s so it can alert again if it comes back
              setTimeout(() => seenVehiclesRef.current.delete(id), 5000);

              if (props.onNewDetection) {
                props.onNewDetection({
                  id: id,
                  vehicle_id: id, // missing real ID
                  class: cls,
                  score: veh.score,
                  direction: "Đang di chuyển",
                  time: new Date().toLocaleTimeString('vi-VN')
                });
              }
            }
          });
        }

      } catch (e) {
        console.error("SSE parse error", e);
      }
    });

    sse.addEventListener("status", (e) => {
      const d = JSON.parse(e.data);
      if (d.status === "ended") handleStop();
    });

    sse.onerror = (err) => {
      console.error("SSE Error", err);
      // Browser auto-reconnects usually. 
      // If critical: handleStop(); setStatus("Mất kết nối server");
    };
  }

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
          <div style={{ position: "relative", width: "100%", height: "100%" }}>
            <video
              ref={videoRef}
              src={videoUrl}
              className="real-video"
              onEnded={handleVideoEnded}
              playsInline
              muted
            />
            {/* OVERLAY */}
            {boundingBoxes
              .filter(box => (box.score * 100) >= confidenceThreshold)
              .map((box, idx) => {
                const [x1, y1, x2, y2] = box.bbox;
                // Coordinates from backend are absolute (e.g. 1280x720).
                // We need to scale to video element size.
                // Simply using % if backend assumes specific resize? 
                // Backend detector runs on original frame size usually, or resized.
                // backend/app/api/sse.py -> capture(original).
                // backend/config/settings.py had FRAME_WIDTH=960. 
                // But sse.py uses cv2.VideoCapture(file), reads frame, detects.
                // YOLOv8 handles resize internally but returns coords relative to input image.
                // So if sse.py passed full frame, bbox is relative to full frame resolution.
                // The HTML video element fits content. 
                // This is tricky: "absolute" bbox vs "responsive" video.
                // Best way: calculate %: (x / originalWidth) * 100.
                // But we don't know originalWidth here easily without video metadata.
                // HACK: Assume backend logic or simply normalize on backend. 
                // But for now, let's assume 1280x720 or 960x540?
                // Detector in `detector.py` uses `self.model(frame)`.
                // `sse.py` reads frame. `cap.get(cv2.CAP_PROP_FRAME_WIDTH)`.
                // Ideally send frame size in SSE init or with each frame.
                // Or simpler: CSS `viewBox`? No.
                // Let's assume standard HD (1280x720) or FHD (1920x1080) OR use a known aspect ratio.
                // Better approach for Frontend Overlay: 
                // We can't easily normalize without width/height.
                // Let's try 960x540 (from previous settings.py) OR 1280x720. 
                // I'll stick to % logic assuming 1280x720 for now OR pass 100% if we assume backend resize.
                // Wait, `sse.py` does NOT resize. It uses original video.
                // If I upload 1920x1080, boxes are 0..1920.
                // If I display video at 640x360, box x=1000 will be off-screen if I assume px.
                // So percentage IS required.
                // Video element has `videoWidth` and `videoHeight`.
                // I can get them from `videoRef.current.videoWidth`.
                const vidParams = videoRef.current ? { w: videoRef.current.videoWidth, h: videoRef.current.videoHeight } : { w: 1280, h: 720 };
                const W = vidParams.w || 1280;
                const H = vidParams.h || 720;

                const left = (x1 / W) * 100 + "%";
                const top = (y1 / H) * 100 + "%";
                const width = ((x2 - x1) / W) * 100 + "%";
                const height = ((y2 - y1) / H) * 100 + "%";

                const isPriority = ["ambulance", "fire", "police"].some(k => box.class.includes(k));
                const color = box.class.includes("fire") ? "orange" : box.class.includes("police") ? "blue" : "red";

                return (
                  <div key={idx} className="bounding-box" style={{
                    left, top, width, height,
                    position: "absolute",
                    border: `2px solid ${isPriority ? color : '#00ff00'}`,
                    zIndex: 10
                  }}>
                    <span style={{
                      background: isPriority ? color : '#00ff00',
                      color: 'white',
                      fontSize: '10px',
                      position: 'absolute',
                      top: '-16px',
                      left: '-2px',
                      padding: '0 4px',
                      whiteSpace: 'nowrap'
                    }}>
                      {box.class.toUpperCase()} {(box.score * 100).toFixed(0)}%
                    </span>
                  </div>
                );
              })}
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
        <div className="footer-left">
          <span className="label">Trạng thái: </span>
          <span className="source-tag">{status}</span>

          {/* Slider Moved Here for Visibility */}
          <div className="slider-control" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '24px' }}>
            <span className="label" style={{ fontSize: '11px' }}>CONFIDENCE: {confidenceThreshold}%</span>
            <input
              type="range"
              min="0"
              max="100"
              value={confidenceThreshold}
              onChange={(e) => setConfidenceThreshold(Number(e.target.value))}
              className="conf-slider"
              style={{ width: '80px', cursor: 'pointer', height: '4px' }}
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