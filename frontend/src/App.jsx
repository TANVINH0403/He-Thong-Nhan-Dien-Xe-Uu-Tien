import React, { useState } from "react";
import "./App.css";

// Import các components
import Header from "./components/Header/Header.jsx";
import Sidebar from "./components/Sidebar/Sidebar.jsx";
import StatsCard from "./components/StatsCard/StatsCard.jsx";
import VideoPlayer from "./components/VideoPlayer/VideoPlayer.jsx";
import Analytics from "./components/Analytics/Analytics.jsx"; // Mới
import Settings from "./components/Settings/Settings.jsx"; // Mới

function App() {
  // State để quản lý trang đang xem ('live', 'analytics', 'config')
  const [activePage, setActivePage] = useState("live");

  // State thống kê
  const [stats, setStats] = useState({
    fps: 0,
    priorityCount: 0,
    latency: 0,
    activeCameras: 1,
  });

  // State danh sách xe ưu tiên phát hiện
  const [recentDetections, setRecentDetections] = useState([]);

  // Hàm thêm detection mới (callback từ VideoPlayer)
  const handleNewDetection = (detection) => {
    setRecentDetections((prev) => {
      // Giữ lại 50 item mới nhất
      const newList = [...prev, detection];
      if (newList.length > 50) return newList.slice(newList.length - 50);
      return newList;
    });

    // Cập nhật thống kê số lượng
    setStats(prev => ({
      ...prev,
      priorityCount: prev.priorityCount + 1
    }));
  };

  // Hàm cập nhật stats khác (fps, latency)
  const handleStatsUpdate = (newStats) => {
    setStats(prev => ({
      ...prev,
      ...newStats
    }));
  };

  return (
    <div className="app-layout">
      {/* Truyền hàm setActivePage xuống Header để bắt sự kiện click */}
      <Header onNavigate={setActivePage} activePage={activePage} />

      <main className="main-wrapper">
        {/* TRƯỜNG HỢP 1: Trang Giám sát trực tiếp (Mặc định) */}
        {activePage === "live" && (
          <>
            <div className="content-area">
              <div className="stats-grid">
                <StatsCard
                  title="TỐC ĐỘ"
                  value={stats.fps}
                  subColor={stats.fps > 20 ? "green" : "red"}
                />
                <StatsCard
                  title="ƯU TIÊN"
                  value={stats.priorityCount}
                  subColor="red"
                />
                <StatsCard
                  title="ĐỘ TRỄ"
                  value={`${stats.latency}ms`}
                  subColor={stats.latency < 100 ? "green" : "orange"}
                />
                <StatsCard
                  title="HOẠT ĐỘNG"
                  value={`${stats.activeCameras}/1`}
                  subColor="green"
                />
              </div>
              <VideoPlayer
                onNewDetection={handleNewDetection}
                onStatsUpdate={handleStatsUpdate}
              />
            </div>
            {/* Sidebar chỉ hiện ở trang Live */}
            <Sidebar detections={recentDetections} />
          </>
        )}

        {/* TRƯỜNG HỢP 2: Trang Phân tích */}
        {activePage === "analytics" && <Analytics />}

        {/* TRƯỜNG HỢP 3: Trang Cấu hình */}
        {activePage === "config" && <Settings />}
      </main>
    </div>
  );
}

export default App;
