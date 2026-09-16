import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext.jsx";

export default function Register() {
  const { t } = useTranslation();
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", phone: "", email: "", password: "", preferredLanguage: "hi" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await register(form);
      navigate("/citizen");
    } catch (err) {
      setError(err.response?.data?.message || t("common.error"));
    } finally {
      setLoading(false);
    }
  };

  const field = (key, label, type = "text", required = true) => (
    <div>
      <label className="block text-sm font-medium mb-1.5">{label}</label>
      <input
        type={type} required={required} value={form[key]}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        className="w-full border border-paperDark rounded-lg px-3.5 py-2.5 focus:border-ink outline-none"
      />
    </div>
  );

  return (
    <div className="max-w-md mx-auto px-6 py-16">
      <div className="bg-white rounded-2xl shadow-card p-8">
        <h1 className="font-display font-bold text-2xl mb-6">{t("auth.registerTitle")}</h1>
        <form onSubmit={submit} className="space-y-4">
          {field("name", t("auth.name"))}
          {field("phone", t("auth.phone"), "tel")}
          {field("email", t("auth.email"), "email", false)}
          {field("password", t("auth.password"), "password")}
          <div>
            <label className="block text-sm font-medium mb-1.5">{t("auth.preferredLanguage")}</label>
            <select
              value={form.preferredLanguage}
              onChange={(e) => setForm({ ...form, preferredLanguage: e.target.value })}
              className="w-full border border-paperDark rounded-lg px-3.5 py-2.5 focus:border-ink outline-none bg-white"
            >
              <option value="hi">हिंदी</option>
              <option value="en">English</option>
            </select>
          </div>
          {error && <p className="text-alert text-sm">{error}</p>}
          <button
            disabled={loading}
            className="w-full bg-ink text-white font-semibold py-2.5 rounded-lg hover:bg-ink-light transition-colors disabled:opacity-60"
          >
            {loading ? t("common.loading") : t("auth.registerBtn")}
          </button>
        </form>
        <p className="text-sm text-ink-light/70 mt-5">
          {t("auth.haveAccount")}{" "}
          <Link to="/login" className="text-marigold-dark font-semibold hover:underline">{t("auth.loginBtn")}</Link>
        </p>
      </div>
    </div>
  );
}
