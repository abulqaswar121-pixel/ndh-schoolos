import React, { useState } from "react";
import { CalendarDays, Download, Plus, Printer, Search, Trash2 } from "lucide-react";
import { useSchoolOS } from "@/context/SchoolOSContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { exportRowsToCsv } from "@/services/calculations";
import { toast } from "sonner";

const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
export function TimetableModule() {
  const { db, portal, saveTimetableEntry, deleteTimetableEntry } = useSchoolOS();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [cls, setCls] = useState("all");
  const [term, setTerm] = useState(db.settings.currentTerm);
  const entries = (db.timetable || [])
    .filter(
      (t) =>
        (cls === "all" || t.classId === cls) &&
        t.term === term &&
        t.session === db.settings.currentSession &&
        `${db.subjects.find((s) => s.id === t.subjectId)?.name} ${db.classes.find((c) => c.id === t.classId)?.name} ${t.day}`
          .toLowerCase()
          .includes(search.toLowerCase()),
    )
    .sort(
      (a, b) => days.indexOf(a.day) - days.indexOf(b.day) || a.startsAt.localeCompare(b.startsAt),
    );
  const headers = ["Day", "Time", "Class", "Subject", "Teacher / Ustadh", "Room"];
  const rows = entries.map((t) => [
    t.day,
    `${t.startsAt} – ${t.endsAt}`,
    db.classes.find((c) => c.id === t.classId)?.name || "",
    db.subjects.find((s) => s.id === t.subjectId)?.name || "",
    db.staff.find((s) => s.id === t.staffId)?.fullName || "",
    t.room,
  ]);
  function add() {
    if (!db.classes.length || !db.subjects.length) {
      toast.info("Create a class and add a subject in School settings before scheduling a lesson.");
      return;
    }
    setOpen(true);
  }
  return (
    <section className="os-panel">
      <div className="os-table-toolbar">
        <div className="os-table-search">
          <Search size={16} />
          <input
            aria-label="Search timetable"
            placeholder="Search lessons..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select aria-label="Timetable class" value={cls} onChange={(e) => setCls(e.target.value)}>
          <option value="all">All classes</option>
          {db.classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select aria-label="Timetable term" value={term} onChange={(e) => setTerm(e.target.value)}>
          {db.settings.terms.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
        <button
          className="os-secondary"
          onClick={() => exportRowsToCsv("weekly-timetable.csv", headers, rows)}
        >
          <Download size={14} />
          CSV
        </button>
        <button className="os-secondary" onClick={() => window.print()}>
          <Printer size={14} />
          Print
        </button>
        {portal.role === "admin" && (
          <button className="os-primary" onClick={add}>
            <Plus size={14} />
            Add Lesson
          </button>
        )}
      </div>
      {!entries.length ? (
        <div className="os-module-empty-body">
          <span className="os-large-empty-icon">
            <CalendarDays size={34} strokeWidth={1.4} />
          </span>
          <h3>A little structure for the school week</h3>
          <p>No lessons scheduled yet. Create a timetable around your school day.</p>
          {portal.role === "admin" && (
            <button className="os-primary" onClick={add}>
              <Plus size={15} />
              Add Lesson
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50">
              <tr>
                {headers.map((h) => (
                  <th className="p-4" key={h}>
                    {h}
                  </th>
                ))}
                {portal.role === "admin" && <th className="p-4 no-print">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr className="border-t" key={entries[i]!.id}>
                  {r.map((v, k) => (
                    <td className="p-4" key={k}>
                      {v}
                    </td>
                  ))}
                  {portal.role === "admin" && (
                    <td className="p-4 no-print">
                      <button
                        aria-label="Delete lesson"
                        className="os-icon-button"
                        onClick={() => {
                          if (confirm("Remove this lesson from the timetable?"))
                            deleteTimetableEntry(entries[i]!.id);
                        }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="os-dialog">
          <DialogHeader>
            <DialogTitle>Give your week a little structure.</DialogTitle>
            <DialogDescription>
              Add a lesson for {term}, {db.settings.currentSession}.
            </DialogDescription>
          </DialogHeader>
          <form
            className="os-form"
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              const entry = {
                id: crypto.randomUUID(),
                day: String(f.get("day")),
                classId: String(f.get("class")),
                subjectId: String(f.get("subject")),
                staffId: String(f.get("staff")),
                startsAt: String(f.get("start")),
                endsAt: String(f.get("end")),
                room: String(f.get("room")),
                term,
                session: db.settings.currentSession,
              };
              if (entry.endsAt <= entry.startsAt) {
                toast.error("The lesson must end after it starts.");
                return;
              }
              if (
                (db.timetable || []).some(
                  (t) =>
                    t.term === term &&
                    t.session === entry.session &&
                    t.day === entry.day &&
                    (t.classId === entry.classId ||
                      (entry.staffId && t.staffId === entry.staffId)) &&
                    t.startsAt < entry.endsAt &&
                    t.endsAt > entry.startsAt,
                )
              ) {
                toast.error("This lesson overlaps with another class or teacher booking.");
                return;
              }
              saveTimetableEntry(entry);
              setOpen(false);
              toast.success("Lesson added to the timetable.");
            }}
          >
            <div className="os-form-row">
              <label>
                Day
                <select name="day">
                  {days.map((d) => (
                    <option key={d}>{d}</option>
                  ))}
                </select>
              </label>
              <label>
                Class
                <select name="class" required>
                  {db.classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label>
              Subject
              <select name="subject" required>
                {db.subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Teacher / Ustadh
              <select name="staff">
                <option value="">Not assigned yet</option>
                {db.staff.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.fullName}
                  </option>
                ))}
              </select>
            </label>
            <div className="os-form-row">
              <label>
                Start time
                <input type="time" name="start" required />
              </label>
              <label>
                End time
                <input type="time" name="end" required />
              </label>
            </div>
            <label>
              Room
              <input name="room" placeholder="Optional room or hall" />
            </label>
            <button type="submit" className="os-primary">
              Add Lesson
            </button>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
