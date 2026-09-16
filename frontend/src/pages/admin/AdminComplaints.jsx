import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import api from "../../api/axios.js";
import PriorityBadge from "../../components/PriorityBadge.jsx";
import AttachmentGallery from "../../components/AttachmentGallery.jsx";
import { useAuth } from "../../context/AuthContext.jsx";

const STATUSES = ["submitted", "underReview", "assigned", "investigation", "resolved", "closed", "escalated"];
const PRIORITIES = ["low", "medium", "high", "critical"];

export default function AdminComplaints() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [officers, setOfficers] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const params = statusFilter ? { status: statusFilter } : {};
      const [{ data: complaintData }, { data: officerData }] = await Promise.all([
        api.get("/admin/complaints", { params }),
        api.get("/admin/officers", { params: { isActive: "true" } }),
      ]);
      setComplaints(complaintData.complaints);
      setOfficers(officerData.officers);
    } catch (err) {
      setError(err.response?.data?.message || t("common.error"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const assign = async (id, officerId) => {
    if (!officerId) return;
    await api.patch(`/admin/complaints/${id}/assign`, { officerId });
    load();
  };

  const changePriority = async (id, priority) => {
    await api.patch(`/admin/complaints/${id}/priority`, { priority });
    load();
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-8">
        <div>
          <h1 className="font-display font-bold text-2xl">All Complaints</h1>
          {user?.role === "departmentHead" && <p className="text-sm text-ink-light/70 mt-1">Department — Admin View</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setStatusFilter("")} className={`text-sm font-semibold px-3 py-2 rounded-lg border ${!statusFilter ? "bg-ink text-white border-ink" : "border-paperDark hover:bg-paper"}`}>All</button>
          <button type="button" onClick={() => setStatusFilter("escalated")} className={`text-sm font-semibold px-3 py-2 rounded-lg border ${statusFilter === "escalated" ? "bg-alert text-white border-alert" : "border-alert/40 text-alert hover:bg-alert/10"}`}>⚠ {t("complaint.status.escalated")}</button>
          <select
            value={statusFilter === "escalated" ? "" : statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-paperDark rounded-lg px-3 py-2 text-sm bg-white outline-none focus:border-ink"
          >
            <option value="">More filters</option>
            {STATUSES.filter((s) => s !== "escalated").map((s) => <option key={s} value={s}>{t(`complaint.status.${s}`)}</option>)}
          </select>
        </div>
      </div>

      {error && <p className="text-alert text-sm mb-4">{error}</p>}
      {loading && <p className="text-ink-light/60">{t("common.loading")}</p>}

      <div className="bg-white rounded-xl shadow-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-paper text-ink-light/70 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Tracking ID</th>
              <th className="px-4 py-3 font-medium">Title</th>
              <th className="px-4 py-3 font-medium">Department</th>
              <th className="px-4 py-3 font-medium">District</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Priority</th>
              <th className="px-4 py-3 font-medium">Assign Officer</th>
            </tr>
          </thead>
          <tbody>
            {complaints.map((c) => (
              <tr key={c._id} className={`border-t border-paperDark align-top ${c.status === "escalated" ? "bg-alert/5" : ""}`}>
                <td className="px-4 py-3 font-mono text-xs">{c.trackingId}</td>
                <td className="px-4 py-3 font-medium max-w-[220px]">{c.titleEn}</td>
                <td className="px-4 py-3 text-ink-light/70">{c.department?.nameEn}</td>
                <td className="px-4 py-3 text-ink-light/70">{c.district}</td>
                <td className="px-4 py-3">{t(`complaint.status.${c.status}`)}</td>
                <td className="px-4 py-3">
                  <select
                    value={c.priority}
                    onChange={(e) => changePriority(c._id, e.target.value)}
                    className="border border-paperDark rounded-md px-2 py-1 text-xs bg-white outline-none"
                  >
                    {PRIORITIES.map((p) => <option key={p} value={p}>{t(`complaint.priority.${p}`)}</option>)}
                  </select>
                  <AttachmentGallery attachments={[...(c.evidenceUrls || []), ...(c.resolutionAttachments || [])]} label="Photos" />
                </td>
                <td className="px-4 py-3">
                  <select
                    defaultValue={c.assignedOfficer?._id || ""}
                    onChange={(e) => assign(c._id, e.target.value)}
                    className="border border-paperDark rounded-md px-2 py-1 text-xs bg-white outline-none min-w-[140px]"
                  >
                    <option value="">Unassigned</option>
                    {officers.map((o) => <option key={o._id} value={o._id}>{o.name}</option>)}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && complaints.length === 0 && (
          <p className="text-center text-ink-light/60 py-10">No complaints found.</p>
        )}
      </div>
    </div>
  );
}
