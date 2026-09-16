// Issue/complaint type options for the citizen complaint form.
// These map directly into the existing `crimeType` field on the Complaint
// model (kept as-is to avoid a breaking schema/API change) but are now
// chosen from a dropdown instead of free text (fix-list item #5/#11).
// Each entry has bilingual labels; `value` is what gets submitted.
export const issueTypes = [
  { value: "Water Supply Problem", en: "Water Supply Problem", hi: "जल आपूर्ति समस्या" },
  { value: "Electricity Problem", en: "Electricity Problem", hi: "बिजली समस्या" },
  { value: "Road Damage", en: "Road Damage", hi: "सड़क क्षति" },
  { value: "Garbage Collection", en: "Garbage Collection", hi: "कूड़ा संग्रहण" },
  { value: "Streetlight Not Working", en: "Streetlight Not Working", hi: "स्ट्रीट लाइट खराब" },
  { value: "Health Service", en: "Health Service", hi: "स्वास्थ्य सेवा" },
  { value: "Police Complaint", en: "Police Complaint", hi: "पुलिस शिकायत" },
  { value: "Education Issue", en: "Education Issue", hi: "शिक्षा संबंधी समस्या" },
  { value: "Land / Property Dispute", en: "Land / Property Dispute", hi: "भूमि / संपत्ति विवाद" },
  { value: "Transport / Licensing", en: "Transport / Licensing", hi: "परिवहन / लाइसेंस" },
  { value: "Other", en: "Other", hi: "अन्य" },
];
