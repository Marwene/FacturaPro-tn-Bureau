import nodemailer from "nodemailer";

export interface MailConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
  fromName: string;
}

let _config: MailConfig | null = null;
let _transporter: nodemailer.Transporter | null = null;

export function configureMail(config: MailConfig) {
  _config = config;
  _transporter = null;
}

export function getMailConfig(): MailConfig | null {
  if (_config) return _config;

  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const port = parseInt(process.env.SMTP_PORT ?? "587", 10);
  const secure = process.env.SMTP_SECURE === "true" || port === 465;
  const from = process.env.SMTP_FROM ?? user ?? "noreply@facturapro.tn";
  const fromName = process.env.SMTP_FROM_NAME ?? "FacturaPro TN";

  if (!host || !user || !pass) return null;

  _config = { host, port, secure, user, pass, from, fromName };
  return _config;
}

function getTransporter(): nodemailer.Transporter | null {
  if (_transporter) return _transporter;
  const config = getMailConfig();
  if (!config) return null;
  _transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: { user: config.user, pass: config.pass },
  });
  return _transporter;
}

export interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendMail(opts: SendMailOptions): Promise<boolean> {
  const transporter = getTransporter();
  const config = getMailConfig();
  if (!transporter || !config) {
    console.log("[mail] No SMTP config — email not sent (logged below):");
    console.log(`  To: ${opts.to}\n  Subject: ${opts.subject}`);
    return false;
  }

  try {
    await transporter.sendMail({
      from: `"${config.fromName}" <${config.from}>`,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
    });
    console.log(`[mail] Email sent to ${opts.to} — "${opts.subject}"`);
    return true;
  } catch (err) {
    console.error(`[mail] Failed to send to ${opts.to}:`, (err as Error).message);
    return false;
  }
}

// ── Shared email shell ──────────────────────────────────────────────

const EMAIL_STYLES = {
  body: "margin:0;padding:0;background-color:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif",
  container: "max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08)",
  header: "background:linear-gradient(135deg,#0f172a 0%,#1e293b 100%);padding:28px 32px;text-align:center",
  headerTitle: "color:#ffffff;margin:0;font-size:20px;font-weight:700;letter-spacing:-0.3px",
  headerSub: "color:#94a3b8;margin:6px 0 0;font-size:13px",
  content: "padding:32px",
  greeting: "margin:0 0 4px;font-size:16px;font-weight:600;color:#0f172a",
  paragraph: "margin:12px 0 0;font-size:14px;line-height:1.6;color:#475569",
  card: "background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:20px;margin:20px 0",
  codeBox: "background:#f1f5f9;border:2px dashed #cbd5e1;border-radius:10px;padding:24px;margin:20px 0;text-align:center",
  code: "font-size:32px;font-weight:800;letter-spacing:8px;color:#0f172a;font-family:'Courier New',Courier,monospace;line-height:1.2",
  button: "display:inline-block;background:#0f172a;color:#ffffff !important;text-decoration:none;padding:12px 32px;border-radius:8px;font-size:14px;font-weight:600;margin:8px 0;text-align:center;transition:background 0.2s",
  small: "color:#94a3b8;font-size:12px;line-height:1.5;margin:16px 0 0",
  divider: "height:1px;background:#e2e8f0;margin:24px 0;border:none",
  footer: "padding:20px 32px;background:#f8fafc;text-align:center;border-top:1px solid #e2e8f0",
  footerText: "margin:0;color:#94a3b8;font-size:11px;line-height:1.6",
  badge: "display:inline-block;background:#0f172a;color:#ffffff;border-radius:6px;padding:2px 10px;font-size:12px;font-weight:600;margin-bottom:12px",
};

function shell(title: string, bodyHtml: string): string {
  return `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${title ? `<title>${title}</title>` : ""}</head>
<body style="${EMAIL_STYLES.body}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="min-height:100vh;padding:24px 16px">
<tr><td align="center" style="padding:20px 0">
<div style="${EMAIL_STYLES.container}">
<div style="${EMAIL_STYLES.header}">
<div style="${EMAIL_STYLES.badge}">FacturaPro TN</div>
<h1 style="${EMAIL_STYLES.headerTitle}">${title}</h1>
</div>
<div style="${EMAIL_STYLES.content}">
${bodyHtml}
</div>
<div style="${EMAIL_STYLES.footer}">
<p style="${EMAIL_STYLES.footerText}">
<strong>FacturaPro TN</strong><br>
Gestion commerciale &amp; fiscale<br>
<span style="font-size:10px">Cet email a \u00e9t\u00e9 envoy\u00e9 automatiquement, merci de ne pas y r\u00e9pondre.</span>
</p>
</div>
</div>
</td></tr></table>
</body>
</html>`;
}

