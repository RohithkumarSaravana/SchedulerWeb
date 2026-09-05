"use client";

import type { CleanroomRelayAssignment, Employee, GeneralTask, LeaveRecord } from "@prisma/client";
import { Download, FileDown, RotateCcw, ShieldAlert, Undo2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, useTransition } from "react";
import { clearDayLeave, generateRelay, markSickAndRecompute, recomputeDailyCover } from "@/app/actions/daily";
import { Badge, shiftBadgeVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PHASE_ORDER, ROOM_ORDER } from "@/lib/domain";
import { downloadNodeAsPdf, downloadNodeAsPng } from "@/lib/export-client";

type GeneralAssignmentRow = { taskId: number; employeeId: number | null; covered: boolean };

export function DailyScheduleView({
  dayIso,
  dayName,
  isSpecialDay,
  employees,
  tasks,
  leaves,
  generalAssignments,
  relayRows,
}: {
  dayIso: string;
  dayName: string;
  isSpecialDay: boolean;
  employees: Employee[];
  tasks: GeneralTask[];
  leaves: LeaveRecord[];
  generalAssignments: GeneralAssignmentRow[];
  relayRows: CleanroomRelayAssignment[];
}) {
  const router = useRouter();
  const employeeById = new Map(employees.map((e) => [e.id, e]));
  const taskById = new Map(tasks.map((t) => [t.id, t]));

  function changeDay(deltaDays: number) {
    const d = new Date(`${dayIso}T00:00:00.000Z`);
    d.setUTCDate(d.getUTCDate() + deltaDays);
    router.push(`/daily?day=${d.toISOString().slice(0, 10)}`);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="outline" size="sm" onClick={() => changeDay(-1)}>
          ← Prev
        </Button>
        <Input
          type="date"
          value={dayIso}
          onChange={(e) => router.push(`/daily?day=${e.target.value}`)}
          className="w-[160px]"
        />
        <Button variant="outline" size="sm" onClick={() => changeDay(1)}>
          Next →
        </Button>
        <Badge variant="outline">{dayName}</Badge>
      </div>

      <OffTodaySection dayIso={dayIso} employees={employees} leaves={leaves} employeeById={employeeById} />

      <GeneralSection
        dayIso={dayIso}
        generalAssignments={generalAssignments}
        taskById={taskById}
        employeeById={employeeById}
      />

      <RelaySection
        dayIso={dayIso}
        dayName={dayName}
        isSpecialDay={isSpecialDay}
        employees={employees}
        relayRows={relayRows}
        employeeById={employeeById}
      />
    </div>
  );
}

