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
                  value="62 FPS"
                  subValue="+5%"
                  subColor="green"
                />
                <StatsCard
                  title="Xe ưu tiên hôm nay"
                  value="142"
                  subValue="Cảnh báo"
                  subColor="red"
                />
                <StatsCard
                  title="Độ trễ mạng"
                  value="8ms"
                  subValue="Tốt"
                  subColor="green"
                />
                <StatsCard
                  title="Camera hoạt động"
                  value="24/24"
                  icon="check_circle"
                  subColor="green"
                />
              </div>
              <VideoPlayer />
            </div>
            {/* Sidebar chỉ hiện ở trang Live */}
            <Sidebar />
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
