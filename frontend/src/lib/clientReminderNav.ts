import type { ClientReminder } from "./clientPortalApi";

export function clientReminderPath(reminder: ClientReminder): string {
  if (reminder.action === "invoices") {
    return reminder.related_id != null ? `/client/invoices/${reminder.related_id}` : "/client/invoices";
  }
  if (reminder.action === "plans") return "/client/plans/workout";
  if (reminder.action === "messages") return "/client/messages";
  if (reminder.action === "promotions") return "/client/promotions";
  return "/client";
}
