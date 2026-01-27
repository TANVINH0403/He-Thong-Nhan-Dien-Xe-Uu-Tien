import { useRef, useEffect, useState } from "react";
import { io } from "socket.io-client";
import "./VideoPlayer.css";

const API_URL = "http://127.0.0.1:8000";

// --- CẤU HÌNH "BÀN TAY SẮT" ---
const KEEP_THRESHOLD = 0.50;
const MAX_STICKY_FRAMES = 10;
const TRACKING_DIST = 150;

// [TĂNG GẤP 3] Loại bỏ tất cả vật thể nhỏ/xa. Xe ưu tiên phải đi tới gần mới tính.
const MIN_BOX_SIZE = 20000;

// --- BỘ LỌC HÌNH DÁNG & ĐỘ TIN CẬY ---
const getVehicleInfo = (label, conf, width, height) => {
    if (!label) return null;
    const l = label.toLowerCase();

    // Tỷ lệ khung hình = Rộng / Cao
    // Xe máy/Người đi bộ: Cao > Rộng (Ratio < 0.8)
    // Ô tô: Rộng > Cao (Ratio > 1.0)
    const ratio = width / height;

    // 1. XE CỨU THƯƠNG
    // Khắc phục lỗi xe trắng 7 chỗ (93%) -> Tăng lên 0.96
    if (l.includes("cuu thuong") || l.includes("ambu")) {
        // Nếu khung hình quá dẹt hoặc quá cao -> Bỏ qua
        if (conf < 0.96) return null;
        return { name: "CỨU THƯƠNG", icon: "🚑", color: "#ef4444", type: "AMB" };
    }

    // 2. XE CỨU HỎA
    if (l.includes("cuu hoa") || l.includes("fire")) {
        if (conf < 0.90) return null;
        return { name: "CỨU HỎA", icon: "🚒", color: "#f97316", type: "FIR" };
    }

    // 3. XE CẢNH SÁT (QUAN TRỌNG: DIỆT XE MÁY)
    if (l.includes("canh sat") || l.includes("police")) {
        // [LUẬT MỚI]: Xe cảnh sát không bao giờ Cao hơn Rộng.
        // Nếu ratio < 1.0 (Dáng đứng/Dáng xe máy) -> VỨT BỎ NGAY LẬP TỨC
        if (ratio < 1.0) return null;

        if (conf < 0.92) return null;
        return { name: "CẢNH SÁT", icon: "🚓", color: "#3b82f6", type: "POL" };
    }

    // 4. XE QUÂN ĐỘI
    if (l.includes("quan doi") || l.includes("army")) {
        if (conf < 0.90) return null;
        return { name: "XE QUÂN ĐỘI", icon: "🪖", color: "#166534", type: "MIL" };
    }

    return null;
};

const getDistance = (p1, p2) => Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));

