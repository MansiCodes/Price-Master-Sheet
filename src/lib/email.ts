import nodemailer from "nodemailer";

export async function sendPasswordResetEmail(email: string, token: string) {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || "587", 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;
  const from = process.env.SMTP_FROM || `"Atlanta Telecables" <noreply@atlantatelecables.com>`;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const resetUrl = `${appUrl}/reset-password?token=${token}`;

  // Log for development if SMTP config is missing
  if (!host || !user || !pass) {
    console.warn("--- SMTP CREDENTIALS NOT CONFIGURED IN .env ---");
    console.warn(`Password Reset link for ${email}: ${resetUrl}`);
    console.warn("-------------------------------------------------");
    return { sent: false, devLink: resetUrl };
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
  });

  const mailOptions = {
    from,
    to: email,
    subject: "Reset your Cable Junction Password",
    text: `You requested a password reset for your Cable Junction account.\n\nPlease reset your password by clicking on the link below:\n\n${resetUrl}\n\nThis link will expire in 1 hour.\n\nIf you did not request this, you can safely ignore this email.`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e4e8e5; border-radius: 16px;">
        <h2 style="color: #127269; font-family: Georgia, serif;">Reset your password</h2>
        <p>You requested a password reset for your Cable Junction account.</p>
        <p>Please click the button below to reset your password. This link is valid for 1 hour.</p>
        <div style="margin: 24px 0;">
          <a href="${resetUrl}" style="background-color: #127269; color: white; padding: 12px 24px; text-decoration: none; border-radius: 999px; font-weight: bold; display: inline-block;">Reset Password</a>
        </div>
        <p style="color: #5a6b64; font-size: 0.9rem;">Or copy and paste this URL into your browser:</p>
        <p style="color: #127269; font-size: 0.9rem; word-break: break-all;">${resetUrl}</p>
        <hr style="border: 0; border-top: 1px solid #e4e8e5; margin: 24px 0;" />
        <p style="color: #5a6b64; font-size: 0.8rem;">If you did not request this email, you can safely ignore it.</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
  return { sent: true };
}
