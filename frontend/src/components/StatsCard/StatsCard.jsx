import React from "react";
import "./StatsCard.css";

export default function StatsCard({ title, value, subValue, subColor, icon }) {
  const getColor = (c) => {
    if (c === "green") return "var(--success-green)";
    if (c === "red") return "var(--emergency-red)";
    return "var(--text-muted)";
  };

  return (
    <div className="stats-card">
      <div className="stats-body" style={{ flexDirection: 'column', gap: '4px' }}>
        <span className="stats-value">{value}</span>
        <span className="stats-label" style={{
          fontSize: '10px',
          fontWeight: 800,
          color: 'var(--text-muted)',
          opacity: 0.6,
          letterSpacing: '1px'
        }}>{title}</span>
      </div>
    </div>
  );
}
