import { TaskManager } from "@/components/tasks/task-manager";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const tasks = await prisma.generalTask.findMany({ orderBy: [{ shift: "asc" }, { name: "asc" }] });

  return (
    <div className="space-y-6">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-soft">Roster · Work</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink">General Tasks</h1>
        <p className="mt-1 max-w-2xl text-sm text-ink-soft">
          The task list feeding the weekly roster, one shift at a time. Mark a task as an &ldquo;extra&rdquo;
          for the night-shift add-ons that change week to week.
        </p>
      </div>
      <TaskManager tasks={tasks} />
    </div>
  );
}
