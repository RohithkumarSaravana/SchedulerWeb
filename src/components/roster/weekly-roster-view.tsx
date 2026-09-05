"use client";

import type { Employee, GeneralTask } from "@prisma/client";
import { Download, FileDown, RefreshCw, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, useTransition } from "react";
import { clearWeeklyRoster, regenerateWeeklyRoster, updateWeeklyAssignment } from "@/app/actions/roster";
import { Badge, shiftBadgeVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { downloadNodeAsPdf, downloadNodeAsPng } from "@/lib/export-client";
import { SHIFTS, type Shift } from "@/lib/domain";

type Assignment = { id: number; taskId: number; employeeId: number | null; locked: boolean };

export function WeeklyRosterView({
  weekStartIso,
  assignments,
  employees,
  tasks,
}: {
  weekStartIso: string;
  assignments: Assignment[];
  employees: Employee[];
  tasks: GeneralTask[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [notice, setNotice] = useState<string | null>(null);
  const exportRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState<"png" | "pdf" | null>(null);

  const taskById = new Map(tasks.map((t) => [t.id, t]));
  const employeeById = useMemo(() => new Map(employees.map((e) => [e.id, e])), [employees]);

  const workload = useMemo(() => {
    const counts = new Map<number, number>();
    for (const a of assignments) {
      if (a.employeeId != null) counts.set(a.employeeId, (counts.get(a.employeeId) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([empId, count]) => ({ employee: employeeById.get(empId), count }))
      .filter((r) => r.employee)
      .sort((a, b) => b.count - a.count);
  }, [assignments, employeeById]);

  function generate() {
    setNotice(null);
    startTransition(async () => {
      const res = await regenerateWeeklyRoster(weekStartIso);
      setNotice(res.gaps > 0 ? `${res.gaps} task(s) have no eligible employee.` : "Roster generated.");
      router.refresh();
    });
  }

  function clearWeek() {
    if (!confirm("Clear this week's roster?")) return;
    startTransition(async () => {
      await clearWeeklyRoster(weekStartIso);
      router.refresh();
    });
  }

  function changeWeek(deltaWeeks: number) {
    const d = new Date(`${weekStartIso}T00:00:00.000Z`);
    d.setUTCDate(d.getUTCDate() + deltaWeeks * 7);
    router.push(`/weekly-roster?week=${d.toISOString().slice(0, 10)}`);
  }

  async function exportAs(kind: "png" | "pdf") {
    if (!exportRef.current) return;
    setExporting(kind);
    try {
      if (kind === "png") await downloadNodeAsPng(exportRef.current, `weekly-roster-${weekStartIso}.png`);
      else await downloadNodeAsPdf(exportRef.current, `weekly-roster-${weekStartIso}.pdf`);
    } finally {
      setExporting(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" onClick={() => changeWeek(-1)}>
            ← Prev
          </Button>
          <Input
            type="date"
            value={weekStartIso}
            onChange={(e) => router.push(`/weekly-roster?week=${e.target.value}`)}
            className="w-[160px]"
          />
          <Button variant="outline" size="sm" onClick={() => changeWeek(1)}>
            Next →
          </Button>
        </div>
        <Button onClick={generate} disabled={pending}>
          <RefreshCw className={pending ? "animate-spin" : ""} /> Generate / regenerate
        </Button>
        <Button variant="outline" onClick={clearWeek} disabled={pending}>
          <Trash2 /> Clear week
        </Button>
        {notice && <Badge variant={notice.includes("no eligible") ? "danger" : "ok"}>{notice}</Badge>}
      </div>

      {assignments.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-ink-soft">
            No roster for this week yet. Click <strong>Generate / regenerate</strong>.
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Workload (tasks per person)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {workload.map(({ employee, count }) => (
                  <Badge key={employee!.id} variant="outline">
                    {employee!.initials} · {count}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => exportAs("png")} disabled={exporting !== null}>
              <Download /> {exporting === "png" ? "Exporting…" : "Download PNG"}
            </Button>
            <Button variant="outline" size="sm" onClick={() => exportAs("pdf")} disabled={exporting !== null}>
              <FileDown /> {exporting === "pdf" ? "Exporting…" : "Download PDF"}
            </Button>
          </div>

          <div ref={exportRef} className="space-y-5 bg-bg p-1">
            {SHIFTS.map((shift) => (
              <ShiftTable
                key={shift}
                shift={shift}
                assignments={assignments.filter((a) => taskById.get(a.taskId)?.shift === shift)}
                taskById={taskById}
                employees={employees.filter((e) => e.shift === shift)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function ShiftTable({
  shift,
  assignments,
  taskById,
  employees,
}: {
  shift: Shift;
  assignments: Assignment[];
  taskById: Map<number, GeneralTask>;
  employees: Employee[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function update(a: Assignment, patch: Partial<Pick<Assignment, "employeeId" | "locked">>) {
    startTransition(async () => {
      await updateWeeklyAssignment({
        weeklyAssignmentId: a.id,
        employeeId: patch.employeeId !== undefined ? patch.employeeId : a.employeeId,
        locked: patch.locked !== undefined ? patch.locked : a.locked,
      });
      router.refresh();
    });
  }

  const rows = [...assignments].sort((a, b) => {
    const ta = taskById.get(a.taskId)?.name ?? "";
    const tb = taskById.get(b.taskId)?.name ?? "";
    return ta.localeCompare(tb);
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <Badge variant={shiftBadgeVariant(shift)} className="mr-2">
            {shift}
          </Badge>
          shift
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Task</TableHead>
              <TableHead>Area</TableHead>
              <TableHead>Machine</TableHead>
              <TableHead>Assigned to</TableHead>
              <TableHead>Locked</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((a) => {
              const task = taskById.get(a.taskId);
              if (!task) return null;
              return (
                <TableRow key={a.id}>
                  <TableCell>{task.name}</TableCell>
                  <TableCell className="text-ink-soft">{task.area || "—"}</TableCell>
                  <TableCell>{task.requiredMachine ? <Badge variant="dirty">{task.requiredMachine}</Badge> : "—"}</TableCell>
                  <TableCell className="min-w-[180px]">
                    <Select
                      value={a.employeeId != null ? String(a.employeeId) : "unassigned"}
                      onValueChange={(v) => update(a, { employeeId: v === "unassigned" ? null : Number(v) })}
                      disabled={pending}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned">— UNASSIGNED —</SelectItem>
                        {employees.map((e) => (
                          <SelectItem key={e.id} value={String(e.id)}>
                            {e.initials} — {e.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Checkbox
                      checked={a.locked}
                      onCheckedChange={(v) => update(a, { locked: v === true })}
                      disabled={pending}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
