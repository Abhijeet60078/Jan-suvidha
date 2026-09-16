import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import api from "../api/axios.js";
import StatusTimeline from "../components/StatusTimeline.jsx";
import PriorityBadge from "../components/PriorityBadge.jsx";

export default function TrackComplaint() {
  const { t, i18n } = useTranslation();
  const [params] = useSearchParams();
  const [trackingId, setTrackingId] = useState(params.get("id") || "");
  const [complaint, setComplaint] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const search = async (e) => {
    e?.preventDefault();
    setError("");
    setComplaint(null);
    setLoading(true);
    try {
      const { data } = await api.get(`/complaints/track/${trackingId.trim()}`);
      setComplaint(data.complaint);
    } catch (err) {
      setError(err.response?.data?.message || t("common.error"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (params.get("id")) search();
  }, []);

  return (
    <div className="max-w-2xl mx-auto px-6 py-14">
      <h1 className="font-display font-bold text-2xl mb-6">{t("complaint.trackTitle")}</h1>
      <form onSubmit={search} className="flex gap-3 mb-8">
        <input
          value={trackingId} onChange={(e) => setTrackingId(e.target.value)}
          placeholder={t("complaint.enterTrackingId")}
          className="flex-1 border border-paperDark rounded-lg px-4 py-3 font-mono outline-none focus:border-ink bg-white"
        />
        <button disabled={loading} className="bg-ink text-white font-semibold px-6 rounded-lg hover:bg-ink-light transition-colors">
          {loading ? "…" : "→"}
        </button>
      </form>

      {error && <p className="text-alert text-sm mb-4">{error}</p>}

      {complaint && (
        <div className="bg-white rounded-2xl shadow-card p-6">
          <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
            <div>
              <span className="font-mono text-xs text-ink-light/60">{complaint.trackingId}</span>
              <h2 className="font-display font-semibold text-lg mt-0.5">{complaint.titleEn}</h2>
              <p className="text-sm text-ink-light/70">{i18n.language === "hi" ? complaint.department?.nameHi : complaint.department?.nameEn}</p>
            </div>
            <PriorityBadge priority={complaint.priority} />
          </div>
          <StatusTimeline status={complaint.status} history={complaint.history} />
          <div className="mt-5 pt-5 border-t border-paperDark grid sm:grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-ink-light/60">{t("complaint.district")}</span>
              <p className="font-medium">{complaint.district}</p>
            </div>
            <div>
              <span className="text-ink-light/60">{t("complaint.deadline")}</span>
              <p className="font-medium">{new Date(complaint.slaDeadline).toLocaleString(i18n.language === "hi" ? "hi-IN" : "en-IN")}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
