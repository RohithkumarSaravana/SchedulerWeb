"use client";

import type { Employee, LeaveRecord } from "@prisma/client";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { addLeave, deleteLeave } from "@/app/actions/leave";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LEAVE_TYPES, formatDateOnly, type LeaveType } from "@/lib/domain";

type LeaveWithEmployee = LeaveRecord & { employee: Employee };

export function LeaveManager({ employees, leaves }: { employees: Employee[]; leaves: LeaveWithEmployee[] }) {
  const today = formatDateOnly(new Date());
  const [employeeId, setEmployeeId] = useState<number | null>(employees[0]?.id ?? null);
  const [start, setStart] = useState(today);
  const [end, setEnd] = useState(today);
  const [leaveType, setLeaveType] = useState<LeaveType>("Planned");
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function submit() {
    if (!employeeId) return;
    startTransition(async () => {
      await addLeave({ employeeId, startDate: start, endDate: end, leaveType, note });
      setNote("");
      router.refresh();
    });
  }

  function remove(id: number) {
    startTransition(async () => {
      await deleteLeave(id);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Add leave</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-5">
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Employee</Label>
              <Select value={employeeId ? String(employeeId) : ""} onValueChange={(v) => setEmployeeId(Number(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((e) => (
                    <SelectItem key={e.id} value={String(e.id)}>
                      {e.initials} — {e.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>From</Label>
              <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>To</Label>
              <Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={leaveType} onValueChange={(v) => setLeaveType(v as LeaveType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LEAVE_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="mt-3 flex items-end gap-3">
            <div className="flex-1 space-y-1.5">
              <Label>Note</Label>
              <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional" />
            </div>
            <Button onClick={submit} disabled={pending || !employeeId}>
              Add leave
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Upcoming &amp; recent leave</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {leaves.length === 0 ? (
            <p className="p-4 text-sm text-ink-soft">No leave recorded in the last two weeks or upcoming.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>From</TableHead>
                  <TableHead>To</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Note</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaves.map((lr) => (
                  <TableRow key={lr.id}>
                    <TableCell>
                      {lr.employee.initials} — {lr.employee.name}
                    </TableCell>
                    <TableCell className="font-mono">{formatDateOnly(new Date(lr.startDate))}</TableCell>
                    <TableCell className="font-mono">{formatDateOnly(new Date(lr.endDate))}</TableCell>
                    <TableCell>
                      <Badge variant={lr.leaveType === "Sick" ? "dirty" : "neutral"}>{lr.leaveType}</Badge>
                    </TableCell>
                    <TableCell className="text-ink-soft">{lr.note || "—"}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => remove(lr.id)} aria-label="Delete leave">
                        <Trash2 className="size-4 text-danger" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
