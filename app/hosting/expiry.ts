import { daysBetweenISO } from "@/lib/tasks/week";
import { EXPIRY_FIELDS, EXPIRY_WARNING_DAYS, type HostingSite } from "@/lib/hosting/fields";

export type ExpiryLevel = "expired" | "soon" | "ok";

export type ExpiryItem = {
  siteId: string;
  siteName: string;
  label: string;
  date: string;
  daysLeft: number;
  level: ExpiryLevel;
};

export function expiryLevel(daysLeft: number): ExpiryLevel {
  if (daysLeft < 0) return "expired";
  if (daysLeft <= EXPIRY_WARNING_DAYS) return "soon";
  return "ok";
}

export function formatDday(daysLeft: number): string {
  if (daysLeft === 0) return "D-DAY";
  return daysLeft > 0 ? `D-${daysLeft}` : `D+${-daysLeft}`;
}

export const LEVEL_CLASSES: Record<ExpiryLevel, string> = {
  expired: "bg-danger-bg text-danger",
  soon: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  ok: "bg-success-bg text-success",
};

export function siteExpiries(site: HostingSite, today: string): ExpiryItem[] {
  return EXPIRY_FIELDS.flatMap(({ key, label }) => {
    const date = site.values[key];
    if (!date) return [];
    const daysLeft = daysBetweenISO(today, date);
    return [
      {
        siteId: site.id,
        siteName: site.values.siteName,
        label,
        date,
        daysLeft,
        level: expiryLevel(daysLeft),
      },
    ];
  });
}