// ── Email templates ────────────────────────────────────────────────

export function buildInvitationEmail(
  name: string,
  email: string,
  password: string,
  loginUrl: string,
  verificationCode?: string,
  verificationUrl?: string
) {
  const subject = "Bienvenue sur FacturaPro — Vos accès";

  const codeSection = verificationCode ? `
<div style="${EMAIL_STYLES.codeBox}">
<p style="margin:0 0 12px;color:#64748b;font-size:13px;font-weight:500">Votre code de v\u00e9rification</p>
<span style="${EMAIL_STYLES.code}">${verificationCode}</span>
${verificationUrl ? `<br><br><a href="${verificationUrl}" style="${EMAIL_STYLES.button}">V\u00e9rifier mon email</a>` : ""}
</div>` : "";

  const bodyHtml = `
<p style="${EMAIL_STYLES.greeting}">Bonjour ${name},</p>
<p style="${EMAIL_STYLES.paragraph}">Un administrateur vous a cr\u00e9\u00e9 un compte sur <strong>FacturaPro TN</strong>. Voici vos identifiants de connexion :</p>
<div style="${EMAIL_STYLES.card}">
<table width="100%" cellpadding="0" cellspacing="0">
<tr>
<td style="padding:4px 0;color:#64748b;font-size:13px">Adresse email</td>
<td style="padding:4px 0;font-size:14px;font-weight:600;color:#0f172a;text-align:right">${email}</td>
</tr>
<tr>
<td style="padding:4px 0;color:#64748b;font-size:13px">Mot de passe</td>
<td style="padding:4px 0;font-size:14px;font-weight:600;color:#0f172a;text-align:right;font-family:'Courier New',Courier,monospace">${password}</td>
</tr>
</table>
</div>
<div style="text-align:center;margin:24px 0 8px">
<a href="${loginUrl}" style="${EMAIL_STYLES.button}">Se connecter \u00e0 FacturaPro</a>
</div>
${codeSection}
<hr style="${EMAIL_STYLES.divider}">
<p style="${EMAIL_STYLES.small}">🔒 Pour des raisons de s\u00e9curit\u00e9, veuillez changer votre mot de passe apr\u00e8s votre premi\u00e8re connexion.</p>`;

  return { subject, html: shell(subject, bodyHtml) };
}

export function buildStatusChangeEmail(name: string, actif: boolean) {
  const subject = actif
    ? "Votre compte FacturaPro a \u00e9t\u00e9 r\u00e9activ\u00e9"
    : "Votre compte FacturaPro a \u00e9t\u00e9 d\u00e9sactiv\u00e9";

  const icon = actif ? "✅" : "⛔";
  const message = actif
    ? "Votre compte a \u00e9t\u00e9 <strong>r\u00e9activ\u00e9</strong>. Vous pouvez de nouveau acc\u00e9der \u00e0 FacturaPro TN et utiliser toutes les fonctionnalit\u00e9s de l\u2019application."
    : "Votre compte a \u00e9t\u00e9 <strong>d\u00e9sactiv\u00e9</strong>. Vous ne pouvez plus acc\u00e9der \u00e0 FacturaPro TN pour le moment. Si vous pensez qu\u2019il s\u2019agit d\u2019une erreur, veuillez contacter votre administrateur.";

  const bodyHtml = `
<p style="${EMAIL_STYLES.greeting}">${icon} Bonjour ${name},</p>
<p style="${EMAIL_STYLES.paragraph}">${message}</p>
${actif ? `<div style="text-align:center;margin:24px 0 8px"><a href="${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/login" style="${EMAIL_STYLES.button}">Se connecter</a></div>` : ""}
<hr style="${EMAIL_STYLES.divider}">
<p style="${EMAIL_STYLES.small}">Si vous n\u2019\u00eates pas \u00e0 l\u2019origine de cette modification, veuillez nous contacter imm\u00e9diatement.</p>`;

  return { subject, html: shell(subject, bodyHtml) };
}

