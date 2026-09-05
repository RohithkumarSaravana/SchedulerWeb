// Shared domain vocabulary. Prisma stores these as plain strings (SQLite has no native
// enum support) - these unions + zod schemas are the single source of truth for valid values.

export const SHIFTS = ["Morning", "Evening", "Night"] as const;
export type Shift = (typeof SHIFTS)[number];

export const MACHINES = ["Scrubber", "Buffer", "Auto-scrubber", "Vacuum"] as const;
export type Machine = (typeof MACHINES)[number];

export const FREQUENCIES = ["Daily", "Weekly", "Twice weekly", "3x weekly", "Specific days"] as const;
export type Frequency = (typeof FREQUENCIES)[number];

export const LEAVE_TYPES = ["Planned", "Sick"] as const;
export type LeaveType = (typeof LEAVE_TYPES)[number];

export const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
export type Weekday = (typeof WEEKDAYS)[number];

// Cleanroom relay display order - kept here (not in lib/cleanroomRelay.ts) because that
// module pulls in Prisma and its driver adapter, which must never end up in a client bundle.
export const ROOM_ORDER: Record<string, number> = { PAO3: 0, CCRI: 1, PAO1: 2, PAO2: 3 };
export const PHASE_ORDER: Record<string, number> = { Main: 0, "Vesta mop": 1, "Water mop": 2 };

export function dayName(d: Date): Weekday {
  // getUTCDay: 0=Sun..6=Sat -> shift to Mon-first index
  return WEEKDAYS[(d.getUTCDay() + 6) % 7];
}

/** Normalize to UTC midnight - the canonical form for every date stored/queried in this app. */
export function dateOnly(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/** Parse a `YYYY-MM-DD` string (e.g. from an <input type="date">) as UTC midnight. */
export function parseDateOnly(s: string): Date {
  return new Date(`${s}T00:00:00.000Z`);
}

export function formatDateOnly(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function monday(d: Date): Date {
  const day = (d.getUTCDay() + 6) % 7; // 0 = Monday
  const out = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  out.setUTCDate(out.getUTCDate() - day);
  return out;
}

export function csv(values: readonly string[]): string {
  return values.join(",");
}

export function fromCsv(value: string | null | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

export function taskRunsOn(
  task: { frequency: string; specificDays: string },
  day: Weekday
): boolean {
  if (task.frequency === "Specific days") {
    return fromCsv(task.specificDays).includes(day);
  }
  if (task.specificDays) {
    return fromCsv(task.specificDays).includes(day);
  }
  return true;
}

export function roomRunsOn(room: { activeDays: string; active: boolean }, day: Weekday): boolean {
  if (!room.active) return false;
  if (room.activeDays.toUpperCase() === "ALL") return true;
  return fromCsv(room.activeDays).includes(day);
}
