import { describe, expect, it } from "vitest";
import { createSeedDatabase } from "@/data/seedMarkazAcademy";
import { getStudentProgrammeLabels, isQuranAvailable } from "@/services/schoolExperience";
import { getResolvedCustomization, createDefaultCustomization } from "@/services/customizationDefaults";
import { getAuthorizedSnapshot, canManageStudents } from "@/services/accessControl";
import { mergePortalChanges } from "@/services/portalPolicy";
import type { ActivePortalSession } from "@/types/school";

describe("school-specific features", () => {
  it("ordinary schools do not enable Quran tools", () => { const db = createSeedDatabase(); db.settings.enableQuranModule = false; expect(isQuranAvailable(db.settings)).toBe(false); });
  it("Markaz can enable Quran without changing another school", () => { const a = createSeedDatabase(); const b = createSeedDatabase(); a.settings.enableQuranModule = true; b.settings.enableQuranModule = false; expect(isQuranAvailable(a.settings)).toBe(true); expect(isQuranAvailable(b.settings)).toBe(false); });
  it("integrated reports label both Halqah and Class", () => { const db = createSeedDatabase(); db.settings.multiProgrammeEnabled = true; db.settings.programmes = [{id:"h",name:"Islamiyya",groupLabel:"Halqah"},{id:"c",name:"Academic",groupLabel:"Class"}]; db.classes = [{id:"h1",programmeId:"h",name:"Khallad",levelOrder:1},{id:"c1",programmeId:"c",name:"Basic 1",levelOrder:1}]; expect(getStudentProgrammeLabels(db.settings,db.classes,{programmeClasses:{h:"h1",c:"c1"}})).toEqual([{label:"Halqah",name:"Khallad"},{label:"Class",name:"Basic 1"}]); });
  it("legacy Markaz report becomes shared options with no photo", () => { const db = createSeedDatabase(); db.settings.customization = createDefaultCustomization(); db.settings.customization.reportSheet.template = "halqah_excel"; const report = getResolvedCustomization(db.settings).reportSheet; expect(report.template).toBe("classic_grid"); expect(report.detailsLayout).toBe("register_grid"); expect(report.showStudentPhotoBox).toBe(false); });
  it("photo choice remains configurable for every school", () => { const db = createSeedDatabase(); db.settings.customization = createDefaultCustomization(); db.settings.customization.reportSheet.showStudentPhotoBox = false; expect(getResolvedCustomization(db.settings).reportSheet.showStudentPhotoBox).toBe(false); db.settings.customization.reportSheet.showStudentPhotoBox=true; expect(getResolvedCustomization(db.settings).reportSheet.showStudentPhotoBox).toBe(true); });
});

describe("portal access", () => {
  const parent: ActivePortalSession = { isAuthenticated:true,role:"parent",parentStudentIds:["child1"],displayName:"Parent",subtitle:"" };
  it("parents can read only explicitly linked children even with missing phones", () => { const db=createSeedDatabase(); db.students=[{id:"child1",parentPhone:"",programmeClasses:{}},{id:"child2",parentPhone:"",programmeClasses:{}}] as typeof db.students; expect(getAuthorizedSnapshot(db,parent).students.map((s)=>s.id)).toEqual(["child1"]); });
  it("parents cannot change school settings through a forged request", () => { const db=createSeedDatabase(); const next=getAuthorizedSnapshot(db,parent); next.settings={...next.settings,name:"Changed"}; expect(()=>mergePortalChanges(db,next,parent)).toThrow("cannot change"); });
  it("teachers cannot change their role or salary", () => { const db=createSeedDatabase(); const portal:ActivePortalSession={isAuthenticated:true,role:"class_teacher",displayName:"Teacher",subtitle:""}; const next=getAuthorizedSnapshot(db,portal); next.staff=[{id:"forged",systemRole:"admin"}] as typeof db.staff; expect(()=>mergePortalChanges(db,next,portal)).toThrow("cannot change"); });
  it("bursar may maintain student records", () => { expect(canManageStudents({...parent,role:"bursar"})).toBe(true); expect(canManageStudents(parent)).toBe(false); });
  it("teachers do not receive the school invoice projection", () => { const db=createSeedDatabase(); db.feeInvoices=[{studentId:"other",id:"invoice",netPayable:9000}] as NonNullable<typeof db.feeInvoices>; expect(getAuthorizedSnapshot(db,{...parent,role:"class_teacher"}).feeInvoices).toEqual([]); });
});