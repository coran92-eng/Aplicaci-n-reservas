import Link from "next/link";

export default function RootNotFound() {
  return (
    <html>
      <body>
        <main style={{ fontFamily: "sans-serif", textAlign: "center", padding: "48px 16px" }}>
          <h1 style={{ fontSize: "48px", fontWeight: "bold", margin: "0 0 8px" }}>404</h1>
          <p style={{ color: "#666", marginBottom: "24px" }}>Página no encontrada</p>
          <a href="/es" style={{ color: "#000", textDecoration: "underline" }}>
            Volver al inicio
          </a>
        </main>
      </body>
    </html>
  );
}
