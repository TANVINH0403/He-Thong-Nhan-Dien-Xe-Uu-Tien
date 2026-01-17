import React from "react";
import "./Analytics.css";

export default function Analytics() {
  return (
    <div className="analytics-container">
      <h2 className="page-title">Báo cáo & Phân tích dữ liệu</h2>

      {/* Grid biểu đồ */}
      <div className="charts-grid">
        <div className="chart-card">
          <h3>Thống kê loại xe (7 ngày qua)</h3>
          <div className="simple-bar-chart">
            <div className="bar-group">
              <div className="bar red" style={{ height: "80%" }}></div>
              <span>Cứu thương</span>
            </div>
            <div className="bar-group">
              <div className="bar orange" style={{ height: "45%" }}></div>
              <span>Cứu hỏa</span>
            </div>
            <div className="bar-group">
              <div className="bar blue" style={{ height: "30%" }}></div>
              <span>Cảnh sát</span>
            </div>
          </div>
        </div>

        <div className="chart-card">
          <h3>Tổng quan hiệu suất</h3>
          <div className="stats-row">
            <div>
              <span className="big-num">1,240</span>
              <span className="label">Lượt phát hiện</span>
            </div>
            <div>
              <span className="big-num success">98.5%</span>
              <span className="label">Độ chính xác</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bảng dữ liệu */}
      <div className="table-card">
        <h3>Nhật ký chi tiết</h3>
        <table className="data-table">
          <thead>
            <tr>
              <th>Thời gian</th>
              <th>Loại xe</th>
              <th>Camera</th>
              <th>Độ tin cậy</th>
              <th>Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>10:24:12 - 24/05</td>
              <td className="text-red">Xe Cứu Thương</td>
              <td>CAM-04</td>
              <td>98.4%</td>
              <td>
                <span className="badge">Đã xử lý</span>
              </td>
            </tr>
            <tr>
              <td>10:22:58 - 24/05</td>
              <td className="text-orange">Xe Cứu Hỏa</td>
              <td>CAM-02</td>
              <td>92.1%</td>
              <td>
                <span className="badge">Đã xử lý</span>
              </td>
            </tr>
            <tr>
              <td>09:15:00 - 24/05</td>
              <td className="text-red">Xe Cứu Thương</td>
              <td>CAM-01</td>
              <td>88.5%</td>
              <td>
                <span className="badge pending">Chờ duyệt</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
