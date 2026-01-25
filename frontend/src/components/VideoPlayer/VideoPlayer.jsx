import { useRef, useEffect, useState } from "react";
import { io } from "socket.io-client";
import "./VideoPlayer.css";

const API_URL = "http://127.0.0.1:8000";

// --- CẤU HÌNH SIÊU ỔN ĐỊNH ---
const SPAWN_THRESHOLD = 0.85; // Cần >85% mới bắt đầu tracking (Chống bắt nhầm)
const KEEP_THRESHOLD = 0.40;  // Chỉ cần >40% là giữ tracking (Chống mất dấu)
const MAX_STICKY_FRAMES = 10; // Giữ khung hình thêm 10 frames (0.3s) khi xe bị che (Chống nháy)
const TRACKING_DIST = 150;

const getVehicleInfo = (label) => {
    if (!label) return null;
    const l = label.toLowerCase();

    // 1. Xe Cứu Thương
    if (l.includes("cuu thuong")) {
        return { name: "CỨU THƯƠNG", icon: "🚑", color: "#ef4444", type: "AMB" };
    }

    // 2. Xe Cứu Hỏa
    if (l.includes("cuu hoa")) {
        return { name: "CỨU HỎA", icon: "🚒", color: "#f97316", type: "FIR" };
    }

    // 3. Xe Cảnh Sát
    if (l.includes("canh sat")) {
        return { name: "CẢNH SÁT", icon: "🚓", color: "#3b82f6", type: "POL" };
    }

    // 4. Xe Quân Đội
    if (l.includes("quan doi")) {
        return { name: "XE QUÂN ĐỘI", icon: "🪖", color: "#166534", type: "MIL" };
    }

    // Các xe khác
    return null;
};

const getDistance = (p1, p2) => Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));

