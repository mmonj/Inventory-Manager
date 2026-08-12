import React from "react";

import { Context, reverse } from "@reactivated";

import { fetchByReactivated } from "@client/util/commonUtil";

/** Converts a base64url-encoded VAPID public key into the Uint8Array PushManager.subscribe expects. */
function urlBase64ToUint8Array(base64Url: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const bytes = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    bytes[i] = rawData.charCodeAt(i);
  }
  return bytes;
}

export type TPushPermissionState = "unsupported" | "default" | "denied" | "granted";

/**
 * Manages the browser's Web Push subscription lifecycle: registering the service worker,
 * requesting notification permission, subscribing/unsubscribing with the push manager, and
 * syncing the resulting subscription with the server (save_push_subscription/
 * delete_push_subscription - see server/views.py). isSubscribed reflects this specific
 * browser/device's subscription state, not a per-user account-wide setting - a user with
 * multiple devices enables/disables each independently.
 */
export function usePushNotifications() {
  const context = React.useContext(Context);
  const [permission, setPermission] = React.useState<TPushPermissionState>(() => {
    if (typeof Notification === "undefined" || !("serviceWorker" in navigator)) {
      return "unsupported";
    }
    return Notification.permission;
  });
  const [isSubscribed, setIsSubscribed] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);

  React.useEffect(() => {
    if (permission === "unsupported") {
      return;
    }

    void navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        // Check for a newer sw.js on every mount, not just relying on the browser's own
        // periodic check - combined with skipWaiting/clients.claim() in sw.js itself, this
        // means a page visit is enough to pick up a service worker fix, without the user
        // needing to manually clear site data.
        void registration.update();
        return registration.pushManager.getSubscription();
      })
      .then((subscription) => setIsSubscribed(subscription !== null));
  }, [permission]);

  async function subscribe() {
    if (permission === "unsupported") {
      return;
    }

    setIsLoading(true);
    try {
      const requestedPermission = await Notification.requestPermission();
      setPermission(requestedPermission);
      if (requestedPermission !== "granted") {
        return;
      }

      const registration = await navigator.serviceWorker.register("/sw.js");
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(context.vapid_public_key),
      });

      const subscriptionJson = subscription.toJSON();
      if (subscriptionJson.endpoint === undefined || subscriptionJson.keys === undefined) {
        return;
      }

      const resp = await fetchByReactivated(
        reverse("root:save_push_subscription"),
        context.csrf_token,
        "POST",
        new URLSearchParams({
          endpoint: subscriptionJson.endpoint,
          p256dh_key: subscriptionJson.keys.p256dh,
          auth_key: subscriptionJson.keys.auth,
        }),
        "application/x-www-form-urlencoded"
      );

      setIsSubscribed(resp.ok);
    } finally {
      setIsLoading(false);
    }
  }

  async function unsubscribe() {
    if (permission === "unsupported") {
      return;
    }

    setIsLoading(true);
    try {
      const registration = await navigator.serviceWorker.register("/sw.js");
      const subscription = await registration.pushManager.getSubscription();
      if (subscription === null) {
        setIsSubscribed(false);
        return;
      }

      const endpoint = subscription.endpoint;
      await subscription.unsubscribe();

      await fetchByReactivated(
        reverse("root:delete_push_subscription"),
        context.csrf_token,
        "POST",
        new URLSearchParams({ endpoint }),
        "application/x-www-form-urlencoded"
      );

      setIsSubscribed(false);
    } finally {
      setIsLoading(false);
    }
  }

  return { permission, isSubscribed, isLoading, subscribe, unsubscribe };
}