export default function SmartVideoPlayer({ config }) {
  const { cameraName } = config || { cameraName: "CAM-01" };
  const imgRef = useRef(null);
  const canvasRef = useRef(null);
  const socketRef = useRef(null);

  const [activeVehicle, setActiveVehicle] = useState(null);
  const [systemState, setSystemState] = useState("MONITORING");
  const [analysisLogs, setAnalysisLogs] = useState([]);

  const [videoId, setVideoId] = useState(null);
  const [fileName, setFileName] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);

  const activeTracksRef = useRef([]);
  const processedIdsRef = useRef(new Set());
  const idCounterRef = useRef(1000);

  const fetchHistory = async () => {
      try {
          const res = await fetch(`${API_URL}/api/history`);
          if(!res.ok) return;
          const data = await res.json();
          setAnalysisLogs(data.map(d => ({
              id: d.id, time: d.time, plate: d.plate, type: d.type, conf: `${Math.round(d.conf * 100)}%`
          })));
          const ids = new Set(data.map(d => d.plate));
          processedIdsRef.current = ids;
      // eslint-disable-next-line no-unused-vars
      } catch (e) { /* empty */ }
  };

  const processTracking = (rawBoxes) => {
    const currentTracks = activeTracksRef.current;

    // --- BỘ LỌC ĐẦU VÀO (SIÊU CẤP) ---
    const candidates = rawBoxes.filter(b => {
        const w = b.x2 - b.x1;
        const h = b.y2 - b.y1;
        const area = w * h;

        // 1. Lọc kích thước: Tăng lên 20000 để loại bỏ xe ở xa/nhỏ
        if (area < MIN_BOX_SIZE) return false;

        // 2. Lọc thông minh (Truyền cả Chiều rộng/Chiều cao vào để check dáng xe)
        const info = getVehicleInfo(b.label, b.conf, w, h);
        return info !== null;
    });

    const usedIndices = new Set();
    const nextTracks = [];

    // A. Update xe cũ
    currentTracks.forEach(track => {
        let bestIdx = -1;
        let minDist = TRACKING_DIST;

        candidates.forEach((box, idx) => {
            if (usedIndices.has(idx)) return;

            // Lấy thông tin để so khớp
            const w = box.x2 - box.x1;
            const h = box.y2 - box.y1;
            const infoBox = getVehicleInfo(box.label, box.conf, w, h);

            // Lấy info track cũ (giả lập w,h để bypass check)
            const infoTrack = getVehicleInfo(track.label, 1.0, 100, 50);

            if (infoBox && infoTrack && infoBox.type === infoTrack.type) {
                const dist = getDistance({x: track.x, y: track.y}, {x: (box.x1+box.x2)/2, y: (box.y1+box.y2)/2});
                if (dist < minDist) {
                    minDist = dist;
                    bestIdx = idx;
                }
            }
        });

        if (bestIdx !== -1) {
            const box = candidates[bestIdx];
            usedIndices.add(bestIdx);
            nextTracks.push({
                ...track,
                x: (box.x1 + box.x2) / 2, y: (box.y1 + box.y2) / 2,
                box: box, conf: box.conf, stickyCount: 0
            });
        } else {
            if (track.stickyCount < MAX_STICKY_FRAMES) {
                nextTracks.push({ ...track, stickyCount: track.stickyCount + 1 });
            }
        }
    });

    // B. Thêm xe mới
    candidates.forEach((box, idx) => {
        if (!usedIndices.has(idx)) {
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

  const drawAndAnalyze = () => {
    const tracks = activeTracksRef.current;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, 854, 480);

    let priority = null;

    tracks.forEach(t => {
        if (!t.box) return;
        const w = t.box.x2 - t.box.x1;
        const h = t.box.y2 - t.box.y1;

        // Check lần cuối khi vẽ
        const info = getVehicleInfo(t.label, t.conf, w, h);
        if(!info) return;

        const { x1, y1, x2, y2 } = t.box;

        ctx.lineWidth = 3; ctx.strokeStyle = info.color; ctx.setLineDash([]);
        ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);

        ctx.fillStyle = info.color;
        const label = `${info.name} [${t.id}]`;
        const txtW = ctx.measureText(label).width + 20;
        ctx.fillRect(x1, y1 - 30, txtW, 30);
        ctx.fillStyle = "#fff"; ctx.font = "bold 13px sans-serif";
        ctx.fillText(label, x1 + 10, y1 - 10);

        if (t.stickyCount === 0) {
            if (!priority || t.conf > priority.conf) priority = { ...t, info };

            if (!processedIdsRef.current.has(t.id)) {
                const timeStr = new Date().toLocaleString('vi-VN');
                const logItem = { vehicle_type: info.name, plate_id: t.id, confidence: t.conf };

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

    if (priority) {
        setSystemState("TRIGGERED");
        setActiveVehicle({ ...priority.info, id: priority.id, conf: Math.round(priority.conf*100) });
    } else {
        if (tracks.length === 0) {
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
    if(!videoId && !config?.streamUrl) return alert("Chưa chọn video!");
    activeTracksRef.current = [];
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
      {/* GIAO DIỆN GIỮ NGUYÊN */}
      <div className={`monitor-section ${systemState === 'TRIGGERED' ? 'alert-border' : ''}`}>
          <div className="section-header">
              <div className="cam-info">📹 {cameraName}</div>
              <div className="stream-status">● GEOMETRIC FILTER MODE</div>
          </div>
          <div className="viewport">
              <img ref={imgRef} className="video-feed" alt="feed"/>
              <canvas ref={canvasRef} width={854} height={480} className="overlay-canvas" />
              {!isPlaying && <div className="standby-overlay"><p>HỆ THỐNG SẴN SÀNG</p></div>}
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