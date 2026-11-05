import nodemailer from "nodemailer";
import { Resend } from "resend";

type Mail = {
  to: string;
  subject: string;
  html: string;
  attachments?: { filename: string; content: Buffer }[];
};

const from = () => process.env.EMAIL_FROM ?? "WireFence Supplies <franklinmuriithi431@gmail.com>";

/** "WireFence Supplies <a@b.com>" -> "WireFence Supplies" */
const fromName = () => {
  const m = from().match(/^\s*"?([^"<]+?)"?\s*</);
  return m?.[1]?.trim() || "WireFence Supplies";
};

/**
 * Providers (EMAIL_PROVIDER):
 *  - "gmail-relay": Google Apps Script web app over HTTPS (port 443). Works on Render's free tier,
 *                   where outbound SMTP ports 25/465/587 are blocked.
 *  - "smtp":        Nodemailer SMTP. Works locally / on hosts that allow SMTP.
 *  - "resend":      Resend API over HTTPS (needs a verified domain to email other people).
 */
export async function sendMail(mail: Mail) {
  const provider = (process.env.EMAIL_PROVIDER ?? "resend").toLowerCase();

  if (provider === "gmail-relay") {
    const url = process.env.GMAIL_RELAY_URL;
    const secret = process.env.GMAIL_RELAY_SECRET;
    if (!url || !secret) throw new Error("GMAIL_RELAY_URL and GMAIL_RELAY_SECRET must be set");

    // Apps Script answers POST with a redirect to the result; fetch follows it by default.
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        secret,
        to: mail.to,
        subject: mail.subject,
        html: mail.html,
        fromName: fromName(),
        attachments: mail.attachments?.map((a) => ({
          filename: a.filename,
          mimeType: a.filename.toLowerCase().endsWith(".pdf") ? "application/pdf" : "application/octet-stream",
          contentBase64: a.content.toString("base64"),
        })),
      }),
      redirect: "follow",
      cache: "no-store",
      signal: AbortSignal.timeout(25_000),
    });

    const text = await res.text();
    let json: { ok?: boolean; error?: string } = {};
    try {
      json = JSON.parse(text);
    } catch {
      throw new Error(`Gmail relay returned a non-JSON response (${res.status}). Check the web app URL and that access is set to "Anyone".`);
    }
    if (!res.ok || !json.ok) throw new Error(`Gmail relay: ${json.error ?? `HTTP ${res.status}`}`);
    return;
  }

  if (provider === "smtp") {
    const port = Number(process.env.SMTP_PORT ?? 587);
    const isSecure = port === 465;

    const transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: port,
      secure: isSecure, // true for port 465, false for port 587
      requireTLS: !isSecure, // Forces STARTTLS on port 587 for cloud hosts
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS?.replace(/\s+/g, ""), // Automatically strips spaces from App Passwords
      },
      tls: {
        rejectUnauthorized: false, // Prevents certificate verification drops inside containers
      },
      connectionTimeout: 15000, // 15-second connection timeout
    });

    await transport.sendMail({ from: from(), ...mail });
    return;
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error } = await resend.emails.send({ from: from(), ...mail });
  if (error) throw new Error(error.message);
}

export const otpEmail = (code: string, minutes: number) => `
  <div style="font-family:system-ui,sans-serif;max-width:420px;padding:20px;border:1px solid #e2e8f0;border-radius:8px">
    <h2 style="color:#15803d;margin-top:0">Admin Sign-In Code</h2>
    <p>Use the 6-digit code below to finish signing into WireFence Admin:</p>
    <p style="font-size:32px;letter-spacing:6px;font-weight:700;color:#0f172a;background:#f1f5f9;padding:12px;text-align:center;border-radius:6px;margin:16px 0">${code}</p>
    <p style="font-size:14px;color:#64748b">This code expires in ${minutes} minutes. If you did not request this code, ignore this email.</p>
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

/* import nodemailer from "nodemailer";
import { Resend } from "resend";

type Mail = {
  to: string;
  subject: string;
  html: string;
  attachments?: { filename: string; content: Buffer }[];
};

const from = () => process.env.EMAIL_FROM ?? "WireFence Supplies <franklinmuriithi431@gmail.com>";

export async function sendMail(mail: Mail) {
  if (process.env.EMAIL_PROVIDER === "smtp") {
    const port = Number(process.env.SMTP_PORT ?? 587);
    const isSecure = port === 465;

    const transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: port,
      secure: isSecure, // true for port 465, false for port 587
      requireTLS: !isSecure, // Forces STARTTLS on port 587 for cloud hosts
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS?.replace(/\s+/g, ""), // Automatically strips spaces from App Passwords
      },
      tls: {
        rejectUnauthorized: false, // Prevents certificate verification drops inside containers
      },
      connectionTimeout: 15000, // 15-second connection timeout
    });

    await transport.sendMail({ from: from(), ...mail });
    return;
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error } = await resend.emails.send({ from: from(), ...mail });
  if (error) throw new Error(error.message);
}

export const otpEmail = (code: string, minutes: number) => `
  <div style="font-family:system-ui,sans-serif;max-width:420px;padding:20px;border:1px solid #e2e8f0;border-radius:8px">
    <h2 style="color:#15803d;margin-top:0">Admin Sign-In Code</h2>
    <p>Use the 6-digit code below to finish signing into WireFence Admin:</p>
    <p style="font-size:32px;letter-spacing:6px;font-weight:700;color:#0f172a;background:#f1f5f9;padding:12px;text-align:center;border-radius:6px;margin:16px 0">${code}</p>
    <p style="font-size:14px;color:#64748b">This code expires in ${minutes} minutes. If you did not request this code, ignore this email.</p>
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
} */