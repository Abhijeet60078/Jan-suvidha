import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import api from "../../api/axios.js";
import StatusTimeline from "../../components/StatusTimeline.jsx";
import PriorityBadge from "../../components/PriorityBadge.jsx";
import AttachmentGallery from "../../components/AttachmentGallery.jsx";

export default function ComplaintDetail() {
  const { t, i18n } = useTranslation();
  const { id } = useParams();
  const [complaint, setComplaint] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reopening, setReopening] = useState(false);

  const load = () => {
    setLoading(true);
    api
      .get(`/complaints/${id}`)
      .then(({ data }) => setComplaint(data.complaint))
      .catch((err) => setError(err.response?.data?.message || t("common.error")))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const rate = async (rating) => {
    await api.post(`/complaints/${id}/rate`, { rating });
    load();
  };

  const reopen = async () => { setReopening(true); try { await api.post(`/complaints/${id}/reopen`); load(); } finally { setReopening(false); } };

  if (loading) return <div className="max-w-3xl mx-auto px-6 py-16 text-center text-ink-light/60">{t("common.loading")}</div>;
  if (error) return <div className="max-w-3xl mx-auto px-6 py-16 text-center text-alert">{error}</div>;
  if (!complaint) return null;

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <Link to="/citizen" className="text-sm text-ink-light/70 hover:text-ink mb-6 inline-block">← {t("common.back")}</Link>

      <div className="bg-white rounded-2xl shadow-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
          <div>
            <span className="font-mono text-xs text-ink-light/60">{complaint.trackingId}</span>
            <h1 className="font-display font-bold text-xl mt-0.5">{complaint.titleEn}</h1>
            <p className="text-sm text-ink-light/70">
              {i18n.language === "hi" ? complaint.department?.nameHi : complaint.department?.nameEn} · {complaint.district}
            </p>
          </div>
          <PriorityBadge priority={complaint.priority} />
        </div>

        <StatusTimeline status={complaint.status} history={complaint.history} />
        <AttachmentGallery attachments={complaint.evidenceUrls} label={t("complaint.attachments")} />
        <AttachmentGallery attachments={complaint.resolutionAttachments} label={t("complaint.resolutionAttachments")} />

        <div className="mt-6 pt-5 border-t border-paperDark grid sm:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-ink-light/60">{t("complaint.description")}</span>
            <p className="font-medium mt-0.5">{complaint.descriptionEn}</p>
          </div>
          <div>
            <span className="text-ink-light/60">{t("complaint.deadline")}</span>
            <p className="font-medium mt-0.5">
              {new Date(complaint.slaDeadline).toLocaleString(i18n.language === "hi" ? "hi-IN" : "en-IN")}
            </p>
          </div>
          {complaint.address && (
            <div>
              <span className="text-ink-light/60">{t("complaint.address")}</span>
              <p className="font-medium mt-0.5">{complaint.address}</p>
            </div>
          )}
          {complaint.assignedOfficer && (
            <div>
              <span className="text-ink-light/60">Assigned Officer</span>
              <p className="font-medium mt-0.5">{complaint.assignedOfficer.name}</p>
            </div>
          )}
        </div>

        {complaint.notes?.length > 0 && (
          <div className="mt-6 pt-5 border-t border-paperDark">
            <h2 className="font-display font-semibold text-sm mb-3">Updates</h2>
            <div className="space-y-2">
              {complaint.notes.map((n, i) => (
                <div key={i} className="text-sm bg-paper rounded-lg px-3.5 py-2.5">
                  <span className="font-semibold">{n.authorName || "System"}:</span> {n.message}
                  <span className="block text-xs text-ink-light/50 mt-0.5">
                    {new Date(n.createdAt).toLocaleString(i18n.language === "hi" ? "hi-IN" : "en-IN")}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {complaint.history?.length > 0 && (
          <details className="mt-6 pt-5 border-t border-paperDark" open>
            <summary className="font-display font-semibold text-sm cursor-pointer">{t("complaint.auditTrail")}</summary>
            <div className="mt-4 ml-2 border-l-2 border-paperDark space-y-4">
              {[...complaint.history].reverse().map((entry, index) => (
                <div key={`${entry.createdAt}-${index}`} className="relative pl-5 text-sm">
                  <span className="absolute -left-[7px] top-1.5 w-3 h-3 rounded-full bg-teal border-2 border-white" />
                  <p className="font-semibold">{t(`complaint.audit.${entry.action}`)}</p>
                  <p className="text-ink-light/75">{entry.fromValue || "-"} → {entry.toValue || "-"}</p>
                  <p className="text-xs text-ink-light/50 mt-0.5">{entry.byUserName || "System"} · {new Date(entry.createdAt).toLocaleString(i18n.language === "hi" ? "hi-IN" : "en-IN")}</p>
                </div>
              ))}
            </div>
          </details>
        )}

        {complaint.status === "resolved" && (
          <div className="mt-6 pt-5 border-t border-paperDark flex items-center gap-2">
            <span className="text-sm font-medium">{t("complaint.rateThis")}:</span>
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} onClick={() => rate(n)} className="text-lg hover:scale-110 transition-transform">⭐</button>
            ))}
          </div>
        )}
        {["resolved", "closed"].includes(complaint.status) && <button type="button" disabled={reopening} onClick={reopen} className="mt-4 text-sm font-semibold text-alert underline">{reopening ? "Reopening..." : "Reopen complaint"}</button>}

        {complaint.citizenRating && (
          <div className="mt-4 text-sm text-ink-light/70">
            {t("complaint.rateThis")}: {"⭐".repeat(complaint.citizenRating)}
          </div>
        )}
      </div>
    </div>
  );
}