export default function SmartVideoPlayer({ config }) {
  const { cameraName } = config || { cameraName: "CAM-01" };
  const imgRef = useRef(null);
  const canvasRef = useRef(null);
  const socketRef = useRef(null);

  // State hiển thị
  const [activeVehicle, setActiveVehicle] = useState(null);
  const [systemState, setSystemState] = useState("MONITORING");
  const [analysisLogs, setAnalysisLogs] = useState([]);

  const [videoId, setVideoId] = useState(null);
  const [fileName, setFileName] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);

  // Refs Tracking (Quan trọng)
  const activeTracksRef = useRef([]);
  const processedIdsRef = useRef(new Set());
  const idCounterRef = useRef(1000);

  // 1. Tải lịch sử & Khôi phục bộ nhớ ID
  const fetchHistory = async () => {
      try {
          const res = await fetch(`${API_URL}/api/history`);
          if(!res.ok) return;
          const data = await res.json();
          setAnalysisLogs(data.map(d => ({
              id: d.id, time: d.time, plate: d.plate, type: d.type, conf: `${Math.round(d.conf * 100)}%`
          })));
          // Nạp lại các ID đã có vào bộ nhớ để không log trùng sau khi F5
          const ids = new Set(data.map(d => d.plate));
          processedIdsRef.current = ids;
      // eslint-disable-next-line no-unused-vars
      } catch (e) { /* empty */ }
  };

  // 2. Thuật toán "Sticky Box" (Hộp dính)
  const processTracking = (rawBoxes) => {
    const currentTracks = activeTracksRef.current;

    // Chỉ lấy các box đủ tiêu chuẩn để so khớp
const candidates = rawBoxes.filter(b => {
        const info = getVehicleInfo(b.label);
        return info !== null && b.conf >= KEEP_THRESHOLD;
    });

    const usedIndices = new Set();
    const nextTracks = [];

    // A. Cập nhật xe cũ
    currentTracks.forEach(track => {
        let bestIdx = -1;
        let minDist = TRACKING_DIST;

        candidates.forEach((box, idx) => {
            if (usedIndices.has(idx)) return;
            const dist = getDistance({x: track.x, y: track.y}, {x: (box.x1+box.x2)/2, y: (box.y1+box.y2)/2});
            if (dist < minDist && box.label === track.label) {
                minDist = dist;
                bestIdx = idx;
            }
        });

        if (bestIdx !== -1) {
            // Tìm thấy -> Update
            const box = candidates[bestIdx];
            usedIndices.add(bestIdx);
            nextTracks.push({
                ...track,
                x: (box.x1 + box.x2) / 2, y: (box.y1 + box.y2) / 2,
                box: box, conf: box.conf, stickyCount: 0 // Reset sticky
            });
        } else {
            // Mất dấu -> Tăng stickyCount (Giữ lại thêm chút nữa)
            if (track.stickyCount < MAX_STICKY_FRAMES) {
                nextTracks.push({
                    ...track,
                    stickyCount: track.stickyCount + 1
                });
            }
        }
    });

    // B. Thêm xe mới (Chỉ khi rất rõ nét)
    candidates.forEach((box, idx) => {
        if (!usedIndices.has(idx) && box.conf >= SPAWN_THRESHOLD) {
            const newId = `ID-${idCounterRef.current++}`;
            nextTracks.push({
                id: newId, x: (box.x1+box.x2)/2, y: (box.y1+box.y2)/2,
                box: box, label: box.label, conf: box.conf, stickyCount: 0
            });
        }
    });

    activeTracksRef.current = nextTracks;
    return nextTracks;
  };

  // 3. Vẽ Canvas (Vẽ nét liền, không mờ)
  const drawAndAnalyze = () => {
    const tracks = activeTracksRef.current;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, 854, 480);

    let priority = null;

    tracks.forEach(t => {
        // Luôn dùng box dữ liệu gần nhất để vẽ
        if (!t.box) return;
        const { x1, y1, x2, y2 } = t.box;
        const info = getVehicleInfo(t.label);

        // VẼ KHUNG: Luôn là nét liền và đậm (Kể cả khi đang mất dấu nhẹ)
        // Điều này giúp mắt người xem thấy mượt, không bị nhấp nháy
        ctx.lineWidth = 3;
        ctx.strokeStyle = info.color;
        ctx.setLineDash([]); // Bắt buộc nét liền
        ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);

        // Vẽ Nhãn
        ctx.fillStyle = info.color;
        const label = `${info.name} [${t.id}]`;
        const w = ctx.measureText(label).width + 20;
        ctx.fillRect(x1, y1 - 30, w, 30);
        ctx.fillStyle = "#fff"; ctx.font = "bold 13px sans-serif";
        ctx.fillText(label, x1 + 10, y1 - 10);

        // Chỉ xử lý logic nếu xe đang rõ (stickyCount = 0)
        if (t.stickyCount === 0) {
            if (!priority || t.conf > priority.conf) priority = { ...t, info };

            // Log vào DB
            if (!processedIdsRef.current.has(t.id)) {
                const timeStr = new Date().toLocaleString('vi-VN');
                const logItem = { vehicle_type: info.name, plate_id: t.id, confidence: t.conf };

                // Update UI
                setAnalysisLogs(prev => [{
                    id: Date.now(), time: timeStr, plate: t.id,
                    type: info.name, conf: `${Math.round(t.conf * 100)}%`
                }, ...prev].slice(0, 50));

                processedIdsRef.current.add(t.id);
                fetch(`${API_URL}/api/save-log`, {
                    method: "POST", headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(logItem)
                }).catch(()=>{});
            }
        }
    });

    // Cập nhật thông tin Panel
    if (priority) {
        setSystemState("TRIGGERED");
        setActiveVehicle({ ...priority.info, id: priority.id, conf: Math.round(priority.conf*100) });
    } else {
        // Chỉ về MONITORING khi không còn xe ưu tiên nào trong khung hình
        const hasPriority = tracks.some(t => ['AMB','FIR','POL'].includes(getVehicleInfo(t.label).type));
        if (!hasPriority) {
            setSystemState("MONITORING");
            setActiveVehicle(null);
        }
    }
  };

  useEffect(() => {
    socketRef.current = io(API_URL);
    socketRef.current.on("frame_packet", (data) => {
      if (imgRef.current) imgRef.current.src = "data:image/jpeg;base64," + data.image;
      processTracking(data.boxes || []);
      if (canvasRef.current) drawAndAnalyze();
    });
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchHistory();
    return () => socketRef.current?.disconnect();
  }, []);

  const uploadVideo = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFileName(file.name);
    const form = new FormData(); form.append("file", file);
    const res = await fetch(`${API_URL}/upload`, { method: "POST", body: form });
    const data = await res.json();
    if (data.video_id) setVideoId(data.video_id);
  };

  const handleStart = async () => {
    // eslint-disable-next-line no-undef
    if(!videoId && !streamUrl) return alert("Chưa chọn video!");
    activeTracksRef.current = []; // Reset tracking
    setIsPlaying(true);
    await fetch(`${API_URL}/start-ai/${encodeURIComponent(videoId || "stream")}`, { method: "POST" });
  };

  const handleStop = async () => {
    await fetch(`${API_URL}/stop-ai`, { method: "POST" });
    setIsPlaying(false); setActiveVehicle(null); setSystemState("MONITORING");
    activeTracksRef.current = [];
    const ctx = canvasRef.current?.getContext("2d");
    if(ctx) ctx.clearRect(0, 0, 854, 480);
  };

  return (
    <div className="its-container">
      {/* ... Phần giao diện giữ nguyên ... */}
      <div className={`monitor-section ${systemState === 'TRIGGERED' ? 'alert-border' : ''}`}>
          <div className="section-header">
              <div className="cam-info">📹 {cameraName}</div>
              <div className="stream-status">● SMOOTH & STABLE MODE</div>
          </div>
          <div className="viewport">
              <img ref={imgRef} className="video-feed" alt="feed"/>
              <canvas ref={canvasRef} width={854} height={480} className="overlay-canvas" />
              {!isPlaying && <div className="standby-overlay"><p>SẴN SÀNG</p></div>}
          </div>
          <div className="controls-bar">
             <label className="file-input-label">📂 {fileName || "CHỌN VIDEO"}<input type="file" onChange={uploadVideo} style={{display:'none'}}/></label>
             <div className="btns">
                 {!isPlaying ? <button className="btn-go" onClick={handleStart}>BẮT ĐẦU</button> : <button className="btn-stop" onClick={handleStop}>DỪNG LẠI</button>}
             </div>
          </div>
      </div>

      <div className="data-sidebar">
          <div className="sidebar-block traffic-block">
              <div className="traffic-lights-visual">
                  <div className={`bulb red ${systemState !== 'TRIGGERED' ? 'active-red' : ''}`}></div>
                  <div className="bulb yellow"></div>
                  <div className={`bulb green ${systemState === 'TRIGGERED' ? 'active-green' : ''}`}></div>
              </div>
              <div className="status-text">{systemState === 'TRIGGERED' ? <span className="txt-open">ƯU TIÊN: ĐÈN XANH</span> : "BÌNH THƯỜNG: ĐÈN ĐỎ"}</div>
          </div>

          <div className={`sidebar-block stats-block ${systemState === 'TRIGGERED' ? 'stats-active' : ''}`}>
              <div className="block-header">PHÂN TÍCH ĐỐI TƯỢNG</div>
              {systemState === 'TRIGGERED' && activeVehicle ? (
                  <div className="stats-content">
                      <div className="vehicle-icon" style={{color: activeVehicle.color}}>{activeVehicle.icon}</div>
                      <div className="vehicle-name" style={{color: activeVehicle.color}}>{activeVehicle.name}</div>
                      <div className="plate-box">ID: {activeVehicle.id}</div>
                      <div className="conf-display">ĐỘ TIN CẬY: <span className="highlight">{activeVehicle.conf}%</span></div>
                  </div>
              ) : <div className="scanning"><div className="radar-circle"></div><p>Đang quét...</p></div>}
          </div>

          <div className="sidebar-block logs-block">
              <div className="block-header">LỊCH SỬ NHẬN DIỆN</div>
              <div className="logs-list">
                  {analysisLogs.map(log => (
                      <div key={log.id} className="log-row">
                          <span className="l-time">{log.time}</span>
                          <span className="l-plate">{log.plate}</span>
                          <span className="l-type" style={{color: log.type === 'CỨU THƯƠNG' ? '#ef4444' : log.type === 'CẢNH SÁT' ? '#3b82f6' : '#fff'}}>{log.type}</span>
                      </div>
                  ))}
              </div>
          </div>
      </div>
    </div>
  );
}