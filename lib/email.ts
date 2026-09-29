type CandidatePublishedEmail = {
  to: string;
  candidateName: string;
  locationName: string;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export async function sendCandidatePublishedEmail({ to, candidateName, locationName }: CandidatePublishedEmail) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim();
  if (!apiKey || !from) {
    console.warn("candidate.publication_email_skipped", { reason: "RESEND_API_KEY o EMAIL_FROM no configurado", to });
    return { sent: false, skipped: true };
  }

  const publicUrl = (process.env.PUBLIC_APP_URL?.trim() || "http://localhost").replace(/\/+$/, "");
  const safeCandidateName = escapeHtml(candidateName);
  const safeLocationName = escapeHtml(locationName);
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: `${candidateName} ya es oficialmente público`,
      html: `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#2d241f"><h1>${safeCandidateName} ya está en la carta</h1><p>¡Buenas noticias! El plato que pediste seguir ya es oficialmente público en ${safeLocationName}.</p><p><a href="${publicUrl}/carta" style="color:#9a5b2f;font-weight:700">Ver la carta</a></p></div>`,
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`El proveedor de correo rechazó el aviso (${response.status}): ${detail.slice(0, 240)}`);
  }
  return { sent: true, skipped: false };
}
