/**
 * Nightly cleanroom relay: CCRI -> PAO1 -> PAO2, plus a self-contained PAO3 on Wed/Sun.
 * Ported from the Python prototype's core/cleanroom_relay.py - see that file's docstring
 * for the full narrative of the workflow. Behaviour should match exactly, including the
 * "leftover" fix (spare relay people join the mop crew instead of vanishing).
 */
import type { Employee } from "@prisma/client";
import { dateOnly, dayName, PHASE_ORDER, ROOM_ORDER } from "./domain";
import { prisma } from "./prisma";

export { PHASE_ORDER, ROOM_ORDER };

export type RelaySettings = {
  ccriSize: number;
  pao1Vacuum: number;
  bins: number;
  pao2VacuumMax: number;
  relayLookbackDays: number;
};

export async function getRelaySettings(): Promise<RelaySettings> {
  const rows = await prisma.setting.findMany();
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return {
    ccriSize: Number(map.ccri_size ?? 3),
    pao1Vacuum: Number(map.pao1_vacuum ?? 4),
    bins: Number(map.cleanroom_bins ?? 2),
    pao2VacuumMax: Number(map.pao2_vacuum_max ?? 6),
    relayLookbackDays: Number(map.relay_lookback_days ?? 14),
  };
}

/** Sinks+Gowning merges first, then Production+Glass, as the crew gets shorter. */
function resolveSingles(shortfall: number): { singles: Record<string, number>; merges: string[] } {
  if (shortfall >= 2) {
    return { singles: { "Gowning+Sinks": 1, "Production+Glass": 1 }, merges: ["Gowning+Sinks", "Production+Glass"] };
  }
  if (shortfall >= 1) {
    return { singles: { "Gowning+Sinks": 1, Production: 1, Glass: 1 }, merges: ["Gowning+Sinks"] };
  }
  return { singles: { Gowning: 1, Sinks: 1, Production: 1, Glass: 1 }, merges: [] };
}

function productionLabel(singles: Record<string, number>): string | null {
  return Object.keys(singles).find((k) => k.includes("Production")) ?? null;
}

export type RelayRow = { room: string; phase: string; role: string; employeeIds: number[] };

export type RelayPlan = {
  day: Date;
  isSpecialDay: boolean;
  activeMerges: string[];
  shortfall: number;
  unfilled: string[];
  rows: RelayRow[];
};

function histKey(employeeId: number, room: string, role: string): string {
  return `${employeeId}|${room}|${role}`;
}

function pickN<T extends Employee>(
  pool: T[],
  taken: Set<number>,
  hist: Map<string, number>,
  histTotal: Map<number, number>,
  room: string,
  role: string,
  k: number
): T[] {
  const cands = pool
    .filter((e) => !taken.has(e.id))
    .sort((a, b) => {
      const ha = hist.get(histKey(a.id, room, role)) ?? 0;
      const hb = hist.get(histKey(b.id, room, role)) ?? 0;
      if (ha !== hb) return ha - hb;
      const ta = histTotal.get(a.id) ?? 0;
      const tb = histTotal.get(b.id) ?? 0;
      if (ta !== tb) return ta - tb;
      return a.id - b.id;
    });
  const chosen = cands.slice(0, Math.max(k, 0));
  for (const e of chosen) taken.add(e.id);
  return chosen;
}

/** Fill Bins, then Vacuum (both protected), then the single roles, topping up whatever
 * preAssigned already supplied (used for PAO2's CCRI hand-off). */
function staffRoom<T extends Employee>(
  pool: T[],
  taken: Set<number>,
  hist: Map<string, number>,
  histTotal: Map<number, number>,
  room: string,
  vacuumTarget: number,
  binsTarget: number,
  singles: Record<string, number>,
  preAssigned?: Record<string, T[]>
): Record<string, T[]> {
  const roles: Record<string, T[]> = {};
  for (const [k, v] of Object.entries(preAssigned ?? {})) roles[k] = [...v];
  for (const lst of Object.values(roles)) for (const e of lst) taken.add(e.id);

  const topUp = (label: string, target: number) => {
    const have = (roles[label] ?? []).length;
    const need = Math.max(0, target - have);
    const picked = pickN(pool, taken, hist, histTotal, room, label, need);
    roles[label] = [...(roles[label] ?? []), ...picked];
  };

  topUp("Bins", binsTarget);
  topUp("Vacuum", vacuumTarget);
  for (const [label, target] of Object.entries(singles)) topUp(label, target);
  return roles;
}

function checkGaps(
  plan: RelayPlan,
  room: string,
  roles: Record<string, Employee[]>,
  vacuumTarget: number,
  binsTarget: number,
  singles: Record<string, number>
): void {
  const targets: Record<string, number> = { Vacuum: vacuumTarget, Bins: binsTarget, ...singles };
  for (const [label, target] of Object.entries(targets)) {
    const have = (roles[label] ?? []).length;
    if (have < target) plan.unfilled.push(`${room} ${label}: ${have}/${target}`);
  }
}

