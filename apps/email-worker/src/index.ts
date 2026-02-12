import PostalMime from "postal-mime";

interface Env {
  WEBHOOK_URL: string;
  WEBHOOK_SECRET: string;
}

export default {
  async email(message: ForwardableEmailMessage, env: Env): Promise<void> {
    const rawEmail = await new Response(message.raw).arrayBuffer();
    const parser = new PostalMime();
    const parsed = await parser.parse(rawEmail);

    const from = message.from;
    const subject = parsed.subject || "(no subject)";
    const date = parsed.date || new Date().toISOString();
    const body = parsed.text || parsed.html?.replace(/<[^>]*>/g, "") || "";

    const formData = new FormData();
    formData.append("from", from);
    formData.append("subject", subject);
    formData.append("date", date);
    formData.append("body", body);

    if (parsed.attachments && parsed.attachments.length > 0) {
      for (const att of parsed.attachments) {
        const raw = typeof att.content === "string" ? att.content : new Uint8Array(att.content as ArrayBuffer);
        const blob = new Blob([raw], { type: att.mimeType });
        const filename = att.filename || `attachment-${Date.now()}`;
        formData.append("attachments", blob, filename);
      }
    }

    const response = await fetch(env.WEBHOOK_URL, {
      method: "POST",
      headers: {
        "X-Email-Webhook-Secret": env.WEBHOOK_SECRET,
      },
      body: formData,
    });

    if (!response.ok) {
      const text = await response.text();
      console.error(`Webhook failed: ${response.status} ${text}`);
      message.setReject(`Processing failed: ${response.status}`);
    }
  },
};
