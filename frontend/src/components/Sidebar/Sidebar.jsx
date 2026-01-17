import React, { useState } from "react";
import "./Sidebar.css";
import Modal from "../Modal/Modal.jsx";

export default function Sidebar() {
  const [activeTab, setActiveTab] = useState("list");
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedId, setSelectedId] = useState(null);

  const handleViewDetail = (id) => {
    setSelectedId(id);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setTimeout(() => setSelectedId(null), 200);
  };

  // ... (rest of the file remains same until return) ...

  return (
    <aside className="sidebar">
      {/* Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title="Chi tiết phương tiện"
        type="info"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingBottom: '12px', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '32px', color: 'var(--primary)' }}>
              info
            </span>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>ID: {selectedId}</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>Phát hiện lúc: {new Date().toLocaleTimeString()}</p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={{ background: 'rgba(0,0,0,0.02)', padding: '12px', borderRadius: '8px' }}>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Loại xe</p>
              <p style={{ fontSize: '14px', fontWeight: 700 }}>
                {selectedId?.includes("AMB") ? "Xe Cứu Thương" : selectedId?.includes("FIR") ? "Xe Cứu Hỏa" : "Xe Ưu Tiên"}
              </p>
            </div>
            <div style={{ background: 'rgba(0,0,0,0.02)', padding: '12px', borderRadius: '8px' }}>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Độ tin cậy</p>
              <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--success-green)' }}>98.4%</p>
            </div>
            <div style={{ background: 'rgba(0,0,0,0.02)', padding: '12px', borderRadius: '8px' }}>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Hướng di chuyển</p>
              <p style={{ fontSize: '14px', fontWeight: 700 }}>Đang di chuyển</p>
            </div>
            <div style={{ background: 'rgba(0,0,0,0.02)', padding: '12px', borderRadius: '8px' }}>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Camera</p>
              <p style={{ fontSize: '14px', fontWeight: 700 }}>CAM-01</p>
            </div>
          </div>

          <div style={{ padding: '12px', background: 'rgba(239, 68, 68, 0.05)', borderRadius: '8px', marginTop: '4px', border: '1px solid rgba(239, 68, 68, 0.1)' }}>
            <p style={{ fontSize: '12px', color: 'var(--emergency-red)', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>warning</span>
              Trạng thái khẩn cấp được xác nhận.
            </p>
          </div>
        </div>
      </Modal>

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
