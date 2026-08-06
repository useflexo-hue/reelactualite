/**
 * Export CSV / PDF de l'historique de supervision du direct.
 * Exécuté côté navigateur (téléchargement direct).
 */
import type { DirectDashboard, DirectEventRow } from "@/lib/direct.functions";

export const KIND_LABEL: Record<string, string> = {
  health: "Sonde de santé",
  client_alert: "Alerte navigateur",
  home_data: "Rendu accueil",
  error: "Erreur",
};

export const SEVERITY_LABEL: Record<string, string> = {
  ok: "Opérationnel",
  info: "Info",
  warn: "À surveiller",
  critical: "Critique",
};

export const REASON_LABEL: Record<string, string> = {
  animation_stopped: "Animation du bandeau arrêtée",
  content_warn: "Contenu vieillissant",
  content_critical: "Contenu figé",
  health_exception: "Échec de la sonde de santé",
};

const fmt = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "Africa/Kinshasa",
});

function when(iso: string) {
  return fmt.format(new Date(iso));
}

export function rangeLabel(days: number): string {
  if (days === 1) return "24 dernières heures";
  if (days === 7) return "7 derniers jours";
  if (days === 30) return "30 derniers jours";
  return "12 derniers mois";
}

const dayFmt = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "short",
  timeZone: "Africa/Kinshasa",
});

/** Libellé de la période effective (préréglage ou plage personnalisée). */
export function describeRange(dash: {
  range_days: number;
  range_start: string;
  range_end: string;
  range_custom: boolean;
}): string {
  if (!dash.range_custom) return rangeLabel(dash.range_days);
  return `du ${dayFmt.format(new Date(dash.range_start))} au ${dayFmt.format(
    new Date(dash.range_end),
  )}`;
}

function rangeSlug(dash: { range_days: number; range_start: string; range_end: string; range_custom: boolean }) {
  return dash.range_custom
    ? `${dash.range_start.slice(0, 10)}_${dash.range_end.slice(0, 10)}`
    : `${dash.range_days}j`;
}

function rows(events: DirectEventRow[]): string[][] {
  return events.map((e) => [
    when(e.created_at),
    KIND_LABEL[e.kind] ?? e.kind,
    SEVERITY_LABEL[e.severity] ?? e.severity,
    e.db_error ?? (e.reason ? (REASON_LABEL[e.reason] ?? e.reason) : ""),
    e.age_minutes !== null ? String(e.age_minutes) : "",
    e.breaking_count !== null ? String(e.breaking_count) : "",
    e.ticker_items !== null ? String(e.ticker_items) : "",
    e.duration_ms !== null ? String(e.duration_ms) : "",
    e.path ?? "",
  ]);
}

const HEADERS = [
  "Date",
  "Type",
  "Gravité",
  "Détail",
  "Âge article (min)",
  "Alertes breaking",
  "Titres du fil",
  "Durée (ms)",
  "Page",
];

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function fileStamp() {
  return new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
}

export function exportDirectCsv(dash: DirectDashboard, events: DirectEventRow[]) {
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const meta = [
    ["ReelActu — Historique supervision du direct"],
    ["Période", describeRange(dash)],
    ["Début de période", when(dash.range_start)],
    ["Fin de période", when(dash.range_end)],
    ["Export généré le", when(dash.checked_at)],
    ["État actuel", SEVERITY_LABEL[dash.status] ?? dash.status],
    ["Âge du dernier article (min)", String(dash.age_minutes ?? "")],
    ["Alertes 24 h", String(dash.counters.alerts_24h)],
    ["Erreurs 24 h", String(dash.counters.errors_24h)],
    ["Événements exportés", String(events.length)],
    [],
  ];
  const lines = [...meta.map((r) => r.map((c) => esc(String(c))).join(",")), HEADERS.map(esc).join(",")];
  for (const r of rows(events)) lines.push(r.map(esc).join(","));
  download(
    new Blob(["\uFEFF" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" }),
    `reelactu-direct-${rangeSlug(dash)}-${fileStamp()}.csv`,
  );
}

export async function exportDirectPdf(dash: DirectDashboard, events: DirectEventRow[]) {
  const [{ jsPDF }, autoTableMod] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const autoTable = (autoTableMod as unknown as { default: (doc: unknown, opts: unknown) => void })
    .default;

  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();

  doc.setFontSize(16);
  doc.text("ReelActu — Supervision du direct", 40, 42);
  doc.setFontSize(10);
  doc.setTextColor(110);
  doc.text(
    `Période : ${describeRange(dash)} (du ${when(dash.range_start)} au ${when(
      dash.range_end,
    )}) · Export du ${when(dash.checked_at)}`,
    40,
    60,
  );

  const summary = [
    ["État actuel", SEVERITY_LABEL[dash.status] ?? dash.status],
    [
      "Âge du dernier article",
      dash.age_minutes !== null ? `${dash.age_minutes} min` : "aucune publication",
    ],
    ["Alertes 24 h / 7 j", `${dash.counters.alerts_24h} / ${dash.counters.alerts_7d}`],
    ["Erreurs 24 h", String(dash.counters.errors_24h)],
    [
      "Temps de rafraîchissement",
      `${dash.query_ms} ms${
        dash.counters.avg_duration_ms !== null
          ? ` (moyenne sondes : ${dash.counters.avg_duration_ms} ms)`
          : ""
      }`,
    ],
    ["Événements sur la période", String(events.length)],
  ];

  autoTable(doc, {
    startY: 76,
    head: [["Indicateur", "Valeur"]],
    body: summary,
    theme: "grid",
    styles: { fontSize: 9, cellPadding: 4 },
    headStyles: { fillColor: [17, 17, 17], textColor: 255 },
    columnStyles: { 0: { cellWidth: 180 } },
    margin: { left: 40, right: 40 },
  });

  const afterSummary =
    (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 160;

  doc.setFontSize(12);
  doc.setTextColor(0);
  doc.text("Historique des alertes et erreurs [direct]", 40, afterSummary + 26);

  autoTable(doc, {
    startY: afterSummary + 36,
    head: [HEADERS],
    body: events.length ? rows(events) : [["—", "Aucun événement sur la période", "", "", "", "", "", "", ""]],
    theme: "striped",
    styles: { fontSize: 8, cellPadding: 3, overflow: "linebreak" },
    headStyles: { fillColor: [17, 17, 17], textColor: 255 },
    columnStyles: {
      0: { cellWidth: 82 },
      1: { cellWidth: 82 },
      2: { cellWidth: 72 },
      3: { cellWidth: 230 },
      4: { cellWidth: 66, halign: "right" },
      5: { cellWidth: 66, halign: "right" },
      6: { cellWidth: 62, halign: "right" },
      7: { cellWidth: 56, halign: "right" },
    },
    margin: { left: 40, right: 40, bottom: 46 },
    didDrawPage: () => {
      const page = doc.getNumberOfPages();
      doc.setFontSize(8);
      doc.setTextColor(130);
      doc.text(`ReelActu · L'information Réelle — page ${page}`, width - 40, height - 22, {
        align: "right",
      });
    },
  });

  doc.save(`reelactu-direct-${rangeSlug(dash)}-${fileStamp()}.pdf`);
}
