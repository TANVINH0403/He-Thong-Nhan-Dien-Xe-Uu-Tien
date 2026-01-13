import React, { useState } from "react";
import "./Sidebar.css";

export default function Sidebar() {
  // 1. Tạo state để lưu tab đang chọn
  const [activeTab, setActiveTab] = useState("list"); // 'list', 'history', 'alert'

  // Hàm xử lý khi click nút "Chi tiết"
  const handleViewDetail = (id) => {
    alert(`Đang mở thông tin chi tiết cho xe ID: ${id}`);
  };

  return (
    <aside className="sidebar">
      <div className="tabs">
        <button
          className={`tab-btn ${activeTab === "list" ? "active" : ""}`}
          onClick={() => setActiveTab("list")}
        >
          Danh sách nhận diện
        </button>
        <button
          className={`tab-btn ${activeTab === "history" ? "active" : ""}`}
          onClick={() => setActiveTab("history")}
        >
          Lịch sử
        </button>
        <button
          className={`tab-btn ${activeTab === "alert" ? "active" : ""}`}
          onClick={() => setActiveTab("alert")}
        >
          Cảnh báo
        </button>
      </div>

      <div className="subheader">
        <span className="sub-text">Phát hiện gần đây</span>
        <span className="live-tag">● TRỰC TIẾP</span>
      </div>

      <div className="list">
        {/* Nội dung thay đổi dựa theo Tab (Ở đây mình demo Tab Danh sách) */}
        {activeTab === "list" && (
          <>
            {/* Item 1 */}
            <div
              className="item item-red"
              onClick={() => handleViewDetail("#AMB-442")}
            >
              <div className="item-top">
                <div className="item-icon red-bg-soft">
                  <span className="material-symbols-outlined red-text">
                    local_hospital
                  </span>
                </div>
                <div className="item-content">
                  <h4 className="item-title red-text">Xe Cứu Thương</h4>
                  <p className="item-id">ID: #AMB-442</p>
                </div>
                <span className="time">10:24:12</span>
              </div>
              <div className="item-bot">
                <span className="tag red-bg">KHẨN CẤP</span>
                <span className="conf">98.4%</span>
                <button
                  className="link red-text"
                  onClick={(e) => {
                    e.stopPropagation(); // Ngăn click lan ra ngoài
                    handleViewDetail("#AMB-442");
                  }}
                >
                  CHI TIẾT
                </button>
              </div>
            </div>

            {/* Item 2 */}
            <div
              className="item item-orange"
              onClick={() => handleViewDetail("#FIR-901")}
            >
              <div className="item-top">
                <div className="item-icon orange-bg-soft">
                  <span className="material-symbols-outlined orange-text">
                    fire_truck
                  </span>
                </div>
                <div className="item-content">
                  <h4 className="item-title orange-text">Xe Cứu Hỏa</h4>
                  <p className="item-id">ID: #FIR-901</p>
                </div>
                <span className="time">10:22:58</span>
              </div>
              <div className="item-bot">
                <span className="tag orange-bg">ƯU TIÊN</span>
                <span className="conf">92.1%</span>
                <button
                  className="link orange-text"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleViewDetail("#FIR-901");
                  }}
                >
                  CHI TIẾT
                </button>
              </div>
            </div>
          </>
        )}

        {/* Nội dung giả cho các tab khác */}
        {activeTab === "history" && (
          <div style={{ padding: 20, textAlign: "center", color: "#64748b" }}>
            Chưa có lịch sử nào.
          </div>
        )}
        {activeTab === "alert" && (
          <div style={{ padding: 20, textAlign: "center", color: "#ef4444" }}>
            Không có cảnh báo mới.
          </div>
        )}
      </div>

      <div className="sidebar-footer">
        <div className="disk-head">
          <span>Dung lượng ổ đĩa</span>
          <span className="disk-val">4.2 TB / 10 TB</span>
        </div>
        <div className="disk-track">
          <div className="disk-fill"></div>
        </div>
      </div>
    </aside>
  );
}
