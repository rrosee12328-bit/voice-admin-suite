// Render proposal templates as PDF using jsPDF.
import type { ProposalSection, ProposalTemplate } from "./proposals";

export async function proposalToPdf(
  template: ProposalTemplate,
  clientName: string,
): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 56;
  const usableW = pageW - margin * 2;
  let y = margin;

  const ensureSpace = (h: number) => {
    if (y + h > pageH - margin) {
      doc.addPage();
      y = margin;
    }
  };

  const writeLines = (
    text: string,
    opts: {
      size?: number;
      bold?: boolean;
      color?: [number, number, number];
      gap?: number;
      indent?: number;
    } = {},
  ) => {
    const { size = 11, bold = false, color = [40, 40, 40], gap = 6, indent = 0 } = opts;
    doc.setFontSize(size);
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setTextColor(...color);
    const lines = doc.splitTextToSize(text, usableW - indent);
    const lineH = size * 1.35;
    for (const line of lines) {
      ensureSpace(lineH);
      doc.text(line, margin + indent, y);
      y += lineH;
    }
    y += gap;
  };

  // Header band
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageW, 70, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("VEKTISS", margin, 32);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Custom Proposal", margin, 48);
  doc.setFontSize(9);
  doc.text(new Date().toLocaleDateString(), pageW - margin, 32, { align: "right" });
  y = 100;

  const sections = template.build(clientName);
  for (const s of sections) {
    renderSection(s);
  }

  function renderSection(s: ProposalSection) {
    switch (s.type) {
      case "heading":
        ensureSpace(40);
        writeLines(s.text, { size: 20, bold: true, color: [15, 23, 42], gap: 10 });
        doc.setDrawColor(226, 232, 240);
        doc.line(margin, y, pageW - margin, y);
        y += 14;
        break;
      case "subheading":
        ensureSpace(28);
        y += 4;
        writeLines(s.text, { size: 13, bold: true, color: [15, 23, 42], gap: 6 });
        break;
      case "paragraph":
        writeLines(s.text, { size: 10.5, color: [51, 65, 85], gap: 8 });
        break;
      case "bullets":
        for (const item of s.items) {
          ensureSpace(20);
          doc.setFontSize(10.5);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(59, 130, 246);
          doc.text("•", margin, y);
          writeLines(item, { size: 10.5, color: [51, 65, 85], gap: 4, indent: 14 });
        }
        y += 4;
        break;
      case "callout": {
        ensureSpace(36);
        doc.setFillColor(241, 245, 249);
        doc.roundedRect(margin, y - 4, usableW, 28, 4, 4, "F");
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(100, 116, 139);
        doc.text(s.label.toUpperCase(), margin + 12, y + 8);
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(15, 23, 42);
        doc.text(s.text, pageW - margin - 12, y + 14, { align: "right" });
        y += 36;
        break;
      }
    }
  }

  return doc.output("blob");
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
