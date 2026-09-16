import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext.jsx";
import api from "../api/axios.js";

export default function Login() {
  const { t } = useTranslation();
  const { login, loginWithOtp } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ phone: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState("password");
  const [otpSent, setOtpSent] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const user = mode === "password" ? await login(form.phone, form.password) : await loginWithOtp(form.phone, form.password);
      if (user.requiresTwoFactor) {
        setMode("otp");
        setOtpSent(true);
        setForm({ ...form, password: user.devCode || "" });
        return;
      }
      if (user.role === "citizen") navigate("/citizen");
      else if (user.role === "officer") navigate("/officer");
      else navigate("/admin");
    } catch (err) {
      setError(err.response?.data?.message || t("common.error"));
    } finally {
      setLoading(false);
    }
  };

  const sendOtp = async () => {
    setError("");
    try {
      const { data } = await api.post("/auth/otp/request", { phone: form.phone, purpose: "login" });
      setOtpSent(true);
      if (data.devCode) setForm({ ...form, password: data.devCode });
    } catch (err) {
      setError(err.response?.data?.message || t("common.error"));
    }
  };

  return (
    <div className="max-w-md mx-auto px-6 py-16">
      <div className="bg-white rounded-2xl shadow-card p-8">
        <h1 className="font-display font-bold text-2xl mb-6">{t("auth.loginTitle")}</h1>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">{t("auth.phone")}</label>
            <input
              type="tel" required value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full border border-paperDark rounded-lg px-3.5 py-2.5 focus:border-ink outline-none"
              placeholder="9876543210"
            />
          </div>
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-sm font-medium">{mode === "password" ? t("auth.password") : "OTP code"}</label>
              <button type="button" onClick={() => { setMode(mode === "password" ? "otp" : "password"); setOtpSent(false); setError(""); }} className="text-xs text-marigold-dark font-semibold">
                {mode === "password" ? "Login with OTP" : "Use password"}
              </button>
            </div>
            <input
              type={mode === "password" ? "password" : "text"} required value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full border border-paperDark rounded-lg px-3.5 py-2.5 focus:border-ink outline-none"
            />
          </div>
          {mode === "otp" && <button type="button" onClick={sendOtp} className="text-sm text-ink-light underline">{otpSent ? "Resend OTP" : "Send OTP"}</button>}
          {error && <p className="text-alert text-sm">{error}</p>}
          <button
            disabled={loading}
            className="w-full bg-ink text-white font-semibold py-2.5 rounded-lg hover:bg-ink-light transition-colors disabled:opacity-60"
          >
            {loading ? t("common.loading") : t("auth.loginBtn")}
          </button>
        </form>
        <p className="text-sm text-ink-light/70 mt-5">
          {t("auth.noAccount")}{" "}
          <Link to="/register" className="text-marigold-dark font-semibold hover:underline">{t("auth.registerBtn")}</Link>
        </p>
      </div>
    </div>
  );
}
