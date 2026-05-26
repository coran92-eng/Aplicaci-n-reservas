import webpush from "web-push";

function getVapid() {
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const subj = process.env.VAPID_SUBJECT ?? "mailto:admin@cortedemanga.es";
  if (!pub || !priv) return null;
  return { pub, priv, subj };
}

export async function sendPushToAll(payload: {
  title: string;
  body: string;
  url?: string;
}): Promise<void> {
  const vapid = getVapid();
  if (!vapid) return;

  webpush.setVapidDetails(vapid.subj, vapid.pub, vapid.priv);

  const { createServiceClient } = await import("@/lib/supabase/server");
  const sc = createServiceClient();
  const { data: subs } = await sc
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth");
  if (!subs?.length) return;

  const message = JSON.stringify(payload);
  await Promise.allSettled(
    subs.map((sub) =>
      webpush
        .sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          message
        )
        .catch(async (err) => {
          if (err.statusCode === 410) {
            await sc
              .from("push_subscriptions")
              .delete()
              .eq("endpoint", sub.endpoint);
          }
        })
    )
  );
}

export function getVapidPublicKey(): string | null {
  return process.env.VAPID_PUBLIC_KEY ?? null;
}
