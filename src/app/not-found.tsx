import Link from "next/link";

export default function RootNotFound() {
  return (
    <html>
      <body style={{ margin: 0 }}>
        <main style={{ fontFamily: "system-ui, sans-serif", textAlign: "center", padding: "48px 16px", background: "#F3ECDF", color: "#1E3A2B", minHeight: "100vh", margin: 0 }}>
          <h1 style={{ fontSize: "48px", fontWeight: "bold", margin: "0 0 8px" }}>404</h1>
          <p style={{ color: "#4C5E52", marginBottom: "24px" }}>Pàgina no trobada · Página no encontrada · Page not found</p>
          <a href="/ca" style={{ color: "#1E3A2B", textDecoration: "underline", fontWeight: 700 }}>
            Reserves · Reservas · Bookings
          </a>
        </main>
      </body>
    </html>
  );
}
