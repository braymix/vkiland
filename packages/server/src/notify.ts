/**
 * Avviso via email quando il server ha finito di avviarsi (es. dopo un
 * deploy o un riavvio del container).
 *
 * Attivo solo se SMTP_HOST, SMTP_USER e SMTP_PASS sono impostate: in sviluppo,
 * senza variabili, non parte nessuna email. Per Gmail serve una "password per
 * le app" (non quella dell'account): SMTP_HOST=smtp.gmail.com, SMTP_PORT=465.
 *
 *   NOTIFY_EMAIL  destinatario (default: SMTP_USER)
 */
import { hostname } from 'node:os';

export async function notifyStartup(): Promise<void> {
  const host = process.env['SMTP_HOST'];
  const user = process.env['SMTP_USER'];
  const pass = process.env['SMTP_PASS'];
  if (!host || !user || !pass) return;

  const port = Number(process.env['SMTP_PORT'] ?? 465);
  const to = process.env['NOTIFY_EMAIL'] || user;
  const when = new Date().toLocaleString('it-IT', { timeZone: 'Europe/Rome' });

  try {
    const { createTransport } = await import('nodemailer');
    const transport = createTransport({ host, port, secure: port === 465, auth: { user, pass } });
    await transport.sendMail({
      from: `"Viking Island" <${user}>`,
      to,
      subject: 'Server di Viking Island tornato su',
      text: `Il server di Viking Island è tornato su ed è pronto ad accettare giocatori.\n\nAvviato: ${when}\nHost: ${hostname()}\n`,
    });
    console.log(`[notify] email di avvio inviata a ${to}`);
  } catch (err) {
    // Un problema con la posta non deve mai far cadere il server di gioco.
    console.error(`[notify] invio email di avvio fallito: ${err instanceof Error ? err.message : String(err)}`);
  }
}
