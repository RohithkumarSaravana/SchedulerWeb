"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { MACHINES, SHIFTS } from "@/lib/domain";
import { prisma } from "@/lib/prisma";

const EmployeeInput = z.object({
  id: z.number().optional(),
  name: z.string().min(1, "Name is required"),
  initials: z.string().min(1, "Initials are required").max(10),
  shift: z.enum(SHIFTS),
  doesGeneral: z.boolean(),
  doesCleanroom: z.boolean(),
  active: z.boolean(),
  machineCerts: z.array(z.enum(MACHINES)),
  skills: z.string(),
  trainedTaskIds: z.array(z.number()),
});

export type EmployeeInput = z.infer<typeof EmployeeInput>;

export async function upsertEmployee(input: EmployeeInput) {
  const data = EmployeeInput.parse(input);
  const payload = {
    name: data.name,
    initials: data.initials,
    shift: data.shift,
    doesGeneral: data.doesGeneral,
    doesCleanroom: data.doesCleanroom,
    active: data.active,
    machineCerts: data.machineCerts.join(","),
    skills: data.skills,
  };

  let id = data.id;
  if (id) {
    await prisma.employee.update({ where: { id }, data: payload });
    await prisma.taskTraining.deleteMany({ where: { employeeId: id } });
  } else {
    const created = await prisma.employee.create({ data: payload });
    id = created.id;
  }
  if (data.trainedTaskIds.length) {
    await prisma.taskTraining.createMany({
      data: data.trainedTaskIds.map((taskId) => ({ employeeId: id!, taskId })),
    });
  }

  revalidatePath("/employees");
  revalidatePath("/");
  revalidatePath("/weekly-roster");
  revalidatePath("/daily");
}

export async function deleteEmployee(id: number) {
  await prisma.employee.delete({ where: { id } });
  revalidatePath("/employees");
  revalidatePath("/");
}
