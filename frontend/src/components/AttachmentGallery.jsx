import React from "react";

export default function AttachmentGallery({ attachments = [], label = "Attachments" }) {
  if (!attachments.length) return null;

  return (
    <div className="mt-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-light/60 mb-2">{label}</p>
      <div className="flex flex-wrap gap-2">
        {attachments.map((attachment, index) => {
          const url = typeof attachment === "string" ? attachment : attachment.url;
          const resourceType = typeof attachment === "string" ? "image" : attachment.resourceType || "image";
          return <a key={`${url}-${index}`} href={url} target="_blank" rel="noreferrer" className="block w-20 h-20 rounded-lg overflow-hidden border border-paperDark bg-paper hover:opacity-80">
            {resourceType === "video" ? <video src={url} className="w-full h-full object-cover" muted /> : resourceType === "raw" ? <span className="w-full h-full flex items-center justify-center text-xs font-semibold">PDF</span> : <img src={url} alt={`${label} ${index + 1}`} className="w-full h-full object-cover" />}
          </a>;
        })}
      </div>
    </div>
  );
}
