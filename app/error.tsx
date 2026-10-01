"use client";

export default function ErrorPage({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <div style={{ textAlign: "center", padding: "80px 24px" }}>
      <div className="pixel" style={{ fontSize: 14, color: "var(--magenta)", marginBottom: 12 }}>
        NO SE PUDO CARGAR EL VAULT
      </div>
      <p style={{ color: "var(--ink-faint)", marginBottom: 24 }}>
        La base de datos no respondió. Revisa tu conexión e inténtalo de nuevo.
      </p>
      <button className="btn" onClick={() => retry()}>
        REINTENTAR
      </button>
    </div>
  );
}
