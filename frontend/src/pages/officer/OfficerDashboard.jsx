import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import api from "../../api/axios.js";
import StatusTimeline from "../../components/StatusTimeline.jsx";
import PriorityBadge from "../../components/PriorityBadge.jsx";
import RatingGauge from "../../components/RatingGauge.jsx";
import AttachmentGallery from "../../components/AttachmentGallery.jsx";
import { useAuth } from "../../context/AuthContext.jsx";

export default function OfficerDashboard() {
  const { t, i18n } = useTranslation();
  const { user, setUser } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [noteDrafts, setNoteDrafts] = useState({});
  const [resolutionFiles, setResolutionFiles] = useState({});
  const [selected, setSelected] = useState([]);
  const [bulkStatus, setBulkStatus] = useState("investigation");
  const [followUps, setFollowUps] = useState({});

  const load = async () => {
    const { data } = await api.get("/complaints/assigned");
    setComplaints(data.complaints);
    const me = await api.get("/auth/me");
    setUser(me.data.user);
  };

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, []);

  const updateStatus = async (id, status) => {
    const files = resolutionFiles[id] || [];
    const payload = new FormData();
    payload.append("status", status);
    files.forEach(({ file }) => payload.append("attachments", file));
    await api.patch(`/complaints/${id}/status`, payload);
    load();
  };

  const selectResolutionFiles = (id, event) => {
    const selected = Array.from(event.target.files || []);
    if (selected.length > 3 || selected.some((file) => !["image/jpeg", "image/png", "image/webp", "video/mp4", "video/webm", "application/pdf"].includes(file.type) || file.size > 20 * 1024 * 1024)) {
      event.target.value = "";
      return;
    }
    setResolutionFiles({ ...resolutionFiles, [id]: selected.map((file) => ({ file, preview: URL.createObjectURL(file) })) });
  };

  const addNote = async (id) => {
    const note = noteDrafts[id];
    if (!note?.trim()) return;
    await api.patch(`/complaints/${id}/status`, { note, internal: true, followUpAt: followUps[id] || undefined });
    setNoteDrafts({ ...noteDrafts, [id]: "" });
    load();
  };

  const updateBulk = async () => {
    if (!selected.length) return;
    await api.patch("/complaints/bulk-status", { complaintIds: selected, status: bulkStatus });
    setSelected([]);
    load();
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <div className="grid sm:grid-cols-[auto_1fr] gap-6 items-center bg-white rounded-2xl shadow-card p-6 mb-8">
        <RatingGauge value={user?.rating ?? 100} size={100} />
        <div>
          <h1 className="font-display font-bold text-xl mb-1">{t("officer.dashboardTitle")} — {user?.name}</h1>
          <div className="flex flex-wrap gap-2 text-xs font-semibold mt-2">
            <span className={`px-2.5 py-1 rounded-full ${user?.salaryEligible ? "bg-teal/15 text-teal" : "bg-alert/15 text-alert"}`}>
              {t("officer.salaryEligible")}: {user?.salaryEligible ? "✓" : "✗"}
            </span>
            <span className={`px-2.5 py-1 rounded-full ${user?.promotionEligible ? "bg-teal/15 text-teal" : "bg-alert/15 text-alert"}`}>
              {t("officer.promotionEligible")}: {user?.promotionEligible ? "✓" : "✗"}
            </span>
            {user?.underReview && (
              <span className="px-2.5 py-1 rounded-full bg-alert text-white">{t("officer.underReview")}</span>
            )}
          </div>
        </div>
      </div>

      <h2 className="font-display font-semibold text-lg mb-4">{t("officer.assignedComplaints")}</h2>
      <div className="flex flex-wrap items-center gap-2 mb-4 bg-white rounded-xl shadow-card p-3">
        <span className="text-sm font-semibold">{selected.length} selected</span>
        <select value={bulkStatus} onChange={(e) => setBulkStatus(e.target.value)} className="border border-paperDark rounded-lg px-2 py-1.5 text-sm bg-white">
          <option value="underReview">Under review</option><option value="investigation">Investigation</option><option value="resolved">Resolved</option><option value="closed">Closed</option>
        </select>
        <button type="button" disabled={!selected.length} onClick={updateBulk} className="text-sm font-semibold px-3 py-1.5 rounded-lg bg-ink text-white disabled:opacity-40">Update selected</button>
      </div>
      {loading && <p className="text-ink-light/60">{t("common.loading")}</p>}

      <div className="space-y-4">
        {complaints.map((c) => (
          <div key={c._id} className="bg-white rounded-xl shadow-card p-5">
            <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
              <div>
                <label className="flex items-center gap-2 text-xs mb-2"><input type="checkbox" checked={selected.includes(c._id)} onChange={(e) => setSelected(e.target.checked ? [...selected, c._id] : selected.filter((id) => id !== c._id))} /> Select for bulk update</label>
                <span className="font-mono text-xs text-ink-light/60">{c.trackingId}</span>
                <h3 className="font-display font-semibold text-base mt-0.5">{c.titleEn}</h3>
                <p className="text-sm text-ink-light/70">{i18n.language === "hi" ? c.department?.nameHi : c.department?.nameEn} · {c.district}</p>
              </div>
              <PriorityBadge priority={c.priority} />
            </div>
            <p className="text-sm text-ink-light/80 mb-4">{c.descriptionEn}</p>
            {c.location?.lat && c.location?.lng && <a className="text-xs text-marigold-dark font-semibold underline" href={`https://www.google.com/maps?q=${c.location.lat},${c.location.lng}`} target="_blank" rel="noreferrer">Open complaint location</a>}
            <StatusTimeline status={c.status} />
            <AttachmentGallery attachments={c.evidenceUrls} label="Evidence" />
            <AttachmentGallery attachments={c.resolutionAttachments} label="Resolution photos" />

            <div className="mt-4 pt-4 border-t border-paperDark flex flex-wrap gap-2">
              {c.status !== "resolved" && c.status !== "closed" && (
                <>
                  {c.status === "assigned" && (
                    <button onClick={() => updateStatus(c._id, "investigation")} className="text-sm font-semibold px-3.5 py-2 rounded-lg bg-ink text-white hover:bg-ink-light">
                      Start Investigation
                    </button>
                  )}
                  <button onClick={() => updateStatus(c._id, "resolved")} className="text-sm font-semibold px-3.5 py-2 rounded-lg bg-teal text-white hover:bg-teal-dark">
                    {t("officer.markResolved")}
                  </button>
                  <label className="text-sm font-semibold px-3.5 py-2 rounded-lg border border-paperDark cursor-pointer hover:bg-paper">
                    {t("officer.resolutionPhotos")}
                    <input type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,application/pdf" multiple onChange={(e) => selectResolutionFiles(c._id, e)} className="hidden" />
                  </label>
                </>
              )}
            </div>
            {(resolutionFiles[c._id] || []).length > 0 && <div className="flex gap-2 mt-3">{resolutionFiles[c._id].map(({ preview, file }) => <img key={preview} src={preview} alt={file.name} className="w-16 h-16 object-cover rounded-lg border border-paperDark" />)}</div>}

            <div className="mt-3 flex gap-2">
              <input
                value={noteDrafts[c._id] || ""}
                onChange={(e) => setNoteDrafts({ ...noteDrafts, [c._id]: e.target.value })}
                placeholder={t("officer.addNote")}
                className="flex-1 border border-paperDark rounded-lg px-3 py-2 text-sm outline-none focus:border-ink"
              />
              <button onClick={() => addNote(c._id)} className="text-sm font-semibold px-4 rounded-lg border border-paperDark hover:bg-paper">
                +
              </button>
            </div>
            <div className="mt-2 flex items-center gap-2 text-xs text-ink-light/70">
              <label htmlFor={`follow-up-${c._id}`}>Follow-up:</label>
              <input id={`follow-up-${c._id}`} type="datetime-local" value={followUps[c._id] || ""} onChange={(e) => setFollowUps({ ...followUps, [c._id]: e.target.value })} className="border border-paperDark rounded px-2 py-1" />
            </div>
          </div>
        ))}
        {!loading && complaints.length === 0 && (
          <div className="bg-white rounded-xl shadow-card p-10 text-center text-ink-light/70">No complaints assigned yet.</div>
        )}
      </div>
    </div>
  );
}
