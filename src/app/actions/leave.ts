"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { LEAVE_TYPES, parseDateOnly } from "@/lib/domain";
import { prisma } from "@/lib/prisma";

const LeaveInput = z.object({
  employeeId: z.number(),
  startDate: z.string(),
  endDate: z.string(),
  leaveType: z.enum(LEAVE_TYPES),
  note: z.string(),
});

export async function addLeave(input: z.infer<typeof LeaveInput>) {
  const data = LeaveInput.parse(input);
  await prisma.leaveRecord.create({
    data: {
      employeeId: data.employeeId,
      startDate: parseDateOnly(data.startDate),
      endDate: parseDateOnly(data.endDate),
      leaveType: data.leaveType,
      note: data.note,
    },
  });
  revalidatePath("/leave");
  revalidatePath("/");
  revalidatePath("/daily");
}

export async function deleteLeave(id: number) {
  await prisma.leaveRecord.delete({ where: { id } });
  revalidatePath("/leave");
  revalidatePath("/");
  revalidatePath("/daily");
}
