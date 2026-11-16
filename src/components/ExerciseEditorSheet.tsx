import { Trash2, X } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { Exercise, WorkoutId } from '../types/workout';

interface ExerciseEditorSheetProps {
  exercise: Exercise | null;
  workoutId: WorkoutId;
  nextOrder: number;
  onSave: (exercise: Exercise) => void;
  onDelete?: (id: string) => void;
  onClose: () => void;
}

export function ExerciseEditorSheet({
  exercise,
  workoutId,
  nextOrder,
  onSave,
  onDelete,
  onClose,
}: ExerciseEditorSheetProps) {
  const isNew = exercise === null;
  const [name, setName] = useState(exercise?.name ?? '');
  const [muscleGroup, setMuscleGroup] = useState(exercise?.muscleGroup ?? '');
  const [sets, setSets] = useState(String(exercise?.sets ?? 3));
  const [reps, setReps] = useState(exercise?.reps ?? '8–12');
  const [rir, setRir] = useState(exercise?.rir ?? 'RIR 2');
  const [restSeconds, setRestSeconds] = useState(String(exercise?.restSeconds ?? 90));
  const [weightKg, setWeightKg] = useState(exercise?.weightKg ?? '0');
  const [notes, setNotes] = useState(exercise?.notes ?? '');
  const [isBiset, setIsBiset] = useState(Boolean(exercise?.isBiset));
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const parsedSets = Math.min(8, Math.max(1, parseInt(sets, 10) || 3));
    const parsedRest = Math.max(15, parseInt(restSeconds, 10) || 90);
    const existingSets = exercise?.completedSets ?? [];
    const nextCompletedSets = Array.from({ length: parsedSets }, (_, idx) => existingSets[idx] ?? false);

    onSave({
      id: exercise?.id ?? `${workoutId.toLowerCase()}-${Date.now()}`,
      workoutId: exercise?.workoutId ?? workoutId,
      order: exercise?.order ?? nextOrder,
      muscleGroup: muscleGroup.trim() || 'Geral',
      name: name.trim(),
      sets: parsedSets,
      reps: reps.trim() || '8–12',
      rir: rir.trim() || 'RIR 2',
      restSeconds: parsedRest,
      isBiset,
      bisetNote: isBiset
        ? exercise?.bisetNote ||
          'Bi-set: execute os dois exercícios seguidos sem pausa e descanse 60s ao terminar a dupla.'
        : undefined,
      weightKg: weightKg.trim(),
      previousWeightKg: exercise?.previousWeightKg ?? weightKg.trim(),
      completedSets: nextCompletedSets,
      completed: nextCompletedSets.every(Boolean),
      notes: notes.trim(),
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-label={isNew ? 'Adicionar exercício' : 'Editar exercício'}
    >
      <div
        className="w-full md:max-w-lg max-h-[90vh] flex flex-col rounded-t-3xl md:rounded-2xl bg-white dark:bg-[#171A1F] border-t md:border border-stone-200 dark:border-zinc-800 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle affordance on mobile */}
        <div className="md:hidden pt-3 pb-1">
          <div className="w-10 h-1.5 bg-stone-300 dark:bg-zinc-700 rounded-full mx-auto" />
        </div>

        <div className="flex items-center justify-between px-5 py-3.5 border-b border-stone-100 dark:border-zinc-800">
          <h2 className="text-base font-semibold text-stone-900 dark:text-zinc-100">
            {isNew ? `Novo Exercício — Treino ${workoutId}` : 'Editar Exercício'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar janela"
            className="min-h-[44px] min-w-[44px] -mr-2 flex items-center justify-center rounded-xl text-stone-500 hover:bg-stone-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto px-5 py-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-stone-600 dark:text-zinc-300 mb-1.5">
              Nome do Exercício
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Supino Reto com Halteres"
              className="w-full min-h-[44px] px-3.5 rounded-xl border border-stone-200 bg-stone-50 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#EA580C] dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-stone-600 dark:text-zinc-300 mb-1.5">
                Grupo Muscular
              </label>
              <input
                type="text"
                value={muscleGroup}
                onChange={(e) => setMuscleGroup(e.target.value)}
                placeholder="Ex: Peito"
                className="w-full min-h-[44px] px-3.5 rounded-xl border border-stone-200 bg-stone-50 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#EA580C] dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-600 dark:text-zinc-300 mb-1.5">
                Carga Atual (kg)
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
                className="w-full min-h-[44px] px-3.5 rounded-xl border border-stone-200 bg-stone-50 text-sm font-mono-tabular text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#EA580C] dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-stone-600 dark:text-zinc-300 mb-1.5">
                Séries
              </label>
              <input
                type="number"
                min={1}
                max={8}
                value={sets}
                onChange={(e) => setSets(e.target.value)}
                className="w-full min-h-[44px] px-3 rounded-xl border border-stone-200 bg-stone-50 text-sm font-mono-tabular text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#EA580C] dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-600 dark:text-zinc-300 mb-1.5">
                Repetições
              </label>
              <input
                type="text"
                value={reps}
                onChange={(e) => setReps(e.target.value)}
                placeholder="8–10"
                className="w-full min-h-[44px] px-3 rounded-xl border border-stone-200 bg-stone-50 text-sm font-mono-tabular text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#EA580C] dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-600 dark:text-zinc-300 mb-1.5">
                Descanso (s)
              </label>
              <input
                type="number"
                min={15}
                step={15}
                value={restSeconds}
                onChange={(e) => setRestSeconds(e.target.value)}
                className="w-full min-h-[44px] px-3 rounded-xl border border-stone-200 bg-stone-50 text-sm font-mono-tabular text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#EA580C] dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 items-end">
            <div>
              <label className="block text-xs font-medium text-stone-600 dark:text-zinc-300 mb-1.5">
                RIR Alvo
              </label>
              <input
                type="text"
                value={rir}
                onChange={(e) => setRir(e.target.value)}
                placeholder="RIR 2"
                className="w-full min-h-[44px] px-3.5 rounded-xl border border-stone-200 bg-stone-50 text-sm font-mono-tabular text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#EA580C] dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              />
            </div>

            <button
              type="button"
              onClick={() => setIsBiset((v) => !v)}
              aria-pressed={isBiset}
              className={`min-h-[44px] px-3.5 rounded-xl border text-xs font-medium transition-colors ${
                isBiset
                  ? 'bg-stone-900 border-stone-900 text-white dark:bg-zinc-100 dark:border-zinc-100 dark:text-zinc-900'
                  : 'bg-stone-50 border-stone-200 text-stone-700 dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-300'
              }`}
            >
              {isBiset ? 'Estrutura Bi-set: Ativa' : 'Marcar como Bi-set'}
            </button>
          </div>

          <div>
            <label className="block text-xs font-medium text-stone-600 dark:text-zinc-300 mb-1.5">
              Observações de Execução
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Dicas de postura, cadência ou ajuste da máquina..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-50 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#EA580C] dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            />
          </div>

          <div className="pt-2 pb-safe flex items-center justify-between gap-3">
            {!isNew && onDelete ? (
              confirmDelete ? (
                <button
                  type="button"
                  onClick={() => onDelete(exercise.id)}
                  className="min-h-[44px] px-4 rounded-xl bg-red-600 text-white text-xs font-semibold hover:bg-red-700 transition-colors whitespace-nowrap"
                >
                  Confirmar Exclusão
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="min-h-[44px] px-3 rounded-xl text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30 text-xs font-medium inline-flex items-center gap-1.5 whitespace-nowrap"
                >
                  <Trash2 className="w-4 h-4" />
                  Remover
                </button>
              )
            ) : (
              <span />
            )}

            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={onClose}
                className="min-h-[44px] px-4 rounded-xl border border-stone-200 dark:border-zinc-700 text-sm font-medium text-stone-700 dark:text-zinc-300 hover:bg-stone-50 dark:hover:bg-zinc-800 whitespace-nowrap"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="min-h-[44px] px-5 rounded-xl bg-[#EA580C] text-white text-sm font-semibold hover:bg-[#DC4E07] active:scale-95 transition-transform whitespace-nowrap"
              >
                Salvar
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
