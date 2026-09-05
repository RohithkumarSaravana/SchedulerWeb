/**
 * General-cleaning scheduling engine - weekly roster generation + same-day leave cover.
 * Ported from the Python prototype's core/scheduler.py; behaviour should match exactly.
 */
import type { Employee, GeneralTask } from "@prisma/client";
import { dateOnly, dayName, fromCsv, monday, taskRunsOn } from "./domain";
import { prisma } from "./prisma";

export type Settings = { wCount: number; wMinutes: number; wSize: number };

export async function getSettings(): Promise<Settings> {
  const rows = await prisma.setting.findMany();
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return {
    wCount: Number(map.w_count ?? 1.0),
    wMinutes: Number(map.w_minutes ?? 0.05),
    wSize: Number(map.w_size ?? 0.5),
  };
}

export function taskWeight(task: Pick<GeneralTask, "estMinutes" | "size">, w: Settings): number {
  return w.wCount + w.wMinutes * task.estMinutes + w.wSize * task.size;
}

export function eligibleForTask(
  emp: Employee,
  task: GeneralTask,
  trainedTaskIds: Set<number> | undefined
): boolean {
  if (emp.shift !== task.shift || !emp.doesGeneral || !emp.active) return false;
  if (task.requiredMachine && !fromCsv(emp.machineCerts).includes(task.requiredMachine)) return false;
  if (trainedTaskIds && trainedTaskIds.size > 0 && !trainedTaskIds.has(task.id)) return false;
  return true;
}

async function trainingMap(): Promise<Map<number, Set<number>>> {
  const rows = await prisma.taskTraining.findMany();
  const map = new Map<number, Set<number>>();
  for (const r of rows) {
    if (!map.has(r.employeeId)) map.set(r.employeeId, new Set());
    map.get(r.employeeId)!.add(r.taskId);
  }
  return map;
}

function byDifficulty(a: GeneralTask, b: GeneralTask): number {
  const da = a.requiredMachine ? 1 : 0;
  const db = b.requiredMachine ? 1 : 0;
  if (da !== db) return db - da;
  if (a.size !== b.size) return b.size - a.size;
  return b.estMinutes - a.estMinutes;
}

// --------------------------------------------------------------------------
// 1. General weekly roster
// --------------------------------------------------------------------------
export type WeeklyResult = {
  weekStart: Date;
  assignments: Map<number, number | null>; // taskId -> employeeId
  gaps: number[];
  workload: Map<number, number>; // employeeId -> score
};

export async function generateWeeklyRoster(
  weekStartInput: Date,
  respectLocks = true
): Promise<WeeklyResult> {
  const weekStart = monday(weekStartInput);
  const w = await getSettings();
  const prevWeek = new Date(weekStart);
  prevWeek.setUTCDate(prevWeek.getUTCDate() - 7);

  const prevRows = await prisma.weeklyAssignment.findMany({ where: { weekStart: prevWeek } });
  const prevOwner = new Map<number, number>();
  for (const wa of prevRows) if (wa.employeeId != null) prevOwner.set(wa.taskId, wa.employeeId);

  const locked = new Map<number, number>();
  if (respectLocks) {
    const lockedRows = await prisma.weeklyAssignment.findMany({
      where: { weekStart, locked: true },
    });
    for (const wa of lockedRows) if (wa.employeeId != null) locked.set(wa.taskId, wa.employeeId);
  }

  const employees = await prisma.employee.findMany({ where: { active: true } });
  const tasks = await prisma.generalTask.findMany({ where: { active: true } });
  const trained = await trainingMap();
  const taskById = new Map(tasks.map((t) => [t.id, t]));

  const assignments = new Map<number, number | null>();
  const gaps: number[] = [];
  const workload = new Map<number, number>();

  for (const [taskId, empId] of locked) {
    assignments.set(taskId, empId);
    const t = taskById.get(taskId);
    if (t) workload.set(empId, (workload.get(empId) ?? 0) + taskWeight(t, w));
  }

  const ordered = [...tasks].sort(byDifficulty);
  for (const task of ordered) {
    if (assignments.has(task.id)) continue;
    const cands = employees.filter((e) => eligibleForTask(e, task, trained.get(e.id)));
    if (cands.length === 0) {
      gaps.push(task.id);
      assignments.set(task.id, null);
      continue;
    }
    cands.sort((a, b) => {
      const wa = workload.get(a.id) ?? 0;
      const wb = workload.get(b.id) ?? 0;
      if (wa !== wb) return wa - wb;
      const pa = prevOwner.get(task.id) === a.id ? 1 : 0;
      const pb = prevOwner.get(task.id) === b.id ? 1 : 0;
      if (pa !== pb) return pa - pb;
      return a.id - b.id;
    });
    const pick = cands[0];
    assignments.set(task.id, pick.id);
    workload.set(pick.id, (workload.get(pick.id) ?? 0) + taskWeight(task, w));
  }

  return { weekStart, assignments, gaps, workload };
}

