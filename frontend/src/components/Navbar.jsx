import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import LanguageToggle from "./LanguageToggle.jsx";
import NotificationBell from "./NotificationBell.jsx";
import { useAuth } from "../context/AuthContext.jsx";

export default function Navbar() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const dashboardPath = () => {
    if (!user) return "/login";
    if (user.role === "citizen") return "/citizen";
    if (user.role === "officer") return "/officer";
    return "/admin";
  };

  // Role-aware nav links (spec section 12).
  // - citizen: Home, Track Complaint, File Complaint, Citizen Dashboard
  // - officer: Home, Track Complaint, Officer Dashboard (never File Complaint)
  // - admin/departmentHead: Home, Admin Dashboard, Officer Leaderboard (no Track/File Complaint)
  // Frontend hiding is convenience only — every underlying API route is
  // separately enforced by backend role middleware (see middleware/auth.js).
  const isStaff = user && (user.role === "admin" || user.role === "departmentHead");
  const isCitizen = user && user.role === "citizen";
  const isOfficer = user && user.role === "officer";

  return (
    <header className="bg-ink text-white sticky top-0 z-40 shadow-card">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-display font-bold text-lg tracking-tight">
          <span className="w-8 h-8 rounded-md bg-marigold text-ink-dark flex items-center justify-center font-black">JS</span>
          <span>{t("appName")}</span>
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-white/85">
          <Link to="/" className="hover:text-marigold transition-colors">{t("nav.home")}</Link>

          {(!user || isCitizen || isOfficer) && (
            <Link to="/track" className="hover:text-marigold transition-colors">{t("nav.trackComplaint")}</Link>
          )}

          {isCitizen && (
            <Link to="/citizen/file" className="hover:text-marigold transition-colors">{t("home.cta")}</Link>
          )}

          {user && (
            <Link to={dashboardPath()} className="hover:text-marigold transition-colors">{t("nav.dashboard")}</Link>
          )}

          {isStaff && (
            <Link to="/admin/leaderboard" className="hover:text-marigold transition-colors">{t("admin.leaderboard")}</Link>
          )}
        </nav>

        <div className="flex items-center gap-3">
          <LanguageToggle />
          {user ? (
            <>
              <NotificationBell />
              <button
                onClick={() => { logout(); navigate("/"); }}
                className="text-sm font-semibold px-3 py-1.5 rounded-md border border-white/25 hover:bg-white/10 transition-colors"
              >
                {t("nav.logout")}
              </button>
            </>
          ) : (
            <Link
              to="/login"
              className="text-sm font-semibold px-3 py-1.5 rounded-md bg-marigold text-ink-dark hover:bg-marigold-light transition-colors"
            >
              {t("nav.login")}
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
