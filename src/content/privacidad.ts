// Política de privacidad de la app de reservas (CA · ES · EN).
// Titular y contacto: los mismos que el aviso legal de cortedemanga.es.
// Marcas al principio de un texto: «§» solo se muestra con la etiqueta de Google Ads encendida,
// «¬» solo con ella apagada (ver src/lib/ads.ts), para que la política diga siempre lo que pasa.
export type Bloque = {
  h: string;
  p?: string[];
  ul?: string[];
  table?: { head: [string, string, string]; rows: [string, string, string][] };
  nota?: string;
  pd?: string[];
};

export type Privacidad = { title: string; updated: string; blocks: Bloque[] };

export const PRIVACIDAD: Record<"ca" | "es" | "en", Privacidad> = {
  ca: {
    title: "Política de privacitat",
    updated: "Darrera actualització: 26 de novembre de 2026",
    blocks: [
      {
        h: "Qui tracta les teves dades",
        p: [
          "Grupo Daco BCN, S.L. (NIF B16965584), amb domicili al carrer del Consell de Cent, 245 bis, 08011 Barcelona, titular del bar Corte de Manga (carrer del Comte d’Urgell, 108, 08011 Barcelona). Contacte: cortedemangabcn@gmail.com.",
        ],
      },
      {
        h: "Quines dades recollim",
        p: [
          "Les que ens dones quan reserves: nom i cognoms, correu electrònic, telèfon, dia, hora, nombre de persones i, si vols, comentaris.",
          "Si als comentaris ens expliques al·lèrgies o intoleràncies, les fem servir només per atendre’t en la teva visita; en escriure-les ens dones el teu consentiment exprés.",
        ],
      },
      {
        h: "Per a què i amb quina base legal",
        ul: [
          "Gestionar la teva reserva: confirmar-la, avisar-te de canvis, recordar-te-la el dia abans i permetre’t modificar-la o cancel·lar-la. Base legal: aplicar les mesures que ens demanes abans de la teva visita (art. 6.1.b RGPD).",
          "Atendre’t al local i en properes reserves, amb l’historial de les teves visites. Base legal: el nostre interès legítim a atendre bé els clients (art. 6.1.f RGPD); t’hi pots oposar quan vulguis.",
          "§Mesurar si els nostres anuncis de Google porten reserves (mira «Galetes»).",
        ],
        pd: ["No fem servir les teves dades per enviar-te publicitat ni les venem."],
      },
      {
        h: "Quant de temps les guardem",
        p: [
          "Fins a dos anys després de la data de la reserva. Després les esborrem, llevat que les haguem de conservar més temps per una obligació legal o una reclamació.",
        ],
      },
      {
        h: "Qui més les tracta",
        p: [
          "No cedim les teves dades a tercers llevat d’obligació legal. Ens ajuden aquests proveïdors, que només les tracten per compte nostre:",
        ],
        table: {
          head: ["Proveïdor", "Per a què", "On"],
          rows: [
            ["Supabase Inc.", "Base de dades de les reserves", "UE (Irlanda)"],
            ["Vercel Inc.", "Allotjament d’aquest web", "UE i EUA*"],
            ["Resend Inc.", "Enviament dels correus de la reserva", "EUA*"],
            ["Meta Platforms Ireland Ltd. (WhatsApp)", "Avisos de la reserva per WhatsApp", "UE / EUA*"],
            ["§Google Ireland Ltd.", "Mesura d’anuncis (Google Ads)", "UE / EUA*"],
          ],
        },
        nota: "* Quan hi ha transferències als EUA, es fan amb les garanties que exigeix el RGPD (per exemple, clàusules contractuals tipus de la Comissió Europea).",
      },
      {
        h: "Galetes",
        p: [
          "¬Aquest web només fa servir una galeta tècnica (NEXT_LOCALE) que recorda l’idioma que tries. No fa servir galetes de publicitat ni d’analítica.",
          "§Aquest web fa servir:",
        ],
        ul: [
          "§Una galeta tècnica (NEXT_LOCALE) que recorda l’idioma que tries.",
          "§L’etiqueta de Google Ads, que instal·la galetes de Google (com _gcl_au) per saber si una visita que arriba des d’un anunci acaba en reserva. Quan confirmes una reserva, l’etiqueta envia a Google el teu correu, telèfon i nom xifrats (amb hash) per atribuir aquesta reserva a l’anunci.",
        ],
        pd: ["Pots bloquejar o esborrar les galetes des de la configuració del navegador."],
      },
      {
        h: "Els teus drets",
        p: [
          "Pots demanar l’accés, la rectificació, la supressió, la limitació, la portabilitat o oposar-te al tractament, i retirar el teu consentiment quan vulguis, escrivint a cortedemangabcn@gmail.com amb l’assumpte «Protecció de dades». Et respondrem en un mes com a màxim.",
          "Si creus que no t’hem atès bé, pots reclamar a l’Agència Espanyola de Protecció de Dades (aepd.es).",
        ],
      },
      {
        h: "Canvis",
        p: ["Si canvia res, ho actualitzarem aquí amb la data de la darrera actualització."],
      },
    ],
  },
  es: {
    title: "Política de privacidad",
    updated: "Última actualización: 26 de noviembre de 2026",
    blocks: [
      {
        h: "Quién trata tus datos",
        p: [
          "Grupo Daco BCN, S.L. (NIF B16965584), con domicilio en Carrer del Consell de Cent, 245 bis, 08011 Barcelona, titular del bar Corte de Manga (Carrer del Comte d’Urgell, 108, 08011 Barcelona). Contacto: cortedemangabcn@gmail.com.",
        ],
      },
      {
        h: "Qué datos recogemos",
        p: [
          "Los que nos das al reservar: nombre y apellidos, email, teléfono, día, hora, número de personas y, si quieres, comentarios.",
          "Si en los comentarios nos cuentas alergias o intolerancias, las usamos solo para atenderte en tu visita; al escribirlas nos das tu consentimiento expreso.",
        ],
      },
      {
        h: "Para qué y con qué base legal",
        ul: [
          "Gestionar tu reserva: confirmarla, avisarte de cambios, recordártela el día antes y permitirte modificarla o cancelarla. Base legal: aplicar las medidas que nos pides antes de tu visita (art. 6.1.b RGPD).",
          "Atenderte en el local y en próximas reservas, con el historial de tus visitas. Base legal: nuestro interés legítimo en atender bien a los clientes (art. 6.1.f RGPD); puedes oponerte cuando quieras.",
          "§Medir si nuestros anuncios de Google traen reservas (mira «Cookies»).",
        ],
        pd: ["No usamos tus datos para enviarte publicidad ni los vendemos."],
      },
      {
        h: "Cuánto tiempo los guardamos",
        p: [
          "Hasta dos años después de la fecha de la reserva. Después los borramos, salvo que tengamos que conservarlos más tiempo por una obligación legal o una reclamación.",
        ],
      },
      {
        h: "Quién más los trata",
        p: [
          "No cedemos tus datos a terceros salvo obligación legal. Nos ayudan estos proveedores, que solo los tratan por cuenta nuestra:",
        ],
        table: {
          head: ["Proveedor", "Para qué", "Dónde"],
          rows: [
            ["Supabase Inc.", "Base de datos de las reservas", "UE (Irlanda)"],
            ["Vercel Inc.", "Alojamiento de esta web", "UE y EE. UU.*"],
            ["Resend Inc.", "Envío de los emails de la reserva", "EE. UU.*"],
            ["Meta Platforms Ireland Ltd. (WhatsApp)", "Avisos de la reserva por WhatsApp", "UE / EE. UU.*"],
            ["§Google Ireland Ltd.", "Medición de anuncios (Google Ads)", "UE / EE. UU.*"],
          ],
        },
        nota: "* Cuando hay transferencias a EE. UU., se hacen con las garantías que exige el RGPD (por ejemplo, cláusulas contractuales tipo de la Comisión Europea).",
      },
      {
        h: "Cookies",
        p: [
          "¬Esta web solo usa una cookie técnica (NEXT_LOCALE) que recuerda el idioma que eliges. No usa cookies de publicidad ni de analítica.",
          "§Esta web usa:",
        ],
        ul: [
          "§Una cookie técnica (NEXT_LOCALE) que recuerda el idioma que eliges.",
          "§La etiqueta de Google Ads, que instala cookies de Google (como _gcl_au) para saber si una visita que llega desde un anuncio termina en reserva. Al confirmar una reserva, la etiqueta envía a Google tu email, teléfono y nombre cifrados (con hash) para atribuir esa reserva al anuncio.",
        ],
        pd: ["Puedes bloquear o borrar las cookies desde la configuración de tu navegador."],
      },
      {
        h: "Tus derechos",
        p: [
          "Puedes pedir el acceso, la rectificación, la supresión, la limitación, la portabilidad u oponerte al tratamiento, y retirar tu consentimiento cuando quieras, escribiendo a cortedemangabcn@gmail.com con el asunto «Protección de datos». Te responderemos en un mes como máximo.",
          "Si crees que no te hemos atendido bien, puedes reclamar ante la Agencia Española de Protección de Datos (aepd.es).",
        ],
      },
      {
        h: "Cambios",
        p: ["Si cambia algo, lo actualizaremos aquí con la fecha de la última actualización."],
      },
    ],
  },
  en: {
    title: "Privacy policy",
    updated: "Last updated: 26 November 2026",
    blocks: [
      {
        h: "Who handles your data",
        p: [
          "Grupo Daco BCN, S.L. (tax ID B16965584), registered at Carrer del Consell de Cent, 245 bis, 08011 Barcelona, which runs the Corte de Manga bar (Carrer del Comte d’Urgell, 108, 08011 Barcelona). Contact: cortedemangabcn@gmail.com.",
        ],
      },
      {
        h: "What data we collect",
        p: [
          "What you give us when you book: first and last name, email, phone number, date, time, number of guests and, if you like, comments.",
          "If you tell us about allergies or intolerances in the comments, we use them only to look after you during your visit; by writing them you give us your explicit consent.",
        ],
      },
      {
        h: "Why we use it and on what legal basis",
        ul: [
          "To manage your booking: confirm it, let you know about changes, remind you the day before and let you change or cancel it. Legal basis: steps you ask us to take before your visit (Art. 6(1)(b) GDPR).",
          "To look after you at the bar and in future bookings, using the history of your visits. Legal basis: our legitimate interest in serving our guests well (Art. 6(1)(f) GDPR); you can object at any time.",
          "§To measure whether our Google ads bring in bookings (see “Cookies”).",
        ],
        pd: ["We don’t use your data to send you advertising, and we don’t sell it."],
      },
      {
        h: "How long we keep it",
        p: [
          "Up to two years after the date of the booking. After that we delete it, unless we have to keep it longer because of a legal obligation or a claim.",
        ],
      },
      {
        h: "Who else processes it",
        p: [
          "We don’t share your data with third parties unless the law requires it. These providers help us and only process it on our behalf:",
        ],
        table: {
          head: ["Provider", "What for", "Where"],
          rows: [
            ["Supabase Inc.", "Booking database", "EU (Ireland)"],
            ["Vercel Inc.", "Hosting this website", "EU and USA*"],
            ["Resend Inc.", "Sending booking emails", "USA*"],
            ["Meta Platforms Ireland Ltd. (WhatsApp)", "Booking notifications on WhatsApp", "EU / USA*"],
            ["§Google Ireland Ltd.", "Ad measurement (Google Ads)", "EU / USA*"],
          ],
        },
        nota: "* Any transfers to the USA are made with the safeguards required by the GDPR (for example, the European Commission’s standard contractual clauses).",
      },
      {
        h: "Cookies",
        p: [
          "¬This website only uses a technical cookie (NEXT_LOCALE) that remembers the language you choose. It uses no advertising or analytics cookies.",
          "§This website uses:",
        ],
        ul: [
          "§A technical cookie (NEXT_LOCALE) that remembers the language you choose.",
          "§The Google Ads tag, which sets Google cookies (such as _gcl_au) to find out whether a visit that comes from an ad ends in a booking. When you confirm a booking, the tag sends Google your email, phone number and name in encrypted form (hashed) to attribute that booking to the ad.",
        ],
        pd: ["You can block or delete cookies in your browser settings."],
      },
      {
        h: "Your rights",
        p: [
          "You can ask for access, rectification, erasure, restriction or portability, object to the processing, and withdraw your consent at any time by writing to cortedemangabcn@gmail.com with the subject “Data protection”. We’ll reply within one month at most.",
          "If you think we haven’t handled your request properly, you can complain to the Spanish Data Protection Agency (aepd.es).",
        ],
      },
      {
        h: "Changes",
        p: ["If anything changes, we’ll update it here with the date of the last update."],
      },
    ],
  },
};
