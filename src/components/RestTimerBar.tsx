import { Minus, Plus, Timer, X } from 'lucide-react';

interface RestTimerBarProps {
  secondsLeft: number;
  totalSeconds: number;
  exerciseName: string;
  onAdjust: (delta: number) => void;
  onDismiss: () => void;
}

function formatTimer(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function RestTimerBar({
  secondsLeft,
  totalSeconds,
  exerciseName,
  onAdjust,
  onDismiss,
}: RestTimerBarProps) {
  const progress = totalSeconds > 0 ? Math.max(0, Math.min(100, (secondsLeft / totalSeconds) * 100)) : 0;
  const isFinished = secondsLeft === 0;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-[70px] left-3 right-3 z-30 md:left-auto md:right-6 md:bottom-6 md:w-96 rounded-2xl bg-[#141619] text-white dark:bg-zinc-900 border border-stone-800 dark:border-zinc-700 shadow-lg overflow-hidden"
    >
      <div className="h-1 w-full bg-white/10">
        <div
          className={`h-full transition-[width] duration-300 ease-linear ${
            isFinished ? 'bg-emerald-500' : 'bg-[#EA580C]'
          }`}
          style={{ width: `${isFinished ? 100 : progress}%` }}
        />
      </div>

      <div className="flex items-center justify-between gap-2 px-3 py-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
              isFinished ? 'bg-emerald-500/20 text-emerald-400' : 'bg-[#EA580C]/20 text-[#FB923C]'
            }`}
          >
            <Timer className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-bold font-mono-tabular leading-none">
                {isFinished ? 'Pronto' : formatTimer(secondsLeft)}
              </span>
              <span className="text-[11px] text-stone-400 whitespace-nowrap">
                {isFinished ? 'Descanso concluído' : 'Descanso'}
              </span>
            </div>
            <p className="text-xs text-stone-300 truncate mt-0.5">{exerciseName}</p>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => onAdjust(-15)}
            aria-label="Subtrair 15 segundos"
            className="min-h-[44px] min-w-[44px] px-2 rounded-xl text-xs font-mono-tabular font-medium text-stone-200 hover:bg-white/10 active:scale-95 transition-transform flex items-center justify-center whitespace-nowrap"
          >
            <Minus className="w-3.5 h-3.5 mr-0.5" />
            15s
          </button>
          <button
            type="button"
            onClick={() => onAdjust(15)}
            aria-label="Adicionar 15 segundos"
            className="min-h-[44px] min-w-[44px] px-2 rounded-xl text-xs font-mono-tabular font-medium text-stone-200 hover:bg-white/10 active:scale-95 transition-transform flex items-center justify-center whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5 mr-0.5" />
            15s
          </button>
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Fechar cronômetro"
            className="min-h-[44px] min-w-[44px] rounded-xl text-stone-400 hover:text-white hover:bg-white/10 active:scale-95 transition-transform flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
