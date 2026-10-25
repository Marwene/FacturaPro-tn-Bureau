import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? "smtp.ethereal.email",
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
        user: process.env.SMTP_USER ?? "",
        pass: process.env.SMTP_PASS ?? "",
    },
});

export async function sendEmail(options: {
    to: string;
    subject: string;
    text: string;
    html?: string;
}) {
    if (!process.env.SMTP_HOST) {
        console.log("[email] SMTP non configuré, email simulé:", options.subject, "→", options.to);
        return;
    }
    await transporter.sendMail({
        from: process.env.SMTP_FROM ?? `"FacturaPro" <${process.env.SMTP_USER}>`,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html ?? options.text,
    });
}
