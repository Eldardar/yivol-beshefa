type WhatsAppItem = { to: string; title: string; body: string };

function configured(): boolean {
  return Boolean(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);
}

function toE164(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.startsWith("0") ? `972${digits.slice(1)}` : digits;
}

async function sendOne(item: WhatsAppItem): Promise<void> {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const apiVersion = process.env.WHATSAPP_API_VERSION ?? "v21.0";
  const templateName = process.env.WHATSAPP_TEMPLATE_NAME ?? "shift_notification";
  const languageCode = process.env.WHATSAPP_TEMPLATE_LANG ?? "he";
  const res = await fetch(`https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}` },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: toE164(item.to),
      type: "template",
      template: {
        name: templateName,
        language: { code: languageCode },
        components: [{ type: "body", parameters: [{ type: "text", text: item.title }, { type: "text", text: item.body }] }],
      },
    }),
  });
  if (!res.ok) console.error(`שגיאה בשליחת הודעת WhatsApp ל-${item.to}`, res.status, await res.text().catch(() => ""));
}

export async function sendWhatsAppMessages(items: WhatsAppItem[]): Promise<void> {
  if (items.length === 0) return;
  if (!configured()) {
    for (const item of items) console.log(`[dev] אין הגדרת WHATSAPP_TOKEN; הודעת WhatsApp עבור ${item.to}: ${item.title} — ${item.body}`);
    return;
  }
  await Promise.allSettled(items.map(sendOne));
}
