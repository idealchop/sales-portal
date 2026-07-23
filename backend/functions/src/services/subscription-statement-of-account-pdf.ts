import PDFDocument from "pdfkit";
import { formatBusinessAddressForPdf } from "./subscription-official-receipt-pdf";

export type StatementLineItem = {
  subscriptionId: string;
  planName: string;
  planCode: string;
  billingCycle: string;
  price: number;
  paymentMethod: string;
  paymentReference: string;
  paymentStatus: string;
  periodStart: string;
  periodEnd: string;
};

export type SubscriptionStatementPdfInput = {
  businessName: string;
  businessEmail: string;
  businessPhone: string;
  businessAddress: string;
  ownerDisplayName: string;
  ownerEmail: string;
  generatedAtLabel: string;
  lines: StatementLineItem[];
};

function drawWatermark(doc: InstanceType<typeof PDFDocument>): void {
  const w = doc.page.width;
  const h = doc.page.height;
  doc.save();
  doc.translate(w / 2, h / 2);
  doc.rotate(-34);
  doc.opacity(0.06);
  doc.fillColor("#0f766e");
  doc.font("Helvetica-Bold").fontSize(48);
  doc.text("SMART REFILL", -220, -28, { width: 440, align: "center" });
  doc.font("Helvetica").fontSize(12);
  doc.opacity(0.045);
  doc.text("Statement of account", -220, 28, {
    width: 440,
    align: "center",
  });
  doc.restore();
}

function resetCursor(
  doc: InstanceType<typeof PDFDocument>,
  fallbackMargin: number,
): void {
  const m = doc.page.margins;
  const left = typeof m?.left === "number" ? m.left : fallbackMargin;
  const top = typeof m?.top === "number" ? m.top : fallbackMargin;
  doc.opacity(1);
  doc.fillColor("#111827");
  doc.strokeColor("#000000");
  doc.lineWidth(1);
  doc.font("Helvetica");
  doc.x = left;
  doc.y = top;
}

function money(n: number): string {
  return n.toLocaleString("en-PH", { maximumFractionDigits: 2 });
}

/**
 * Statement of account PDF listing all subscription payment periods
 * for one business (newest first).
 */
