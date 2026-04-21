const nodemailer = require("nodemailer");

const REQUIRED_VARS = ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS", "SMTP_FROM"];
const missingVars = REQUIRED_VARS.filter((k) => !process.env[k]);

let transporter = null;
let senderAddress = process.env.SMTP_FROM || "";

/**
 * Initialize the mailer.
 * If real SMTP credentials are provided, uses those.
 * Otherwise, auto-creates an Ethereal test account so emails work out of the box.
 */
async function initMailer() {
  if (missingVars.length === 0) {
    // Real SMTP configured
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
    senderAddress = process.env.SMTP_FROM;
    console.log("[Mailer] Using configured SMTP server");
    return;
  }

  // No SMTP configured — create a free Ethereal test account automatically
  try {
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    senderAddress = testAccount.user;
    console.log("[Mailer] No SMTP configured — using Ethereal test account");
    console.log(`[Mailer] Test inbox: https://ethereal.email/login`);
    console.log(`[Mailer]   User: ${testAccount.user}`);
    console.log(`[Mailer]   Pass: ${testAccount.pass}`);
  } catch (err) {
    console.warn(`[Mailer] Could not create test account: ${err.message}. Emails disabled.`);
  }
}

// Initialize on load
initMailer();

/**
 * Send a promotion notification email to an applicant.
 * Silently skips (logs a warning) if SMTP is not configured.
 * Never throws — all errors are caught and logged internally.
 */
async function sendPromotionEmail({
  applicantName,
  applicantEmail,
  applicationId,
  acknowledgeDeadline,
}) {
  console.log(`[Mailer] sendPromotionEmail called for ${applicantEmail}, transporter: ${!!transporter}`);
  if (!transporter) {
    console.log("[Mailer] No transporter — skipping email");
    return;
  }

  const serverUrl = process.env.API_URL || `http://localhost:${process.env.PORT || 5000}`;
  const acknowledgeUrl = `${serverUrl}/api/applications/${applicationId}/acknowledge-email`;
  const statusUrl = `${process.env.APP_URL || "http://localhost:5173"}/status`;
  const deadline = new Date(acknowledgeDeadline).toLocaleString("en-US", {
    dateStyle: "long",
    timeStyle: "short",
  });

  const textBody = [
    `Hi ${applicantName},`,
    ``,
    `You have been promoted from the waitlist and are now pending acknowledgment.`,
    ``,
    `  Application ID : ${applicationId}`,
    `  Acknowledge by : ${deadline}`,
    ``,
    `Click here to acknowledge your promotion:`,
    `${acknowledgeUrl}`,
    ``,
    `Or visit ${statusUrl} and enter your Application ID.`,
    ``,
    `If you do not acknowledge before the deadline, you will be returned to the waitlist.`,
  ].join("\n");

  const htmlBody = `
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
      <div style="background:linear-gradient(135deg,#2563eb,#7c3aed);padding:1.5rem 2rem;">
        <h2 style="color:#fff;margin:0;font-size:1.25rem;">You've been promoted! 🎉</h2>
      </div>
      <div style="padding:1.5rem 2rem;">
        <p style="color:#374151;line-height:1.6;">Hi <strong>${applicantName}</strong>,</p>
        <p style="color:#374151;line-height:1.6;">You have been promoted from the waitlist and are now <strong>pending acknowledgment</strong>.</p>
        <table cellpadding="8" style="border-collapse:collapse;margin:1.25rem 0;width:100%;background:#f9fafb;border-radius:8px;">
          <tr>
            <td style="font-weight:600;color:#6b7280;padding-right:1rem;border-bottom:1px solid #e5e7eb;">Application ID</td>
            <td style="color:#111827;border-bottom:1px solid #e5e7eb;"><code style="background:#e5e7eb;padding:2px 8px;border-radius:4px;font-size:0.9em;">${applicationId}</code></td>
          </tr>
          <tr>
            <td style="font-weight:600;color:#6b7280;padding-right:1rem;">Acknowledge by</td>
            <td style="color:#dc2626;font-weight:600;">${deadline}</td>
          </tr>
        </table>
        <div style="text-align:center;margin:1.5rem 0;">
          <a href="${acknowledgeUrl}" style="display:inline-block;padding:0.75rem 2rem;background:linear-gradient(135deg,#2563eb,#7c3aed);color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:1rem;">
            ✓ Acknowledge My Promotion
          </a>
        </div>
        <p style="color:#9ca3af;font-size:0.85em;text-align:center;">
          Or <a href="${statusUrl}" style="color:#2563eb;">check your status manually</a>
        </p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:1.25rem 0;">
        <p style="color:#9ca3af;font-size:0.8em;line-height:1.5;">
          If you do not acknowledge before the deadline, you will be returned to the waitlist with a penalized position.
        </p>
      </div>
    </div>
  `;

  try {
    const info = await transporter.sendMail({
      from: senderAddress,
      to: applicantEmail,
      subject: "Action required — you have been selected from the waitlist",
      text: textBody,
      html: htmlBody,
    });
    console.log(`[Mailer] Promotion email sent to ${applicantEmail} (appId: ${applicationId})`);

    // Show Ethereal preview URL if using test account
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log(`[Mailer] Preview URL: ${previewUrl}`);
    }
  } catch (err) {
    console.error(`[Mailer] Failed to send email to ${applicantEmail}:`, err.message);
  }
}

module.exports = { sendPromotionEmail };
