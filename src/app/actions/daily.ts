"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { planRelayNight, saveRelayPlan } from "@/lib/cleanroomRelay";
import { parseDateOnly } from "@/lib/domain";
import { prisma } from "@/lib/prisma";
import { computeDailyCover, saveDailyCover } from "@/lib/scheduler";

export async function markSickAndRecompute(dayStr: string, employeeIds: number[]) {
  const day = parseDateOnly(dayStr);
  for (const employeeId of employeeIds) {
    await prisma.leaveRecord.create({
      data: { employeeId, startDate: day, endDate: day, leaveType: "Sick", note: "Added from Daily Schedule" },
    });
  }
  const cover = await computeDailyCover(day);
  await saveDailyCover(cover);
  revalidatePath("/daily");
  revalidatePath("/");
  return { covered: cover.covers.length };
}

export async function recomputeDailyCover(dayStr: string) {
  const day = parseDateOnly(dayStr);
  const cover = await computeDailyCover(day);
  await saveDailyCover(cover);
  revalidatePath("/daily");
}

export async function clearDayLeave(dayStr: string) {
  const day = parseDateOnly(dayStr);
  await prisma.leaveRecord.deleteMany({ where: { startDate: { lte: day }, endDate: { gte: day } } });
  await prisma.coverageOverride.deleteMany({ where: { day } });
  revalidatePath("/daily");
  revalidatePath("/");
}

const GenerateRelayInput = z.object({
  day: z.string(),
  extraEmployeeIds: z.array(z.number()).default([]),
});

export async function generateRelay(input: z.infer<typeof GenerateRelayInput>) {
  const data = GenerateRelayInput.parse(input);
  const day = parseDateOnly(data.day);
  const plan = await planRelayNight(day, data.extraEmployeeIds);
  await saveRelayPlan(plan);
  revalidatePath("/daily");
  revalidatePath("/");
  return { shortfall: plan.shortfall, activeMerges: plan.activeMerges, unfilled: plan.unfilled };
}