/** People in the pool who didn't land a named role (targets < pool size) - they still
 * join the general mop rather than vanishing from the night's plan. */
function leftover<T extends Employee>(pool: T[], roles: Record<string, T[]>): T[] {
  const used = new Set(Object.values(roles).flat().map((e) => e.id));
  return pool.filter((e) => !used.has(e.id));
}

function splitVesta<T extends Employee>(
  pool: T[],
  room: string,
  hist: Map<string, number>,
  histTotal: Map<number, number>
): [T[], T[], T[]] {
  const dirty = pickN(pool, new Set(), hist, histTotal, room, "Vesta-Dirty", 1);
  const dirtyIds = new Set(dirty.map((e) => e.id));
  const remaining = pool.filter((e) => !dirtyIds.has(e.id));
  const clean = pickN(remaining, new Set(), hist, histTotal, room, "Vesta-Clean", 1);
  const cleanIds = new Set(clean.map((e) => e.id));
  const rest = remaining.filter((e) => !cleanIds.has(e.id));
  return [clean, dirty, rest];
}

function addMopRows(
  plan: RelayPlan,
  room: string,
  clean: Employee[],
  dirty: Employee[],
  rest: Employee[],
  singlesPeople: Employee[]
): void {
  const general = [...rest, ...singlesPeople];
  plan.rows.push({ room, phase: "Vesta mop", role: "Clean side", employeeIds: clean.map((e) => e.id) });
  plan.rows.push({ room, phase: "Vesta mop", role: "Dirty side", employeeIds: dirty.map((e) => e.id) });
  plan.rows.push({
    room,
    phase: "Vesta mop",
    role: "General (after own task)",
    employeeIds: general.map((e) => e.id),
  });
  plan.rows.push({ room, phase: "Water mop", role: "Clean side", employeeIds: clean.map((e) => e.id) });
  plan.rows.push({ room, phase: "Water mop", role: "Dirty side", employeeIds: dirty.map((e) => e.id) });
  plan.rows.push({
    room,
    phase: "Water mop",
    role: "General (after own task)",
    employeeIds: general.map((e) => e.id),
  });
}

function others(roles: Record<string, Employee[]>, exclude: string[]): Employee[] {
  return Object.entries(roles)
    .filter(([r]) => !exclude.includes(r))
    .flatMap(([, emps]) => emps);
}

