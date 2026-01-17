import React, { useState } from "react";
import "./Sidebar.css";
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
        bgSoft: "rgba(239, 68, 68, 0.1)",
        icon: "local_hospital",
        tag: "KHẨN CẤP"
      };
    } else if (c.includes("fire")) {
      return {
        label: "Xe Cứu Hỏa",
        colorVar: "var(--warning-orange)",
        bgSoft: "rgba(245, 158, 11, 0.1)",
        icon: "fire_truck",
        tag: "ƯU TIÊN"
      };
    } else if (c.includes("police")) {
      return {
        label: "Xe Cảnh Sát",
        colorVar: "var(--primary)",
        bgSoft: "rgba(59, 130, 246, 0.1)",
        icon: "local_police",
        tag: "CẢNH SÁT"
      };
    }
    return {
      label: "Xe Ưu Tiên",
      colorVar: "var(--text-muted)",
      bgSoft: "rgba(0,0,0,0.05)",
      icon: "warning",
      tag: "KHÁC"
    };
  };

  const info = activeDetection ? getClassInfo(activeDetection.class) : {};

  return (
    <aside className="sidebar">
      <div className="subheader" style={{ marginBottom: '16px' }}>
        <span className="sub-text">THÔNG TIN NHẬN DIỆN</span>
        <span className="live-tag">● LIVE</span>
      </div>

      <div style={{ flex: 1, padding: '0 20px 20px 20px', display: 'flex', flexDirection: 'column' }}>
        {activeDetection ? (
          <div style={{
            background: 'var(--bg-main)',
            borderRadius: '16px',
            padding: '24px',
            border: `1px solid ${info.colorVar}`,
            boxShadow: `0 10px 30px -10px ${info.bgSoft}`
          }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px', paddingBottom: '20px', borderBottom: '1px solid var(--border-color)' }}>
              <div style={{
                width: '64px', height: '64px',
                borderRadius: '16px',
                background: info.bgSoft,
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: '32px', color: info.colorVar }}>
                  {info.icon}
                </span>
              </div>
              <div>
                <span style={{
                  background: info.colorVar, color: 'white',
                  padding: '4px 12px', borderRadius: '100px',
                  fontSize: '11px', fontWeight: 700
                }}>{info.tag}</span>
                <h2 style={{ margin: '8px 0 0 0', fontSize: '20px', color: 'var(--text-main)', fontWeight: 800 }}>
                  {info.label}
                </h2>
                <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                  ID: {activeDetection.vehicle_id}
                </p>
              </div>
            </div>

            {/* Details Grid */}
            <div style={{ display: 'grid', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ background: 'var(--bg-surface)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                  <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>ĐỘ TIN CẬY</p>
                  <p style={{ fontSize: '24px', fontWeight: 800, color: info.colorVar }}>
                    {(activeDetection.score * 100).toFixed(1)}%
                  </p>
                </div>
                <div style={{ background: 'var(--bg-surface)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                  <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>TRẠNG THÁI</p>
                  <p style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-main)' }}>
                    {activeDetection.direction || "Di chuyển"}
                  </p>
                </div>
              </div>

              <div style={{ background: 'var(--bg-surface)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>THỜI GIAN PHÁT HIỆN</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'var(--text-muted)' }}>schedule</span>
                  <p style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-main)' }}>
                    {activeDetection.time}
                  </p>
                </div>
              </div>

              <div style={{
                marginTop: '8px', padding: '16px', borderRadius: '12px',
                background: info.bgSoft, border: `1px solid ${info.colorVar}30`,
                display: 'flex', gap: '12px'
              }}>
                <span className="material-symbols-outlined" style={{ color: info.colorVar }}>warning</span>
                <div>
                  <p style={{ fontSize: '13px', fontWeight: 700, color: info.colorVar, marginBottom: '4px' }}>CẢNH BÁO TỰ ĐỘNG</p>
                  <p style={{ fontSize: '12px', color: 'var(--text-main)', opacity: 0.8 }}>Hệ thống đã tự động ghi nhận và gửi thông báo đến trung tâm điều khiển.</p>
                </div>
              </div>
            </div>

          </div>
        ) : (
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            color: 'var(--text-muted)', opacity: 0.6
          }}>
            <div style={{ position: 'relative', width: '80px', height: '80px', marginBottom: '24px' }}>
              <div style={{ position: 'absolute', inset: 0, border: '4px solid var(--border-color)', borderRadius: '50%' }}></div>
              <div style={{ position: 'absolute', inset: 0, border: '4px solid var(--primary)', borderRadius: '50%', borderTopColor: 'transparent', animation: 'spin 2s linear infinite' }}></div>
              <span className="material-symbols-outlined" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: '32px' }}>radar</span>
            </div>
            <h3 style={{ fontSize: '16px', marginBottom: '8px' }}>ĐANG QUÉT TÍN HIỆU...</h3>
            <p style={{ fontSize: '13px', textAlign: 'center', maxWidth: '200px' }}>
              Hệ thống đang giám sát camera thời gian thực để phát hiện xe ưu tiên.
            </p>
          </div>
        )}
      </div>

      {/* Add spin animation locally for now */}
      <style>{`
        @keyframes spin { 
            0% { transform: rotate(0deg); } 
            100% { transform: rotate(360deg); } 
        }
      `}</style>
    </aside>
  );
}
