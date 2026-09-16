import React from "react";
import { useTranslation } from "react-i18next";

// The core "solve the invisibility problem" component: shows the citizen
// exactly where their complaint stands, like a shipment tracker, instead
// of a black box. Escalated status breaks the rail with an alert marker.
const STEPS = ["submitted", "underReview", "assigned", "investigation", "resolved"];

export default function StatusTimeline({ status, history = [] }) {
  const { t } = useTranslation();
  const isEscalated = status === "escalated";
  const currentIndex = isEscalated ? STEPS.length - 2 : STEPS.indexOf(status === "closed" ? "resolved" : status);

  return (
    <div className="w-full py-2">
      <div className="flex items-center">
        {STEPS.map((step, i) => {
          const done = i <= currentIndex && !isEscalated;
          const isCurrent = i === currentIndex;
          return (
            <React.Fragment key={step}>
              <div className="flex flex-col items-center gap-1.5 shrink-0">
                <div
                  className={[
                    "w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors",
                    done ? "bg-teal border-teal" : "bg-white border-paperDark",
                    isCurrent && !isEscalated ? "ring-4 ring-teal/20" : "",
                  ].join(" ")}
                />
                <span className={`text-[11px] font-medium text-center w-16 leading-tight ${done ? "text-ink-dark" : "text-ink-light/50"}`}>
                  {t(`complaint.status.${step}`)}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`h-0.5 flex-1 -mt-5 ${i < currentIndex ? "bg-teal" : "bg-paperDark"}`} />
              )}
            </React.Fragment>
          );
        })}
      </div>
      {isEscalated && (
        <div className="mt-3 flex items-center gap-2 text-alert text-sm font-semibold bg-alert/10 rounded-md px-3 py-2 w-fit">
          <span className="w-2 h-2 rounded-full bg-alert animate-pulse" />
          {t("complaint.status.escalated")}
        </div>
      )}
      {history.length > 0 && (
        <div className="mt-4 border-l-2 border-paperDark ml-2 space-y-3">
          {[...history].reverse().map((entry, index) => (
            <div key={`${entry.createdAt}-${index}`} className="relative pl-4 text-xs">
              <span className="absolute -left-[5px] top-1 w-2 h-2 rounded-full bg-teal" />
              <p className="font-semibold">{entry.action === "assignment" ? `Assigned to ${entry.toValue}` : `${entry.fromValue || "New"} -> ${entry.toValue || "Updated"}`}</p>
              <p className="text-ink-light/60">{entry.byUserName || "System"} · {new Date(entry.createdAt).toLocaleString()}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