function OffTodaySection({
  dayIso,
  employees,
  leaves,
  employeeById,
}: {
  dayIso: string;
  employees: Employee[];
  leaves: LeaveRecord[];
  employeeById: Map<number, Employee>;
}) {
  const router = useRouter();
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<string | null>(null);
  const offIds = new Set(leaves.map((l) => l.employeeId));
  const candidates = employees.filter((e) => !offIds.has(e.id));

  function toggle(id: number) {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function markSick() {
    setResult(null);
    startTransition(async () => {
      const res = await markSickAndRecompute(dayIso, [...picked]);
      setResult(`Reassigned ${res.covered} task(s).`);
      setPicked(new Set());
      router.refresh();
    });
  }

  function recompute() {
    startTransition(async () => {
      await recomputeDailyCover(dayIso);
      router.refresh();
    });
  }

  function clearAll() {
    if (!confirm("Clear all leave for this day?")) return;
    startTransition(async () => {
      await clearDayLeave(dayIso);
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Off today</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {leaves.length === 0 ? (
          <p className="text-sm text-ink-soft">Nobody marked off.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {leaves.map((lr) => {
              const e = employeeById.get(lr.employeeId);
              return (
                <Badge key={lr.id} variant={lr.leaveType === "Sick" ? "dirty" : "neutral"}>
                  {e?.initials ?? lr.employeeId} · {lr.leaveType}
                </Badge>
              );
            })}
          </div>
        )}

        <div className="scroll-thin max-h-36 space-y-1 overflow-y-auto rounded-[var(--radius-sm)] border border-steel-line-soft p-2.5">
          {candidates.map((e) => (
            <label key={e.id} className="flex cursor-pointer items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                checked={picked.has(e.id)}
                onChange={() => toggle(e.id)}
                className="size-4 accent-signal"
              />
              {e.initials} — {e.name} ({e.shift})
            </label>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={markSick} disabled={pending || picked.size === 0}>
            <ShieldAlert /> Mark sick + auto-reassign
          </Button>
          <Button variant="outline" onClick={recompute} disabled={pending}>
            <RotateCcw /> Recompute cover
          </Button>
          <Button variant="outline" onClick={clearAll} disabled={pending}>
            <Undo2 /> Clear all leave
          </Button>
          {result && <span className="text-[13px] text-ok">{result}</span>}
        </div>
      </CardContent>
    </Card>
  );
}

function GeneralSection({
  dayIso,
  generalAssignments,
  taskById,
  employeeById,
}: {
  dayIso: string;
  generalAssignments: GeneralAssignmentRow[];
  taskById: Map<number, GeneralTask>;
  employeeById: Map<number, Employee>;
}) {
  const exportRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  const rows = generalAssignments
    .map((a) => ({ ...a, task: taskById.get(a.taskId) }))
    .filter((a) => a.task)
    .sort((a, b) => (a.task!.shift + a.task!.name).localeCompare(b.task!.shift + b.task!.name));

  async function exportPng() {
    if (!exportRef.current) return;
    setExporting(true);
    try {
      await downloadNodeAsPng(exportRef.current, `daily-general-${dayIso}.png`);
    } finally {
      setExporting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>General cleaning — today</CardTitle>
        <Button variant="outline" size="sm" onClick={exportPng} disabled={exporting || rows.length === 0}>
          <Download /> {exporting ? "Exporting…" : "PNG"}
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        {rows.length === 0 ? (
          <p className="p-4 text-sm text-ink-soft">
            No weekly roster covers this day yet — generate it on the Weekly Roster page.
          </p>
        ) : (
          <div ref={exportRef} className="bg-bg p-1">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Shift</TableHead>
                  <TableHead>Task</TableHead>
                  <TableHead>Assigned to</TableHead>
                  <TableHead>Cover</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => {
                  const emp = r.employeeId != null ? employeeById.get(r.employeeId) : null;
                  return (
                    <TableRow key={r.taskId}>
                      <TableCell>
                        <Badge variant={shiftBadgeVariant(r.task!.shift)}>{r.task!.shift}</Badge>
                      </TableCell>
                      <TableCell>{r.task!.name}</TableCell>
                      <TableCell>{emp ? `${emp.initials} — ${emp.name}` : "— UNASSIGNED —"}</TableCell>
                      <TableCell>{r.covered && <Badge variant="signal">↩ cover</Badge>}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RelaySection({
  dayIso,
  dayName,
  isSpecialDay,
  employees,
  relayRows,
  employeeById,
}: {
  dayIso: string;
  dayName: string;
  isSpecialDay: boolean;
  employees: Employee[];
  relayRows: CleanroomRelayAssignment[];
  employeeById: Map<number, Employee>;
}) {
  const router = useRouter();
  const [extra, setExtra] = useState<Set<number>>(new Set());
  const [pending, startTransition] = useTransition();
  const [notice, setNotice] = useState<{ tone: "ok" | "danger"; text: string } | null>(null);
  const exportRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState<"png" | "pdf" | null>(null);

  const nonCleanroom = employees.filter((e) => !e.doesCleanroom);

  function toggle(id: number) {
    setExtra((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function generate() {
    setNotice(null);
    startTransition(async () => {
      const res = await generateRelay({ day: dayIso, extraEmployeeIds: [...extra] });
      if (res.unfilled.length > 0) {
        setNotice({ tone: "danger", text: `Could not fully fill: ${res.unfilled.join("; ")}` });
      } else if (res.activeMerges.length > 0) {
        setNotice({ tone: "ok", text: `Short-staffed by ${res.shortfall}: merged ${res.activeMerges.join(", ")}` });
      } else {
        setNotice({ tone: "ok", text: "Relay plan generated." });
      }
      router.refresh();
    });
  }

  const grouped = useMemo(() => {
    const map = new Map<string, { room: string; phase: string; role: string; initials: string[] }>();
    for (const r of relayRows) {
      const key = `${r.room}|${r.phase}|${r.role}`;
      if (!map.has(key)) map.set(key, { room: r.room, phase: r.phase, role: r.role, initials: [] });
      const emp = employeeById.get(r.employeeId);
      if (emp) map.get(key)!.initials.push(emp.initials);
    }
    return [...map.values()].sort(
      (a, b) =>
        (ROOM_ORDER[a.room] ?? 9) - (ROOM_ORDER[b.room] ?? 9) || (PHASE_ORDER[a.phase] ?? 9) - (PHASE_ORDER[b.phase] ?? 9)
    );
  }, [relayRows, employeeById]);

  async function exportAs(kind: "png" | "pdf") {
    if (!exportRef.current) return;
    setExporting(kind);
    try {
      if (kind === "png") await downloadNodeAsPng(exportRef.current, `daily-cleanroom-${dayIso}.png`);
      else await downloadNodeAsPdf(exportRef.current, `daily-cleanroom-${dayIso}.pdf`);
    } finally {
      setExporting(null);
    }
  }

  return (
    <Card>
      <CardHeader className="flex-col items-start gap-2 sm:flex-row sm:items-center">
        <div>
          <CardTitle>Cleanroom relay — night</CardTitle>
          <p className="mt-1 text-[13px] text-ink-soft">
            {isSpecialDay
              ? `${dayName}: PAO3 runs first (self-contained), then the crew continues to general cleaning and the usual CCRI → PAO1 → PAO2 relay later that night.`
              : `${dayName}: general cleaning first, then CCRI (2:30) → PAO1/PAO2 (3:00) relay.`}
          </p>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <details className="text-sm">
          <summary className="cursor-pointer select-none text-ink-soft">Pull in day-shift help (rare)</summary>
          <div className="scroll-thin mt-2 max-h-32 space-y-1 overflow-y-auto rounded-[var(--radius-sm)] border border-steel-line-soft p-2.5">
            {nonCleanroom.map((e) => (
              <label key={e.id} className="flex cursor-pointer items-center gap-2 text-sm text-ink">
                <input
                  type="checkbox"
                  checked={extra.has(e.id)}
                  onChange={() => toggle(e.id)}
                  className="size-4 accent-signal"
                />
                {e.initials} — {e.name} ({e.shift})
              </label>
            ))}
          </div>
        </details>

        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={generate} disabled={pending}>
            {pending ? "Generating…" : "Generate / regenerate relay"}
          </Button>
          {notice && <Badge variant={notice.tone}>{notice.text}</Badge>}
        </div>

        {grouped.length === 0 ? (
          <p className="text-sm text-ink-soft">No cleanroom relay generated for this day yet.</p>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => exportAs("png")} disabled={exporting !== null}>
                <Download /> {exporting === "png" ? "Exporting…" : "PNG"}
              </Button>
              <Button variant="outline" size="sm" onClick={() => exportAs("pdf")} disabled={exporting !== null}>
                <FileDown /> {exporting === "pdf" ? "Exporting…" : "PDF"}
              </Button>
            </div>
            <div ref={exportRef} className="bg-bg p-1">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Room</TableHead>
                    <TableHead>Phase</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>People</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {grouped.map((g, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Badge variant="clean">{g.room}</Badge>
                      </TableCell>
                      <TableCell className="text-ink-soft">{g.phase}</TableCell>
                      <TableCell>{g.role}</TableCell>
                      <TableCell className="font-mono">{g.initials.sort().join(", ")}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
