import { notFound } from "next/navigation";

// Cualquier ruta desconocida dentro de /ca, /es o /en muestra la página 404 de la app (con cabecera y pie)
export default function CatchAll() {
  notFound();
}
