import { Check, Minus, Pencil, Plus, Timer } from 'lucide-react';
import { Exercise } from '../types/workout';

interface ExerciseCardProps {
  exercise: Exercise;
  onToggleComplete: (id: string) => void;
  onToggleSet: (id: string, setIndex: number) => void;
  onChangeWeight: (id: string, weight: string) => void;
  onStartRest: (exercise: Exercise) => void;
  onEdit: (exercise: Exercise) => void;
}

function formatRestLabel(seconds: number): string {
  if (seconds >= 60 && seconds % 60 === 0) {
    return `${seconds / 60} min`;
  }
  if (seconds > 60) {
    const mins = Math.floor(seconds / 60);
    const rem = seconds % 60;
    return `${mins}m${rem}s`;
  }
  return `${seconds}s`;
}

export function ExerciseCard({
  exercise,
  onToggleComplete,
  onToggleSet,
  onChangeWeight,
  onStartRest,
  onEdit,
}: ExerciseCardProps) {
  const currentNum = parseFloat(exercise.weightKg.replace(',', '.'));
  const prevNum = parseFloat(exercise.previousWeightKg.replace(',', '.'));
  const hasLoadIncrease =
    !Number.isNaN(currentNum) && !Number.isNaN(prevNum) && currentNum > prevNum;
  const loadDiff = hasLoadIncrease ? +(currentNum - prevNum).toFixed(1) : 0;

  const stepWeight = (delta: number) => {
    const base = Number.isNaN(currentNum) ? 0 : currentNum;
    const next = Math.max(0, +(base + delta).toFixed(1));
    onChangeWeight(exercise.id, String(next));
  };

  const completedSetsCount = exercise.completedSets.filter(Boolean).length;

  return (
    <article
      className={`rounded-2xl border transition-colors duration-150 p-4 ${
        exercise.completed
          ? 'bg-emerald-50/50 border-emerald-200/90 dark:bg-emerald-950/20 dark:border-emerald-900/60'
          : 'bg-white border-stone-200/90 dark:bg-[#171A1F] dark:border-zinc-800'
      }`}
    >
      {/* Top Row: Clean unboxed metadata + Action buttons */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1 pt-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs font-medium text-stone-500 dark:text-zinc-400">
            <span className="font-mono-tabular text-stone-700 dark:text-zinc-300">
              {String(exercise.order).padStart(2, '0')}
            </span>
            <span aria-hidden="true">·</span>
            <span className="text-[#C2410C] dark:text-[#FB923C] font-semibold">
              {exercise.muscleGroup}
            </span>
            {exercise.isBiset && (
              <>
                <span aria-hidden="true">·</span>
                <span className="text-stone-700 dark:text-zinc-300 font-semibold">Bi-set</span>
              </>
            )}
          </div>

          <h3
            className={`mt-1 text-[17px] font-semibold leading-snug tracking-tight ${
              exercise.completed
                ? 'text-stone-500 line-through dark:text-zinc-400'
                : 'text-stone-900 dark:text-zinc-100'
            }`}
          >
            {exercise.name}
          </h3>

          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-stone-600 dark:text-zinc-400 font-mono-tabular">
            <span>
              {exercise.sets} {exercise.sets === 1 ? 'série' : 'séries'}
            </span>
            <span aria-hidden="true">·</span>
            <span>{exercise.reps} reps</span>
            <span aria-hidden="true">·</span>
            <span>{exercise.rir}</span>
            <span aria-hidden="true">·</span>
            <span>{formatRestLabel(exercise.restSeconds)} descanso</span>
          </div>
        </div>

        <div className="flex items-center shrink-0 -mr-1.5 -mt-1">
          <button
            type="button"
            onClick={() => onEdit(exercise)}
            aria-label={`Editar ${exercise.name}`}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 dark:text-zinc-500 dark:hover:text-zinc-200 dark:hover:bg-zinc-800 transition-colors"
          >
            <Pencil className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => onToggleComplete(exercise.id)}
            aria-pressed={exercise.completed}
            aria-label={
              exercise.completed
                ? `Desmarcar ${exercise.name} como concluído`
                : `Marcar ${exercise.name} como concluído`
            }
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl active:scale-95 transition-transform"
          >
            <span
              className={`w-7 h-7 rounded-lg flex items-center justify-center border transition-colors ${
                exercise.completed
                  ? 'bg-emerald-600 border-emerald-600 text-white'
                  : 'bg-stone-50 border-stone-300 text-transparent dark:bg-zinc-900 dark:border-zinc-600'
              }`}
            >
              <Check className="w-4 h-4 stroke-[2.75]" />
            </span>
          </button>
        </div>
      </div>

      {/* Bi-set or execution notes */}
      {(exercise.bisetNote || exercise.notes) && (
        <p className="mt-2.5 text-xs leading-relaxed text-stone-500 dark:text-zinc-400">
          {exercise.bisetNote || exercise.notes}
        </p>
      )}

      {/* Sets checklist row — 44px touch targets for one-handed thumb tapping */}
      <div className="mt-3.5 pt-3.5 border-t border-stone-100 dark:border-zinc-800/80">
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="text-xs font-medium text-stone-500 dark:text-zinc-400">
            Séries ({completedSetsCount}/{exercise.sets})
          </span>
          <button
            type="button"
            onClick={() => onStartRest(exercise)}
            className="min-h-[36px] px-2.5 -mr-1.5 rounded-lg inline-flex items-center gap-1.5 text-xs font-medium text-[#C2410C] dark:text-[#FB923C] hover:bg-orange-50 dark:hover:bg-orange-950/30 transition-colors whitespace-nowrap shrink-0"
          >
            <Timer className="w-3.5 h-3.5" />
            Descanso {formatRestLabel(exercise.restSeconds)}
          </button>
        </div>

        <div className="grid grid-cols-4 sm:flex sm:flex-wrap gap-2">
          {exercise.completedSets.map((done, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => onToggleSet(exercise.id, idx)}
              aria-pressed={done}
              className={`min-h-[44px] sm:min-w-[68px] px-3 rounded-xl border text-xs font-mono-tabular font-semibold flex items-center justify-center gap-1.5 transition-all active:scale-95 whitespace-nowrap ${
                done
                  ? 'bg-stone-900 border-stone-900 text-white dark:bg-zinc-100 dark:border-zinc-100 dark:text-zinc-900'
                  : 'bg-stone-50 border-stone-200 text-stone-700 hover:border-stone-300 dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-300'
              }`}
            >
              {done && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
              S{idx + 1}
            </button>
          ))}
        </div>
      </div>

      {/* Load (Carga) Stepper Row */}
      <div className="mt-3 pt-3 border-t border-stone-100 dark:border-zinc-800/80 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <span className="block text-xs font-medium text-stone-600 dark:text-zinc-300">
            Carga (kg)
          </span>
          <div className="flex items-center gap-1.5 text-[11px] text-stone-500 dark:text-zinc-400 font-mono-tabular mt-0.5">
            <span>Anterior: {exercise.previousWeightKg || '—'} kg</span>
            {hasLoadIncrease && (
              <>
                <span aria-hidden="true">·</span>
                <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
                  +{loadDiff} kg
                </span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => stepWeight(-2.5)}
            aria-label={`Diminuir carga de ${exercise.name} em 2.5 kg`}
            className="min-h-[44px] min-w-[44px] rounded-xl border border-stone-200 bg-stone-50 text-stone-700 hover:bg-stone-100 active:scale-95 transition-transform flex items-center justify-center dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            <Minus className="w-4 h-4" />
          </button>

          <div className="relative">
            <input
              type="text"
              inputMode="decimal"
              value={exercise.weightKg}
              onChange={(e) => onChangeWeight(exercise.id, e.target.value)}
              aria-label={`Carga em kg para ${exercise.name}`}
              className="w-16 min-h-[44px] rounded-xl border border-stone-200 bg-white text-center text-sm font-mono-tabular font-semibold text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#EA580C] dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
            />
          </div>

          <button
            type="button"
            onClick={() => stepWeight(2.5)}
            aria-label={`Aumentar carga de ${exercise.name} em 2.5 kg`}
            className="min-h-[44px] min-w-[44px] rounded-xl border border-stone-200 bg-stone-50 text-stone-700 hover:bg-stone-100 active:scale-95 transition-transform flex items-center justify-center dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>
    </article>
  );
}
