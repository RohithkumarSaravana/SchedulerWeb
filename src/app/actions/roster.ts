"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { parseDateOnly } from "@/lib/domain";
import { prisma } from "@/lib/prisma";
import { generateWeeklyRoster, saveWeeklyRoster } from "@/lib/scheduler";

export async function regenerateWeeklyRoster(weekStartStr: string) {
  const weekStart = parseDateOnly(weekStartStr);
  const result = await generateWeeklyRoster(weekStart, true);
  await saveWeeklyRoster(result);
  revalidatePath("/weekly-roster");
  revalidatePath("/daily");
  revalidatePath("/");
  return { gaps: result.gaps.length };
}

export async function clearWeeklyRoster(weekStartStr: string) {
  const weekStart = parseDateOnly(weekStartStr);
  await prisma.weeklyAssignment.deleteMany({ where: { weekStart } });
  revalidatePath("/weekly-roster");
  revalidatePath("/daily");
}

const AssignInput = z.object({
  weeklyAssignmentId: z.number(),
  employeeId: z.number().nullable(),
  locked: z.boolean(),
});

export async function updateWeeklyAssignment(input: z.infer<typeof AssignInput>) {
  const data = AssignInput.parse(input);
  await prisma.weeklyAssignment.update({
    where: { id: data.weeklyAssignmentId },
    data: { employeeId: data.employeeId, locked: data.locked },
  });
  revalidatePath("/weekly-roster");
  revalidatePath("/daily");
}
