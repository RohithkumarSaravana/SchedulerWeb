import { EmployeeManager } from "@/components/employees/employee-manager";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function EmployeesPage() {
  const [employees, tasks, training] = await Promise.all([
    prisma.employee.findMany({ orderBy: [{ shift: "asc" }, { name: "asc" }] }),
    prisma.generalTask.findMany({ orderBy: [{ shift: "asc" }, { name: "asc" }] }),
    prisma.taskTraining.findMany(),
  ]);

  const trainingByEmployee = new Map<number, number[]>();
  for (const t of training) {
    if (!trainingByEmployee.has(t.employeeId)) trainingByEmployee.set(t.employeeId, []);
    trainingByEmployee.get(t.employeeId)!.push(t.taskId);
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-soft">Roster · People</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink">Employees</h1>
        <p className="mt-1 max-w-2xl text-sm text-ink-soft">
          Add, edit, or retire staff. Machine certifications gate which general tasks someone is eligible
          for; the cleanroom flag puts them in the night relay pool.
        </p>
      </div>
      <EmployeeManager
        employees={employees.map((e) => ({
          ...e,
          machineCerts: e.machineCerts,
        }))}
        tasks={tasks}
        trainingByEmployee={Object.fromEntries(trainingByEmployee)}
      />
    </div>
  );
}
