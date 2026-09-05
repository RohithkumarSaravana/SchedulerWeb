"use client";

import type { Employee, GeneralTask } from "@prisma/client";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { deleteEmployee, type EmployeeInput, upsertEmployee } from "@/app/actions/employees";
import { Badge, shiftBadgeVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MACHINES, SHIFTS, type Machine, type Shift, fromCsv } from "@/lib/domain";

type EmployeeRow = Employee;

const emptyForm = (shift: Shift = "Morning"): EmployeeInput => ({
  name: "",
  initials: "",
  shift,
  doesGeneral: true,
  doesCleanroom: false,
  active: true,
  machineCerts: [],
  skills: "",
  trainedTaskIds: [],
});

export function EmployeeManager({
  employees,
  tasks,
  trainingByEmployee,
}: {
  employees: EmployeeRow[];
  tasks: GeneralTask[];
  trainingByEmployee: Record<number, number[]>;
}) {
  const [filter, setFilter] = useState<"All" | Shift>("All");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<EmployeeInput>(emptyForm());
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const visible = useMemo(
    () => (filter === "All" ? employees : employees.filter((e) => e.shift === filter)),
    [employees, filter]
  );

  function openCreate() {
    setForm(emptyForm(filter === "All" ? "Morning" : filter));
    setError(null);
    setOpen(true);
  }

  function openEdit(e: EmployeeRow) {
    setForm({
      id: e.id,
      name: e.name,
      initials: e.initials,
      shift: e.shift as Shift,
      doesGeneral: e.doesGeneral,
      doesCleanroom: e.doesCleanroom,
      active: e.active,
      machineCerts: fromCsv(e.machineCerts) as Machine[],
      skills: e.skills,
      trainedTaskIds: trainingByEmployee[e.id] ?? [],
    });
    setError(null);
    setOpen(true);
  }

  function save() {
    setError(null);
    startTransition(async () => {
      try {
        await upsertEmployee(form);
        setOpen(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not save employee.");
      }
    });
  }

  function remove(id: number) {
    if (!confirm("Remove this employee? This also clears their leave and assignment history.")) return;
    startTransition(async () => {
      await deleteEmployee(id);
    });
  }

  const shiftTasks = tasks.filter((t) => t.shift === form.shift);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as "All" | Shift)}>
          <TabsList>
            <TabsTrigger value="All">All</TabsTrigger>
            {SHIFTS.map((s) => (
              <TabsTrigger key={s} value={s}>
                {s}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <Button onClick={openCreate}>
          <Plus /> Add employee
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Initials</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Shift</TableHead>
            <TableHead>Roles</TableHead>
            <TableHead>Machine certs</TableHead>
            <TableHead>Skills</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {visible.map((e) => (
            <TableRow key={e.id}>
              <TableCell className="font-mono font-semibold">{e.initials}</TableCell>
              <TableCell>{e.name}</TableCell>
              <TableCell>
                <Badge variant={shiftBadgeVariant(e.shift)}>{e.shift}</Badge>
              </TableCell>
              <TableCell className="space-x-1">
                {e.doesGeneral && <Badge variant="outline">General</Badge>}
                {e.doesCleanroom && <Badge variant="clean">Cleanroom</Badge>}
              </TableCell>
              <TableCell className="space-x-1">
                {fromCsv(e.machineCerts).map((m) => (
                  <Badge key={m} variant="neutral">
                    {m}
                  </Badge>
                ))}
              </TableCell>
              <TableCell className="text-ink-soft">{e.skills || "—"}</TableCell>
              <TableCell>
                <Badge variant={e.active ? "ok" : "danger"}>{e.active ? "Active" : "Inactive"}</Badge>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(e)} aria-label={`Edit ${e.name}`}>
                    <Pencil className="size-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => remove(e.id)} aria-label={`Remove ${e.name}`}>
                    <Trash2 className="size-4 text-danger" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
          {visible.length === 0 && (
            <TableRow>
              <TableCell colSpan={8} className="py-8 text-center text-ink-soft">
                No employees in this shift yet.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto scroll-thin">
          <DialogHeader>
            <DialogTitle>{form.id ? "Edit employee" : "Add employee"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="name">Full name</Label>
                <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="initials">Initials</Label>
                <Input
                  id="initials"
                  value={form.initials}
                  onChange={(e) => setForm({ ...form, initials: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Shift</Label>
              <Select
                value={form.shift}
                onValueChange={(v) => setForm({ ...form, shift: v as Shift, trainedTaskIds: [] })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SHIFTS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-wrap gap-5">
              <CheckboxField
                label="Does general cleaning"
                checked={form.doesGeneral}
                onChange={(v) => setForm({ ...form, doesGeneral: v })}
              />
              <CheckboxField
                label="Cleanroom relay pool"
                checked={form.doesCleanroom}
                onChange={(v) => setForm({ ...form, doesCleanroom: v })}
              />
              <CheckboxField label="Active" checked={form.active} onChange={(v) => setForm({ ...form, active: v })} />
            </div>

            <div className="space-y-1.5">
              <Label>Machine certifications</Label>
              <div className="flex flex-wrap gap-4">
                {MACHINES.map((m) => (
                  <CheckboxField
                    key={m}
                    label={m}
                    checked={form.machineCerts.includes(m)}
                    onChange={(v) =>
                      setForm({
                        ...form,
                        machineCerts: v ? [...form.machineCerts, m] : form.machineCerts.filter((x) => x !== m),
                      })
                    }
                  />
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="skills">Skills (comma separated, e.g. Final-check)</Label>
              <Input id="skills" value={form.skills} onChange={(e) => setForm({ ...form, skills: e.target.value })} />
            </div>

            <div className="space-y-1.5">
              <Label>
                Trained on ({form.shift} shift) — leave empty to default to &ldquo;trained on everything&rdquo;
              </Label>
              <div className="scroll-thin max-h-40 space-y-1.5 overflow-y-auto rounded-[var(--radius-sm)] border border-steel-line p-2.5">
                {shiftTasks.map((t) => (
                  <CheckboxField
                    key={t.id}
                    label={t.name}
                    checked={form.trainedTaskIds.includes(t.id)}
                    onChange={(v) =>
                      setForm({
                        ...form,
                        trainedTaskIds: v
                          ? [...form.trainedTaskIds, t.id]
                          : form.trainedTaskIds.filter((x) => x !== t.id),
                      })
                    }
                  />
                ))}
                {shiftTasks.length === 0 && <p className="text-sm text-ink-soft">No tasks on this shift yet.</p>}
              </div>
            </div>

            {error && <p className="text-sm text-danger">{error}</p>}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={pending || !form.name || !form.initials}>
              {pending ? "Saving…" : "Save employee"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CheckboxField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm text-ink">
      <Checkbox checked={checked} onCheckedChange={(v) => onChange(v === true)} />
      {label}
    </label>
  );
}
