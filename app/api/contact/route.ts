import { Resend } from "resend";

type ContactPayload = { name: string; email: string; msg: string };

const CONTACT_RECIPIENT = "mrezk84@gmail.com";
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  let body: Partial<ContactPayload>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "Cuerpo de la petición inválido." }, { status: 400 });
  }

  const name = body.name?.trim() ?? "";
  const email = body.email?.trim() ?? "";
  const msg = body.msg?.trim() ?? "";

  if (!name || !email || !msg) {
    return Response.json({ ok: false, error: "Faltan campos requeridos." }, { status: 400 });
  }

  if (!EMAIL_REGEX.test(email)) {
    return Response.json({ ok: false, error: "El correo no tiene un formato válido." }, { status: 400 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return Response.json({ ok: false, error: "El servidor no tiene configurada la API key de Resend." }, { status: 502 });
  }

  const resend = new Resend(apiKey);

  const { error } = await resend.emails.send({
    from: "onboarding@resend.dev",
    to: CONTACT_RECIPIENT,
    replyTo: email,
    subject: "Nuevo mensaje de contacto — Arcade Vault",
    text: `Nombre: ${name}\nCorreo: ${email}\n\nMensaje:\n${msg}`,
  });

  if (error) {
    return Response.json({ ok: false, error: "No se pudo enviar el mensaje." }, { status: 502 });
  }

  return Response.json({ ok: true });
}
