import { useRef, useEffect, useState } from "react";
import { io } from "socket.io-client";
import "./VideoPlayer.css";

const API_URL = "http://127.0.0.1:8000";

// --- CẤU HÌNH ---
const KEEP_THRESHOLD = 0.50;
const MAX_STICKY_FRAMES = 10;
const TRACKING_DIST = 150;
const MIN_BOX_SIZE = 20000;

const getVehicleInfo = (label, conf, width, height) => {
    if (!label) return null;
    const l = label.toLowerCase();
    const ratio = width / height;

    if (l.includes("cuu thuong") || l.includes("ambu")) {
        if (conf < 0.96) return null;
        return { name: "CỨU THƯƠNG", icon: "🚑", color: "#ef4444", type: "AMB" };
    }
    if (l.includes("cuu hoa") || l.includes("fire")) {
        if (conf < 0.90) return null;
        return { name: "CỨU HỎA", icon: "🚒", color: "#f97316", type: "FIR" };
    }
    if (l.includes("canh sat") || l.includes("police")) {
        if (ratio < 1.0) return null;
        if (conf < 0.92) return null;
        return { name: "CẢNH SÁT", icon: "🚓", color: "#3b82f6", type: "POL" };
    }
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
  const [selectedVideo, setSelectedVideo] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);

  const activeTracksRef = useRef([]);
  const processedIdsRef = useRef(new Set());
  const idCounterRef = useRef(1000);

  // Tải danh sách video VÀ tải ảnh Preview ngay lập tức
  const fetchVideos = async () => {
    try {
        const res = await fetch(`${API_URL}/api/list-videos`);
        const data = await res.json();
        if (data.videos && data.videos.length > 0) {
            const firstVideo = data.videos[0];
            setSelectedVideo(firstVideo);

            // Gọi API lấy ảnh Preview
            if(imgRef.current) {
                imgRef.current.src = `${API_URL}/api/video-preview/${encodeURIComponent(firstVideo)}`;
            }
        }
    } catch(e) { console.error(e); }
  };

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

    const candidates = rawBoxes.filter(b => {
        const w = b.x2 - b.x1;
        const h = b.y2 - b.y1;
        const area = w * h;
        if (area < MIN_BOX_SIZE) return false;
        const info = getVehicleInfo(b.label, b.conf, w, h);
        return info !== null;
    });

    const usedIndices = new Set();
    const nextTracks = [];

    currentTracks.forEach(track => {
        let bestIdx = -1;
        let minDist = TRACKING_DIST;

        candidates.forEach((box, idx) => {
            if (usedIndices.has(idx)) return;
            const w = box.x2 - box.x1;
            const h = box.y2 - box.y1;
            const infoBox = getVehicleInfo(box.label, box.conf, w, h);
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
      // Khi socket gửi về thì mới update hình động
      if (imgRef.current) imgRef.current.src = "data:image/jpeg;base64," + data.image;
      processTracking(data.boxes || []);
      if (canvasRef.current) drawAndAnalyze();
    });

    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchHistory();
    fetchVideos(); // Lấy video và hiển thị ảnh bìa
    return () => socketRef.current?.disconnect();
  }, []);

  const handleStart = async () => {
    if(!selectedVideo) return alert("Hệ thống chưa tìm thấy video trong folder uploads!");

    setIsPlaying(true);
    activeTracksRef.current = [];
    await fetch(`${API_URL}/start-ai/${encodeURIComponent(selectedVideo)}`, { method: "POST" });
  };

  const handleStop = async () => {
    await fetch(`${API_URL}/stop-ai`, { method: "POST" });
    setIsPlaying(false);
    setActiveVehicle(null);
    setSystemState("MONITORING");
    activeTracksRef.current = [];

    // Clear canvas
    const ctx = canvasRef.current?.getContext("2d");
    if(ctx) ctx.clearRect(0, 0, 854, 480);

    // Khi dừng lại, load lại ảnh bìa ban đầu (để không bị đen màn hình)
    if(imgRef.current && selectedVideo) {
        imgRef.current.src = `${API_URL}/api/video-preview/${encodeURIComponent(selectedVideo)}`;
    }
  };

  return (
    <div className="its-container">
      <div className={`monitor-section ${systemState === 'TRIGGERED' ? 'alert-border' : ''}`}>
          <div className="section-header">
              <div className="cam-info">📹 {cameraName}</div>
              <div className="stream-status">● SYSTEM READY</div>
          </div>

          <div className="viewport">
              {/* LUÔN HIỂN THỊ ẢNH (Ban đầu là ảnh tĩnh từ API, sau là ảnh động từ Socket) */}
              <img ref={imgRef} className="video-feed" alt="feed" style={{display: 'block'}}/>
              <canvas ref={canvasRef} width={854} height={480} className="overlay-canvas" />
          </div>

          <div className="controls-bar" style={{justifyContent: 'center', padding: '15px', background: 'transparent'}}>
             <div className="btns">
                 {!isPlaying ? (
                    <button onClick={handleStart} style={{
                        padding: '10px 25px',
                        fontSize: '14px',
                        borderRadius: '20px',
                        background: 'linear-gradient(90deg, #3b82f6, #2563eb)',
                        color: 'white',
                        border: 'none',
                        fontWeight: '600',
                        cursor: 'pointer',
                        boxShadow: '0 4px 10px rgba(37, 99, 235, 0.3)',
                        transition: 'all 0.2s ease',
                        display: 'flex', alignItems: 'center', gap: '8px'
                    }} onMouseOver={e => e.currentTarget.style.transform = 'scale(1.05)'}
                       onMouseOut={e => e.currentTarget.style.transform = 'scale(1.0)'}>
                        <span>▶</span> BẮT ĐẦU
                    </button>
                 ) : (
                    <button onClick={handleStop} style={{
                        padding: '10px 25px',
                        fontSize: '14px',
                        borderRadius: '20px',
                        background: 'linear-gradient(90deg, #ef4444, #dc2626)',
                        color: 'white',
                        border: 'none',
                        fontWeight: '600',
                        cursor: 'pointer',
                        boxShadow: '0 4px 10px rgba(239, 68, 68, 0.3)',
                        transition: 'all 0.2s ease',
                        display: 'flex', alignItems: 'center', gap: '8px'
                    }} onMouseOver={e => e.currentTarget.style.transform = 'scale(1.05)'}
                       onMouseOut={e => e.currentTarget.style.transform = 'scale(1.0)'}>
                        <span>⏹</span> DỪNG LẠI
                    </button>
                 )}
             </div>
          </div>
      </div>

      {/* CỘT PHẢI GIỮ NGUYÊN */}
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