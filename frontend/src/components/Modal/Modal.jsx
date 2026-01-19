import React, { useEffect, useState } from "react";
import "./Modal.css";

export default function Modal({ isOpen, onClose, title, children, type = "info" }) {
    const [show, setShow] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setShow(true);
        } else {
            setTimeout(() => setShow(false), 200); // Wait for animation
        }
    }, [isOpen]);

    if (!isOpen && !show) return null;

    return (
        <div className={`modal-overlay ${isOpen ? "open" : ""}`} onClick={onClose}>
            <div className={`modal-container ${isOpen ? "open" : ""}`} onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <div className="modal-title-row">
                        {type === "alert" && <span className="material-symbols-outlined icon-alert">warning</span>}
                        <span className="modal-title">{title}</span>
                    </div>
                    <button className="close-btn" onClick={onClose}>
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>
                <div className="modal-content">
                    {children}
                </div>
                <div className="modal-footer">
                    <button className="btn btn-primary" onClick={onClose}>Đóng</button>
                </div>
            </div>
        </div>
    );
}
