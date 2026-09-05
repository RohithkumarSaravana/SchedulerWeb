import { LeaveManager } from "@/components/leave/leave-manager";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function LeavePage() {
  const twoWeeksAgo = new Date();
  twoWeeksAgo.setUTCDate(twoWeeksAgo.getUTCDate() - 14);

  const [employees, leaves] = await Promise.all([
    prisma.employee.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.leaveRecord.findMany({
      where: { endDate: { gte: twoWeeksAgo } },
      include: { employee: true },
      orderBy: { startDate: "asc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-soft">Roster · Leave</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink">Leave</h1>
        <p className="mt-1 max-w-2xl text-sm text-ink-soft">
          Planned leave and sick days. Adding leave here doesn&rsquo;t auto-reassign — use Daily Schedule for
          same-day sick cover.
        </p>
      </div>
      <LeaveManager employees={employees} leaves={leaves} />
    </div>
  );
}
