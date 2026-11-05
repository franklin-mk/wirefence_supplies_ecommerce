import nodemailer from "nodemailer";
import { Resend } from "resend";

type Mail = {
  to: string;
  subject: string;
  html: string;
  attachments?: { filename: string; content: Buffer }[];
};

const from = () => process.env.EMAIL_FROM ?? "WireFence Supplies <no-reply@localhost>";

export async function sendMail(mail: Mail) {
  if (process.env.EMAIL_PROVIDER === "smtp") {
    const transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 465),
      secure: Number(process.env.SMTP_PORT ?? 465) === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
    await transport.sendMail({ from: from(), ...mail });
    return;
  }
  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error } = await resend.emails.send({ from: from(), ...mail });
  if (error) throw new Error(error.message);
}

export const otpEmail = (code: string, minutes: number) => `
  <div style="font-family:system-ui,sans-serif;max-width:420px">
    <h2>Admin sign-in code</h2>
    <p style="font-size:32px;letter-spacing:6px;font-weight:700">${code}</p>
    <p>This code expires in ${minutes} minutes. If you did not try to sign in, change your password now.</p>
  </div>`;

export interface SendOrderReceiptEmailOptions {
  toEmail: string;
  customerName: string;
  orderId: string;
  mpesaReceipt: string;
  totalAmount: number;
  county: string;
  town: string;
  items: {
    title: string;
    variantName: string;
    quantity: number;
    unitPrice: number;
  }[];
}

export async function sendOrderReceiptEmail(opts: SendOrderReceiptEmailOptions) {
  const itemsHtml = opts.items
    .map(
      (item) =>
        `<tr>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.title} (${item.variantName})</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">KSh ${(item.unitPrice * item.quantity).toLocaleString()}</td>
        </tr>`
    )
    .join("");

  const html = `
    <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
      <h2 style="color: #15803d;">Payment Confirmed!</h2>
      <p>Hi <strong>${opts.customerName}</strong>,</p>
      <p>Thank you for shopping with <strong>WireFence Supplies</strong>. Your M-Pesa payment was successfully received.</p>
      
      <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #e2e8f0;">
        <p style="margin: 4px 0;"><strong>Order ID:</strong> ${opts.orderId}</p>
        <p style="margin: 4px 0;"><strong>M-Pesa Receipt:</strong> ${opts.mpesaReceipt}</p>
        <p style="margin: 4px 0;"><strong>Delivery Location:</strong> ${opts.town}, ${opts.county}</p>
      </div>

      <h3>Order Summary</h3>
      <table style="width: 100%; border-collapse: collapse; text-align: left;">
        <thead>
          <tr style="background: #f1f5f9;">
            <th style="padding: 8px;">Item</th>
            <th style="padding: 8px; text-align: center;">Qty</th>
            <th style="padding: 8px; text-align: right;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>

      <h3 style="text-align: right; margin-top: 20px; color: #15803d;">
        Total Paid: KSh ${opts.totalAmount.toLocaleString()}
      </h3>

      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
      <p style="font-size: 14px; color: #64748b;">
        Track your delivery live from your account page. Contact us on WhatsApp for any shipping inquiries.
      </p>
    </div>
  `;

  await sendMail({
    to: opts.toEmail,
    subject: `Payment Receipt for Order ${opts.orderId}`,
    html,
  });
}