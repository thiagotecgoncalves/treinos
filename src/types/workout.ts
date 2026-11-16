export type WorkoutId = 'A' | 'B' | 'C';
export type TabId = 'resumo' | WorkoutId;

export interface ProgramMeta {
  title: string;
  subtitle: string;
  tip: string;
}

export interface WorkoutSummaryMeta {
  id: WorkoutId;
  label: string;
  targetCount: number;
}

export interface GuideConcept {
  concept: string;
  description: string;
}

export interface ScheduleDay {
  day: string;
  shortDay: string;
  activity: string;
  details: string;
  workoutId?: WorkoutId;
}

export interface ParsedSpreadsheetData {
  meta: ProgramMeta;
  summaries: WorkoutSummaryMeta[];
  guide: GuideConcept[];
  schedule: ScheduleDay[];
}

export interface Exercise {
  id: string;
  workoutId: WorkoutId;
  order: number;
  muscleGroup: string;
  name: string;
  sets: number;
  reps: string;
  rir: string;
  restSeconds: number;
  isBiset?: boolean;
  bisetNote?: string;
  weightKg: string;
  previousWeightKg: string;
  completedSets: boolean[];
  completed: boolean;
  notes: string;
}

export interface WorkoutSessionMeta {
  id: WorkoutId;
  title: string;
  dayLabel: string;
  focusSummary: string;
}
