// ─────────────────────────────────────────────────────────────
// EmailJS sends real emails straight from the browser — no backend
// server or Firebase Cloud Functions (and no billing plan) needed.
// This is what powers: (1) emailing you when an owner submits a
// payment claim, and (2) emailing an owner when someone starts a
// chat about their listing.
//
// Setup (free tier: 200 emails/month):
// 1. Create a free account at emailjs.com
// 2. Email Services → Add a service → connect Gmail/Outlook (the
//    inbox you want these alerts sent FROM).
// 3. Email Templates → Create template. Use these variable names
//    in the template body so they match what the code sends:
//      {{to_email}}   — recipient
//      {{subject}}    — email subject
//      {{message}}    — the alert body text
// 4. Account → General → copy your Public Key.
// 5. Fill in the three values below.
// ─────────────────────────────────────────────────────────────
export const emailjsConfig = {
  serviceId: "service_0iyfqke",
  templateId: "template_c3wb848",
  publicKey: "dN2GV1Q7idXEXGFJu"
};
