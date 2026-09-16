import React, { useEffect, useRef, useState } from "react";
import api from "../api/axios.js";
import { io } from "socket.io-client";
import { useAuth } from "../context/AuthContext.jsx";

export default function NotificationBell() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  const load = async () => {
    try {
      const { data } = await api.get("/notifications/mine");
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch {
      // Notifications should never block the rest of the application.
    }
  };

  useEffect(() => {
    load();
    const interval = window.setInterval(load, 60000);
    const socket = io();
    socket.on("connect", () => socket.emit("join", user?._id));
    socket.on("notification", (notification) => {
      setNotifications((items) => [notification, ...items.filter((item) => item._id !== notification._id)].slice(0, 50));
      setUnreadCount((count) => count + 1);
    });
    return () => { window.clearInterval(interval); socket.disconnect(); };
  }, [user?._id]);

  useEffect(() => {
    const close = (event) => {
      if (!containerRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const markRead = async (notification) => {
    if (!notification.isRead) {
      await api.patch(`/notifications/${notification._id}/read`);
      setNotifications((items) => items.map((item) => item._id === notification._id ? { ...item, isRead: true } : item));
      setUnreadCount((count) => Math.max(0, count - 1));
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <button type="button" onClick={() => setOpen(!open)} aria-label="Notifications" className="relative w-9 h-9 rounded-md hover:bg-white/10 text-lg">
        <span aria-hidden="true">&#128276;</span>
        {unreadCount > 0 && <span className="absolute -right-1 -top-1 min-w-5 h-5 px-1 rounded-full bg-alert text-white text-[10px] font-bold flex items-center justify-center">{unreadCount > 99 ? "99+" : unreadCount}</span>}
      </button>
      {open && (
        <div className="absolute right-0 top-11 w-80 max-w-[calc(100vw-2rem)] bg-white text-ink rounded-xl shadow-card border border-paperDark overflow-hidden z-50">
          <div className="px-4 py-3 border-b border-paperDark font-semibold text-sm">Notifications</div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 && <p className="px-4 py-6 text-sm text-ink-light/60">No notifications yet.</p>}
            {notifications.map((notification) => (
              <button key={notification._id} type="button" onClick={() => markRead(notification)} className={`block text-left w-full px-4 py-3 border-b border-paperDark last:border-0 hover:bg-paper ${notification.isRead ? "" : "bg-marigold/10"}`}>
                <p className="text-sm leading-snug">{notification.message}</p>
                <p className="text-[11px] text-ink-light/55 mt-1">{new Date(notification.createdAt).toLocaleString()}</p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
