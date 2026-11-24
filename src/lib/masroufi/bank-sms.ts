import { Capacitor, registerPlugin } from "@capacitor/core";
import { importBankExpense } from "./queries";

export interface BankSmsStatus {
  enabled?: boolean;
  ownerKey?: string;
  categoryId?: string;
  senders?: string[];
  granted?: boolean;
  pending?: number;
  storageWarning?: boolean;
}
export interface BankSmsEntry {
  id: string;
  amount: string;
  occurredAt: string;
  categoryId: string;
  ownerKey: string;
  review?: boolean;
  preview?: string;
}
interface BankSmsApi {
  requestAccess(): Promise<{ granted: boolean }>;
  requestNotifications(): Promise<void>;
  getStatus(): Promise<BankSmsStatus>;
  configure(options: { senders: string[]; categoryId: string; ownerKey: string }): Promise<void>;
  getPending(options: { ownerKey: string }): Promise<{ entries: BankSmsEntry[] }>;
  acknowledge(options: { ownerKey: string; id: string }): Promise<void>;
  disable(): Promise<void>;
}
export const BankSms = registerPlugin<BankSmsApi>("BankSms");
export function bankSmsSupported() {
  return Capacitor.getPlatform() === "android" && Capacitor.isPluginAvailable("BankSms");
}
let syncing = false;
export async function syncBankSms(ownerKey: string) {
  if (!bankSmsSupported() || syncing) return 0;
  syncing = true;
  let count = 0;
  try {
    const status = await BankSms.getStatus();
    if (!status.enabled || status.ownerKey !== ownerKey) return 0;
    const { entries } = await BankSms.getPending({ ownerKey });
    for (const entry of entries) {
      if (entry.ownerKey !== ownerKey) throw new Error("عملية محفوظة لحساب مختلف");
      if (entry.review) continue;
      await importBankExpense({
        data: {
          key: entry.id,
          amount: Number(entry.amount),
          occurredAt: entry.occurredAt,
          categoryId: entry.categoryId,
          ownerKey,
        },
      });
      await BankSms.acknowledge({ ownerKey, id: entry.id });
      count++;
    }
    return count;
  } finally {
    syncing = false;
  }
}
