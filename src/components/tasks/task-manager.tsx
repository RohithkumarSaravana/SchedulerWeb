"use client";

import type { GeneralTask } from "@prisma/client";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { deleteTask, type TaskInput, upsertTask } from "@/app/actions/tasks";
import { Badge, shiftBadgeVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FREQUENCIES, MACHINES, SHIFTS, type Frequency, type Machine, type Shift } from "@/lib/domain";

const emptyForm = (shift: Shift = "Morning"): TaskInput => ({
  name: "",
  shift,
  area: "",
  estMinutes: 20,
  size: 2,
  frequency: "Daily",
  specificDays: "",
  requiredMachine: null,
  isExtra: false,
  active: true,
  notes: "",
});

export function TaskManager({ tasks }: { tasks: GeneralTask[] }) {
  const [filter, setFilter] = useState<"All" | Shift>("All");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<TaskInput>(emptyForm());
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const visible = useMemo(
    () => (filter === "All" ? tasks : tasks.filter((t) => t.shift === filter)),
    [tasks, filter]
  );

  function openCreate() {
    setForm(emptyForm(filter === "All" ? "Morning" : filter));
    setError(null);
    setOpen(true);
  }

  function openEdit(t: GeneralTask) {
    setForm({
      id: t.id,
      name: t.name,
      shift: t.shift as Shift,
      area: t.area,
      estMinutes: t.estMinutes,
      size: t.size,
      frequency: t.frequency as Frequency,
      specificDays: t.specificDays,
      requiredMachine: t.requiredMachine as Machine | null,
      isExtra: t.isExtra,
      active: t.active,
      notes: t.notes,
    });
    setError(null);
    setOpen(true);
  }

  function save() {
    setError(null);
    startTransition(async () => {
      try {
        await upsertTask(form);
        setOpen(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not save task.");
      }
    });
  }

  function remove(id: number) {
    if (!confirm("Remove this task? This also clears its weekly assignments.")) return;
    startTransition(async () => {
      await deleteTask(id);
    });
  }

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
          <Plus /> Add task
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Task</TableHead>
            <TableHead>Shift</TableHead>
            <TableHead>Area</TableHead>
            <TableHead>Minutes</TableHead>
            <TableHead>Frequency</TableHead>
            <TableHead>Machine</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {visible.map((t) => (
            <TableRow key={t.id}>
              <TableCell className="max-w-[260px]">
                {t.name}
                {t.isExtra && (
                  <Badge variant="signal" className="ml-2">
                    Extra
                  </Badge>
                )}
              </TableCell>
              <TableCell>
                <Badge variant={shiftBadgeVariant(t.shift)}>{t.shift}</Badge>
              </TableCell>
              <TableCell className="text-ink-soft">{t.area || "—"}</TableCell>
              <TableCell className="font-mono">{t.estMinutes}</TableCell>
              <TableCell className="text-ink-soft">
                {t.frequency}
                {t.specificDays && <span className="ml-1 font-mono text-[11px]">({t.specificDays})</span>}
              </TableCell>
              <TableCell>{t.requiredMachine ? <Badge variant="dirty">{t.requiredMachine}</Badge> : "—"}</TableCell>
              <TableCell>
                <Badge variant={t.active ? "ok" : "danger"}>{t.active ? "Active" : "Inactive"}</Badge>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(t)} aria-label={`Edit ${t.name}`}>
                    <Pencil className="size-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => remove(t.id)} aria-label={`Remove ${t.name}`}>
                    <Trash2 className="size-4 text-danger" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
          {visible.length === 0 && (
            <TableRow>
              <TableCell colSpan={8} className="py-8 text-center text-ink-soft">
                No tasks on this shift yet.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto scroll-thin">
          <DialogHeader>
            <DialogTitle>{form.id ? "Edit task" : "Add task"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="task-name">Task name</Label>
              <Input id="task-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Shift</Label>
                <Select value={form.shift} onValueChange={(v) => setForm({ ...form, shift: v as Shift })}>
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
              <div className="space-y-1.5">
                <Label htmlFor="area">Area</Label>
                <Input id="area" value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="minutes">Estimated minutes</Label>
                <Input
                  id="minutes"
                  type="number"
                  min={1}
                  max={480}
                  value={form.estMinutes}
                  onChange={(e) => setForm({ ...form, estMinutes: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Size (1 small – 3 large)</Label>
                <Select value={String(form.size)} onValueChange={(v) => setForm({ ...form, size: Number(v) })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3].map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Frequency</Label>
                <Select value={form.frequency} onValueChange={(v) => setForm({ ...form, frequency: v as Frequency })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FREQUENCIES.map((f) => (
                      <SelectItem key={f} value={f}>
                        {f}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="days">Specific days (Mon,Tue…)</Label>
                <Input
                  id="days"
                  placeholder="e.g. Mon,Thu"
                  value={form.specificDays}
                  onChange={(e) => setForm({ ...form, specificDays: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Required machine</Label>
              <Select
                value={form.requiredMachine ?? "none"}
                onValueChange={(v) => setForm({ ...form, requiredMachine: v === "none" ? null : (v as Machine) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {MACHINES.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-wrap gap-5">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-ink">
                <Checkbox
                  checked={form.isExtra}
                  onCheckedChange={(v) => setForm({ ...form, isExtra: v === true })}
                />
                Night &ldquo;extra&rdquo; (may change weekly)
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-ink">
                <Checkbox checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v === true })} />
                Active
              </label>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="notes">Notes</Label>
              <Input id="notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>

            {error && <p className="text-sm text-danger">{error}</p>}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={pending || !form.name}>
              {pending ? "Saving…" : "Save task"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
