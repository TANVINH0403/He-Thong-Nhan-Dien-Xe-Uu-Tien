import React from "react";
import "./StatsCard.css";

export default function StatsCard({ title, value, subColor }) {
  const getIconInfo = (t) => {
    const title = t.toUpperCase();
    if (title.includes("TỐC ĐỘ")) return { icon: "speed", color: "var(--accent-blue)" };
    if (title.includes("ƯU TIÊN")) return { icon: "emergency", color: "var(--emergency-red)" };
    if (title.includes("ĐỘ TRỄ")) return { icon: "timer", color: "var(--warning-orange)" };
    if (title.includes("HOẠT ĐỘNG")) return { icon: "videocam", color: "var(--success-green)" };
    return { icon: "analytics", color: "var(--primary)" };
  };

  const info = getIconInfo(title);

  return (
    <div className="stats-card">
      <div className="stats-icon-wrapper" style={{ background: `${info.color}15`, color: info.color }}>
        <span className="material-symbols-outlined">{info.icon}</span>
      </div>
      <div className="stats-body">
        <span className="stats-value" style={{ color: subColor === "red" ? "var(--emergency-red)" : subColor === "green" ? "var(--success-green)" : "var(--text-bright)" }}>
          {value}
        </span>
        <span className="stats-label">{title}</span>
      </div>
    </div>
  );
}
