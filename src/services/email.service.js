import env from '../config/env.js';

// NOTE — Phase 5 will replace the body of sendEmail() with a real call to
// the Resend API (https://api.resend.com/emails) using env.resend.apiKey
// and env.resend.emailFrom. Every other service in the app calls the named
// helpers below (sendVerificationEmail, sendPasswordResetEmail, etc.), not
// sendEmail() directly, so that swap will not require touching auth.service.js,
// transaction.service.js, or any controller.
//
// Per the project rules: email delivery and financial transactions are
// separate concerns. A failed or not-yet-implemented email must never
// block, roll back, or corrupt a financial operation — callers should
// treat sendEmail() failures as non-fatal and log them.

async function sendEmail({ to, subject, html }) {
  if (!env.resend.apiKey) {
    // Development fallback: log instead of sending, so OTP flows are
    // testable before Resend is wired up in Phase 5.
    console.log('\n[email:dev-mode] Resend API key not configured — logging instead of sending.');
    console.log(`[email:dev-mode] To: ${to}`);
    console.log(`[email:dev-mode] Subject: ${subject}`);
    console.log(`[email:dev-mode] Body:\n${html}\n`);
    return { delivered: false, devMode: true };
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.resend.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: env.resend.emailFrom, to, subject, html }),
    });

    if (!response.ok) {
      const body = await response.text();
      console.error(`[email] Resend API error (${response.status}):`, body);
      return { delivered: false, error: body };
    }

    return { delivered: true };
  } catch (err) {
    console.error('[email] Failed to send email:', err.message);
    return { delivered: false, error: err.message };
  }
}

function wrapTemplate(title, bodyHtml) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
      <div style="font-family: monospace; font-weight: 700; font-size: 13px; background: #0B3D2E; color: #00FF9C; display: inline-block; padding: 6px 10px; border-radius: 6px; margin-bottom: 20px;">SFB</div>
      <h2 style="color: #0F1613; margin-bottom: 12px;">${title}</h2>
      ${bodyHtml}
      <p style="color: #8A928D; font-size: 12px; margin-top: 32px; border-top: 1px solid #E4E7E4; padding-top: 16px;">
        Spring Financial Bank — a real banking experience designed for secure, everyday financial services.
      </p>
    </div>
  `;
}

export async function sendVerificationEmail({ to, firstName, otp, expiresMinutes }) {
  return sendEmail({
    to,
    subject: 'Verify your Spring Financial Bank account',
    html: wrapTemplate(
      'Verify your email',
      `<p>Hi ${firstName},</p>
       <p>Your verification code is:</p>
       <p style="font-family: monospace; font-size: 28px; font-weight: 700; letter-spacing: 4px; background: #E7FBF2; color: #0B3D2E; padding: 12px 20px; border-radius: 8px; display: inline-block;">${otp}</p>
       <p>This code expires in ${expiresMinutes} minutes. If you didn't request this, you can ignore this email.</p>`
    ),
  });
}

export async function sendPasswordResetEmail({ to, firstName, otp, expiresMinutes }) {
  return sendEmail({
    to,
    subject: 'Reset your Spring Financial Bank password',
    html: wrapTemplate(
      'Reset your password',
      `<p>Hi ${firstName},</p>
       <p>Your password reset code is:</p>
       <p style="font-family: monospace; font-size: 28px; font-weight: 700; letter-spacing: 4px; background: #E7FBF2; color: #0B3D2E; padding: 12px 20px; border-radius: 8px; display: inline-block;">${otp}</p>
       <p>This code expires in ${expiresMinutes} minutes. If you didn't request this, please secure your account.</p>`
    ),
  });
}

export async function sendCreditNotification({ to, firstName, amount, currency, description }) {
  return sendEmail({
    to,
    subject: 'Your SFB account has been credited',
    html: wrapTemplate(
      'Account credited',
      `<p>Hi ${firstName},</p>
       <p>Your account was just credited <strong>${currency} ${amount}</strong>.</p>
       ${description ? `<p style="color:#4B5550;">${description}</p>` : ''}`
    ),
  });
}

export async function sendDebitNotification({ to, firstName, amount, currency, description }) {
  return sendEmail({
    to,
    subject: 'Your SFB account has been debited',
    html: wrapTemplate(
      'Account debited',
      `<p>Hi ${firstName},</p>
       <p>Your account was just debited <strong>${currency} ${amount}</strong>.</p>
       ${description ? `<p style="color:#4B5550;">${description}</p>` : ''}`
    ),
  });
}

export async function sendTransferReceivedEmail({ to, firstName, amount, currency, senderName }) {
  return sendEmail({
    to,
    subject: 'You received a transfer',
    html: wrapTemplate(
      'Transfer received',
      `<p>Hi ${firstName},</p>
       <p>You received <strong>${currency} ${amount}</strong> from ${senderName}.</p>`
    ),
  });
}

export async function sendTransferSentEmail({ to, firstName, amount, currency, recipientName }) {
  return sendEmail({
    to,
    subject: 'Your transfer was successful',
    html: wrapTemplate(
      'Transfer sent',
      `<p>Hi ${firstName},</p>
       <p>You sent <strong>${currency} ${amount}</strong> to ${recipientName}.</p>`
    ),
  });
}
