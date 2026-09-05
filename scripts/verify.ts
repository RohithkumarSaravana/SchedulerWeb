/**
 * Port of the Python prototype's tests/test_scheduler.py - checks the TypeScript engines
 * produce the same behaviour against the same seed data. Run: npx tsx scripts/verify.ts
 */
import { planRelayNight, saveRelayPlan } from "../src/lib/cleanroomRelay";
import { monday } from "../src/lib/domain";
import { prisma } from "../src/lib/prisma";
import {
  computeDailyCover,
  effectiveGeneralAssignments,
  generateWeeklyRoster,
  saveDailyCover,
  saveWeeklyRoster,
} from "../src/lib/scheduler";

const NEXT_MON = monday(new Date(Date.now() + 7 * 86400000));

let failed = 0;
async function test(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    console.log(`PASS ${name}`);
  } catch (e) {
    failed++;
    console.log(`FAIL ${name}: ${e instanceof Error ? e.message : e}`);
  }
}

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

async function main() {
  await test("weekly roster covers all tasks or flags gaps", async () => {
    const res = await generateWeeklyRoster(NEXT_MON);
    const nTasks = await prisma.generalTask.count({ where: { active: true } });
    assert(res.assignments.size === nTasks, `expected ${nTasks} assignments, got ${res.assignments.size}`);
    for (const [taskId, empId] of res.assignments) {
      if (empId == null) assert(res.gaps.includes(taskId), "unassigned task should be in gaps");
    }
    console.log(`  weekly: ${nTasks} tasks, ${res.gaps.length} gaps`);
  });

  await test("machine tasks only go to certified staff", async () => {
    const res = await generateWeeklyRoster(NEXT_MON);
    const machineTasks = await prisma.generalTask.findMany({ where: { requiredMachine: { not: null } } });
    for (const task of machineTasks) {
      const empId = res.assignments.get(task.id);
      if (empId == null) continue;
      const emp = await prisma.employee.findUniqueOrThrow({ where: { id: empId } });
      assert(emp.machineCerts.split(",").includes(task.requiredMachine!), `${task.name} -> uncertified ${emp.initials}`);
    }
  });

  await test("workload is reasonably balanced per shift", async () => {
    const res = await generateWeeklyRoster(NEXT_MON);
    const byShift = new Map<string, number[]>();
    for (const [empId, score] of res.workload) {
      const emp = await prisma.employee.findUniqueOrThrow({ where: { id: empId } });
      if (!byShift.has(emp.shift)) byShift.set(emp.shift, []);
      byShift.get(emp.shift)!.push(score);
    }
    for (const [shift, scores] of byShift) {
      const spread = Math.max(...scores) - Math.min(...scores);
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
      console.log(`  ${shift}: avg=${avg.toFixed(1)} spread=${spread.toFixed(1)}`);
      assert(spread <= avg, `${shift} workload too uneven`);
    }
  });

  await test("sick day reassigns only that person's tasks", async () => {
    const res = await generateWeeklyRoster(NEXT_MON);
    await saveWeeklyRoster(res);
    const day = new Date(NEXT_MON);
    day.setUTCDate(day.getUTCDate() + 1); // Tuesday

    const before = await effectiveGeneralAssignments(day);
    const ownerCounts = new Map<number, number>();
    for (const eid of before.values()) if (eid != null) ownerCounts.set(eid, (ownerCounts.get(eid) ?? 0) + 1);
    const victimId = [...ownerCounts.entries()].sort((a, b) => b[1] - a[1])[0][0];

    await prisma.leaveRecord.create({
      data: { employeeId: victimId, startDate: day, endDate: day, leaveType: "Sick" },
    });

    const victimTasks = new Set([...before.entries()].filter(([, eid]) => eid === victimId).map(([tid]) => tid));
    assert(victimTasks.size > 0, "victim should own tasks");
    const cover = await computeDailyCover(day);
    await saveDailyCover(cover);

    const after = await effectiveGeneralAssignments(day);
    const changed = new Set([...after.keys()].filter((tid) => before.get(tid) !== after.get(tid)));
    for (const c of changed) assert(victimTasks.has(c), "only the sick person's tasks should move");
    for (const t of victimTasks) assert(after.get(t) !== victimId, "victim still assigned");
    assert(changed.size === victimTasks.size, "every victim task should be reassigned");
    console.log(`  sick day moved ${changed.size} task(s)`);
  });

  await test("relay: full staff uses whole pool with no gaps", async () => {
    const plan = await planRelayNight(NEXT_MON);
    const poolRows = await prisma.employee.findMany({
      where: { shift: "Night", doesCleanroom: true, active: true },
    });
    const poolIds = new Set(poolRows.map((e) => e.id));
    const assigned = new Set(plan.rows.flatMap((r) => r.employeeIds));
    for (const id of poolIds) assert(assigned.has(id), `employee ${id} missing from plan`);
    assert(plan.shortfall === 0, `expected 0 shortfall, got ${plan.shortfall}`);
    assert(plan.activeMerges.length === 0, "no merges expected at full staff");
    assert(plan.unfilled.length === 0, `unexpected gaps: ${plan.unfilled.join(", ")}`);
    console.log(`  relay: pool=${poolIds.size} rows=${plan.rows.length}`);
  });

  await test("relay: PAO2 absorbs every relayed person", async () => {
    const plan = await planRelayNight(NEXT_MON);
    const pao1Main = new Set(
      plan.rows.filter((r) => r.room === "PAO1" && r.phase === "Main").flatMap((r) => r.employeeIds)
    );
    const pao2People = new Set(plan.rows.filter((r) => r.room === "PAO2").flatMap((r) => r.employeeIds));
    for (const id of pao1Main) assert(pao2People.has(id), `PAO1 worker ${id} never relayed into PAO2`);
    console.log(`  PAO1 main=${pao1Main.size} PAO2 people=${pao2People.size}`);
  });

  await test("relay: shortstaffed merges roles before dropping anything", async () => {
    const day = new Date(NEXT_MON);
    day.setUTCDate(day.getUTCDate() + 1); // Tuesday, not a PAO3 day
    const pool = await prisma.employee.findMany({
      where: { shift: "Night", doesCleanroom: true, active: true },
    });
    for (const e of pool.slice(0, 2)) {
      await prisma.leaveRecord.create({ data: { employeeId: e.id, startDate: day, endDate: day, leaveType: "Sick" } });
    }
    const plan = await planRelayNight(day);
    assert(plan.shortfall === 2, `expected shortfall 2, got ${plan.shortfall}`);
    assert(
      JSON.stringify(plan.activeMerges) === JSON.stringify(["Gowning+Sinks", "Production+Glass"]),
      `unexpected merges: ${plan.activeMerges.join(", ")}`
    );
    console.log(`  shortstaffed: merges=${plan.activeMerges.join(",")} unfilled=${plan.unfilled.join(",")}`);
  });

  await test("relay: PAO3 only on Wed and Sun", async () => {
    const wed = new Date(NEXT_MON);
    wed.setUTCDate(wed.getUTCDate() + 2);
    const tue = new Date(NEXT_MON);
    tue.setUTCDate(tue.getUTCDate() + 1);
    const planWed = await planRelayNight(wed);
    const planTue = await planRelayNight(tue);
    assert(planWed.isSpecialDay && planWed.rows.some((r) => r.room === "PAO3"), "Wed should run PAO3");
    assert(!planTue.isSpecialDay && !planTue.rows.some((r) => r.room === "PAO3"), "Tue should not run PAO3");
  });

  await test("relay: save persists every assignment", async () => {
    const plan = await planRelayNight(NEXT_MON);
    await saveRelayPlan(plan);
    const expected = plan.rows.reduce((n, r) => n + r.employeeIds.length, 0);
    const count = await prisma.cleanroomRelayAssignment.count({ where: { day: NEXT_MON } });
    assert(count === expected, `expected ${expected} rows, got ${count}`);
  });

  await prisma.$disconnect();
  process.exit(failed ? 1 : 0);
}

main();
