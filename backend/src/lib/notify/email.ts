// Transactional email via SMTP (nodemailer).
//
// Only active when SMTP_HOST / SMTP_USER / SMTP_PASS are present — otherwise
// sendMail() is a no-op that returns { status: "skipped" }, exactly like the
// iyzico / Cloudinary integrations degrade gracefully when unconfigured.
//
// Works with any SMTP provider (Gmail App Password, Brevo, Yandex, …):
//   SMTP_HOST=smtp.gmail.com  SMTP_PORT=587  SMTP_SECURE=false
//   SMTP_USER=gesmarketim@gmail.com  SMTP_PASS=<app-password>
//   MAIL_FROM="GES MARKETİM <gesmarketim@gmail.com>"

import nodemailer, { type Transporter } from "nodemailer";

function cfg() {
  const port = Number(process.env.SMTP_PORT ?? 587);
  const secureRaw = (process.env.SMTP_SECURE ?? "").toLowerCase();
  const user = process.env.SMTP_USER?.trim() ?? "";
  return {
    host: process.env.SMTP_HOST?.trim() ?? "",
    port: Number.isFinite(port) ? port : 587,
    user,
    pass: process.env.SMTP_PASS?.trim() ?? "",
    // Implicit TLS on 465; STARTTLS otherwise. Override with SMTP_SECURE.
    secure: secureRaw ? secureRaw === "true" || secureRaw === "1" : port === 465,
    from: process.env.MAIL_FROM?.trim() || user,
  };
}

export function isEmailConfigured(): boolean {
  const c = cfg();
  return Boolean(c.host && c.user && c.pass);
}

let transporter: Transporter | null = null;
function getTransporter(): Transporter {
  if (transporter) return transporter;
  const c = cfg();
  transporter = nodemailer.createTransport({
    host: c.host,
    port: c.port,
    secure: c.secure,
    auth: { user: c.user, pass: c.pass },
  });
  return transporter;
}

export interface MailInput {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}

export interface MailResult {
  status: "sent" | "skipped" | "failure";
  error?: string;
}

/** Send one email. Never throws — failures are returned, not propagated. */
export async function sendMail(input: MailInput): Promise<MailResult> {
  if (!isEmailConfigured()) return { status: "skipped" };
  const c = cfg();
  try {
    await getTransporter().sendMail({
      from: c.from,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
      replyTo: input.replyTo,
    });
    return { status: "sent" };
  } catch (err) {
    return {
      status: "failure",
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