export function buildVerificationEmail(name: string, code: string) {
  const subject = "Votre code de v\u00e9rification FacturaPro";

  const bodyHtml = `
<p style="${EMAIL_STYLES.greeting}">Bonjour ${name},</p>
<p style="${EMAIL_STYLES.paragraph}">Voici votre code de v\u00e9rification pour confirmer votre adresse email et activer votre compte :</p>
<div style="${EMAIL_STYLES.codeBox}">
<span style="${EMAIL_STYLES.code}">${code}</span>
<p style="margin:16px 0 0;color:#94a3b8;font-size:12px">Ce code expire dans 30 minutes.</p>
</div>
<hr style="${EMAIL_STYLES.divider}">
<p style="${EMAIL_STYLES.small}">Si vous n\u2019avez pas demand\u00e9 cette v\u00e9rification, ignorez simplement cet email.</p>`;

  return { subject, html: shell(subject, bodyHtml) };
}

export function buildEcartBonCommandeEmail(params: {
  name: string;
  bonCommandeNumero: string;
  articleDescription: string;
  quantiteCommandee: string;
  quantiteDetaillee: string;
  ecart: string;
  lienBonCommande?: string;
}) {
  const {
    name,
    bonCommandeNumero,
    articleDescription,
    quantiteCommandee,
    quantiteDetaillee,
    ecart,
    lienBonCommande,
  } = params;

  const subject = `\u00c9cart de quantit\u00e9 d\u00e9tect\u00e9 \u2014 BC ${bonCommandeNumero}`;

  const bodyHtml = `
<p style="${EMAIL_STYLES.greeting}">\u26a0\ufe0f Bonjour ${name},</p>
<p style="${EMAIL_STYLES.paragraph}">Un \u00e9cart de quantit\u00e9 a \u00e9t\u00e9 d\u00e9tect\u00e9 entre le bon de commande <strong>${bonCommandeNumero}</strong> et son bon de commande d\u00e9taill\u00e9 pour l'article :</p>
<div style="${EMAIL_STYLES.card}">
<table width="100%" cellpadding="0" cellspacing="0">
<tr>
<td style="padding:4px 0;color:#64748b;font-size:13px">Article</td>
<td style="padding:4px 0;font-size:14px;font-weight:600;color:#0f172a;text-align:right">${articleDescription}</td>
</tr>
<tr>
<td style="padding:4px 0;color:#64748b;font-size:13px">Quantit\u00e9 command\u00e9e</td>
<td style="padding:4px 0;font-size:14px;font-weight:600;color:#0f172a;text-align:right">${quantiteCommandee}</td>
</tr>
<tr>
<td style="padding:4px 0;color:#64748b;font-size:13px">Quantit\u00e9 d\u00e9taill\u00e9e</td>
<td style="padding:4px 0;font-size:14px;font-weight:600;color:#0f172a;text-align:right">${quantiteDetaillee}</td>
</tr>
<tr>
<td style="padding:4px 0;color:#b91c1c;font-size:13px;font-weight:600">\u00c9cart</td>
<td style="padding:4px 0;font-size:14px;font-weight:700;color:#b91c1c;text-align:right">${ecart}</td>
</tr>
</table>
</div>
<p style="${EMAIL_STYLES.paragraph}">Tant que cet \u00e9cart n'est pas r\u00e9sorb\u00e9, la g\u00e9n\u00e9ration des ordres de fabrication et des bons de livraison li\u00e9s \u00e0 cette ligne reste bloqu\u00e9e.</p>
${lienBonCommande ? `<div style="text-align:center;margin:24px 0 8px"><a href="${lienBonCommande}" style="${EMAIL_STYLES.button}">Voir le bon de commande</a></div>` : ""}
<hr style="${EMAIL_STYLES.divider}">
<p style="${EMAIL_STYLES.small}">Vous recevrez un nouvel email lorsque cet \u00e9cart sera r\u00e9solu.</p>`;

  return { subject, html: shell(subject, bodyHtml) };
}
