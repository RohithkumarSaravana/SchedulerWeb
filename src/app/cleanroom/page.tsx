import { CleanroomSetupForm } from "@/components/cleanroom/cleanroom-setup-form";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function CleanroomSetupPage() {
  const [rooms, settingRows] = await Promise.all([
    prisma.cleanroomRoom.findMany({ orderBy: { id: "asc" } }),
    prisma.setting.findMany(),
  ]);
  const settings = Object.fromEntries(settingRows.map((s) => [s.key, s.value]));

  return (
    <div className="space-y-6">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-soft">Roster · Cleanroom</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink">Cleanroom Setup</h1>
        <p className="mt-1 max-w-2xl text-sm text-ink-soft">
          The nightly clean is a <strong className="text-ink">relay</strong>, not independent rooms: CCRI
          runs first and feeds PAO2; the rest of the crew runs PAO1, and once PAO1&rsquo;s mopping is done,
          that whole crew relays into PAO2 too, roles reshuffled daily. PAO3 (Wed/Sun) is self-contained
          and runs first. See Daily Schedule to generate and view a night&rsquo;s plan.
        </p>
      </div>
      <CleanroomSetupForm rooms={rooms} settings={settings} />
    </div>
  );
}
