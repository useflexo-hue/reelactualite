const MONTHS = [
  "janvier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "août",
  "septembre",
  "octobre",
  "novembre",
  "décembre",
];

export function formatDateTime(value: string | null, mode: "full" | "time" = "full") {
  if (!value) return "";
  const d = new Date(value);
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  if (mode === "time") return `${hh}:${mm}`;
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()} · ${hh}:${mm}`;
}

export function isoDate(value: string | null) {
  if (!value) return "";
  return new Date(value).toISOString();
}
