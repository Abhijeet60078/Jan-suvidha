import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import api from "../../api/axios.js";
import StatusTimeline from "../../components/StatusTimeline.jsx";
import PriorityBadge from "../../components/PriorityBadge.jsx";
import AttachmentGallery from "../../components/AttachmentGallery.jsx";
import { useAuth } from "../../context/AuthContext.jsx";

export default function CitizenDashboard() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/complaints/mine").then(({ data }) => setComplaints(data.complaints)).finally(() => setLoading(false));
  }, []);

  const rate = async (id, rating) => {
    await api.post(`/complaints/${id}/rate`, { rating });
    const { data } = await api.get("/complaints/mine");
    setComplaints(data.complaints);
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-display font-bold text-2xl">{user?.name}, {t("nav.dashboard")}</h1>
        <Link to="/citizen/file" className="bg-marigold text-ink-dark font-semibold px-5 py-2.5 rounded-lg hover:bg-marigold-light transition-colors">
          {t("home.cta")}
        </Link>
      </div>

      {loading && <p className="text-ink-light/60">{t("common.loading")}</p>}
      {!loading && complaints.length === 0 && (
        <div className="bg-white rounded-xl shadow-card p-10 text-center text-ink-light/70">
          No complaints filed yet.
        </div>
      )}

      <div className="space-y-4">
        {complaints.map((c) => (
          <div key={c._id} className="bg-white rounded-xl shadow-card p-5">
            <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
              <Link to={`/citizen/complaint/${c._id}`} className="hover:opacity-80">
                <span className="font-mono text-xs text-ink-light/60">{c.trackingId}</span>
                <h3 className="font-display font-semibold text-base mt-0.5">{c.titleEn}</h3>
                <p className="text-sm text-ink-light/70">{i18n.language === "hi" ? c.department?.nameHi : c.department?.nameEn}</p>
              </Link>
              <PriorityBadge priority={c.priority} />
            </div>
            <StatusTimeline status={c.status} history={c.history} />
            <AttachmentGallery attachments={c.evidenceUrls} label={t("complaint.attachments")} />
            <AttachmentGallery attachments={c.resolutionAttachments} label={t("complaint.resolutionAttachments")} />
            {c.status === "resolved" && (
              <div className="mt-4 pt-4 border-t border-paperDark flex items-center gap-2">
                <span className="text-sm font-medium">{t("complaint.rateThis")}:</span>
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} onClick={() => rate(c._id, n)} className="text-lg hover:scale-110 transition-transform">⭐</button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
