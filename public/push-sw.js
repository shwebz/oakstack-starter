/* global self, clients */
// Shows Oakstack push notifications and opens their link when clicked.
self.addEventListener("push", (event) => {
  const n = event.data ? event.data.json() : {};
  event.waitUntil(
    self.registration.showNotification(n.title || "Notification", {
      body: n.body || "",
      tag: n.tag || undefined,
      data: { url: n.url || "/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data.url));
});
