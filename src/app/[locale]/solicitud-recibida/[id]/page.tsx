import { redirect } from "next/navigation";

export default function SolicitudRecibidaPage({
  params: { locale, id },
}: {
  params: { locale: string; id: string };
}) {
  // Reuse the confirmada page — it already handles pending state
  redirect(`/${locale}/confirmada/${id}`);
}