export function buildSubscriptionStatementPdf(
  input: SubscriptionStatementPdfInput,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "A4",
        margin: 48,
        info: {
          Title: "Smart Refill Statement of Account",
          Author: "Smart Refill Sales Portal",
        },
      });
      const chunks: Buffer[] = [];
      doc.on("data", (chunk: Buffer) => {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      });
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      drawWatermark(doc);
      const margin =
        typeof doc.page.margins?.left === "number" ? doc.page.margins.left : 48;
      resetCursor(doc, margin);
      const contentWidth = doc.page.width - margin * 2;

      const section = (title: string) => {
        doc.moveDown(0.5);
        doc
          .fillColor("#0f766e")
          .fontSize(10)
          .font("Helvetica-Bold")
          .text(title.toUpperCase(), margin, doc.y, { width: contentWidth });
        const lineY = doc.y + 2;
        doc
          .strokeColor("#e2e8f0")
          .lineWidth(0.5)
          .moveTo(margin, lineY)
          .lineTo(doc.page.width - margin, lineY)
          .stroke();
        doc.moveDown(0.4);
        doc.fillColor("#111827").font("Helvetica");
      };

      const row = (label: string, value: string) => {
        const rowTop = doc.y;
        doc
          .fontSize(9)
          .fillColor("#6b7280")
          .font("Helvetica")
          .text(`${label}: `, margin, rowTop, {
            continued: true,
            width: contentWidth,
          });
        doc.fillColor("#111827").font("Helvetica-Bold").text(value || "—");
        doc.font("Helvetica");
        doc.moveDown(0.2);
      };

      doc
        .fillColor("#0f766e")
        .fontSize(22)
        .font("Helvetica-Bold")
        .text("Smart Refill", margin, doc.y, { width: contentWidth });
      doc
        .fillColor("#374151")
        .fontSize(11)
        .font("Helvetica")
        .text("Statement of Account — Subscriptions", margin, doc.y, {
          width: contentWidth,
        });
      doc.moveDown(0.35);
      doc
        .fontSize(8)
        .fillColor("#9ca3af")
        .text(
          "River Tech Inc. · SEC Reg. 2025080215620-07 · BF Homes, 410 El Grande Ave, " +
            "Parañaque, 1720 Metro Manila, PH",
          margin,
          doc.y,
          { width: contentWidth },
        );
      doc.moveDown(0.35);
      doc
        .fontSize(8)
        .fillColor("#6b7280")
        .text(`Generated ${input.generatedAtLabel}`, margin, doc.y, {
          width: contentWidth,
        });

      section("Account");
      row("Business name", input.businessName);
      row("Business email", input.businessEmail);
      row("Phone", input.businessPhone);
      row("Address", input.businessAddress);
      row("Owner", input.ownerDisplayName || "—");
      row("Owner email", input.ownerEmail || "—");

      section("Payment history");
      doc
        .fontSize(8)
        .fillColor("#6b7280")
        .text("Periods listed newest first.", margin, doc.y, {
          width: contentWidth,
        });
      doc.moveDown(0.45);

      if (input.lines.length === 0) {
        doc
          .fontSize(10)
          .fillColor("#6b7280")
          .text("No subscription payments on file.", margin, doc.y, {
            width: contentWidth,
          });
      } else {
        for (const line of input.lines) {
          if (doc.y > doc.page.height - 120) {
            doc.addPage();
            drawWatermark(doc);
            resetCursor(doc, margin);
          }

          const planLabel =
            line.planCode ?
              `${line.planName} (${line.planCode})`
            : line.planName;

          doc
            .fontSize(10)
            .fillColor("#111827")
            .font("Helvetica-Bold")
            .text(planLabel, margin, doc.y, { width: contentWidth * 0.7 });
          doc
            .fontSize(10)
            .fillColor("#111827")
            .font("Helvetica-Bold")
            .text(`PHP ${money(line.price)}`, margin, doc.y - 12, {
              width: contentWidth,
              align: "right",
            });
          doc.moveDown(0.15);
          doc
            .fontSize(8)
            .fillColor("#6b7280")
            .font("Helvetica")
            .text(
              [
                line.billingCycle || "—",
                `${line.periodStart} → ${line.periodEnd}`,
                line.paymentStatus || "—",
                line.paymentMethod ? `via ${line.paymentMethod}` : null,
                line.paymentReference ? `ref ${line.paymentReference}` : null,
                `id ${line.subscriptionId}`,
              ]
                .filter(Boolean)
                .join(" · "),
              margin,
              doc.y,
              { width: contentWidth },
            );
          doc.moveDown(0.55);
          doc
            .strokeColor("#f1f5f9")
            .lineWidth(0.5)
            .moveTo(margin, doc.y)
            .lineTo(doc.page.width - margin, doc.y)
            .stroke();
          doc.moveDown(0.45);
        }
      }

      const totalPaid = input.lines
        .filter((line) => {
          const ps = line.paymentStatus.toLowerCase();
          return ps === "verified" || ps === "approved";
        })
        .reduce((sum, line) => sum + line.price, 0);
      const totalListed = input.lines.reduce((sum, line) => sum + line.price, 0);

      section("Totals");
      row("Periods listed", String(input.lines.length));
      row("Sum of listed amounts", `PHP ${money(totalListed)}`);
      row("Verified / approved paid", `PHP ${money(totalPaid)}`);

      doc.moveDown(1.2);
      doc
        .fontSize(8)
        .fillColor("#9ca3af")
        .text(
          "This statement summarizes subscription payment records on file. " +
            "For tax or accounting advice, consult your professional.",
          margin,
          doc.y,
          { width: contentWidth },
        );
      doc.moveDown(0.8);
      doc
        .fontSize(8)
        .fillColor("#94a3b8")
        .text("Powered by River Tech Inc. · Sales Portal", margin, doc.y, {
          align: "center",
          width: contentWidth,
        });

      doc.end();
    } catch (e) {
      reject(e);
    }
  });
}

export { formatBusinessAddressForPdf };
