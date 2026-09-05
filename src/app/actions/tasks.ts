"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { FREQUENCIES, MACHINES, SHIFTS } from "@/lib/domain";
import { prisma } from "@/lib/prisma";

const TaskInput = z.object({
  id: z.number().optional(),
  name: z.string().min(1, "Name is required"),
  shift: z.enum(SHIFTS),
  area: z.string(),
  estMinutes: z.number().int().min(1).max(480),
  size: z.number().int().min(1).max(3),
  frequency: z.enum(FREQUENCIES),
  specificDays: z.string(),
  requiredMachine: z.enum(MACHINES).nullable(),
  isExtra: z.boolean(),
  active: z.boolean(),
  notes: z.string(),
});

export type TaskInput = z.infer<typeof TaskInput>;

export async function upsertTask(input: TaskInput) {
  const data = TaskInput.parse(input);
  const payload = {
    name: data.name,
    shift: data.shift,
    area: data.area,
    estMinutes: data.estMinutes,
    size: data.size,
    frequency: data.frequency,
    specificDays: data.specificDays,
    requiredMachine: data.requiredMachine,
    isExtra: data.isExtra,
    active: data.active,
    notes: data.notes,
  };
  if (data.id) {
    await prisma.generalTask.update({ where: { id: data.id }, data: payload });
  } else {
    await prisma.generalTask.create({ data: payload });
  }
  revalidatePath("/tasks");
  revalidatePath("/employees");
  revalidatePath("/");
  revalidatePath("/weekly-roster");
  revalidatePath("/daily");
}

export async function deleteTask(id: number) {
  await prisma.generalTask.delete({ where: { id } });
  revalidatePath("/tasks");
  revalidatePath("/");
}
