import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    // Lanza si faltan las variables de entorno.
    await createClient();

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/health`,
      {
        headers: {
          apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
        },
        cache: "no-store",
        signal: AbortSignal.timeout(5000),
      },
    );

    if (!res.ok) {
      return Response.json(
        { ok: false, error: `Supabase respondió ${res.status}.` },
        { status: 500 },
      );
    }

    return Response.json({ ok: true });
  } catch (err) {
    const error =
      err instanceof Error
        ? err.message
        : "Error desconocido al conectar con Supabase.";
    return Response.json({ ok: false, error }, { status: 500 });
  }
}
