import { Edit3, Plus, Trash2 } from "lucide-react";
import React, { useMemo, useState } from "react";
import { toast } from "sonner";
import { TableToolbar } from "../TableToolbar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSchoolOS } from "@/context/SchoolOSContext";
import { canManageClassesAndSubjects } from "@/services/accessControl";
import {
  exportRowsToCsv,
  getActiveProgrammes,
  getProgrammeName,
} from "@/services/calculations";
import type { ClassGroup, ProgrammeId } from "@/types/school";

export function ClassesModule() {
  const {
    db,
    portal,
    upsertClassGroup,
    deleteClassGroup,
    openPrintPreview,
  } = useSchoolOS();
  const { settings, classes, students, staff } = db;

  const canManage = canManageClassesAndSubjects(portal);
  const activeProgrammes = useMemo(
    () => getActiveProgrammes(settings),
    [settings]
  );

  const [search, setSearch] = useState("");
  const [programmeFilter, setProgrammeFilter] = useState<ProgrammeId | "all">(
    "all"
  );
  const [classFilter, setClassFilter] = useState("all");
  const [termFilter, setTermFilter] = useState(settings.currentTerm);

  const [editingGroup, setEditingGroup] = useState<ClassGroup | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return classes
      .filter((cls) => {
        if (programmeFilter !== "all" && cls.programmeId !== programmeFilter) {
          return false;
        }
        if (classFilter !== "all" && cls.id !== classFilter) return false;
        if (!q) return true;
        const teacher =
          staff.find((s) => s.id === cls.formTeacherId)?.fullName ?? "";
        return `${cls.name} ${cls.room ?? ""} ${teacher}`
          .toLowerCase()
          .includes(q);
      })
      .map((cls) => {
        const enrolled = students.filter(
          (s) =>
            s.status === "Active" &&
            s.programmeClasses[cls.programmeId] === cls.id
        );
        const teacher = staff.find((s) => s.id === cls.formTeacherId);
        const nextCls = classes.find((c) => c.id === cls.nextGroupId);
        return {
          cls,
          programmeName: getProgrammeName(settings, cls.programmeId),
          enrolledCount: enrolled.length,
          boysCount: enrolled.filter((s) => s.gender === "Male").length,
          girlsCount: enrolled.filter((s) => s.gender === "Female").length,
          teacherName: teacher?.fullName ?? "Unassigned",
          nextGroupName: nextCls?.name ?? "Graduating Class",
        };
      });
  }, [
    classes,
    programmeFilter,
    classFilter,
    search,
    staff,
    students,
    settings,
  ]);

  const handleOpenAdd = () => {
    setEditingGroup({
      id: `cls-${Date.now()}`,
      name: "",
      programmeId: activeProgrammes[0]?.id ?? "prog-main",
      levelOrder: classes.length + 1,
      nextGroupId: null,
      room: "",
    });
    setFormOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGroup || !editingGroup.name.trim()) {
      toast.error(`Enter a ${settings.labels.classSingular.toLowerCase()} name.`);
      return;
    }
    upsertClassGroup(editingGroup);
    toast.success(`Saved ${editingGroup.name}`);
    setFormOpen(false);
  };

  const handleExportCsv = () => {
    exportRowsToCsv(
      `${settings.code}_classes`,
      [
        settings.labels.classSingular,
        ...(settings.multiProgrammeEnabled ? ["Programme"] : []),
        "Room",
        `${settings.labels.classSingular} ${settings.labels.teacherSingular}`,
        "Students",
        "Promotes To",
      ],
      rows.map((r) => [
        r.cls.name,
        ...(settings.multiProgrammeEnabled ? [r.programmeName] : []),
        r.cls.room ?? "—",
        r.teacherName,
        r.enrolledCount,
        r.nextGroupName,
      ])
    );
  };

  const handlePrint = () => {
    openPrintPreview({
      type: "table",
      title: `${settings.name} — ${settings.labels.classPlural} List`,
      subtitle: `${rows.length} ${settings.labels.classPlural.toLowerCase()}`,
      headers: [
        settings.labels.classSingular,
        "Room",
        settings.labels.teacherSingular,
        "Boys",
        "Girls",
        "Total",
        "Promotes To",
      ],
      rows: rows.map((r) => [
        r.cls.name,
        r.cls.room ?? "—",
        r.teacherName,
        r.boysCount,
        r.girlsCount,
        r.enrolledCount,
        r.nextGroupName,
      ]),
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-[#0F172A] sm:text-2xl">
            {settings.labels.classPlural}
          </h1>
          <p className="text-xs text-slate-600 sm:text-sm">
            View {settings.labels.classPlural.toLowerCase()}, assigned{" "}
            {settings.labels.teacherPlural.toLowerCase()}, rooms and promotion order.
          </p>
        </div>

        {canManage && (
          <Button
            size="sm"
            onClick={handleOpenAdd}
            className="bg-[#0F172A] text-xs font-bold text-white hover:bg-[#1E3A8A]"
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Add {settings.labels.classSingular}
          </Button>
        )}
      </div>

      <TableToolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder={`Search ${settings.labels.classSingular.toLowerCase()} or ${settings.labels.teacherSingular.toLowerCase()}...`}
        programmeFilter={programmeFilter}
        onProgrammeFilterChange={setProgrammeFilter}
        classFilter={classFilter}
        onClassFilterChange={setClassFilter}
        classes={classes}
        termFilter={termFilter}
        onTermFilterChange={setTermFilter}
        terms={settings.terms}
        settings={settings}
        onExportCsv={handleExportCsv}
        onPrint={handlePrint}
        totalCountLabel={`${rows.length} authorized ${settings.labels.classPlural.toLowerCase()}`}
      />

      <div className="ndh-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-bold text-[#0F172A] uppercase">
                <th className="px-4 py-3">{settings.labels.classSingular}</th>
                {settings.multiProgrammeEnabled && (
                  <th className="px-4 py-3">Programme</th>
                )}
                <th className="px-4 py-3">
                  {settings.labels.classSingular}{" "}
                  {settings.labels.teacherSingular}
                </th>
                <th className="px-4 py-3 text-center">Students</th>
                <th className="px-4 py-3">Promotes To</th>
                {canManage && <th className="px-4 py-3 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {rows.map((r) => (
                <tr key={r.cls.id} className="hover:bg-slate-50/70">
                  <td className="px-4 py-3">
                    <div className="font-bold text-[#0F172A]">{r.cls.name}</div>
                    <div className="text-[11px] text-slate-500">
                      {r.cls.room || "Main Building"}
                    </div>
                  </td>
                  {settings.multiProgrammeEnabled && (
                    <td className="px-4 py-3 font-medium text-slate-700">
                      {r.programmeName}
                    </td>
                  )}
                  <td className="px-4 py-3 font-medium text-slate-800">
                    {r.teacherName}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="font-bold text-[#0F172A]">
                      {r.enrolledCount}
                    </span>
                    <span className="ml-1 text-[11px] text-slate-500">
                      ({r.boysCount}B / {r.girlsCount}G)
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs font-medium text-slate-700">
                    {r.nextGroupName}
                  </td>
                  {canManage && (
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingGroup({ ...r.cls });
                            setFormOpen(true);
                          }}
                          className="h-8 border-slate-200 bg-white px-2.5 text-xs text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            deleteClassGroup(r.cls.id);
                            toast.success(`Deleted ${r.cls.name}`);
                          }}
                          className="h-8 border-red-200 bg-white px-2.5 text-xs text-red-600 hover:bg-red-50 hover:text-red-700"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="text-base font-extrabold text-[#0F172A]">
              {editingGroup?.name
                ? `Edit ${editingGroup.name}`
                : `Add ${settings.labels.classSingular}`}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600">
              Set the name, room, {settings.labels.teacherSingular.toLowerCase()} and next promotion level.
            </DialogDescription>
          </DialogHeader>
          {editingGroup && (
            <form onSubmit={handleSave} className="space-y-3.5 text-xs">
              {settings.multiProgrammeEnabled && (
                <div className="space-y-1">
                  <Label className="text-xs font-bold">Programme</Label>
                  <select
                    value={editingGroup.programmeId}
                    onChange={(e) =>
                      setEditingGroup({
                        ...editingGroup,
                        programmeId: e.target.value,
                      })
                    }
                    className="h-9 w-full rounded-lg border border-slate-200 bg-[#F8FAFC] px-3 font-medium"
                  >
                    {activeProgrammes.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="space-y-1">
                <Label className="text-xs font-bold">
                  {settings.labels.classSingular} Name
                </Label>
                <Input
                  value={editingGroup.name}
                  onChange={(e) =>
                    setEditingGroup({ ...editingGroup, name: e.target.value })
                  }
                  placeholder="e.g. Primary 4 or JSS 1A"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold">Room / Block</Label>
                <Input
                  value={editingGroup.room ?? ""}
                  onChange={(e) =>
                    setEditingGroup({ ...editingGroup, room: e.target.value })
                  }
                  placeholder="e.g. Block B - Room 102"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold">
                  {settings.labels.classSingular}{" "}
                  {settings.labels.teacherSingular}
                </Label>
                <select
                  value={editingGroup.formTeacherId ?? ""}
                  onChange={(e) =>
                    setEditingGroup({
                      ...editingGroup,
                      formTeacherId: e.target.value || undefined,
                    })
                  }
                  className="h-9 w-full rounded-lg border border-slate-200 bg-[#F8FAFC] px-3 font-medium"
                >
                  <option value="">Unassigned</option>
                  {staff.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.fullName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold">
                  Promotes To (End of Session)
                </Label>
                <select
                  value={editingGroup.nextGroupId ?? ""}
                  onChange={(e) =>
                    setEditingGroup({
                      ...editingGroup,
                      nextGroupId: e.target.value || null,
                    })
                  }
                  className="h-9 w-full rounded-lg border border-slate-200 bg-[#F8FAFC] px-3 font-medium"
                >
                  <option value="">Graduating Class (Final Year)</option>
                  {classes
                    .filter(
                      (c) =>
                        c.programmeId === editingGroup.programmeId &&
                        c.id !== editingGroup.id
                    )
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setFormOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-[#0F172A] font-bold text-white hover:bg-[#1E3A8A]"
                >
                  Save {settings.labels.classSingular}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
