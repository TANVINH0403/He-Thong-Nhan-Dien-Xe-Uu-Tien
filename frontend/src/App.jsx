import React, { useState, useEffect } from "react";
import "./App.css";
import Header from "./components/Header/Header.jsx";
import VideoPlayer from "./components/VideoPlayer/VideoPlayer.jsx";
import SettingsModal from "./components/SettingsModal/SettingsModal.jsx";

const DEFAULT_CONFIG = {
  cameraName: "CAM-01: ",
  streamUrl: "",
  minConfidence: 60,
  signalThreshold: 85,
  enableOCR: true,
};

function App() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [config, setConfig] = useState(() => {
    const saved = localStorage.getItem("its_config");
    return saved ? JSON.parse(saved) : DEFAULT_CONFIG;
  });

  const [stats, setStats] = useState({
    today: 0,
    ambulance: 0,
    firetruck: 0,
    police: 0,
  });

  // 1. KHAI BÁO HÀM TRƯỚC (Move to Top)
  const fetchStats = async () => {
    try {
      const res = await fetch("http://127.0.0.1:8000/api/stats");
      if (!res.ok) return;
      const data = await res.json();
      setStats(data);
      // eslint-disable-next-line no-unused-vars
    } catch (e) {
      /* empty */
    }
  };

  const handleReset = async () => {
    if (!window.confirm("BẠN CÓ CHẮC CHẮN?")) return;
    try {
      await fetch("http://127.0.0.1:8000/api/reset-data", { method: "DELETE" });
      setStats({ today: 0, ambulance: 0, firetruck: 0, police: 0 });
      alert("✅ Đã xóa dữ liệu thành công!");
    } catch (e) {
      alert("Lỗi: " + e.message);
    }
  };

  // 2. USEEFFECT GỌI HÀM SAU
  useEffect(() => {
    localStorage.setItem("its_config", JSON.stringify(config));
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchStats(); // Lúc này hàm đã tồn tại nên không đỏ
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, [config]);

  return (
    <div className="app-layout">
      <Header onOpenSettings={() => setIsSettingsOpen(true)} stats={stats} />
      <main className="main-wrapper">
        <VideoPlayer config={config} />
      </main>
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        config={config}
        onSave={setConfig}
        onReset={handleReset}
      />
    </div>
  );
}

export default App;
