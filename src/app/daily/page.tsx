import { DailyScheduleView } from "@/components/daily/daily-schedule-view";
import { dateOnly, dayName, formatDateOnly, roomRunsOn } from "@/lib/domain";
import { prisma } from "@/lib/prisma";
import { effectiveGeneralAssignments } from "@/lib/scheduler";

export default async function DailySchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ day?: string }>;
}) {
  const sp = await searchParams;
  const day = dateOnly(sp.day ? new Date(`${sp.day}T00:00:00.000Z`) : new Date());
  const dname = dayName(day);

  const [employees, tasks, leaves, pao3, relayRows] = await Promise.all([
    prisma.employee.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.generalTask.findMany(),
    prisma.leaveRecord.findMany({ where: { startDate: { lte: day }, endDate: { gte: day } } }),
    prisma.cleanroomRoom.findUnique({ where: { name: "PAO3" } }),
    prisma.cleanroomRelayAssignment.findMany({ where: { day } }),
  ]);

  const effective = await effectiveGeneralAssignments(day);
  const overrides = await prisma.coverageOverride.findMany({ where: { day } });
  const overriddenTaskIds = new Set(overrides.map((o) => o.taskId));
  const isSpecialDay = !!pao3 && roomRunsOn(pao3, dname);

  return (
    <div className="space-y-6">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-soft">Roster · Today</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink">Daily Schedule</h1>
        <p className="mt-1 max-w-2xl text-sm text-ink-soft">
          Mark people off, auto-reassign only their tasks, and generate the night&rsquo;s cleanroom relay.
        </p>
      </div>
      <DailyScheduleView
        dayIso={formatDateOnly(day)}
        dayName={dname}
        isSpecialDay={isSpecialDay}
        employees={employees}
        tasks={tasks}
        leaves={leaves}
        generalAssignments={[...effective.entries()].map(([taskId, employeeId]) => ({
          taskId,
          employeeId,
          covered: overriddenTaskIds.has(taskId),
        }))}
        relayRows={relayRows}
      />
    </div>
  );
}
