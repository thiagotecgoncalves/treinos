import { ArrowUpFromLine, CheckCheck, Plus, RotateCcw, Timer } from 'lucide-react';
import { useState } from 'react';
import { WORKOUT_SESSIONS } from '../data/defaultWorkouts';
import { Exercise, WorkoutId } from '../types/workout';
import { ExerciseCard } from './ExerciseCard';

interface WorkoutTabProps {
  workoutId: WorkoutId;
  exercises: Exercise[];
  autoTimer: boolean;
  canSyncToSheet?: boolean;
  onRequestPushToSheet?: () => void;
  onToggleAutoTimer: () => void;
  onToggleComplete: (id: string) => void;
  onToggleSet: (id: string, setIndex: number) => void;
  onChangeWeight: (id: string, weight: string) => void;
  onStartRest: (exercise: Exercise) => void;
  onEditExercise: (exercise: Exercise) => void;
  onAddExercise: () => void;
  onResetWorkout: (workoutId: WorkoutId) => void;
  onCompleteAll: (workoutId: WorkoutId) => void;
}

export function WorkoutTab({
  workoutId,
  exercises,
  autoTimer,
  canSyncToSheet,
  onRequestPushToSheet,
  onToggleAutoTimer,
  onToggleComplete,
  onToggleSet,
  onChangeWeight,
  onStartRest,
  onEditExercise,
  onAddExercise,
  onResetWorkout,
  onCompleteAll,
}: WorkoutTabProps) {
  const [filterMode, setFilterMode] = useState<'all' | 'pending'>('all');

  const session = WORKOUT_SESSIONS[workoutId];
  const completedCount = exercises.filter((e) => e.completed).length;
  const totalCount = exercises.length;
  const pendingCount = totalCount - completedCount;
  const percent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const allDone = totalCount > 0 && completedCount === totalCount;

  const totalSets = exercises.reduce((acc, ex) => acc + ex.sets, 0);
  const doneSets = exercises.reduce(
    (acc, ex) => acc + ex.completedSets.filter(Boolean).length,
    0
  );

  const visibleExercises =
    filterMode === 'pending' ? exercises.filter((e) => !e.completed) : exercises;

  return (
    <div className="space-y-4">
      {/* Workout Session Summary Header */}
      <section className="rounded-2xl bg-white dark:bg-[#171A1F] border border-stone-200/90 dark:border-zinc-800 p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-stone-500 dark:text-zinc-400">
              <span>{session.dayLabel}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono-tabular">
                {completedCount}/{totalCount} exercícios ({percent}%)
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-mono-tabular">
                {doneSets}/{totalSets} séries
              </span>
            </div>
            <h2 className="mt-1 text-2xl font-bold font-display tracking-tight text-stone-900 dark:text-zinc-100">
              {session.title}
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-stone-600 dark:text-zinc-400">
              {session.focusSummary}
            </p>
          </div>

          <button
            type="button"
            onClick={onToggleAutoTimer}
            aria-pressed={autoTimer}
            className={`min-h-[44px] px-3.5 rounded-xl border text-xs font-medium inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
              autoTimer
                ? 'bg-orange-50 border-orange-200 text-[#C2410C] dark:bg-orange-950/30 dark:border-orange-900/60 dark:text-[#FB923C]'
                : 'bg-stone-50 border-stone-200 text-stone-600 dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-400'
            }`}
          >
            <Timer className="w-4 h-4 shrink-0" />
            <span>Auto-Descanso: {autoTimer ? 'On' : 'Off'}</span>
          </button>
        </div>

        {/* Progress Bar */}
        <div className="mt-4 h-2 w-full rounded-full bg-stone-100 dark:bg-zinc-800 overflow-hidden">
          <div
            className={`h-full rounded-full transition-[width] duration-300 ${
              allDone ? 'bg-emerald-600' : 'bg-[#EA580C]'
            }`}
            style={{ width: `${percent}%` }}
          />
        </div>

        {/* Filter & Session Actions */}
        <div className="mt-3.5 pt-3.5 border-t border-stone-100 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-2">
          <div className="inline-flex rounded-xl bg-stone-100 dark:bg-zinc-900 p-1">
            <button
              type="button"
              onClick={() => setFilterMode('all')}
              className={`min-h-[36px] px-3 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                filterMode === 'all'
                  ? 'bg-white text-stone-900 shadow-xs dark:bg-zinc-800 dark:text-zinc-100'
                  : 'text-stone-600 dark:text-zinc-400'
              }`}
            >
              Todos ({totalCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('pending')}
              className={`min-h-[36px] px-3 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                filterMode === 'pending'
                  ? 'bg-white text-stone-900 shadow-xs dark:bg-zinc-800 dark:text-zinc-100'
                  : 'text-stone-600 dark:text-zinc-400'
              }`}
            >
              Pendentes ({pendingCount})
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onResetWorkout(workoutId)}
              className="min-h-[40px] px-3 rounded-xl text-xs font-medium text-stone-600 hover:bg-stone-100 dark:text-zinc-400 dark:hover:bg-zinc-800 inline-flex items-center gap-1.5 whitespace-nowrap"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Limpar</span>
            </button>

            {canSyncToSheet && onRequestPushToSheet && (
              <button
                type="button"
                onClick={onRequestPushToSheet}
                className="min-h-[40px] px-3 rounded-xl border border-stone-200 dark:border-zinc-700 text-xs font-medium text-stone-700 dark:text-zinc-200 hover:bg-stone-50 dark:hover:bg-zinc-800 inline-flex items-center gap-1.5 whitespace-nowrap"
              >
                <ArrowUpFromLine className="w-3.5 h-3.5 text-[#EA580C]" />
                <span>Salvar Planilha</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => onCompleteAll(workoutId)}
              disabled={allDone}
              className={`min-h-[40px] px-3.5 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap transition-colors ${
                allDone
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 cursor-default'
                  : 'bg-stone-900 text-white hover:bg-stone-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200'
              }`}
            >
              <CheckCheck className="w-4 h-4" />
              <span>{allDone ? 'Concluído' : 'Marcar Todos'}</span>
            </button>
          </div>
        </div>
      </section>

      {/* Exercises List */}
      {exercises.length === 0 ? (
        <div className="rounded-2xl bg-white dark:bg-[#171A1F] border border-stone-200/90 dark:border-zinc-800 p-8 text-center">
          <p className="text-sm text-stone-600 dark:text-zinc-400">
            Nenhum exercício cadastrado neste treino.
          </p>
          <button
            type="button"
            onClick={onAddExercise}
            className="mt-4 min-h-[44px] px-4 rounded-xl bg-[#EA580C] text-white text-sm font-semibold inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Adicionar Exercício</span>
          </button>
        </div>
      ) : visibleExercises.length === 0 ? (
        <div className="rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 p-6 text-center space-y-3">
          <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
            Todos os exercícios do {session.title} foram concluídos.
          </p>
          <button
            type="button"
            onClick={() => setFilterMode('all')}
            className="min-h-[40px] px-4 rounded-xl bg-white dark:bg-zinc-900 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold text-emerald-800 dark:text-emerald-300"
          >
            Mostrar todos os {totalCount} exercícios
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
          {visibleExercises.map((exercise) => (
            <ExerciseCard
              key={exercise.id}
              exercise={exercise}
              onToggleComplete={onToggleComplete}
              onToggleSet={onToggleSet}
              onChangeWeight={onChangeWeight}
              onStartRest={onStartRest}
              onEdit={onEditExercise}
            />
          ))}
        </div>
      )}

      {/* Add Exercise Button */}
      <div className="pt-1">
        <button
          type="button"
          onClick={onAddExercise}
          className="w-full min-h-[48px] rounded-2xl border border-dashed border-stone-300 dark:border-zinc-700 text-sm font-medium text-stone-600 dark:text-zinc-300 hover:bg-white dark:hover:bg-[#171A1F] transition-colors flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>Adicionar Exercício ao Treino {workoutId}</span>
        </button>
      </div>
    </div>
  );
}
