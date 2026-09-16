import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import { useTranslation } from "react-i18next";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import api from "../../api/axios.js";

const COLORS = ["#142B45", "#E2933D", "#1F7A5C", "#C1432E", "#2E9973", "#F0B36B", "#1F3F63"];

export default function AdminDashboard() {
  const { t } = useTranslation();
  const [overview, setOverview] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const { user, setUser } = useAuth();

  useEffect(() => {
    api.get("/admin/overview").then(({ data }) => setOverview(data));
    api.get("/admin/analytics").then(({ data }) => setAnalytics(data));
  }, []);

  const download = (format) => api.get(`/admin/analytics/export?format=${format}`, { responseType: "blob" }).then(({ data }) => {
    const url = URL.createObjectURL(data); const link = document.createElement("a"); link.href = url; link.download = `jansuvidha-analytics.${format === "pdf" ? "pdf" : "csv"}`; link.click(); URL.revokeObjectURL(url);
  });
  const toggleTwoFactor = async () => { const enabled = !user?.twoFactorEnabled; await api.patch("/admin/security/2fa", { enabled }); setUser({ ...user, twoFactorEnabled: enabled }); };

  const stat = (label, value, tone = "ink") => (
    <div className="bg-white rounded-xl shadow-card p-5">
      <p className="text-sm text-ink-light/60 mb-1">{label}</p>
      <p className={`font-display font-bold text-3xl text-${tone}`}>{value ?? "—"}</p>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <h1 className="font-display font-bold text-2xl">{t("admin.overview")}</h1>
        <div className="flex flex-wrap gap-2">
          {user?.role === "admin" && <button type="button" onClick={toggleTwoFactor} className="text-sm font-semibold px-4 py-2 rounded-lg border border-paperDark">2FA: {user?.twoFactorEnabled ? "On" : "Off"}</button>}
          <Link to="/admin/complaints" className="text-sm font-semibold px-4 py-2 rounded-lg bg-ink text-white hover:bg-ink-light">
            All Complaints / Assign Officer
          </Link>
          <Link to="/admin/officers" className="text-sm font-semibold px-4 py-2 rounded-lg border border-paperDark hover:bg-paper">
            Officers
          </Link>
          <Link to="/admin/departments" className="text-sm font-semibold px-4 py-2 rounded-lg border border-paperDark hover:bg-paper">
            Departments
          </Link>
          <Link to="/admin/leaderboard" className="text-sm font-semibold px-4 py-2 rounded-lg border border-paperDark hover:bg-paper">
            {t("admin.leaderboard")}
          </Link>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
        {stat(t("admin.totalComplaints"), overview?.totalComplaints)}
        {stat(t("admin.resolved"), overview?.resolved, "teal")}
        {stat(t("admin.escalated"), overview?.escalated, "alert")}
        {stat(t("admin.overdue"), overview?.overdueUnresolved, "alert")}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-card p-6">
          <h2 className="font-display font-semibold mb-4">{t("admin.byDepartment")}</h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={overview?.byDept || []} layout="vertical" margin={{ left: 20 }}>
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="department" width={140} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#142B45" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl shadow-card p-6">
          <h2 className="font-display font-semibold mb-4">{t("admin.byStatus")}</h2>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={overview?.byStatus || []} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={90} label>
                {(overview?.byStatus || []).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="flex gap-2 mt-6">
        <button type="button" onClick={() => download("csv")} className="text-sm font-semibold px-4 py-2 rounded-lg border border-paperDark">Export CSV</button>
        <button type="button" onClick={() => download("pdf")} className="text-sm font-semibold px-4 py-2 rounded-lg border border-paperDark">Export PDF</button>
      </div>
      <div className="grid lg:grid-cols-2 gap-6 mt-6">
        <div className="bg-white rounded-xl shadow-card p-6"><h2 className="font-display font-semibold mb-4">Resolution rate by department</h2><ResponsiveContainer width="100%" height={280}><BarChart data={analytics?.departments || []}><XAxis dataKey="department" hide /><YAxis unit="%" /><Tooltip /><Bar dataKey="resolutionRate" fill="#1F7A5C" /></BarChart></ResponsiveContainer></div>
        <div className="bg-white rounded-xl shadow-card p-6"><h2 className="font-display font-semibold mb-4">SLA violation trend</h2><ResponsiveContainer width="100%" height={280}><LineChart data={analytics?.slaTrends || []}><XAxis dataKey="month" /><YAxis allowDecimals={false} /><Tooltip /><Line type="monotone" dataKey="slaBreaches" stroke="#C1432E" strokeWidth={3} /></LineChart></ResponsiveContainer></div>
      </div>
      <div className="bg-white rounded-xl shadow-card p-6 mt-6"><h2 className="font-display font-semibold mb-4">District complaint heatmap</h2><div className="grid grid-cols-2 sm:grid-cols-4 gap-2">{(analytics?.districts || []).map((district) => <div key={district.district} className="rounded-lg p-3 text-sm" style={{ backgroundColor: `rgba(194, 67, 46, ${Math.min(0.75, 0.15 + district.total / Math.max(1, analytics.districts[0]?.total) * 0.6)})` }}><strong>{district.district}</strong><span className="block text-xs">{district.total} complaints · {district.slaBreaches} SLA</span></div>)}</div></div>
    </div>
  );
}
