import React from "react";
import "./Sidebar.css";

export default function Sidebar({ detections = [] }) {
  // Get the latest detection (last item in the list)
  const activeDetection = detections.length > 0 ? detections[detections.length - 1] : null;

  const getClassInfo = (cls) => {
    if (!cls) return {};
    const c = cls.toLowerCase();
    if (c.includes("ambulance")) {
      return {
        label: "Xe Cứu Thương",
        colorVar: "var(--emergency-red)",
        bgSoft: "rgba(239, 68, 68, 0.08)",
        icon: "local_hospital",
        tag: "KHẨN CẤP"
      };
    } else if (c.includes("fire")) {
      return {
        label: "Xe Cứu Hỏa",
        colorVar: "var(--warning-orange)",
        bgSoft: "rgba(245, 158, 11, 0.08)",
        icon: "fire_truck",
        tag: "ƯU TIÊN"
      };
    } else if (c.includes("police")) {
      return {
        label: "Xe Cảnh Sát",
        colorVar: "var(--primary)",
        bgSoft: "rgba(79, 70, 229, 0.08)",
        icon: "local_police",
        tag: "CẢNH SÁT"
      };
    }
    return {
      label: "Xe Ưu Tiên",
      colorVar: "var(--text-muted)",
      bgSoft: "rgba(0,0,0,0.03)",
      icon: "warning",
      tag: "KHÁC"
    };
  };

  const info = activeDetection ? getClassInfo(activeDetection.class) : {};

  return (
    <aside className="sidebar">
      <div className="subheader">
        <span className="sub-text">NHẬN DIỆN TRỰC TIẾP</span>
        <span className="live-tag">TRỰC TIẾP</span>
      </div>

      <div style={{ flex: 1, padding: '0 32px 32px 32px', display: 'flex', flexDirection: 'column' }}>
        {activeDetection ? (
          <div className={`active-panel ${info.tag === "KHẨN CẤP" ? "emergency-alert" : ""}`} style={{ padding: '32px', border: `1px solid ${info.colorVar}20` }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '32px' }}>
              <div style={{
                width: '64px', height: '64px',
                borderRadius: '18px',
                background: info.bgSoft,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: `0 8px 20px ${info.bgSoft}`
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: '32px', color: info.colorVar }}>
                  {info.icon}
                </span>
              </div>
              <div>
                <span style={{
                  background: info.colorVar, color: 'white',
                  padding: '4px 12px', borderRadius: '8px',
                  fontSize: '11px', fontWeight: 800,
                  textTransform: 'uppercase',
                  boxShadow: `0 4px 10px ${info.bgSoft}`
                }}>{info.tag}</span>
                <h2 style={{ margin: '8px 0 0 0', fontSize: '22px', color: 'var(--text-bright)', fontWeight: 800 }}>
                  {info.label}
                </h2>
                <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-muted)', fontWeight: 600 }}>
                  MÃ NÚT GIAO THÔNG: {activeDetection.vehicle_id}
                </p>
              </div>
            </div>

            {/* Details Grid */}
            <div style={{ display: 'grid', gap: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div style={{ background: 'var(--bg-base)', padding: '20px', borderRadius: '16px', border: '1px solid var(--border-subtle)' }}>
                  <p style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>ĐỘ TIN CẬY</p>
                  <p style={{ fontSize: '24px', fontWeight: 800, color: info.colorVar }}>
                    {(activeDetection.score * 100).toFixed(1)}%
                  </p>
                </div>
                <div style={{ background: 'var(--bg-base)', padding: '20px', borderRadius: '16px', border: '1px solid var(--border-subtle)' }}>
                  <p style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>TRẠNG THÁI</p>
                  <p style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-main)' }}>
                    {activeDetection.direction || "ĐÃ PHÁT HIỆN"}
                  </p>
                </div>
              </div>

              <div style={{ background: 'var(--bg-base)', padding: '20px', borderRadius: '16px', border: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>THỜI GIAN ĐẾN</p>
                  <p style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-main)' }}>
                    {activeDetection.time}
                  </p>
                </div>
                <span className="material-symbols-outlined" style={{ color: 'var(--text-muted)', opacity: 0.5 }}>schedule</span>
              </div>

              <div style={{
                marginTop: '12px', padding: '20px', borderRadius: '16px',
                background: info.bgSoft, border: `1px solid ${info.colorVar}15`,
                display: 'flex', gap: '16px'
              }}>
                <span className="material-symbols-outlined" style={{ color: info.colorVar }}>verified_user</span>
                <div>
                  <p style={{ fontSize: '12px', fontWeight: 800, color: info.colorVar, marginBottom: '4px' }}>HỆ THỐNG XÁC THỰC</p>
                  <p style={{ fontSize: '13px', color: 'var(--text-main)', opacity: 0.7, lineHeight: '1.5' }}>
                    Xe ưu tiên đã được xác minh. Các nút giao thông đã được thông báo để ưu tiên làn đường.
                  </p>
                </div>
              </div>
            </div>

          </div>
        ) : (
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            color: 'var(--text-muted)', background: 'white',
            borderRadius: '24px', border: '2px dashed var(--border-subtle)',
            margin: '0 8px'
          }}>
            <div style={{ marginBottom: '32px', position: 'relative' }}>
              <div style={{
                width: '80px', height: '80px',
                borderRadius: '50%', border: '2px solid var(--primary)',
                borderTopColor: 'transparent',
                animation: 'spin 2s linear infinite'
              }}></div>
              <span className="material-symbols-outlined" style={{
                position: 'absolute', top: '50%', left: '50%',
                transform: 'translate(-50%, -50%)',
                fontSize: '32px', color: 'var(--primary)'
              }}>radar</span>
            </div>
            <h3 style={{ fontSize: '16px', marginBottom: '8px', fontWeight: 800, color: 'var(--text-main)' }}>ĐANG QUÉT HỆ THỐNG</h3>
            <p style={{ fontSize: '13px', textAlign: 'center', maxWidth: '240px', lineHeight: '1.6' }}>
              Đang theo dõi các nguồn camera để phát hiện tín hiệu xe ưu tiên...
            </p>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { 
            0% { transform: rotate(0deg); } 
            100% { transform: rotate(360deg); } 
        }
      `}</style>
    </aside>
  );
}
