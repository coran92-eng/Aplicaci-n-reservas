self.addEventListener("push", (event) => {
  const data = event.data?.json() ?? { title: "Nueva reserva", body: "" };
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data: { url: data.url ?? "/admin" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? "/admin";
  event.waitUntil(clients.openWindow(url));
});
