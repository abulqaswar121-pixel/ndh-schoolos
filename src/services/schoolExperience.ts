import type { SchoolSettings, Student, ClassGroup } from "@/types/school";

export function getStudentProgrammeLabels(settings: SchoolSettings, classes: ClassGroup[], student: Pick<Student, "programmeClasses">) {
  const programmes = settings.multiProgrammeEnabled ? settings.programmes : settings.programmes.slice(0, 1);
  return programmes.flatMap((programme) => {
    const group = classes.find((c) => c.id === student.programmeClasses[programme.id]);
    if (!group) return [];
    return [{ label: programme.groupLabel || settings.labels.classSingular, name: group.name }];
  });
}

export function isQuranAvailable(settings: SchoolSettings): boolean {
  return settings.enableQuranModule === true;
}