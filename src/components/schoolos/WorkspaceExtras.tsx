import React, { useEffect, useState } from "react";
import { BookOpen, Plus, Printer, Search, Users, Download, ShieldCheck } from "lucide-react";
import QRCode from "qrcode";
import { useSchoolOS } from "@/context/SchoolOSContext";
import { QURAN_SURAHS } from "@/data/quranSurahs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { exportRowsToCsv } from "@/services/calculations";
import type { MurajaahStatus } from "@/types/school";
import { toast } from "sonner";
import { getResolvedCustomization } from "@/services/customizationDefaults";

export function QuranTracker() {
  const { db, portal, upsertQuranRecord, updateSettings } = useSchoolOS();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [classId, setClassId] = useState("all");
  const [student, setStudent] = useState("");
  const [surah, setSurah] = useState(1);
  const [from, setFrom] = useState(1);
  const [to, setTo] = useState(1);
  const [juz, setJuz] = useState(0);
  const [rating, setRating] = useState<MurajaahStatus>("Fluent");
  const [notes, setNotes] = useState("");
  const [recitation, setRecitation] = useState("");
  const filtered = db.quranRecords.filter((r) => {
    const s = db.students.find((s) => s.id === r.studentId);
    return (
      s &&
      s.fullName.toLowerCase().includes(search.toLowerCase()) &&
      (classId === "all" || Object.values(s.programmeClasses).includes(classId))
    );
  });
  const rows = filtered.map((r) => [
    db.students.find((s) => s.id === r.studentId)?.fullName || "",
    QURAN_SURAHS.find((s) => s.number === r.currentSurahNumber)?.transliteration || "",
    `${r.ayahFrom}–${r.ayahTo}`,
    r.juzCompleted,
    r.revisionStatus,
    r.teacherNotes,
  ]);
  if (!db.settings.enableQuranModule)
    return (
      <section className="os-panel os-module-empty-body">
        <span className="os-large-empty-icon">
          <BookOpen size={34} />
        </span>
        <h3>Make space for Islamic learning</h3>
        <p>Enable Tahfeez to track memorization, revision, and Tajweed.</p>
        {portal.role === "admin" && (
          <button
            className="os-primary"
            onClick={() =>
              updateSettings((s) => ({ ...s, enableQuranModule: true }), "Enabled Tahfeez tracker")
            }
          >
            Enable Tahfeez tracker
          </button>
        )}
      </section>
    );
  return (
    <section className="os-panel">
      <div className="os-table-toolbar">
        <div className="os-table-search">
          <Search size={16} />
          <input
            aria-label="Search Quran records"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search students..."
          />
        </div>
        <select
          aria-label="Filter by class"
          value={classId}
          onChange={(e) => setClassId(e.target.value)}
        >
          <option value="all">All classes</option>
          {db.classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <button
          className="os-secondary"
          onClick={() =>
            exportRowsToCsv(
              "tahfeez-progress.csv",
              ["Student", "Surah", "Ayah", "Juz completed", "Revision", "Tajweed remarks"],
              rows,
            )
          }
        >
          <Download size={14} />
          CSV
        </button>
        <button className="os-secondary" onClick={() => window.print()}>
          <Printer size={14} />
          Print
        </button>
        <button
          className="os-primary"
          onClick={() => {
            if (!db.students.length) {
              toast.info("Register a student first in the Students module.");
              return;
            }
            setStudent(db.students[0]!.id);
            setOpen(true);
          }}
        >
          <Plus size={15} />
          Add Progress
        </button>
      </div>
      {!filtered.length ? (
        <div className="os-module-empty-body">
          <span className="os-large-empty-icon">
            <BookOpen size={34} strokeWidth={1.3} />
          </span>
          <h3>No memorization records yet</h3>
          <p>Add a student’s first Quran session to start their journey.</p>
          <button
            className="os-primary"
            onClick={() =>
              db.students.length
                ? (setStudent(db.students[0]!.id), setOpen(true))
                : toast.info("Add your first student in Students, then return here.")
            }
          >
            <Plus size={15} />
            Add Progress
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50">
              <tr>
                {["Student", "Surah", "Ayah", "Juz completed", "Revision", "Tajweed remarks"].map(
                  (h) => (
                    <th className="p-4" key={h}>
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr className="border-t" key={i}>
                  {row.map((v, k) => (
                    <td className="p-4" key={k}>
                      {v}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="os-dialog">
          <DialogHeader>
            <DialogTitle>A step forward in memorization</DialogTitle>
            <DialogDescription>Record today’s learning and revision.</DialogDescription>
          </DialogHeader>
          <form
            className="os-form"
            onSubmit={(e) => {
              e.preventDefault();
              if (to < from) {
                toast.error("Ending ayah must not be less than starting ayah.");
                return;
              }
              upsertQuranRecord({
                studentId: student,
                currentSurahNumber: surah,
                ayahFrom: from,
                ayahTo: to,
                juzCompleted: juz,
                hizbCompleted: juz * 2,
                revisionStatus: rating,
                recitationScore: Number(recitation),
                teacherNotes: notes,
                appendLog: true,
                recordedBy: portal.displayName,
              });
              setOpen(false);
            }}
          >
            <label>
              Student
              <select required value={student} onChange={(e) => setStudent(e.target.value)}>
                {db.students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.fullName}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Surah
              <select
                value={surah}
                onChange={(e) => {
                  setSurah(Number(e.target.value));
                  setFrom(1);
                  setTo(1);
                }}
              >
                {QURAN_SURAHS.map((s) => (
                  <option key={s.number} value={s.number}>
                    {s.number}. {s.transliteration} — {s.arabicName}
                  </option>
                ))}
              </select>
            </label>
            <div className="os-form-row">
              <label>
                From ayah
                <input
                  type="number"
                  min="1"
                  max={QURAN_SURAHS[surah - 1]!.ayahCount}
                  required
                  value={from}
                  onChange={(e) => setFrom(Number(e.target.value))}
                />
              </label>
              <label>
                To ayah
                <input
                  type="number"
                  min={from}
                  max={QURAN_SURAHS[surah - 1]!.ayahCount}
                  required
                  value={to}
                  onChange={(e) => setTo(Number(e.target.value))}
                />
              </label>
            </div>
            <div className="os-form-row">
              <label>
                Juz completed
                <input
                  type="number"
                  min="0"
                  max="30"
                  value={juz}
                  onChange={(e) => setJuz(Number(e.target.value))}
                />
              </label>
              <label>
                Revision rating
                <select
                  value={rating}
                  onChange={(e) => setRating(e.target.value as MurajaahStatus)}
                >
                  {[
                    "Fluent",
                    "Strong",
                    "Needs Work",
                    "Excellent",
                    "Good",
                    "Needs Revision",
                    "Pending",
                  ].map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </select>
              </label>
            </div>
            <label>
              Recitation score (out of 10)
              <input
                type="number"
                min="0"
                max="10"
                required
                value={recitation}
                onChange={(e) => setRecitation(e.target.value)}
                placeholder="Enter the assessed score"
              />
            </label>
            <label>
              Tajweed remarks
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Teacher’s observations and next steps"
              />
            </label>
            <button className="os-primary" type="submit">
              Save progress
            </button>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}

export function IdentityCards() {
  const { db } = useSchoolOS();
  const [kind, setKind] = useState("students");
  const [search, setSearch] = useState("");
  const [cls, setCls] = useState("all");
  const students = db.students.filter(
    (s) =>
      s.fullName.toLowerCase().includes(search.toLowerCase()) &&
      (cls === "all" || Object.values(s.programmeClasses).includes(cls)),
  );
  const staff = db.staff.filter((s) => s.fullName.toLowerCase().includes(search.toLowerCase()));
  const records =
    kind === "students"
      ? students.map((s) => ({
          id: s.id,
          name: s.fullName,
          number: s.admissionId,
          photo: s.photoUrl,
          contact: s.parentPhone,
          role: Object.values(s.programmeClasses)
            .map((id) => db.classes.find((c) => c.id === id)?.name)
            .filter(Boolean)
            .join(" / "),
        }))
      : staff.map((s) => ({
          id: s.id,
          name: s.fullName,
          number: s.staffCode,
          photo: s.photoUrl,
          contact: s.phone,
          role: s.role,
        }));
  return (
    <section className="os-panel">
      <div className="os-table-toolbar">
        <div className="os-table-search">
          <Search size={16} />
          <input
            aria-label="Search identity cards"
            placeholder="Search by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select aria-label="Card type" value={kind} onChange={(e) => setKind(e.target.value)}>
          <option value="students">Student cards</option>
          <option value="staff">Staff cards</option>
        </select>
        <select aria-label="Filter by class" value={cls} onChange={(e) => setCls(e.target.value)}>
          <option value="all">All classes</option>
          {db.classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <button
          className="os-secondary"
          onClick={() =>
            exportRowsToCsv(
              "identity-cards.csv",
              ["Name", "ID", "Class / Role", "Contact"],
              records.map((r) => [r.name, r.number, r.role, r.contact]),
            )
          }
        >
          <Download size={14} />
          CSV
        </button>
        <button className="os-primary" disabled={!records.length} onClick={() => window.print()}>
          <Printer size={15} />
          Print cards
        </button>
      </div>
      {!records.length ? (
        <div className="os-module-empty-body">
          <span className="os-large-empty-icon">
            <Users size={34} />
          </span>
          <h3>No {kind === "students" ? "student" : "staff"} cards yet</h3>
          <p>
            Register {kind === "students" ? "students" : "staff"} to generate their school ID cards
            automatically.
          </p>
        </div>
      ) : (
        <div className="os-id-grid">
          {records.map((r) => (
            <div
              className="os-identity-card"
              key={r.id}
              style={
                {
                  "--id-primary": getResolvedCustomization(db.settings).workspaceTheme.primaryColor,
                } as React.CSSProperties
              }
            >
              <div className="os-id-school">
                {db.settings.logoDataUrl && (
                  <img src={db.settings.logoDataUrl} alt="School crest" />
                )}
                <strong>{db.settings.name}</strong>
                <small>{db.settings.motto}</small>
              </div>
              <div className="os-id-photo">
                {r.photo ? <img src={r.photo} alt={r.name} /> : <Users size={42} strokeWidth={1} />}
              </div>
              <h3>{r.name}</h3>
              <span className="os-id-role">{r.role}</span>
              <strong className="os-id-number">{r.number}</strong>
              <QR value={JSON.stringify({ school: db.settings.code, id: r.number })} />
              <p>Emergency contact: {r.contact || "Not provided"}</p>
              <div className="os-id-bottom">
                <ShieldCheck size={12} />
                {kind === "students" ? "STUDENT" : "STAFF"} IDENTITY CARD
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
function QR({ value }: { value: string }) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    let active = true;
    QRCode.toDataURL(value, { width: 150, margin: 1, color: { dark: "#173b3b", light: "#ffffff" } })
      .then((result) => {
        if (active) setUrl(result);
      })
      .catch(() => toast.error("Could not generate QR code."));
    return () => {
      active = false;
    };
  }, [value]);
  return url ? <img className="os-id-qr" src={url} alt="School identity QR code" /> : null;
}
