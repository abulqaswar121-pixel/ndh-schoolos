import {
  ArrowUpCircle,
  Edit3,
  Eye,
  Plus,
  Printer,
  Trash2,
  Users,
} from "lucide-react";
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
import {
  type PromotionDecision,
  useSchoolOS,
} from "@/context/SchoolOSContext";
import { canManageFeeWaivers, canManageStudents } from "@/services/accessControl";
import {
  exportRowsToCsv,
  formatCurrency,
  getActiveProgrammes,
  getStudentClassName,
  getStudentSiblings,
  isStudentInProgramme,
} from "@/services/calculations";
import type { ProgrammeId, Student } from "@/types/school";

export function StudentsModule() {
  const {
    db,
    portal,
    upsertStudent,
    deleteStudent,
    runEndOfSessionPromotion,
    openPrintPreview,
  } = useSchoolOS();
  const { settings, students, classes } = db;

  const canEdit = canManageStudents(portal);
  const canWaive = canManageFeeWaivers(portal);
  const canDelete = portal.role === "admin";
  const canPrintReport = portal.role !== "bursar";

  const activeProgrammes = useMemo(
    () => getActiveProgrammes(settings),
    [settings]
  );

  // Filters
  const [search, setSearch] = useState("");
  const [programmeFilter, setProgrammeFilter] = useState<ProgrammeId | "all">(
    "all"
  );
  const [classFilter, setClassFilter] = useState("all");
  const [termFilter, setTermFilter] = useState(settings.currentTerm);
  const [statusFilter, setStatusFilter] = useState<
    "Active" | "Graduated" | "all"
  >("Active");

  // Modals
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [viewingStudent, setViewingStudent] = useState<Student | null>(null);
  const [promotionOpen, setPromotionOpen] = useState(false);

  // Promotion Decisions Map: `${studentId}__${programmeId}` -> true if held back
  const [holdBackKeys, setHoldBackKeys] = useState<Record<string, boolean>>({});
  const [nextSessionLabel, setNextSessionLabel] = useState("2027/2028");

  const existingParents = useMemo(() => {
    const map = new Map<
      string,
      {
        guardianName: string;
        relationship: string;
        phone: string;
        email: string;
        address: string;
      }
    >();
    students.forEach((s) => {
      if (!map.has(s.parentPhone)) {
        map.set(s.parentPhone, {
          guardianName: s.guardianName,
          relationship: s.guardianRelationship,
          phone: s.parentPhone,
          email: s.parentEmail,
          address: s.homeAddress,
        });
      }
    });
    return Array.from(map.values());
  }, [students]);

  const filteredStudents = useMemo(() => {
    const q = search.trim().toLowerCase();
    return students.filter((s) => {
      if (statusFilter !== "all" && s.status !== statusFilter) return false;
      if (
        programmeFilter !== "all" &&
        !isStudentInProgramme(s, programmeFilter)
      ) {
        return false;
      }
      if (
        classFilter !== "all" &&
        !Object.values(s.programmeClasses).includes(classFilter)
      ) {
        return false;
      }
      if (!q) return true;
      const clsName = getStudentClassName(s, classes, settings);
      return (
        s.fullName.toLowerCase().includes(q) ||
        s.admissionId.toLowerCase().includes(q) ||
        s.guardianName.toLowerCase().includes(q) ||
        s.parentPhone.toLowerCase().includes(q) ||
        clsName.toLowerCase().includes(q)
      );
    });
  }, [
    students,
    statusFilter,
    programmeFilter,
    classFilter,
    search,
    classes,
    settings,
  ]);

  const handleOpenAdd = () => {
    const year = settings.currentSession.slice(0, 4) || "2026";
    const nextNum = String(students.length + 1).padStart(3, "0");
    const defaultProg = activeProgrammes[0]?.id ?? "prog-main";
    const defaultCls = classes.find((c) => c.programmeId === defaultProg)?.id;

    setEditingStudent({
      id: `stu-${Date.now()}`,
      admissionId: `${settings.code}/${year}/${nextNum}`,
      fullName: "",
      gender: "Female",
      dateOfBirth: "2015-05-10",
      bloodGroup: "O+",
      healthNotes: "None",
      homeAddress: "",
      programmeClasses: defaultCls ? { [defaultProg]: defaultCls } : {},
      status: "Active",
      admissionDate: "2026-10-24",
      guardianName: "",
      guardianRelationship: "Father",
      parentPhone: "+234 ",
      parentEmail: "",
      manualFeeWaiver: 0,
      manualWaiverReason: "",
    });
    setIsFormOpen(true);
  };

  const handleSaveStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;
    if (!editingStudent.fullName.trim()) {
      toast.error("Enter the student's full name.");
      return;
    }
    const cleanMap: Record<ProgrammeId, string> = {};
    Object.entries(editingStudent.programmeClasses).forEach(([pid, cid]) => {
      if (cid) cleanMap[pid] = cid;
    });
    if (Object.keys(cleanMap).length === 0) {
      toast.error(
        `Assign the student to at least one ${settings.labels.classSingular.toLowerCase()}.`
      );
      return;
    }
    upsertStudent({
      ...editingStudent,
      programmeClasses: cleanMap,
    });
    toast.success(`Saved student record for ${editingStudent.fullName}`);
    setIsFormOpen(false);
  };

  const handleRunPromotion = () => {
    const active = students.filter((s) => s.status === "Active");
    const decisions: PromotionDecision[] = active.map((stu) => {
      const promoteByProgramme: Record<ProgrammeId, boolean> = {};
      Object.keys(stu.programmeClasses).forEach((pid) => {
        promoteByProgramme[pid] = !holdBackKeys[`${stu.id}__${pid}`];
      });
      return {
        studentId: stu.id,
        promoteByProgramme,
      };
    });
    const res = runEndOfSessionPromotion(
      decisions,
      nextSessionLabel.trim() || undefined
    );
    toast.success(
      `Promotion complete: ${res.promotedCount} promoted, ${res.graduatedCount} graduated, ${res.heldBackCount} repeated.`
    );
    setPromotionOpen(false);
  };

  const handleExportCsv = () => {
    exportRowsToCsv(
      `${settings.code}_students`,
      [
        "Admission ID",
        "Full Name",
        "Gender",
        settings.labels.classSingular,
        "Guardian",
        "Parent Phone",
        "Status",
      ],
      filteredStudents.map((s) => [
        s.admissionId,
        s.fullName,
        s.gender,
        getStudentClassName(s, classes, settings, programmeFilter),
        s.guardianName,
        s.parentPhone,
        s.status,
      ])
    );
  };

  const handlePrintList = () => {
    openPrintPreview({
      type: "table",
      title: `${settings.name} — Student Register`,
      subtitle: `${filteredStudents.length} students`,
      headers: [
        "Admission ID",
        "Full Name",
        "Gender",
        settings.labels.classSingular,
        "Guardian",
        "Phone",
      ],
      rows: filteredStudents.map((s) => [
        s.admissionId,
        s.fullName,
        s.gender,
        getStudentClassName(s, classes, settings, programmeFilter),
        s.guardianName,
        s.parentPhone,
      ]),
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-[#0F172A] sm:text-2xl">
            Students
          </h1>
          <p className="text-xs text-slate-600 sm:text-sm">
            Student admissions, guardian contacts, sibling links and end-of-year promotion.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canEdit && (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPromotionOpen(true)}
                className="border-slate-200 bg-white text-xs font-semibold text-slate-800 hover:bg-slate-50 hover:text-slate-900"
              >
                <ArrowUpCircle className="mr-1.5 h-3.5 w-3.5 text-[#1E3A8A]" />
                Promote {settings.labels.classPlural}
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleOpenAdd}
                className="bg-[#0F172A] text-xs font-bold text-white hover:bg-[#1E3A8A]"
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Add Student
              </Button>
            </>
          )}
        </div>
      </div>

      <TableToolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search student name, admission ID or parent phone..."
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
        onPrint={handlePrintList}
        totalCountLabel={`Showing ${filteredStudents.length} of ${students.length} students`}
        extraFilters={
          <select
            aria-label="Filter by status"
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as "Active" | "Graduated" | "all")
            }
            className="h-9 rounded-lg border border-slate-200 bg-[#F8FAFC] px-2.5 text-xs font-medium text-slate-700"
          >
            <option value="Active">Active Only</option>
            <option value="Graduated">Graduated</option>
            <option value="all">All Status</option>
          </select>
        }
      />

      {/* Students Table */}
      <div className="ndh-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-bold text-[#0F172A] uppercase">
                <th className="px-4 py-3">Student</th>
                <th className="px-4 py-3">{settings.labels.classSingular}</th>
                <th className="px-4 py-3">Parent / Guardian</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredStudents.map((stu) => {
                const siblings = getStudentSiblings(students, stu);
                return (
                  <tr key={stu.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3">
                      <div className="font-bold text-[#0F172A]">
                        {stu.fullName}
                      </div>
                      <div className="font-mono text-[11px] text-slate-500">
                        {stu.admissionId} • {stu.gender}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {getStudentClassName(
                        stu,
                        classes,
                        settings,
                        programmeFilter
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800">
                        {stu.guardianName}
                        {siblings.length > 1 && (
                          <span className="ml-1.5 inline-flex items-center rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-900">
                            <Users className="mr-0.5 h-3 w-3" />
                            {siblings.length} siblings
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {stu.parentPhone}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block rounded-md px-2 py-0.5 text-[11px] font-bold ${
                          stu.status === "Active"
                            ? "bg-emerald-100 text-emerald-900"
                            : "bg-slate-200 text-slate-700"
                        }`}
                      >
                        {stu.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setViewingStudent(stu)}
                          className="h-8 border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        {canPrintReport && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              openPrintPreview({
                                type: "report_card",
                                studentId: stu.id,
                                session: settings.currentSession,
                                term: termFilter,
                                layout: settings.reportCardDefaultLayout,
                              })
                            }
                            className="h-8 border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                            title="Print Report Card"
                          >
                            <Printer className="h-3.5 w-3.5 text-[#1E3A8A]" />
                          </Button>
                        )}
                        {(canEdit || canWaive) && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingStudent({
                                ...stu,
                                programmeClasses: { ...stu.programmeClasses },
                              });
                              setIsFormOpen(true);
                            }}
                            className="h-8 border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {canDelete && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              deleteStudent(stu.id);
                              toast.success(`Removed ${stu.fullName}`);
                            }}
                            className="h-8 border-red-200 bg-white px-2.5 text-xs font-semibold text-red-600 hover:bg-red-50 hover:text-red-700"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Student Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto bg-white">
          <DialogHeader>
            <DialogTitle className="text-base font-extrabold text-[#0F172A]">
              {editingStudent?.fullName
                ? `Edit Student — ${editingStudent.fullName}`
                : "Register New Student"}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600">
              Assign the student to one or more active programmes and link parent phone number.
            </DialogDescription>
          </DialogHeader>

          {editingStudent && (
            <form onSubmit={handleSaveStudent} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-xs font-bold">Full Name</Label>
                  <Input
                    value={editingStudent.fullName}
                    onChange={(e) =>
                      setEditingStudent({
                        ...editingStudent,
                        fullName: e.target.value,
                      })
                    }
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-bold">Admission Number</Label>
                  <Input
                    value={editingStudent.admissionId}
                    onChange={(e) =>
                      setEditingStudent({
                        ...editingStudent,
                        admissionId: e.target.value,
                      })
                    }
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-bold">Gender</Label>
                  <select
                    value={editingStudent.gender}
                    onChange={(e) =>
                      setEditingStudent({
                        ...editingStudent,
                        gender: e.target.value as "Male" | "Female",
                      })
                    }
                    className="h-9 w-full rounded-lg border border-slate-200 bg-[#F8FAFC] px-3 text-xs font-medium"
                  >
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-bold">Date of Birth</Label>
                  <Input
                    type="date"
                    value={editingStudent.dateOfBirth}
                    onChange={(e) =>
                      setEditingStudent({
                        ...editingStudent,
                        dateOfBirth: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              {/* Programme & Class Assignment */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 space-y-2.5">
                <div className="font-bold text-[#0F172A]">
                  {settings.multiProgrammeEnabled
                    ? "Programme & Class Enrolment"
                    : `${settings.labels.classSingular} Assignment`}
                </div>
                {activeProgrammes.map((prog) => {
                  const progClasses = classes.filter(
                    (c) => c.programmeId === prog.id
                  );
                  return (
                    <div
                      key={prog.id}
                      className="grid grid-cols-1 items-center gap-2 sm:grid-cols-3"
                    >
                      <Label className="text-xs font-semibold text-slate-700">
                        {settings.multiProgrammeEnabled
                          ? prog.name
                          : settings.labels.classSingular}
                      </Label>
                      <select
                        value={editingStudent.programmeClasses[prog.id] ?? ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          const next = { ...editingStudent.programmeClasses };
                          if (val) next[prog.id] = val;
                          else delete next[prog.id];
                          setEditingStudent({
                            ...editingStudent,
                            programmeClasses: next,
                          });
                        }}
                        className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium sm:col-span-2"
                      >
                        <option value="">Not enrolled</option>
                        {progClasses.map((cls) => (
                          <option key={cls.id} value={cls.id}>
                            {cls.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                })}
              </div>

              {/* Parent / Sibling Link */}
              <div className="space-y-3 rounded-xl border border-slate-200 p-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-bold text-[#0F172A]">
                    Parent / Guardian Details
                  </span>
                  {existingParents.length > 0 && (
                    <select
                      aria-label="Link to existing sibling family"
                      defaultValue=""
                      onChange={(e) => {
                        const p = existingParents.find(
                          (item) => item.phone === e.target.value
                        );
                        if (p) {
                          setEditingStudent({
                            ...editingStudent,
                            guardianName: p.guardianName,
                            guardianRelationship: p.relationship,
                            parentPhone: p.phone,
                            parentEmail: p.email,
                            homeAddress: p.address,
                          });
                        }
                      }}
                      className="h-8 rounded-md border border-slate-200 bg-slate-50 px-2 text-[11px] font-semibold text-slate-700"
                    >
                      <option value="">Link existing family (sibling)...</option>
                      {existingParents.map((p) => (
                        <option key={p.phone} value={p.phone}>
                          {p.guardianName} ({p.phone})
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold">Guardian Name</Label>
                    <Input
                      value={editingStudent.guardianName}
                      onChange={(e) =>
                        setEditingStudent({
                          ...editingStudent,
                          guardianName: e.target.value,
                        })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold">
                      Guardian Phone (Parent Login)
                    </Label>
                    <Input
                      value={editingStudent.parentPhone}
                      onChange={(e) =>
                        setEditingStudent({
                          ...editingStudent,
                          parentPhone: e.target.value,
                        })
                      }
                      required
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-bold">Home Address</Label>
                  <Input
                    value={editingStudent.homeAddress}
                    onChange={(e) =>
                      setEditingStudent({
                        ...editingStudent,
                        homeAddress: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              {/* Admin-Only Fee Waiver (Audit Logged!) */}
              {canWaive && (
                <div className="grid grid-cols-1 gap-3 rounded-xl border border-amber-200 bg-amber-50/60 p-3.5 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-amber-950">
                      Fee Waiver / Scholarship ({settings.currencySymbol})
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      value={editingStudent.manualFeeWaiver ?? 0}
                      onChange={(e) =>
                        setEditingStudent({
                          ...editingStudent,
                          manualFeeWaiver: Number(e.target.value) || 0,
                        })
                      }
                      className="bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-amber-950">
                      Waiver Reason (Recorded in Audit Log)
                    </Label>
                    <Input
                      value={editingStudent.manualWaiverReason ?? ""}
                      onChange={(e) =>
                        setEditingStudent({
                          ...editingStudent,
                          manualWaiverReason: e.target.value,
                        })
                      }
                      placeholder="e.g. Staff Child / PTA Scholarship"
                      className="bg-white"
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsFormOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-[#0F172A] font-bold text-white hover:bg-[#1E3A8A]"
                >
                  Save Student
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Student Profile Dossier Dialog */}
      <Dialog
        open={Boolean(viewingStudent)}
        onOpenChange={(o) => !o && setViewingStudent(null)}
      >
        <DialogContent className="max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="text-base font-extrabold text-[#0F172A]">
              {viewingStudent?.fullName}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600">
              {viewingStudent?.admissionId} •{" "}
              {viewingStudent
                ? getStudentClassName(viewingStudent, classes, settings)
                : ""}
            </DialogDescription>
          </DialogHeader>
          {viewingStudent && (
            <div className="space-y-2.5 text-xs text-slate-700">
              <div className="grid grid-cols-2 gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div>
                  <span className="text-slate-500">Gender:</span>{" "}
                  <strong>{viewingStudent.gender}</strong>
                </div>
                <div>
                  <span className="text-slate-500">Blood Group:</span>{" "}
                  <strong>{viewingStudent.bloodGroup}</strong>
                </div>
                <div>
                  <span className="text-slate-500">DOB:</span>{" "}
                  <strong>{viewingStudent.dateOfBirth}</strong>
                </div>
                <div>
                  <span className="text-slate-500">Status:</span>{" "}
                  <strong>{viewingStudent.status}</strong>
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 p-3 space-y-1">
                <div className="font-bold text-[#0F172A]">
                  Guardian: {viewingStudent.guardianName} (
                  {viewingStudent.guardianRelationship})
                </div>
                <div>Phone: {viewingStudent.parentPhone}</div>
                <div>Address: {viewingStudent.homeAddress || "—"}</div>
                <div>Health Notes: {viewingStudent.healthNotes || "None"}</div>
                {(viewingStudent.manualFeeWaiver ?? 0) > 0 && (
                  <div className="pt-1 font-semibold text-emerald-800">
                    Fee Waiver:{" "}
                    {formatCurrency(
                      viewingStudent.manualFeeWaiver ?? 0,
                      settings.currencySymbol
                    )}{" "}
                    ({viewingStudent.manualWaiverReason || "Approved"})
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Independent End-of-Session Promotion Dialog */}
      <Dialog open={promotionOpen} onOpenChange={setPromotionOpen}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto bg-white">
          <DialogHeader>
            <DialogTitle className="text-base font-extrabold text-[#0F172A]">
              End-of-Session Promotion
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600">
              Each programme promotes independently. Uncheck any student who should repeat their current {settings.labels.classSingular.toLowerCase()}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 text-xs">
            <div className="flex items-center gap-3">
              <Label className="font-bold">Advance School to Session:</Label>
              <Input
                value={nextSessionLabel}
                onChange={(e) => setNextSessionLabel(e.target.value)}
                className="w-40"
              />
            </div>

            <div className="max-h-72 overflow-y-auto rounded-xl border border-slate-200 divide-y divide-slate-200">
              {students
                .filter((s) => s.status === "Active")
                .map((stu) => (
                  <div
                    key={stu.id}
                    className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5"
                  >
                    <div>
                      <div className="font-bold text-[#0F172A]">
                        {stu.fullName}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {getStudentClassName(stu, classes, settings)}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      {activeProgrammes
                        .filter((p) => Boolean(stu.programmeClasses[p.id]))
                        .map((prog) => {
                          const key = `${stu.id}__${prog.id}`;
                          const held = Boolean(holdBackKeys[key]);
                          return (
                            <label
                              key={key}
                              className="inline-flex items-center gap-1.5 font-semibold text-slate-700"
                            >
                              <input
                                type="checkbox"
                                checked={!held}
                                onChange={(e) =>
                                  setHoldBackKeys((prev) => ({
                                    ...prev,
                                    [key]: !e.target.checked,
                                  }))
                                }
                              />
                              <span>
                                Promote{" "}
                                {settings.multiProgrammeEnabled
                                  ? `(${prog.name})`
                                  : ""}
                              </span>
                            </label>
                          );
                        })}
                    </div>
                  </div>
                ))}
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setPromotionOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleRunPromotion}
                className="bg-[#0F172A] font-bold text-white hover:bg-[#1E3A8A]"
              >
                Confirm Promotion
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
