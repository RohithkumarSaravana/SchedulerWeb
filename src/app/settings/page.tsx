import { SettingsForm } from "@/components/settings/settings-form";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const rows = await prisma.setting.findMany();
  const settings = Object.fromEntries(rows.map((r) => [r.key, r.value]));

  return (
    <div className="space-y-6">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-soft">Roster · Config</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink">Settings</h1>
        <p className="mt-1 max-w-2xl text-sm text-ink-soft">
          Workload weights for the weekly general-cleaning roster. Cleanroom relay headcounts live on the
          Cleanroom Setup page instead.
        </p>
      </div>
      <SettingsForm settings={settings} />
    </div>
  );
}
