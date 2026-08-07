import nodemailer from 'nodemailer';

let transporter: ReturnType<typeof nodemailer.createTransport> | null = null;

function getTransporter(): ReturnType<typeof nodemailer.createTransport> | null {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST?.trim();
  if (!host) return null;

  const port = Number(process.env.SMTP_PORT?.trim() || '587');
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  const secure =
    process.env.SMTP_SECURE?.trim() === 'true' || port === 465;

  transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: user && pass ? { user, pass } : undefined,
  });

  return transporter;
}

export interface WelcomeEmailInput {
  to: string;
  firstName: string;
  organizationName: string;
}

export async function sendWelcomeEmail(input: WelcomeEmailInput): Promise<boolean> {
  const transport = getTransporter();
  if (!transport) {
    console.info('[welcome-email] SMTP_HOST not configured; skipping welcome email');
    return false;
  }

  const from =
    process.env.MAIL_FROM?.trim() || 'TestForge <noreply@testforge.local>';
  const appName = process.env.APP_NAME?.trim() || 'TestForge';
  const firstName = input.firstName.trim() || 'there';

  const subject = `Welcome to ${appName}`;
  const text = [
    `Hi ${firstName},`,
    '',
    `Your ${appName} account is ready for ${input.organizationName.trim()}.`,
    'You can sign in anytime to create projects, import APIs, and run validations.',
    '',
    `This message was sent to ${input.to}. If you did not create this account, you can ignore this email.`,
    '',
    `— The ${appName} team`,
  ].join('\n');

  const html = `
    <p>Hi ${escapeHtml(firstName)},</p>
    <p>Your <strong>${escapeHtml(appName)}</strong> account is ready for
    <strong>${escapeHtml(input.organizationName.trim())}</strong>.</p>
    <p>You can sign in anytime to create projects, import APIs, and run validations.</p>
    <p style="color:#64748b;font-size:13px;">This message was sent to ${escapeHtml(input.to)}.
    If you did not create this account, you can ignore this email.</p>
    <p>— The ${escapeHtml(appName)} team</p>
  `.trim();

  await transport.sendMail({
    from,
    to: input.to,
    subject,
    text,
    html,
  });

  return true;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export default sendWelcomeEmail;
