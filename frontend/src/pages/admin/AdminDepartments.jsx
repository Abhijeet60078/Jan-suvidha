import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import api from "../../api/axios.js";

const emptyForm = { nameEn: "", nameHi: "", code: "", descriptionEn: "", descriptionHi: "" };

export default function AdminDepartments() {
  const { t } = useTranslation();
  const [departments, setDepartments] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await api.get("/admin/departments", { params: { includeInactive: "true" } });
    setDepartments(data.departments);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const payload = editingId ? { id: editingId, ...form } : form;
      await api.post("/admin/departments", payload);
      setForm(emptyForm);
      setEditingId(null);
      load();
    } catch (err) {
      setError(err.response?.data?.message || t("common.error"));
    }
  };

  const edit = (d) => {
    setEditingId(d._id);
    setForm({
      nameEn: d.nameEn, nameHi: d.nameHi, code: d.code,
      descriptionEn: d.descriptionEn || "", descriptionHi: d.descriptionHi || "",
    });
  };

  const toggleActive = async (d) => {
    await api.patch(`/admin/departments/${d._id}/active`, { isActive: !d.isActive });
    load();
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <h1 className="font-display font-bold text-2xl mb-8">Departments</h1>

      <form onSubmit={submit} className="bg-white rounded-xl shadow-card p-6 mb-8 grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1.5">Code (unique)</label>
          <input required disabled={!!editingId} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
            className="w-full border border-paperDark rounded-lg px-3.5 py-2.5 outline-none focus:border-ink disabled:bg-paper" />
        </div>
        <div />
        <div>
          <label className="block text-sm font-medium mb-1.5">Name (English)</label>
          <input required value={form.nameEn} onChange={(e) => setForm({ ...form, nameEn: e.target.value })}
            className="w-full border border-paperDark rounded-lg px-3.5 py-2.5 outline-none focus:border-ink" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Name (Hindi)</label>
          <input required value={form.nameHi} onChange={(e) => setForm({ ...form, nameHi: e.target.value })}
            className="w-full border border-paperDark rounded-lg px-3.5 py-2.5 outline-none focus:border-ink" />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium mb-1.5">Description (English)</label>
          <input value={form.descriptionEn} onChange={(e) => setForm({ ...form, descriptionEn: e.target.value })}
            className="w-full border border-paperDark rounded-lg px-3.5 py-2.5 outline-none focus:border-ink" />
        </div>
        {error && <p className="text-alert text-sm sm:col-span-2">{error}</p>}
        <div className="sm:col-span-2 flex gap-3">
          <button className="bg-marigold text-ink-dark font-semibold px-5 py-2.5 rounded-lg hover:bg-marigold-light">
            {editingId ? "Update Department" : "Create Department"}
          </button>
          {editingId && (
            <button type="button" onClick={() => { setEditingId(null); setForm(emptyForm); }}
              className="border border-paperDark font-semibold px-5 py-2.5 rounded-lg">
              Cancel
            </button>
          )}
        </div>
      </form>

      {loading ? <p className="text-ink-light/60">{t("common.loading")}</p> : (
        <div className="bg-white rounded-xl shadow-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-paper text-ink-light/70 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Code</th>
                <th className="px-4 py-3 font-medium">Name (EN)</th>
                <th className="px-4 py-3 font-medium">Name (HI)</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {departments.map((d) => (
                <tr key={d._id} className="border-t border-paperDark">
                  <td className="px-4 py-3 font-mono text-xs">{d.code}</td>
                  <td className="px-4 py-3 font-medium">{d.nameEn}</td>
                  <td className="px-4 py-3">{d.nameHi}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${d.isActive ? "bg-teal/15 text-teal" : "bg-alert/15 text-alert"}`}>
                      {d.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3 flex gap-3">
                    <button onClick={() => edit(d)} className="text-ink-light hover:text-ink font-medium">Edit</button>
                    <button onClick={() => toggleActive(d)} className="text-alert hover:underline font-medium">
                      {d.isActive ? "Deactivate" : "Activate"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
