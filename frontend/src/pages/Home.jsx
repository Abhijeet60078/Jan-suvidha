import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import api from "../api/axios.js";

export default function Home() {
  const { t } = useTranslation();
  const [departments, setDepartments] = useState([]);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.get("/admin/departments").then(({ data }) => setDepartments(data.departments)).catch(() => {});
    api.get("/public/stats").then(({ data }) => setStats(data)).catch(() => {});
  }, []);

  const steps = ["step1", "step2", "step3", "step4"];

  return (
    <div>
      {/* Hero */}
      <section className="bg-ink text-white">
        <div className="max-w-6xl mx-auto px-6 py-20 grid md:grid-cols-5 gap-10 items-center">
          <div className="md:col-span-3">
            <span className="inline-block text-marigold-light font-mono text-xs tracking-widest uppercase mb-4">
              Uttar Pradesh · Government of India
            </span>
            <h1 className="font-display font-extrabold text-3xl sm:text-4xl lg:text-5xl leading-tight mb-5">
              {t("home.heroTitle")}
            </h1>
            <p className="text-white/75 text-base sm:text-lg mb-8 max-w-xl">{t("home.heroSubtitle")}</p>
            <div className="flex flex-wrap gap-3">
              <Link to="/citizen/file" className="bg-marigold text-ink-dark font-semibold px-6 py-3 rounded-lg hover:bg-marigold-light transition-colors">
                {t("home.cta")}
              </Link>
              <Link to="/track" className="border border-white/30 font-semibold px-6 py-3 rounded-lg hover:bg-white/10 transition-colors">
                {t("home.ctaTrack")}
              </Link>
            </div>
          </div>

          {/* Signature element preview: a live-looking tracking card */}
          <div className="md:col-span-2 bg-white text-ink-dark rounded-2xl shadow-card p-5 font-mono">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs text-ink-light/60 tracking-wide">TRACKING ID</span>
              <span className="text-xs bg-teal/15 text-teal font-semibold px-2 py-0.5 rounded-full font-body">Investigation</span>
            </div>
            <div className="text-lg font-bold mb-5">UP-2026-004821</div>
            <div className="space-y-3">
              {["Submitted", "Under Review", "Assigned", "Investigation", "Resolved"].map((s, i) => (
                <div key={s} className="flex items-center gap-3">
                  <div className={`w-2.5 h-2.5 rounded-full ${i < 3 ? "bg-teal" : "bg-paperDark"}`} />
                  <div className={`h-px flex-1 ${i < 3 ? "bg-teal/40" : "bg-paperDark"}`} />
                  <span className={`text-xs font-body ${i < 3 ? "text-ink-dark font-semibold" : "text-ink-light/50"}`}>{s}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
          <div>
            <h2 className="font-display font-bold text-2xl">{t("home.publicStats")}</h2>
            <p className="text-sm text-ink-light/70 mt-1">{t("home.publicStatsSubtitle")}</p>
          </div>
          <div className="bg-teal/10 rounded-xl px-5 py-3">
            <p className="font-display font-bold text-2xl text-teal">{(stats?.totalResolved ?? 0).toLocaleString()}</p>
            <p className="text-xs text-ink-light/70">{t("home.complaintsResolved")}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-card p-5">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={stats?.byDepartment || []} layout="vertical" margin={{ left: 20, right: 20 }}>
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="department" width={140} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#E2933D" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <h2 className="font-display font-bold text-2xl mb-10">{t("home.howItWorks")}</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((s, i) => (
            <div key={s} className="bg-white rounded-xl shadow-card p-5">
              <div className="font-mono text-marigold-dark font-bold text-sm mb-3">{String(i + 1).padStart(2, "0")}</div>
              <h3 className="font-display font-semibold text-base mb-2">{t(`home.${s}Title`)}</h3>
              <p className="text-sm text-ink-light/80 leading-relaxed">{t(`home.${s}Desc`)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Departments */}
      <section className="bg-paperDark/40 py-16">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="font-display font-bold text-2xl mb-8">{t("home.departments")}</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {departments.map((d) => (
              <div key={d._id} className="bg-white rounded-lg p-4 shadow-card flex items-start gap-3">
                <div className="w-9 h-9 rounded-md bg-ink text-marigold-light flex items-center justify-center font-mono font-bold text-xs shrink-0">
                  {d.code.slice(0, 2)}
                </div>
                <div>
                  <div className="font-semibold text-sm">{d.nameEn}</div>
                  <div className="text-ink-light/70 text-sm">{d.nameHi}</div>
                </div>
              </div>
            ))}
            {departments.length === 0 && (
              <p className="text-ink-light/60 text-sm col-span-full">
                Department list will appear here once the backend is running and seeded.
              </p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
