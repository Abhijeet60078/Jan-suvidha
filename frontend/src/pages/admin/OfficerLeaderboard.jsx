import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import api from "../../api/axios.js";
import RatingGauge from "../../components/RatingGauge.jsx";

export default function OfficerLeaderboard() {
  const { t, i18n } = useTranslation();
  const [officers, setOfficers] = useState([]);

  useEffect(() => {
    api.get("/admin/officers/leaderboard").then(({ data }) => setOfficers(data.officers));
  }, []);

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <h1 className="font-display font-bold text-2xl mb-8">{t("admin.leaderboard")}</h1>

      <div className="bg-white rounded-xl shadow-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-paper text-ink-light/70 text-left">
            <tr>
              <th className="px-5 py-3 font-medium">Officer</th>
              <th className="px-5 py-3 font-medium">Department</th>
              <th className="px-5 py-3 font-medium text-center">Rating</th>
              <th className="px-5 py-3 font-medium text-center">Assigned</th>
              <th className="px-5 py-3 font-medium text-center">SLA Missed</th>
              <th className="px-5 py-3 font-medium text-center">Salary</th>
              <th className="px-5 py-3 font-medium text-center">Promotion</th>
            </tr>
          </thead>
          <tbody>
            {officers.map((o) => (
              <tr key={o._id} className="border-t border-paperDark">
                <td className="px-5 py-3 font-medium">{o.name}{o.underReview && <span className="ml-2 text-xs bg-alert text-white px-2 py-0.5 rounded-full">{t("officer.underReview")}</span>}</td>
                <td className="px-5 py-3 text-ink-light/70">{i18n.language === "hi" ? o.department?.nameHi : o.department?.nameEn}</td>
                <td className="px-5 py-3">
                  <div className="flex justify-center"><RatingGauge value={o.rating} size={56} /></div>
                </td>
                <td className="px-5 py-3 text-center">{o.totalAssigned}</td>
                <td className="px-5 py-3 text-center text-alert font-semibold">{o.totalMissedSLA}</td>
                <td className="px-5 py-3 text-center">{o.salaryEligible ? "✓" : <span className="text-alert">✗</span>}</td>
                <td className="px-5 py-3 text-center">{o.promotionEligible ? "✓" : <span className="text-alert">✗</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {officers.length === 0 && <p className="text-center text-ink-light/60 py-10">No officers found.</p>}
      </div>
    </div>
  );
}
