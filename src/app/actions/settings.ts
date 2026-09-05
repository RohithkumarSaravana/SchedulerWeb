"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const WeightsInput = z.object({
  wCount: z.number().min(0).max(10),
  wMinutes: z.number().min(0).max(2),
  wSize: z.number().min(0).max(5),
});

export async function updateWeights(input: z.infer<typeof WeightsInput>) {
  const data = WeightsInput.parse(input);
  const rows: [string, number][] = [
    ["w_count", data.wCount],
    ["w_minutes", data.wMinutes],
    ["w_size", data.wSize],
  ];
  for (const [key, value] of rows) {
    await prisma.setting.upsert({
      where: { key },
      update: { value: String(value) },
      create: { key, value: String(value) },
    });
  }
  revalidatePath("/settings");
  revalidatePath("/weekly-roster");
}
