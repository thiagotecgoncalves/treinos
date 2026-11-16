import { Minus, Plus, X } from 'lucide-react';
import { motion } from 'motion/react';

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
  const progress =
    totalSeconds > 0 ? Math.max(0, Math.min(1, secondsLeft / totalSeconds)) : 0;
  const isFinished = secondsLeft === 0;
  const ringRadius = 15;
  const circumference = 2 * Math.PI * ringRadius;
  const strokeOffset = circumference * (1 - (isFinished ? 1 : progress));

  return (
    <motion.div
      initial={{ opacity: 0, y: 18, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 18, scale: 0.98 }}
      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
      role="status"
      aria-live="polite"
      className="fixed bottom-[70px] left-3 right-3 z-30 md:left-auto md:right-6 md:bottom-6 md:w-96 rounded-2xl bg-[#141619]/95 backdrop-blur-md text-white dark:bg-zinc-900/95 border border-stone-800 dark:border-zinc-700 shadow-xl overflow-hidden"
    >
      <div className="flex items-center justify-between gap-2 px-3.5 py-2.5">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative w-10 h-10 flex items-center justify-center shrink-0">
            <svg width="40" height="40" className="-rotate-90">
              <circle
                cx="20"
                cy="20"
                r={ringRadius}
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                className="text-white/10"
              />
              <circle
                cx="20"
                cy="20"
                r={ringRadius}
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeOffset}
                className={`transition-[stroke-dashoffset] duration-300 ease-linear ${
                  isFinished ? 'text-emerald-400' : 'text-[#EA580C]'
                }`}
              />
            </svg>
            <span className="absolute text-[10px] font-mono-tabular font-semibold text-white">
              {isFinished ? '0s' : `${secondsLeft}`}
            </span>
          </div>

          <div className="min-w-0">
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-bold font-mono-tabular leading-none">
                {isFinished ? 'Pronto' : formatTimer(secondsLeft)}
              </span>
              <span
                className={`text-[11px] whitespace-nowrap ${
                  isFinished ? 'text-emerald-400 font-medium' : 'text-stone-400'
                }`}
              >
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
    </motion.div>
  );
}
