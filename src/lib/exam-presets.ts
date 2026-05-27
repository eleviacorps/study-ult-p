export interface ExamPreset {
  id: string;
  name: string;
  group: "indian" | "international";
  variables: {
    EXAM_NAME: string;
    EXAM_LEVEL1: string;
    EXAM_LEVEL2: string;
    EXAM_TAGS: string;
  };
}

export const EXAM_PRESETS: ExamPreset[] = [
  {
    id: "jee",
    name: "JEE Main & Advanced",
    group: "indian",
    variables: {
      EXAM_NAME: "JEE",
      EXAM_LEVEL1: "JEE Main",
      EXAM_LEVEL2: "JEE Advanced",
      EXAM_TAGS: "#JEE #JEEAdvanced #Class12 #NCERT #Boards",
    },
  },
  {
    id: "neet",
    name: "NEET UG",
    group: "indian",
    variables: {
      EXAM_NAME: "NEET",
      EXAM_LEVEL1: "NEET UG",
      EXAM_LEVEL2: "NEET UG",
      EXAM_TAGS: "#NEET #Class12 #NCERT #Biology #Chemistry #Physics",
    },
  },
  {
    id: "cbse",
    name: "CBSE Boards (Class 12)",
    group: "indian",
    variables: {
      EXAM_NAME: "CBSE",
      EXAM_LEVEL1: "Class 12 Boards",
      EXAM_LEVEL2: "Class 12 Boards",
      EXAM_TAGS: "#CBSE #Class12 #NCERT #Boards",
    },
  },
  {
    id: "state-board",
    name: "State Boards (Class 12)",
    group: "indian",
    variables: {
      EXAM_NAME: "Board",
      EXAM_LEVEL1: "Class 12 Board Exam",
      EXAM_LEVEL2: "Class 12 Board Exam",
      EXAM_TAGS: "#BoardExam #Class12 #NCERT",
    },
  },
  {
    id: "sat",
    name: "SAT",
    group: "international",
    variables: {
      EXAM_NAME: "SAT",
      EXAM_LEVEL1: "SAT",
      EXAM_LEVEL2: "SAT Subject Tests",
      EXAM_TAGS: "#SAT #CollegePrep #Math #English",
    },
  },
  {
    id: "ap",
    name: "Advanced Placement (AP)",
    group: "international",
    variables: {
      EXAM_NAME: "AP",
      EXAM_LEVEL1: "AP Exam",
      EXAM_LEVEL2: "AP",
      EXAM_TAGS: "#AP #AdvancedPlacement #CollegeBoard",
    },
  },
  {
    id: "ib",
    name: "International Baccalaureate (IB)",
    group: "international",
    variables: {
      EXAM_NAME: "IB",
      EXAM_LEVEL1: "IB Exam",
      EXAM_LEVEL2: "IB Higher Level",
      EXAM_TAGS: "#IB #InternationalBaccalaureate #Diploma",
    },
  },
  {
    id: "gcse",
    name: "GCSE",
    group: "international",
    variables: {
      EXAM_NAME: "GCSE",
      EXAM_LEVEL1: "GCSE",
      EXAM_LEVEL2: "A-Level",
      EXAM_TAGS: "#GCSE #IGCSE #SecondaryEducation",
    },
  },
  {
    id: "alevel",
    name: "A-Levels",
    group: "international",
    variables: {
      EXAM_NAME: "A-Level",
      EXAM_LEVEL1: "A-Level",
      EXAM_LEVEL2: "A-Level",
      EXAM_TAGS: "#ALevel #AdvancedLevel #CollegePrep",
    },
  },
];

export function getPresetById(id: string): ExamPreset | undefined {
  return EXAM_PRESETS.find((p) => p.id === id);
}

export function getDefaultPreset(): ExamPreset {
  return EXAM_PRESETS[0];
}
