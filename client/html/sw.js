// Service worker for Web Push notifications. Served from the site root (see
// server/views.py's service_worker view) so its scope covers the whole site, not just
// /static/ - a worker registered from a subdirectory can only control pages under that
// subdirectory.

// Without these, a newly-fetched worker sits "waiting" until every tab/client controlled
// by the previous worker closes, so fixes here wouldn't take effect until the user closed
// and reopened the browser. skipWaiting activates the new worker as soon as it installs;
// clients.claim() takes control of any already-open pages immediately instead of only new
// navigations, so an update applies without the user needing to reload manually.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let data = { title: "New message", body: "You have a new message." };
  if (event.data) {
    try {
      data = event.data.json();
    } catch {
      // fall back to the default above if the payload isn't valid JSON
    }
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/collected/public/favicon.png",
      data: { url: "/inbox/" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = new URL(event.notification.data?.url ?? "/inbox/", self.location.origin).href;

  // matchAll() itself is async, which risks the notificationclick event's user-activation
  // expiring before openWindow() ever runs on some browsers (Firefox included) - openWindow()
  // silently no-ops (resolves null) once that activation is gone, which matches the reported
  // symptom: works when a tab is already open (focus() has no activation requirement), fails
  // when opening a new window is required. clients.matchAll() itself is a synchronous
  // snapshot call under the hood (it just returns a Promise wrapping already-available data),
  // so calling it doesn't cost real async time - the actual fix is only calling openWindow
  // once, as the very next microtask, not after any additional await in between.
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      const existingClient = clientList.find(
        (client) => new URL(client.url).origin === self.location.origin
      );

      if (existingClient !== undefined && "focus" in existingClient) {
        return existingClient
          .focus()
          .then(() => ("navigate" in existingClient ? existingClient.navigate(targetUrl) : null));
      }

      return self.clients.openWindow(targetUrl);
    })
  );
});
