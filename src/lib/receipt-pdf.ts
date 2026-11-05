import PDFDocument from "pdfkit";

export type ReceiptData = {
  orderNumber: string;
  date: Date;
  mpesaReceipt: string | null;
  customer: { name: string; phone: string; email: string };
  delivery: { county: string; subCounty: string; dropOff: string; notes: string | null };
  items: { name: string; variant: string; qty: number; unitPrice: number }[];
  subtotal: number;
  transport: number;
  total: number;
};

const ksh = (n: number) => "KSh " + Math.round(n).toLocaleString("en-KE");

export function buildReceiptPdf(d: ReceiptData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 48 });
    const chunks: Buffer[] = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const green = "#14532d";
    doc.fillColor(green).fontSize(22).font("Helvetica-Bold").text(process.env.NEXT_PUBLIC_STORE_NAME ?? "WireFence Supplies");
    doc.fillColor("#555").fontSize(10).font("Helvetica").text("Payment receipt / tax invoice");
    doc.moveDown();

    doc.fillColor("#000").fontSize(10);
    doc.text(`Order: ${d.orderNumber}`);
    doc.text(`Date: ${d.date.toLocaleString("en-KE", { timeZone: "Africa/Nairobi" })}`);
    if (d.mpesaReceipt) doc.text(`M-Pesa receipt: ${d.mpesaReceipt}`);
    doc.moveDown();

    doc.font("Helvetica-Bold").text("Billed to");
    doc.font("Helvetica").text(`${d.customer.name}\n${d.customer.phone}\n${d.customer.email}`);
    doc.moveDown(0.5);
    doc.font("Helvetica-Bold").text("Deliver to");
    doc.font("Helvetica").text(`${d.delivery.dropOff}\n${d.delivery.subCounty}, ${d.delivery.county}`);
    if (d.delivery.notes) doc.text(`Transport notes: ${d.delivery.notes}`);
    doc.moveDown();

    // Table
    const x = [48, 290, 360, 430];
    let y = doc.y;
    doc.font("Helvetica-Bold").fillColor(green);
    doc.text("Item", x[0], y); doc.text("Qty", x[1], y); doc.text("Unit", x[2], y); doc.text("Total", x[3], y);
    y += 16;
    doc.moveTo(48, y).lineTo(547, y).strokeColor("#ccc").stroke();
    y += 6;
    doc.font("Helvetica").fillColor("#000");
    for (const it of d.items) {
      doc.text(`${it.name} (${it.variant})`, x[0], y, { width: 235 });
      const h = doc.heightOfString(`${it.name} (${it.variant})`, { width: 235 });
      doc.text(String(it.qty), x[1], y);
      doc.text(ksh(it.unitPrice), x[2], y);
      doc.text(ksh(it.unitPrice * it.qty), x[3], y);
      y += Math.max(h, 14) + 6;
    }
    doc.moveTo(48, y).lineTo(547, y).strokeColor("#ccc").stroke();
    y += 10;
    doc.text("Subtotal", x[2], y); doc.text(ksh(d.subtotal), x[3], y); y += 16;
    doc.text("Transport", x[2], y); doc.text(ksh(d.transport), x[3], y); y += 16;
    doc.font("Helvetica-Bold").text("Total paid", x[2], y); doc.text(ksh(d.total), x[3], y);

    doc.font("Helvetica").fillColor("#666").fontSize(9)
      .text("Thank you for your order. Track delivery live from your account.", 48, 760, { align: "center", width: 499 });
    doc.end();
  });
}
