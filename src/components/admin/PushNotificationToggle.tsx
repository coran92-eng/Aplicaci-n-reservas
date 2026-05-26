"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff } from "lucide-react";

type PushState = "loading" | "unsupported" | "denied" | "enabled" | "disabled";

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length) as Uint8Array<ArrayBuffer>;
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

async function getVapidKey(): Promise<string | null> {
  try {
    const res = await fetch("/api/push/vapid-key");
    if (!res.ok) return null;
    const { publicKey } = await res.json();
    return publicKey ?? null;
  } catch {
    return null;
  }
}

async function getCurrentSubscription(): Promise<PushSubscription | null> {
  const reg = await navigator.serviceWorker.ready;
  return reg.pushManager.getSubscription();
}

export function PushNotificationToggle() {
  const [state, setState] = useState<PushState>("loading");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !("serviceWorker" in navigator) ||
      !("PushManager" in window)
    ) {
      setState("unsupported");
      return;
    }

    if (Notification.permission === "denied") {
      setState("denied");
      return;
    }

    getCurrentSubscription()
      .then((sub) => setState(sub ? "enabled" : "disabled"))
      .catch(() => setState("disabled"));
  }, []);

  async function handleEnable() {
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission === "denied") {
        setState("denied");
        return;
      }
      if (permission !== "granted") return;

      const vapidKey = await getVapidKey();
      if (!vapidKey) return;

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });

      const { endpoint, keys } = sub.toJSON() as {
        endpoint: string;
        keys: { p256dh: string; auth: string };
      };

      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint,
          p256dh: keys.p256dh,
          auth: keys.auth,
          userAgent: navigator.userAgent,
        }),
      });

      setState("enabled");
    } catch {
      // subscription failed silently
    } finally {
      setBusy(false);
    }
  }

  async function handleDisable() {
    setBusy(true);
    try {
      const sub = await getCurrentSubscription();
      if (sub) {
        const endpoint = sub.endpoint;
        await sub.unsubscribe();
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint }),
        });
      }
      setState("disabled");
    } catch {
      // unsubscribe failed silently
    } finally {
      setBusy(false);
    }
  }

  if (state === "unsupported") return null;

  if (state === "loading") {
    return (
      <span className="flex items-center gap-1 opacity-40 cursor-wait">
        <Bell className="h-3.5 w-3.5" />
      </span>
    );
  }

  if (state === "denied") {
    return (
      <span
        className="flex items-center gap-1 opacity-40 cursor-not-allowed"
        title="Notificaciones bloqueadas en el navegador"
      >
        <BellOff className="h-3.5 w-3.5" />
        Bloqueado
      </span>
    );
  }

  if (state === "enabled") {
    return (
      <button
        type="button"
        onClick={handleDisable}
        disabled={busy}
        className="flex items-center gap-1 text-green-400 hover:text-green-300 disabled:opacity-50"
        title="Push activo — click para desactivar"
      >
        <Bell className="h-3.5 w-3.5" />
        Push activo
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleEnable}
      disabled={busy}
      className="flex items-center gap-1 opacity-70 hover:opacity-100 disabled:opacity-50"
      title="Activar notificaciones push"
    >
      <Bell className="h-3.5 w-3.5" />
      Activar push
    </button>
  );
}
