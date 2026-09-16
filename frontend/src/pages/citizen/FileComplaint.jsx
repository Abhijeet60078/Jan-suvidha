import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import api from "../../api/axios.js";
import { upDistricts } from "../../constants/upDistricts.js";
import { issueTypes } from "../../constants/issueTypes.js";

export default function FileComplaint() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [departments, setDepartments] = useState([]);
  const [form, setForm] = useState({
    department: "", crimeType: "", titleEn: "", descriptionEn: "", descriptionHi: "",
    district: "", address: "", isAnonymous: false,
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [attachments, setAttachments] = useState([]);
  const [possibleDuplicates, setPossibleDuplicates] = useState([]);
  const [showDuplicates, setShowDuplicates] = useState(true);
  const [listening, setListening] = useState(false);

  useEffect(() => {
    api.get("/admin/departments").then(({ data }) => setDepartments(data.departments)).catch(() => {});
  }, []);

  useEffect(() => () => attachments.forEach((file) => URL.revokeObjectURL(file.preview)), [attachments]);

  const selectAttachments = (event) => {
    const selected = Array.from(event.target.files || []);
    if (selected.length > 3) {
      setError(t("complaint.attachmentsMax"));
      event.target.value = "";
      return;
    }
    const invalid = selected.find((file) => !["image/jpeg", "image/png", "image/webp", "video/mp4", "video/webm", "application/pdf"].includes(file.type) || file.size > 20 * 1024 * 1024);
    if (invalid) {
      setError(t("complaint.attachmentsInvalid"));
      event.target.value = "";
      return;
    }
    setError("");
    setAttachments(selected.map((file) => ({ file, preview: URL.createObjectURL(file) })));
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const payload = new FormData();
      Object.entries(form).forEach(([key, value]) => payload.append(key, value));
      attachments.forEach(({ file }) => payload.append("attachments", file));
      const { data } = await api.post("/complaints", payload);
      setResult(data.complaint);
      setPossibleDuplicates(data.possibleDuplicates || []);
    } catch (err) {
      setError(err.response?.status === 429 ? t("complaint.dailyLimit") : err.response?.data?.message || t("common.error"));
    } finally {
      setLoading(false);
    }
  };

  const dictateHindi = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) { setError("Hindi voice input is not supported in this browser."); return; }
    const recognition = new SpeechRecognition(); recognition.lang = "hi-IN"; recognition.interimResults = false;
    recognition.onstart = () => setListening(true); recognition.onend = () => setListening(false); recognition.onerror = () => setError("Voice input could not be started.");
    recognition.onresult = (event) => setForm((current) => ({ ...current, descriptionHi: `${current.descriptionHi} ${event.results[0][0].transcript}`.trim() })); recognition.start();
  };

  if (result) {
    return (
      <div className="max-w-lg mx-auto px-6 py-16 text-center">
        <div className="bg-white rounded-2xl shadow-card p-10">
          <div className="w-14 h-14 rounded-full bg-teal/15 text-teal flex items-center justify-center mx-auto mb-5 text-2xl">✓</div>
          <h1 className="font-display font-bold text-xl mb-2">{t("complaint.trackingIdIssued")}</h1>
          <p className="font-mono text-2xl font-bold text-ink my-4">{result.trackingId}</p>
          <p className="text-sm text-ink-light/70 mb-6">
            {t("complaint.deadline")}: {new Date(result.slaDeadline).toLocaleString(i18n.language === "hi" ? "hi-IN" : "en-IN")}
          </p>
          {showDuplicates && possibleDuplicates.length > 0 && (
            <div className="text-left bg-marigold/15 border border-marigold/40 rounded-lg p-4 mb-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-sm">{t("complaint.duplicateTitle")}</p>
                  <p className="text-xs text-ink-light/80 mt-1">{t("complaint.duplicateMessage")}</p>
                  <ul className="mt-2 space-y-1 text-xs">
                    {possibleDuplicates.map((duplicate) => <li key={duplicate.trackingId}><span className="font-mono">{duplicate.trackingId}</span> — {duplicate.titleEn}</li>)}
                  </ul>
                </div>
                <button type="button" onClick={() => setShowDuplicates(false)} aria-label="Dismiss" className="text-lg leading-none">×</button>
              </div>
            </div>
          )}
          <div className="flex gap-3 justify-center">
            <button onClick={() => navigate("/citizen")} className="bg-ink text-white font-semibold px-5 py-2.5 rounded-lg">
              {t("nav.dashboard")}
            </button>
            <button onClick={() => navigate(`/track?id=${result.trackingId}`)} className="border border-paperDark font-semibold px-5 py-2.5 rounded-lg">
              {t("common.viewDetails")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      <div className="bg-white rounded-2xl shadow-card p-8">
        <h1 className="font-display font-bold text-2xl mb-6">{t("complaint.fileTitle")}</h1>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">{t("complaint.department")}</label>
            <select
              required value={form.department}
              onChange={(e) => setForm({ ...form, department: e.target.value })}
              className="w-full border border-paperDark rounded-lg px-3.5 py-2.5 bg-white outline-none focus:border-ink"
            >
              <option value="">—</option>
              {departments.map((d) => (
                <option key={d._id} value={d._id}>{i18n.language === "hi" ? d.nameHi : d.nameEn}</option>
              ))}
            </select>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">{t("complaint.crimeType")}</label>
              <select
                required value={form.crimeType}
                onChange={(e) => setForm({ ...form, crimeType: e.target.value })}
                className="w-full border border-paperDark rounded-lg px-3.5 py-2.5 bg-white outline-none focus:border-ink"
              >
                <option value="">—</option>
                {issueTypes.map((it) => (
                  <option key={it.value} value={it.value}>{i18n.language === "hi" ? it.hi : it.en}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">{t("complaint.district")}</label>
              <select
                required value={form.district}
                onChange={(e) => setForm({ ...form, district: e.target.value })}
                className="w-full border border-paperDark rounded-lg px-3.5 py-2.5 bg-white outline-none focus:border-ink"
              >
                <option value="">—</option>
                {upDistricts.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">{t("complaint.title")}</label>
            <input required value={form.titleEn} onChange={(e) => setForm({ ...form, titleEn: e.target.value })}
              className="w-full border border-paperDark rounded-lg px-3.5 py-2.5 outline-none focus:border-ink" />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">{t("complaint.description")}</label>
            <textarea required rows={4} value={form.descriptionEn} onChange={(e) => setForm({ ...form, descriptionEn: e.target.value })}
              className="w-full border border-paperDark rounded-lg px-3.5 py-2.5 outline-none focus:border-ink" />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">{t("complaint.descriptionHi")}</label>
            <button type="button" onClick={dictateHindi} className="text-xs text-marigold-dark font-semibold mb-1">{listening ? "Listening..." : "Speak in Hindi"}</button>
            <textarea rows={3} value={form.descriptionHi} onChange={(e) => setForm({ ...form, descriptionHi: e.target.value })}
              className="w-full border border-paperDark rounded-lg px-3.5 py-2.5 outline-none focus:border-ink" />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">{t("complaint.address")}</label>
            <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="w-full border border-paperDark rounded-lg px-3.5 py-2.5 outline-none focus:border-ink" />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">{t("complaint.attachments")}</label>
            <input type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,application/pdf" multiple onChange={selectAttachments}
              className="w-full border border-paperDark rounded-lg px-3.5 py-2.5 text-sm bg-white" />
            <p className="text-xs text-ink-light/60 mt-1">{t("complaint.attachmentsHint")}</p>
            {attachments.length > 0 && <div className="flex gap-2 mt-3">{attachments.map(({ preview, file }) => <img key={preview} src={preview} alt={file.name} className="w-16 h-16 object-cover rounded-lg border border-paperDark" />)}</div>}
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.isAnonymous} onChange={(e) => setForm({ ...form, isAnonymous: e.target.checked })} />
            {t("complaint.anonymous")}
          </label>

          {error && <p className="text-alert text-sm">{error}</p>}

          <button disabled={loading} className="w-full bg-marigold text-ink-dark font-bold py-3 rounded-lg hover:bg-marigold-light transition-colors disabled:opacity-60">
            {loading ? t("common.loading") : t("complaint.submit")}
          </button>
        </form>
      </div>
    </div>
  );
}
