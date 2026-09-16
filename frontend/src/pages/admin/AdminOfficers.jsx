import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import api from "../../api/axios.js";

const emptyForm = { name: "", phone: "", email: "", password: "", role: "officer", department: "", district: "", designation: "" };

export default function AdminOfficers() {
  const { t } = useTranslation();
  const [officers, setOfficers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [{ data: officerData }, { data: deptData }] = await Promise.all([
      api.get("/admin/officers"),
      api.get("/admin/departments"),
    ]);
    setOfficers(officerData.officers);
    setDepartments(deptData.departments);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      // Officer/departmentHead account creation reuses the existing
      // POST /api/auth/staff endpoint (admin-only, handles password hashing).
      await api.post("/auth/staff", form);
      setForm(emptyForm);
      load();
    } catch (err) {
      setError(err.response?.data?.message || t("common.error"));
    }
  };

  const toggleActive = async (o) => {
    await api.patch(`/admin/officers/${o._id}/active`, { isActive: !o.isActive });
    load();
  };

  const updateDepartment = async (o, department) => {
    await api.put(`/admin/officers/${o._id}`, { department });
    load();
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <h1 className="font-display font-bold text-2xl mb-8">Officers</h1>

      <form onSubmit={submit} className="bg-white rounded-xl shadow-card p-6 mb-8 grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1.5">Name</label>
          <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full border border-paperDark rounded-lg px-3.5 py-2.5 outline-none focus:border-ink" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Phone</label>
          <input required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="w-full border border-paperDark rounded-lg px-3.5 py-2.5 outline-none focus:border-ink" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Password</label>
          <input required type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="w-full border border-paperDark rounded-lg px-3.5 py-2.5 outline-none focus:border-ink" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Role</label>
          <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}
            className="w-full border border-paperDark rounded-lg px-3.5 py-2.5 bg-white outline-none focus:border-ink">
            <option value="officer">Officer</option>
            <option value="departmentHead">Department Head</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Department</label>
          <select value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })}
            className="w-full border border-paperDark rounded-lg px-3.5 py-2.5 bg-white outline-none focus:border-ink">
            <option value="">—</option>
            {departments.map((d) => <option key={d._id} value={d._id}>{d.nameEn}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">District</label>
          <input value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })}
            className="w-full border border-paperDark rounded-lg px-3.5 py-2.5 outline-none focus:border-ink" />
        </div>
        {error && <p className="text-alert text-sm sm:col-span-2">{error}</p>}
        <div className="sm:col-span-2">
          <button className="bg-marigold text-ink-dark font-semibold px-5 py-2.5 rounded-lg hover:bg-marigold-light">
            Create Officer
          </button>
        </div>
      </form>

      {loading ? <p className="text-ink-light/60">{t("common.loading")}</p> : (
        <div className="bg-white rounded-xl shadow-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-paper text-ink-light/70 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Department</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {officers.map((o) => (
                <tr key={o._id} className="border-t border-paperDark">
                  <td className="px-4 py-3 font-medium">{o.name}</td>
                  <td className="px-4 py-3 text-ink-light/70">{o.role}</td>
                  <td className="px-4 py-3">
                    <select
                      defaultValue={o.department?._id || ""}
                      onChange={(e) => updateDepartment(o, e.target.value)}
                      className="border border-paperDark rounded-md px-2 py-1 text-xs bg-white outline-none"
                    >
                      <option value="">—</option>
                      {departments.map((d) => <option key={d._id} value={d._id}>{d.nameEn}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${o.isActive ? "bg-teal/15 text-teal" : "bg-alert/15 text-alert"}`}>
                      {o.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => toggleActive(o)} className="text-alert hover:underline font-medium">
                      {o.isActive ? "Deactivate" : "Activate"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {officers.length === 0 && <p className="text-center text-ink-light/60 py-10">No officers found.</p>}
        </div>
      )}
    </div>
  );
}
