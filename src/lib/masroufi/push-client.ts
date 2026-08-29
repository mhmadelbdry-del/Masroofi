import { Capacitor } from "@capacitor/core";
import {
  PushNotifications,
  type Token,
} from "@capacitor/push-notifications";
import { registerPushDevice } from "./queries";

let initialized = false;

export async function initializePushNotifications() {
  if (initialized || !Capacitor.isNativePlatform()) return;
  initialized = true;

  await PushNotifications.addListener("registration", async (token: Token) => {
    try {
      await registerPushDevice({ data: { token: token.value, platform: "android" } });
    } catch (error) {
      console.error("[push] device registration failed", error);
    }
  });

  await PushNotifications.addListener("registrationError", (error) => {
    console.error("[push] registration failed", error);
  });

  await PushNotifications.addListener("pushNotificationReceived", (notification) => {
    console.info("[push] notification received", notification.title);
  });

  const permission = await PushNotifications.checkPermissions();
  const result = permission.receive === "prompt" ? await PushNotifications.requestPermissions() : permission;
  if (result.receive !== "granted") return;

  await PushNotifications.createChannel({
    id: "masroofi_updates",
    name: "تحديثات مصروفي",
    description: "إشعارات المصروفات والطلبات المنزلية",
    importance: 4,
    sound: "default",
    vibration: true,
  });
  await PushNotifications.register();
}
