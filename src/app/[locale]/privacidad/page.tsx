import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ChevronLeft } from "lucide-react";

export default async function PrivacidadPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  const t = await getTranslations("privacy");

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-4 py-8">
        <div className="mb-6">
          <Link
            href={`/${locale}`}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            {t("back")}
          </Link>
        </div>

        <div className="bg-card rounded-xl border border-border p-8 space-y-6 text-sm leading-relaxed">
          <div>
            <h1 className="font-heading text-2xl font-bold text-foreground mb-1">{t("title")}</h1>
            <p className="text-xs text-muted-foreground">Última actualización: mayo 2025</p>
          </div>

          <section className="space-y-2">
            <h2 className="font-semibold text-foreground text-base">1. Responsable del tratamiento</h2>
            <div className="text-muted-foreground space-y-0.5">
              <p><strong className="text-foreground">Corte de Manga</strong></p>
              <p>CIF: B16965584</p>
              <p>Domicilio: Comte d&apos;Urgell 108, 08011 Barcelona</p>
              <p>Correo electrónico: reservas@cortedemanga.es</p>
            </div>
          </section>

          <section className="space-y-2">
            <h2 className="font-semibold text-foreground text-base">2. Finalidad del tratamiento</h2>
            <p className="text-muted-foreground">
              Los datos personales recogidos a través del formulario de reserva se tratan
              exclusivamente para gestionar la reserva de mesa y comunicarse con el cliente
              en relación con la misma: confirmación, modificación, cancelación y recordatorio
              de la reserva.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-semibold text-foreground text-base">3. Base jurídica</h2>
            <ul className="text-muted-foreground space-y-1 list-disc list-inside">
              <li>
                <strong className="text-foreground">Ejecución de un precontrato</strong> (art. 6.1.b RGPD):
                la gestión de la solicitud de reserva requiere tratar los datos
                facilitados por el interesado.
              </li>
              <li>
                <strong className="text-foreground">Consentimiento</strong> (art. 6.1.a RGPD):
                para el envío de comunicaciones relacionadas con la reserva, prestado
                de forma libre, específica e informada mediante la aceptación de esta
                política en el formulario.
              </li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="font-semibold text-foreground text-base">4. Datos tratados</h2>
            <p className="text-muted-foreground">
              Nombre y apellidos, número de teléfono, dirección de correo electrónico,
              fecha y hora de reserva, número de comensales y comentarios opcionales
              (alergias, ocasiones especiales u otras peticiones).
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-semibold text-foreground text-base">5. Plazo de conservación</h2>
            <p className="text-muted-foreground">
              Los datos se conservarán durante el tiempo necesario para gestionar la
              reserva y durante un período máximo de <strong className="text-foreground">2 años</strong> desde
              la fecha de la reserva, transcurrido el cual serán eliminados de forma segura
              e irrecuperable. En caso de reclamación, los datos podrán conservarse durante
              el tiempo de prescripción de las acciones legales correspondientes.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-semibold text-foreground text-base">6. Destinatarios y encargados de tratamiento</h2>
            <p className="text-muted-foreground mb-2">
              No se cederán datos a terceros salvo obligación legal. Los datos son tratados
              por los siguientes encargados con los que se mantienen los correspondientes
              contratos de encargo de tratamiento (DPA):
            </p>
            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted">
                    <th className="text-left px-4 py-2 font-semibold text-foreground">Encargado</th>
                    <th className="text-left px-4 py-2 font-semibold text-foreground">Finalidad</th>
                    <th className="text-left px-4 py-2 font-semibold text-foreground">País</th>
                  </tr>
                </thead>
                <tbody className="text-muted-foreground">
                  <tr className="border-b border-border">
                    <td className="px-4 py-2 font-medium text-foreground">Supabase Inc.</td>
                    <td className="px-4 py-2">Almacenamiento de datos</td>
                    <td className="px-4 py-2">UE (Irlanda)</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 font-medium text-foreground">Resend Inc.</td>
                    <td className="px-4 py-2">Envío de emails transaccionales</td>
                    <td className="px-4 py-2">EE. UU.*</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground">
              * Resend Inc. opera bajo las Cláusulas Contractuales Tipo aprobadas por la
              Comisión Europea (art. 46.2.c RGPD), lo que garantiza un nivel de protección
              adecuado para las transferencias internacionales de datos.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-semibold text-foreground text-base">7. Derechos del interesado</h2>
            <p className="text-muted-foreground mb-2">
              En virtud del RGPD y la LOPDGDD, puede ejercer en cualquier momento los
              siguientes derechos:
            </p>
            <ul className="text-muted-foreground space-y-1 list-disc list-inside">
              <li><strong className="text-foreground">Acceso</strong>: conocer qué datos suyos tratamos.</li>
              <li><strong className="text-foreground">Rectificación</strong>: corregir datos inexactos o incompletos.</li>
              <li><strong className="text-foreground">Supresión</strong>: solicitar la eliminación de sus datos.</li>
              <li><strong className="text-foreground">Oposición</strong>: oponerse al tratamiento de sus datos.</li>
              <li><strong className="text-foreground">Limitación</strong>: solicitar que restrinjamos el tratamiento.</li>
              <li><strong className="text-foreground">Portabilidad</strong>: recibir sus datos en formato estructurado.</li>
              <li><strong className="text-foreground">Retirada del consentimiento</strong>: sin efecto retroactivo sobre el tratamiento previo.</li>
            </ul>
            <p className="text-muted-foreground mt-2">
              Para ejercer cualquiera de estos derechos, envíe un correo a{" "}
              <a href="mailto:reservas@cortedemanga.es" className="text-foreground underline">
                reservas@cortedemanga.es
              </a>{" "}
              con el asunto <em>«Derechos RGPD»</em> adjuntando copia de su DNI o documento
              identificativo equivalente. Responderemos en el plazo máximo de{" "}
              <strong className="text-foreground">30 días hábiles</strong>.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-semibold text-foreground text-base">8. Reclamación ante la autoridad de control</h2>
            <p className="text-muted-foreground">
              Si considera que el tratamiento de sus datos no es conforme a la normativa
              vigente, tiene derecho a presentar una reclamación ante la{" "}
              <strong className="text-foreground">Agencia Española de Protección de Datos</strong> (AEPD),
              autoridad de control competente en España:{" "}
              <a
                href="https://www.aepd.es"
                target="_blank"
                rel="noopener noreferrer"
                className="text-foreground underline"
              >
                www.aepd.es
              </a>.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-semibold text-foreground text-base">9. Cookies</h2>
            <p className="text-muted-foreground">
              Este sitio web utiliza únicamente cookies técnicas estrictamente necesarias
              para el funcionamiento del formulario (cookies de sesión). No se utilizan
              cookies de rastreo, publicidad ni analítica de terceros.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-semibold text-foreground text-base">10. Modificaciones</h2>
            <p className="text-muted-foreground">
              Nos reservamos el derecho a actualizar esta política para adaptarla a cambios
              legislativos o de servicio. La versión vigente siempre estará disponible en
              esta página con la fecha de última actualización.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