export async function saveWeeklyRoster(result: WeeklyResult): Promise<void> {
  const existing = await prisma.weeklyAssignment.findMany({
    where: { weekStart: result.weekStart },
  });
  const existingByTask = new Map(existing.map((e) => [e.taskId, e]));
  for (const [taskId, empId] of result.assignments) {
    const wa = existingByTask.get(taskId);
    if (!wa) {
      await prisma.weeklyAssignment.create({
        data: { weekStart: result.weekStart, taskId, employeeId: empId },
      });
    } else if (!wa.locked) {
      await prisma.weeklyAssignment.update({ where: { id: wa.id }, data: { employeeId: empId } });
    }
  }
}

// --------------------------------------------------------------------------
// 2. Daily leave cover (reassign only the off employee's tasks, that day)
// --------------------------------------------------------------------------
export type CoverResult = {
  day: Date;
  covers: { taskId: number; originalEmployeeId: number | null; substituteEmployeeId: number | null }[];
};

export async function computeDailyCover(dayInput: Date): Promise<CoverResult> {
  const day = dateOnly(dayInput);
  const w = await getSettings();
  const weekStart = monday(day);
  const dname = dayName(day);

  const base = await prisma.weeklyAssignment.findMany({ where: { weekStart } });
  const baseMap = new Map(base.map((b) => [b.taskId, b.employeeId]));
  const tasks = await prisma.generalTask.findMany();
  const taskById = new Map(tasks.map((t) => [t.id, t]));
  const employees = await prisma.employee.findMany();
  const trained = await trainingMap();
  const leaves = await prisma.leaveRecord.findMany({
    where: { startDate: { lte: day }, endDate: { gte: day } },
  });
  const offIds = new Set(leaves.map((l) => l.employeeId));

  const workload = new Map<number, number>();
  const affected: GeneralTask[] = [];
  for (const [taskId, ownerId] of baseMap) {
    const task = taskById.get(taskId);
    if (!task || !task.active || !taskRunsOn(task, dname)) continue;
    if (ownerId == null || offIds.has(ownerId)) {
      affected.push(task);
    } else {
      workload.set(ownerId, (workload.get(ownerId) ?? 0) + taskWeight(task, w));
    }
  }

  const covers: CoverResult["covers"] = [];
  for (const task of [...affected].sort(byDifficulty)) {
    const original = baseMap.get(task.id) ?? null;
    const cands = employees.filter((e) => !offIds.has(e.id) && eligibleForTask(e, task, trained.get(e.id)));
    if (cands.length === 0) {
      covers.push({ taskId: task.id, originalEmployeeId: original, substituteEmployeeId: null });
      continue;
    }
    cands.sort((a, b) => (workload.get(a.id) ?? 0) - (workload.get(b.id) ?? 0) || a.id - b.id);
    const pick = cands[0];
    workload.set(pick.id, (workload.get(pick.id) ?? 0) + taskWeight(task, w));
    covers.push({ taskId: task.id, originalEmployeeId: original, substituteEmployeeId: pick.id });
  }
  return { day, covers };
}

export async function saveDailyCover(result: CoverResult): Promise<void> {
  await prisma.coverageOverride.deleteMany({ where: { day: result.day } });
  for (const c of result.covers) {
    await prisma.coverageOverride.create({
      data: {
        day: result.day,
        taskId: c.taskId,
        originalEmployeeId: c.originalEmployeeId,
        substituteEmployeeId: c.substituteEmployeeId,
      },
    });
  }
}

export async function effectiveGeneralAssignments(dayInput: Date): Promise<Map<number, number | null>> {
  const day = dateOnly(dayInput);
  const weekStart = monday(day);
  const dname = dayName(day);
  const out = new Map<number, number | null>();

  const tasks = await prisma.generalTask.findMany();
  const taskById = new Map(tasks.map((t) => [t.id, t]));
  const was = await prisma.weeklyAssignment.findMany({ where: { weekStart } });
  for (const wa of was) {
    const t = taskById.get(wa.taskId);
    if (t && t.active && taskRunsOn(t, dname)) out.set(wa.taskId, wa.employeeId);
  }
  const overrides = await prisma.coverageOverride.findMany({ where: { day } });
  for (const o of overrides) out.set(o.taskId, o.substituteEmployeeId);
  return out;
}
