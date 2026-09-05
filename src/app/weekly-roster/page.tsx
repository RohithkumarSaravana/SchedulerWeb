import { WeeklyRosterView } from "@/components/roster/weekly-roster-view";
import { formatDateOnly, monday } from "@/lib/domain";
import { prisma } from "@/lib/prisma";

export default async function WeeklyRosterPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const sp = await searchParams;
  const weekStart = monday(sp.week ? new Date(`${sp.week}T00:00:00.000Z`) : new Date());

  const [assignments, employees, tasks] = await Promise.all([
    prisma.weeklyAssignment.findMany({ where: { weekStart } }),
    prisma.employee.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.generalTask.findMany({ where: { active: true } }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-soft">Roster · Weekly</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink">Weekly Roster</h1>
        <p className="mt-1 max-w-2xl text-sm text-ink-soft">
          Generates a workload-balanced weekly roster: rotates who owns each task, respects machine
          certifications and training, and flags anything nobody is eligible for.
        </p>
      </div>
      <WeeklyRosterView
        weekStartIso={formatDateOnly(weekStart)}
        assignments={assignments.map((a) => ({ id: a.id, taskId: a.taskId, employeeId: a.employeeId, locked: a.locked }))}
        employees={employees}
        tasks={tasks}
      />
    </div>
  );
}
