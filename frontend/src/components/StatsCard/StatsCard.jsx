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
      <span className="stats-label">{title}</span>
      <div className="stats-body">
        <span className="stats-value">{value}</span>
        {icon ? (
          <span
            className="material-symbols-outlined"
            style={{ color: getColor(subColor) }}
          >
            {icon}
          </span>
        ) : (
          <span className="stats-sub" style={{ color: getColor(subColor) }}>
            {subValue}
          </span>
        )}
      </div>
    </div>
  );
}
