import { importPKCS8, SignJWT } from "jose";
import { getSql, type Sql } from "@/lib/db";

const FCM_SCOPE = "https://www.googleapis.com/auth/firebase.messaging";
const FCM_AUDIENCE = "https://oauth2.googleapis.com/token";

type PushDevice = {
  token: string;
  user_id: string;
};

type ServiceAccount = {
  project_id?: string;
  client_email?: string;
  private_key?: string;
};

function serviceAccount(): ServiceAccount | null {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ServiceAccount;
  } catch {
    console.error("[push] FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON");
    return null;
  }
}

async function accessToken(account: ServiceAccount): Promise<string | null> {
  if (!account.client_email || !account.private_key) return null;
  const key = await importPKCS8(account.private_key.replace(/\\n/g, "\n"), "RS256");
  const assertion = await new SignJWT({ scope: FCM_SCOPE })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setIssuer(account.client_email)
    .setSubject(account.client_email)
    .setAudience(FCM_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(key);

  const response = await fetch(FCM_AUDIENCE, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  if (!response.ok) {
    console.error("[push] OAuth token request failed", response.status);
    return null;
  }
  const payload = (await response.json()) as { access_token?: string };
  return payload.access_token ?? null;
}

async function devicesForHousehold(sql: Sql, householdId: string, excludeUserId: string) {
  return sql<PushDevice>`
    select token, user_id
    from push_devices
    where household_id = ${householdId} and user_id <> ${excludeUserId}
  `;
}

export async function sendHouseholdPush({
  householdId,
  actorUserId,
  title,
  body,
}: {
  householdId: string;
  actorUserId: string;
  title: string;
  body: string;
}) {
  const account = serviceAccount();
  if (!account?.project_id) return;
  const sql = await getSql();
  const devices = await devicesForHousehold(sql, householdId, actorUserId);
  if (devices.length === 0) return;
  const token = await accessToken(account);
  if (!token) return;

  await Promise.all(
    devices.map(async (device) => {
      const response = await fetch(
        `https://fcm.googleapis.com/v1/projects/${account.project_id}/messages:send`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: {
              token: device.token,
              notification: { title, body },
              data: { route: "/" },
              android: { priority: "HIGH", notification: { channel_id: "masroofi_updates" } },
            },
          }),
        },
      );
      if (response.status === 404 || response.status === 400) {
        await sql`delete from push_devices where token = ${device.token}`;
      }
      if (!response.ok) console.error("[push] FCM send failed", response.status);
    }),
  );
}
