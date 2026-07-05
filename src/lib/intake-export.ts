// Render intake form answers as Markdown and PDF.
import { INTAKE_SECTIONS, type Question } from "./intake-questions";
import { FORECLOSURE_INTAKE_SECTIONS } from "./intake-questions-foreclosure";
import { MEDSPA_INTAKE_SECTIONS } from "./intake-questions-medspa";

export type IntakeRow = {
  id: string;
  token: string;
  business_name: string | null;
  contact_phone: string | null;
  website: string | null;
  services: string | null;
  answers: Record<string, any>;
  status: string;
  submitted_at: string | null;
  created_at: string;
  form_type?: string;
};

function getSections(row: IntakeRow) {
  if (row.form_type === "foreclosure_law") return FORECLOSURE_INTAKE_SECTIONS;
  if (row.form_type === "medspa") return MEDSPA_INTAKE_SECTIONS;
  return INTAKE_SECTIONS;
}

function renderAnswer(q: Question, value: any): string {
  if (value == null || value === "") return "_(not answered)_";
  if (q.type === "multiselect" && Array.isArray(value)) {
    if (value.length === 0) return "_(none selected)_";
    return value.map((v) => `- ${v}`).join("\n");
  }
  return String(value);
}

export function intakeToMarkdown(row: IntakeRow): string {
  const lines: string[] = [];
  lines.push(`# Vektiss Voice — Client Intake Questionnaire`);
  if (row.business_name) lines.push(`## ${row.business_name}`);
  lines.push("");
  lines.push(`**Submitted:** ${row.submitted_at ? new Date(row.submitted_at).toLocaleString() : "Draft (not yet submitted)"}`);
  if (row.contact_phone) lines.push(`**Phone:** ${row.contact_phone}`);
  if (row.website) lines.push(`**Website:** ${row.website}`);
  lines.push("");
  lines.push("---");
  lines.push("");

  for (const section of getSections(row)) {
    lines.push(`## ${section.title}`);
    if (section.intro) {
      lines.push("");
      lines.push(`> ${section.intro}`);
    }
    lines.push("");
    for (const q of section.questions) {
      lines.push(`### ${q.label}`);
      const val = row.answers?.[q.id];
      const rendered = renderAnswer(q, val);
      lines.push("");
      lines.push(rendered);
      lines.push("");
    }
    lines.push("---");
    lines.push("");
  }

  return lines.join("\n");
}

export function downloadBlob(content: string | Blob, filename: string, mime?: string) {
  const blob = typeof content === "string" ? new Blob([content], { type: mime ?? "text/plain;charset=utf-8" }) : content;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function intakeToPdf(row: IntakeRow): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 48;
  const usableW = pageW - margin * 2;
  let y = margin;

  const ensureSpace = (h: number) => {
    if (y + h > pageH - margin) {
      doc.addPage();
      y = margin;
    }
  };

  const writeText = (text: string, opts: { size?: number; bold?: boolean; color?: [number, number, number]; gap?: number } = {}) => {
    const { size = 11, bold = false, color = [30, 30, 30], gap = 4 } = opts;
    doc.setFontSize(size);
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setTextColor(...color);
    const lines = doc.splitTextToSize(text, usableW);
    const lineH = size * 1.25;
    for (const line of lines) {
      ensureSpace(lineH);
      doc.text(line, margin, y);
      y += lineH;
    }
    y += gap;
  };

  // Title
  writeText("Vektiss Voice — Client Intake Questionnaire", { size: 18, bold: true, gap: 6 });
  if (row.business_name) writeText(row.business_name, { size: 14, bold: true, color: [60, 60, 60], gap: 8 });

  writeText(`Submitted: ${row.submitted_at ? new Date(row.submitted_at).toLocaleString() : "Draft (not yet submitted)"}`, { size: 9, color: [120, 120, 120], gap: 2 });
  if (row.contact_phone) writeText(`Phone: ${row.contact_phone}`, { size: 9, color: [120, 120, 120], gap: 2 });
  if (row.website) writeText(`Website: ${row.website}`, { size: 9, color: [120, 120, 120], gap: 8 });

  // Divider
  doc.setDrawColor(220, 220, 220);
  doc.line(margin, y, pageW - margin, y);
  y += 14;

  for (const section of getSections(row)) {
    ensureSpace(40);
    writeText(section.title, { size: 14, bold: true, color: [20, 20, 20], gap: 4 });
    if (section.intro) {
      writeText(section.intro, { size: 9, color: [120, 120, 120], gap: 6 });
    }
    for (const q of section.questions) {
      ensureSpace(30);
      writeText(q.label, { size: 10, bold: true, color: [40, 40, 40], gap: 2 });
      const val = row.answers?.[q.id];
      let body = "";
      if (val == null || val === "") body = "(not answered)";
      else if (q.type === "multiselect" && Array.isArray(val)) {
        body = val.length === 0 ? "(none selected)" : val.map((v) => `• ${v}`).join("\n");
      } else body = String(val);
      writeText(body, { size: 10, color: [50, 50, 50], gap: 10 });
    }
    ensureSpace(20);
    doc.setDrawColor(230, 230, 230);
    doc.line(margin, y, pageW - margin, y);
    y += 14;
  }

  return doc.output("blob");
}
