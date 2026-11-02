import { DEFAULT_NIGERIAN_CLASS_NAMES } from "@/data/emptySchoolDatabase";
import type { ClassGroup, Subject } from "@/types/school";

// Explicit fixtures for tests only. Never import these into application code.
export function buildDefaultNigerianClasses(): ClassGroup[] {
  return DEFAULT_NIGERIAN_CLASS_NAMES.map((name, idx) => {
    const id = `cls-main-${idx + 1}`;
    const nextId = idx < DEFAULT_NIGERIAN_CLASS_NAMES.length - 1 ? `cls-main-${idx + 2}` : null;
    return {
      id,
      name,
      programmeId: "prog-main",
      levelOrder: idx + 1,
      nextGroupId: nextId,
      room: "",
    };
  });
}

export function buildDefaultNigerianSubjects(): Subject[] {
  return [
    {
      id: "sub-eng",
      name: "English Studies",
      code: "ENG",
      programmeId: "prog-main",
      isCore: true,
    },
    {
      id: "sub-math",
      name: "Mathematics",
      code: "MTH",
      programmeId: "prog-main",
      isCore: true,
    },
    {
      id: "sub-bst",
      name: "Basic Science & Technology",
      code: "BST",
      programmeId: "prog-main",
      isCore: true,
    },
    {
      id: "sub-nve",
      name: "Civic & National Values",
      code: "NVE",
      programmeId: "prog-main",
      isCore: true,
    },
    {
      id: "sub-bus",
      name: "Business / Pre-Vocational Studies",
      code: "PVS",
      programmeId: "prog-main",
      isCore: false,
    },
    {
      id: "sub-ict",
      name: "Computer Studies / ICT",
      code: "ICT",
      programmeId: "prog-main",
      isCore: false,
    },
  ];
}
