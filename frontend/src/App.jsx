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
                  title="Tốc độ xử lý"
                  value={`${stats.fps} FPS`}
                  subValue={stats.fps > 20 ? "Ổn định" : "Thấp"}
                  subColor={stats.fps > 20 ? "green" : "red"}
                />
                <StatsCard
                  title="Xe ưu tiên hôm nay"
                  value={stats.priorityCount}
                  subValue="Cảnh báo"
                  subColor="red"
                  icon="priority_high"
                />
                <StatsCard
                  title="Độ trễ xử lý"
                  value={`${stats.latency}ms`}
                  subValue={stats.latency < 100 ? "Tốt" : "Cao"}
                  subColor={stats.latency < 100 ? "green" : "orange"}
                  icon="timer"
                />
                <StatsCard
                  title="Camera hoạt động"
                  value={`${stats.activeCameras}/1`}
                  icon="videocam"
                  subColor="green"
                  subValue="Online"
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
