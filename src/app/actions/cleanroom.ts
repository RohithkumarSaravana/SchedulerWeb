"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const RoomInput = z.object({
  id: z.number(),
  activeDays: z.string(),
  active: z.boolean(),
});

export async function updateRoom(input: z.infer<typeof RoomInput>) {
  const data = RoomInput.parse(input);
  await prisma.cleanroomRoom.update({
    where: { id: data.id },
    data: { activeDays: data.activeDays, active: data.active },
  });
  revalidatePath("/cleanroom");
  revalidatePath("/daily");
  revalidatePath("/");
}

const RelaySettingsInput = z.object({
  ccriSize: z.number().int().min(1).max(10),
  pao1Vacuum: z.number().int().min(1).max(12),
  bins: z.number().int().min(1).max(6),
  pao2VacuumMax: z.number().int().min(1).max(12),
  relayLookbackDays: z.number().int().min(1).max(90),
});

export async function updateRelaySettings(input: z.infer<typeof RelaySettingsInput>) {
  const data = RelaySettingsInput.parse(input);
  const rows: [string, number][] = [
    ["ccri_size", data.ccriSize],
    ["pao1_vacuum", data.pao1Vacuum],
    ["cleanroom_bins", data.bins],
    ["pao2_vacuum_max", data.pao2VacuumMax],
    ["relay_lookback_days", data.relayLookbackDays],
  ];
  for (const [key, value] of rows) {
    await prisma.setting.upsert({
      where: { key },
      update: { value: String(value) },
      create: { key, value: String(value) },
    });
  }
  revalidatePath("/cleanroom");
  revalidatePath("/daily");
}
