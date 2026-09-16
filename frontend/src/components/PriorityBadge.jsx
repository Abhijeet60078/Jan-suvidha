import React from "react";
import { useTranslation } from "react-i18next";

const STYLES = {
  low: "bg-paperDark text-ink-light",
  medium: "bg-marigold/20 text-marigold-dark",
  high: "bg-alert/15 text-alert",
  critical: "bg-alert text-white",
};

export default function PriorityBadge({ priority }) {
  const { t } = useTranslation();
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${STYLES[priority] || STYLES.low}`}>
      {t(`complaint.priority.${priority}`)}
    </span>
  );
}
