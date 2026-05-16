import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";

export default async function PrivacidadPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  const t = await getTranslations("privacy");

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-2xl px-4 py-8">
        <div className="mb-6">
          <Link href={`/${locale}`}>
            <Button variant="ghost" size="sm" className="gap-2">
              <ChevronLeft className="h-4 w-4" />
              {t("back")}
            </Button>
          </Link>
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-8 prose prose-sm max-w-none">
          <h1>{t("title")}</h1>

          <h2>Responsable del tratamiento</h2>
          <p>
            <strong>Corte de Manga</strong>
            <br />
            Comte d&apos;Urgell 108, 08011 Barcelona
            <br />
            Contacto: reservas@cortedemanga.es
          </p>

          <h2>Finalidad</h2>
          <p>
            Los datos personales recogidos a través de este formulario se
            utilizan exclusivamente para gestionar la reserva de mesa y
            comunicarse con el cliente respecto a la misma (confirmación,
            cancelación o modificación de la reserva).
          </p>

          <h2>Base legal</h2>
          <p>
            El tratamiento se basa en el consentimiento explícito del
            interesado (art. 6.1.a RGPD) y en la ejecución de un precontrato
            (gestión de la solicitud de reserva, art. 6.1.b RGPD).
          </p>

          <h2>Datos recogidos</h2>
          <p>
            Nombre y apellido, número de teléfono, dirección de correo
            electrónico, fecha y hora de reserva, número de comensales y
            comentarios opcionales.
          </p>

          <h2>Conservación</h2>
          <p>
            Los datos se conservarán durante el tiempo necesario para cumplir
            con la finalidad para la que fueron recogidos, con un máximo de 2
            años desde la fecha de la reserva, tras los cuales serán eliminados
            de forma segura.
          </p>

          <h2>Destinatarios</h2>
          <p>
            No se cederán datos a terceros, salvo obligación legal. Los datos
            se almacenan en servidores de Supabase (EU) y pueden ser
            procesados por Resend (servicio de correo electrónico) para el
            envío de comunicaciones relacionadas con la reserva.
          </p>

          <h2>Derechos</h2>
          <p>
            Puede ejercer sus derechos de acceso, rectificación, supresión,
            oposición, portabilidad y limitación del tratamiento enviando un
            correo a reservas@cortedemanga.es con el asunto
            &quot;Derechos RGPD&quot;, adjuntando copia de su DNI.
          </p>
          <p>
            Tiene derecho a presentar una reclamación ante la Agencia Española
            de Protección de Datos (www.aepd.es).
          </p>

          <h2>Cookies</h2>
          <p>
            Esta web no utiliza cookies de seguimiento ni publicidad. Solo
            pueden usarse cookies técnicas necesarias para el funcionamiento
            del formulario.
          </p>
        </div>
      </div>
    </main>
  );
}