export async function planRelayNight(dayInput: Date, extraEmployeeIds: number[] = []): Promise<RelayPlan> {
  const day = dateOnly(dayInput);
  const cfg = await getRelaySettings();
  const dname = dayName(day);

  const pao3 = await prisma.cleanroomRoom.findUnique({ where: { name: "PAO3" } });
  const isSpecialDay = !!pao3 && pao3.active && (pao3.activeDays.toUpperCase() === "ALL" ||
    pao3.activeDays.split(",").map((d) => d.trim()).includes(dname));

  const leaves = await prisma.leaveRecord.findMany({
    where: { startDate: { lte: day }, endDate: { gte: day } },
  });
  const offIds = new Set(leaves.map((l) => l.employeeId));

  let pool = await prisma.employee.findMany({
    where: { active: true, doesCleanroom: true, shift: "Night" },
  });
  pool = pool.filter((e) => !offIds.has(e.id));
  if (extraEmployeeIds.length) {
    const extra = await prisma.employee.findMany({ where: { id: { in: extraEmployeeIds } } });
    const poolIds = new Set(pool.map((e) => e.id));
    for (const e of extra) if (!poolIds.has(e.id)) pool.push(e);
  }

  const baseline = cfg.ccriSize + cfg.pao1Vacuum + cfg.bins + 4;
  const shortfall = Math.max(0, baseline - pool.length);
  const { singles, merges } = resolveSingles(shortfall);
  const prodLabel = productionLabel(singles);

  const since = new Date(day);
  since.setUTCDate(since.getUTCDate() - cfg.relayLookbackDays);
  const histRows = await prisma.cleanroomRelayAssignment.findMany({
    where: { day: { gte: since, lt: day } },
  });
  const hist = new Map<string, number>();
  const histTotal = new Map<number, number>();
  for (const a of histRows) {
    const key = histKey(a.employeeId, a.room, a.role);
    hist.set(key, (hist.get(key) ?? 0) + 1);
    histTotal.set(a.employeeId, (histTotal.get(a.employeeId) ?? 0) + 1);
  }

  const plan: RelayPlan = { day, isSpecialDay, activeMerges: merges, shortfall, unfilled: [], rows: [] };

  // --- PAO3 first, self-contained, using the whole pool (Wed/Sun only) -----
  if (isSpecialDay && pool.length) {
    const taken3 = new Set<number>();
    const pao3Roles = staffRoom(pool, taken3, hist, histTotal, "PAO3", cfg.pao1Vacuum, cfg.bins, singles);
    checkGaps(plan, "PAO3", pao3Roles, cfg.pao1Vacuum, cfg.bins, singles);
    for (const [role, emps] of Object.entries(pao3Roles)) {
      plan.rows.push({ room: "PAO3", phase: "Main", role, employeeIds: emps.map((e) => e.id) });
    }
    const [clean3, dirty3, rest3] = splitVesta(pao3Roles["Vacuum"] ?? [], "PAO3", hist, histTotal);
    const singles3 = [
      ...(pao3Roles["Bins"] ?? []),
      ...others(pao3Roles, ["Vacuum", "Bins"]),
      ...leftover(pool, pao3Roles),
    ];
    addMopRows(plan, "PAO3", clean3, dirty3, rest3, singles3);
  }

  // --- CCRI ------------------------------------------------------------
  const taken = new Set<number>();
  const ccriTeam = pickN(pool, taken, hist, histTotal, "CCRI", "Team", cfg.ccriSize);
  plan.rows.push({ room: "CCRI", phase: "Main", role: "Team", employeeIds: ccriTeam.map((e) => e.id) });
  if (ccriTeam.length < cfg.ccriSize) plan.unfilled.push(`CCRI Team: ${ccriTeam.length}/${cfg.ccriSize}`);
  const ccriProd = ccriTeam.slice(0, 1);
  const ccriBins = ccriTeam.slice(1, 2);
  const ccriVac = ccriTeam.slice(2, 3);

  // --- PAO1 --------------------------------------------------------------
  const pao1Pool = pool.filter((e) => !taken.has(e.id));
  const pao1Roles = staffRoom(pao1Pool, taken, hist, histTotal, "PAO1", cfg.pao1Vacuum, cfg.bins, singles);
  checkGaps(plan, "PAO1", pao1Roles, cfg.pao1Vacuum, cfg.bins, singles);
  for (const [role, emps] of Object.entries(pao1Roles)) {
    plan.rows.push({ room: "PAO1", phase: "Main", role, employeeIds: emps.map((e) => e.id) });
  }

  const [clean1, dirty1, rest1] = splitVesta(pao1Roles["Vacuum"] ?? [], "PAO1", hist, histTotal);
  const singles1 = [
    ...(pao1Roles["Bins"] ?? []),
    ...others(pao1Roles, ["Vacuum", "Bins"]),
    ...leftover(pao1Pool, pao1Roles),
  ];
  addMopRows(plan, "PAO1", clean1, dirty1, rest1, singles1);

  // --- PAO2: seeded early by CCRI + the PAO1 Vesta-Dirty transfer ---------
  const preAssigned: Record<string, Employee[]> = {};
  if (prodLabel && ccriProd.length) preAssigned[prodLabel] = [...ccriProd];
  if (ccriBins.length) preAssigned["Bins"] = [...ccriBins];
  const earlyVacuum = [...ccriVac, ...dirty1];
  if (earlyVacuum.length) preAssigned["Vacuum"] = earlyVacuum;

  const relayPool = [...clean1, ...rest1, ...singles1];
  const taken2 = new Set<number>(Object.values(preAssigned).flat().map((e) => e.id));
  const pao2Roles = staffRoom(
    relayPool,
    taken2,
    hist,
    histTotal,
    "PAO2",
    cfg.pao2VacuumMax,
    cfg.bins,
    singles,
    preAssigned
  );
  checkGaps(plan, "PAO2", pao2Roles, cfg.pao2VacuumMax, cfg.bins, singles);
  for (const [role, emps] of Object.entries(pao2Roles)) {
    plan.rows.push({ room: "PAO2", phase: "Main", role, employeeIds: emps.map((e) => e.id) });
  }

  const [clean2, dirty2, rest2] = splitVesta(pao2Roles["Vacuum"] ?? [], "PAO2", hist, histTotal);
  const singles2 = [
    ...(pao2Roles["Bins"] ?? []),
    ...others(pao2Roles, ["Vacuum", "Bins"]),
    ...leftover(relayPool, pao2Roles),
  ];
  addMopRows(plan, "PAO2", clean2, dirty2, rest2, singles2);

  return plan;
}

export async function saveRelayPlan(plan: RelayPlan): Promise<void> {
  await prisma.cleanroomRelayAssignment.deleteMany({ where: { day: plan.day } });
  for (const row of plan.rows) {
    for (const employeeId of row.employeeIds) {
      await prisma.cleanroomRelayAssignment.create({
        data: { day: plan.day, room: row.room, phase: row.phase, role: row.role, employeeId },
      });
    }
  }
}

export function sortedRows(plan: RelayPlan): RelayRow[] {
  return [...plan.rows].sort(
    (a, b) =>
      (ROOM_ORDER[a.room] ?? 9) - (ROOM_ORDER[b.room] ?? 9) ||
      (PHASE_ORDER[a.phase] ?? 9) - (PHASE_ORDER[b.phase] ?? 9)
  );
}
