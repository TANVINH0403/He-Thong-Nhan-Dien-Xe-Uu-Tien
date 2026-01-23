import { useRef, useEffect, useState } from "react";
import { io } from "socket.io-client";
import "./VideoPlayer.css";

// Cấu hình chống nhấp nháy
const FLICKER_BUFFER = 10;

export default function SmartVideoPlayer() {
  const imgRef = useRef(null);
  const canvasRef = useRef(null);
  const socketRef = useRef(null);

  // State giao diện
  const [trafficStatus, setTrafficStatus] = useState("NORMAL");
  const [detectedVehicle, setDetectedVehicle] = useState(null);
  const [analysisLogs, setAnalysisLogs] = useState([]);

  // State quản lý video
  const [videoId, setVideoId] = useState(null);
  const [fileName, setFileName] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);

  // Refs
  const lastLogTimeRef = useRef(0);
  const persistenceRef = useRef(0);
  const lastBoxesRef = useRef([]);

  // --- HÀM VẼ KHUNG ---
  const drawBoxes = (boxes) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    boxes.forEach(box => {
      const { x1, y1, x2, y2, label, conf } = box;

      // < 90%: KHÔNG VẼ
      if (conf < 0.9) return;

      const color = "#ef4444";

      // 1. Vẽ khung
      ctx.beginPath();
      ctx.lineWidth = 3;
      ctx.strokeStyle = color;
      ctx.rect(x1, y1, x2 - x1, y2 - y1);
      ctx.stroke();

      // 2. Vẽ góc (Corner Brackets)
      const cornerLen = 20;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(x1, y1 + cornerLen); ctx.lineTo(x1, y1); ctx.lineTo(x1 + cornerLen, y1);
      ctx.moveTo(x2 - cornerLen, y1); ctx.lineTo(x2, y1); ctx.lineTo(x2, y1 + cornerLen);
      ctx.moveTo(x1, y2 - cornerLen); ctx.lineTo(x1, y2); ctx.lineTo(x1 + cornerLen, y2);
      ctx.moveTo(x2 - cornerLen, y2); ctx.lineTo(x2, y2); ctx.lineTo(x2, y2 - cornerLen);
      ctx.stroke();

      // 3. Vẽ nền thông tin
      ctx.fillStyle = "rgba(239, 68, 68, 0.8)";
      const text = `⚠️ ${label.toUpperCase()} [${Math.round(conf*100)}%]`;
      const textWidth = ctx.measureText(text).width + 30;
      ctx.fillRect(x1, y1 - 35, textWidth, 35);

      // 4. Vẽ chữ
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 14px 'Segoe UI', sans-serif";
      ctx.fillText(text, x1 + 10, y1 - 12);
    });
  };

  useEffect(() => {
    socketRef.current = io("http://127.0.0.1:8000");

    socketRef.current.on("frame_packet", (data) => {
      const { image, boxes, system_status, priority_label } = data;

      if (imgRef.current) imgRef.current.src = "data:image/jpeg;base64," + image;

      // CHỐNG NHẤP NHÁY
      let boxesToDraw = [];
      if (boxes.length > 0) {
        boxesToDraw = boxes;
        lastBoxesRef.current = boxes;
        persistenceRef.current = FLICKER_BUFFER;
      } else {
        if (persistenceRef.current > 0) {
           boxesToDraw = lastBoxesRef.current;
           persistenceRef.current -= 1;
        }
      }

      if (canvasRef.current) drawBoxes(boxesToDraw);

      setTrafficStatus(system_status);

      if (system_status === "PRIORITY") {
          setDetectedVehicle({ label: priority_label });

          const now = Date.now();
          if (now - lastLogTimeRef.current > 2000) {
              const newLog = {
                  id: now,
                  time: new Date().toLocaleTimeString('vi-VN'),
                  label: priority_label,
                  conf: "> 90%",
                  action: "MỞ ĐÈN XANH"
              };
              setAnalysisLogs(prev => [newLog, ...prev].slice(0, 10));
              lastLogTimeRef.current = now;
          }
      } else {
          setDetectedVehicle(null);
      }
    });

    return () => { if(socketRef.current) socketRef.current.disconnect(); };
  }, []);

  // --- SỬA LỖI Ở ĐÂY ---
  const uploadVideo = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFileName(file.name);

    const form = new FormData();
    form.append("file", file);

    try {
        // Gửi file lên backend
        const res = await fetch("http://127.0.0.1:8000/upload", { method: "POST", body: form });
        const data = await res.json();

        // Lưu lại ID video để dùng cho nút Bắt Đầu
        if (data.video_id) {
            setVideoId(data.video_id);
            // Không cần alert nữa cho chuyên nghiệp
        }
    } catch(e) { console.error(e); }
  };

  const handleStart = async () => {
    // Kiểm tra xem đã có videoId chưa
    if(!videoId) return alert("Vui lòng nạp video nguồn trước!");

    setIsPlaying(true);
    await fetch(`http://127.0.0.1:8000/start-ai/${encodeURIComponent(videoId)}`, { method: "POST" });
  };

  const handleStop = async () => {
    setIsPlaying(false);
    setTrafficStatus("NORMAL");
    await fetch("http://127.0.0.1:8000/stop-ai", { method: "POST" });
  };

  return (
    <div className="command-center-wrapper">

      {/* KHU VỰC TRUNG TÂM */}
      <div className={`main-monitor ${trafficStatus === 'PRIORITY' ? 'alert-state' : ''}`}>

          <div className="monitor-header">
             <div className="cam-id">
                <span className="dot"></span> LIVE CAM-01 [NGÃ TƯ HÀNG XANH]
             </div>
             <div className="sys-status">
                {trafficStatus === 'PRIORITY' ?
                    <span className="status-danger">PHÁT HIỆN ĐỐI TƯỢNG</span> :
                    <span className="status-safe">HỆ THỐNG SẴN SÀNG</span>
                }
             </div>
          </div>

          <div className="video-viewport">
              <img ref={imgRef} className="video-feed" style={{objectFit: 'fill'}} />
              <canvas ref={canvasRef} width={854} height={480} className="overlay-canvas" />
              <div className="grid-overlay"></div>

              {!isPlaying && (
                <div className="standby-screen">
                    <div className="logo-spin">📡</div>
                    <p>WAITING FOR SIGNAL...</p>
                </div>
              )}
          </div>

          <div className="control-deck">
            <div className="input-group">
                <label className="custom-file-upload">
                    <input type="file" onChange={uploadVideo} />
                    📂 {fileName || "NẠP VIDEO NGUỒN"}
                </label>
            </div>

            <div className="action-buttons">
                {!isPlaying ? (
                    <button className="btn-cmd btn-start" onClick={handleStart}>
                        <span>▶</span> KÍCH HOẠT QUÉT
                    </button>
                ) : (
                    <button className="btn-cmd btn-stop" onClick={handleStop}>
                        <span>⏹</span> NGẮT KẾT NỐI
                    </button>
                )}
            </div>
          </div>
      </div>

      {/* KHU VỰC SIDEBAR */}
      <div className="side-panel">

          <div className="widget traffic-widget">
              <div className="widget-header">TÍN HIỆU ĐIỀU PHỐI</div>
              <div className="traffic-light-container">
                  <div className={`bulb red ${trafficStatus === 'NORMAL' ? 'active' : ''}`}></div>
                  <div className={`bulb green ${trafficStatus === 'PRIORITY' ? 'active' : ''}`}></div>
              </div>
              <div className="traffic-info">
                {trafficStatus === 'PRIORITY' ? (
                    <div className="priority-msg">
                        <div className="blink-text">ƯU TIÊN</div>
                        <div className="vehicle-tag">{detectedVehicle?.label.toUpperCase()}</div>
                    </div>
                ) : (
                    <div className="normal-msg">GIỮ TÍN HIỆU ĐỎ</div>
                )}
              </div>
          </div>

          <div className="widget log-widget">
              <div className="widget-header">
                  DỮ LIỆU THỜI GIAN THỰC
                  <span className="pulse-dot"></span>
              </div>
              <div className="log-list">
                  {analysisLogs.length === 0 ? (
                      <div className="no-data">
                          <div className="scan-line"></div>
                          <span>Đang quét...</span>
                      </div>
                  ) : (
                      analysisLogs.map(log => (
                          <div key={log.id} className="log-item">
                              <div className="log-icon">🚑</div>
                              <div className="log-details">
                                  <div className="log-row-1">
                                      <span className="log-lbl">{log.label.toUpperCase()}</span>
                                      <span className="log-cnf">{log.conf}</span>
                                  </div>
                                  <div className="log-row-2">
                                      <span>{log.time}</span>
                                      <span className="log-act">{log.action}</span>
                                  </div>
                              </div>
                          </div>
                      ))
                  )}
              </div>
          </div>
      </div>
    </div>
  );
}