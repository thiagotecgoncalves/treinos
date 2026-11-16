import { User } from 'firebase/auth';
import {
  ChevronDown,
  ChevronRight,
  Download,
  RotateCcw,
  Upload,
} from 'lucide-react';
import { ChangeEvent, useRef, useState } from 'react';
import {
  Exercise,
  ParsedSpreadsheetData,
  TabId,
  WorkoutId,
} from '../types/workout';
import { SpreadsheetMeta } from '../utils/googleSheets';
import { GoogleSheetsSyncCard } from './GoogleSheetsSyncCard';
import { ProgressRing } from './ProgressRing';

interface OverviewTabProps {
  spreadsheet: ParsedSpreadsheetData;
  exercises: Exercise[];
  onNavigateTab: (tab: TabId) => void;
  onResetWeek: () => void;
  onExportCsv: () => void;
  onImportWorkoutCsv: (workoutId: WorkoutId, csvText: string) => { ok: boolean; message: string };
  googleUser: User | null;
  hasGoogleToken: boolean;
  isLoggingIn: boolean;
  isSyncing: boolean;
  connectedSheet: SpreadsheetMeta | null;
  syncStatusMessage: string | null;
  syncError: string | null;
  onSignIn: () => void;
  onSignOut: () => void;
  onConnectSpreadsheet: (spreadsheetId: string) => Promise<void>;
  onDisconnectSpreadsheet: () => void;
  onPullFromSheet: () => Promise<void>;
  onRequestPushToSheet: () => void;
  onRequestCreateSheet: () => void;
}

function getTodayScheduleIndex(): number {
  // JS getDay(): 0 = Domingo, 1 = Segunda ... 6 = Sábado
  const jsDay = new Date().getDay();
  return jsDay === 0 ? 6 : jsDay - 1;
}

export function OverviewTab({
  spreadsheet,
  exercises,
  onNavigateTab,
  onResetWeek,
  onExportCsv,
  onImportWorkoutCsv,
  googleUser,
  hasGoogleToken,
  isLoggingIn,
  isSyncing,
  connectedSheet,
  syncStatusMessage,
  syncError,
  onSignIn,
  onSignOut,
  onConnectSpreadsheet,
  onDisconnectSpreadsheet,
  onPullFromSheet,
  onRequestPushToSheet,
  onRequestCreateSheet,
}: OverviewTabProps) {
  const [selectedDayIdx, setSelectedDayIdx] = useState<number>(getTodayScheduleIndex);
  const [openGuideIdx, setOpenGuideIdx] = useState<number | null>(0);
  const [confirmReset, setConfirmReset] = useState(false);
  const [importTarget, setImportTarget] = useState<WorkoutId>('A');
  const [importFeedback, setImportFeedback] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const todayIdx = getTodayScheduleIndex();
  const todaySchedule = spreadsheet.schedule[todayIdx];

  const totalExercises = exercises.length;
  const completedTotal = exercises.filter((e) => e.completed).length;
  const totalPercent = totalExercises > 0 ? Math.round((completedTotal / totalExercises) * 100) : 0;

  const totalSets = exercises.reduce((acc, ex) => acc + ex.sets, 0);
  const completedSets = exercises.reduce(
    (acc, ex) => acc + ex.completedSets.filter(Boolean).length,
    0
  );

  const workoutStats = (['A', 'B', 'C'] as WorkoutId[]).map((id) => {
    const list = exercises.filter((e) => e.workoutId === id);
    const done = list.filter((e) => e.completed).length;
    const total = list.length;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    const status =
      done === 0 ? 'Pendente' : done === total && total > 0 ? 'Concluído' : 'Em Progresso';
    return { id, label: `Treino ${id}`, done, total, pct, status };
  });

  const completedSessionsCount = workoutStats.filter(
    (w) => w.total > 0 && w.done === w.total
  ).length;

  const nextPendingWorkout =
    (todaySchedule?.workoutId &&
    workoutStats.find((w) => w.id === todaySchedule.workoutId && w.done < w.total)
      ? todaySchedule.workoutId
      : workoutStats.find((w) => w.done < w.total)?.id) ?? 'A';

  const selectedDay = spreadsheet.schedule[selectedDayIdx] ?? spreadsheet.schedule[0];

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const res = onImportWorkoutCsv(importTarget, text);
    setImportFeedback(res.message);
    e.target.value = '';
  };

  return (
    <div className="space-y-6 lg:grid lg:grid-cols-12 lg:gap-6 lg:space-y-0">
      {/* Left Column on Desktop / Top Summary on Mobile */}
      <div className="space-y-6 lg:col-span-7">
        {/* Weekly Total Hero Focal Card */}
        <section className="rounded-2xl bg-[#141619] text-white dark:bg-[#171A1F] border border-stone-800 dark:border-zinc-800 p-5 sm:p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-stone-400">
                <span>Hoje: {todaySchedule?.day ?? 'Semana'}</span>
                <span aria-hidden="true">·</span>
                <span className="text-[#FB923C] font-medium">
                  {todaySchedule?.activity ?? `Treino ${nextPendingWorkout}`}
                </span>
              </div>

              <div className="mt-1.5 flex items-baseline gap-2.5">
                <span className="text-4xl font-bold font-display tracking-tight tabular-nums text-white">
                  {completedTotal} de {totalExercises}
                </span>
                <span className="text-sm text-stone-400">exercícios</span>
              </div>

              <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-mono-tabular text-stone-300">
                <span>
                  {completedSets}/{totalSets} séries
                </span>
                <span aria-hidden="true" className="text-stone-600">
                  ·
                </span>
                <span>{completedSessionsCount}/3 treinos</span>
              </div>
            </div>

            <ProgressRing
              percentage={totalPercent}
              size={76}
              strokeWidth={6}
              accentClass={totalPercent === 100 ? 'text-emerald-400' : 'text-[#EA580C]'}
              trackClass="text-white/10"
              labelClass="text-white"
            />
          </div>

          <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => onNavigateTab(nextPendingWorkout)}
              className="flex-1 min-h-[46px] px-4 rounded-xl bg-[#EA580C] text-white text-sm font-semibold hover:bg-[#DC4E07] active:scale-[0.99] transition-all flex items-center justify-center gap-2 whitespace-nowrap"
            >
              <span>
                {completedTotal === totalExercises && totalExercises > 0
                  ? `Revisar Treino ${nextPendingWorkout}`
                  : `Iniciar Treino ${nextPendingWorkout}`}
              </span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </section>

        {/* Status Semanal dos Treinos (A / B / C) */}
        <section className="rounded-2xl bg-white dark:bg-[#171A1F] border border-stone-200/90 dark:border-zinc-800 overflow-hidden">
          <div className="px-5 py-4 border-b border-stone-100 dark:border-zinc-800 flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-stone-900 dark:text-zinc-100">
              Status Semanal dos Treinos
            </h2>
            <span className="text-xs font-mono-tabular text-stone-500 dark:text-zinc-400">
              {totalPercent}% geral
            </span>
          </div>

          <div className="divide-y divide-stone-100 dark:divide-zinc-800">
            {workoutStats.map((item) => {
              const scheduleEntry = spreadsheet.schedule.find((s) => s.workoutId === item.id);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onNavigateTab(item.id)}
                  className="w-full min-h-[68px] px-5 py-3.5 flex items-center justify-between gap-3 text-left hover:bg-stone-50 dark:hover:bg-zinc-900/60 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-base font-semibold text-stone-900 dark:text-zinc-100">
                        {item.label}
                      </span>
                      <span aria-hidden="true" className="text-stone-300 dark:text-zinc-600">
                        ·
                      </span>
                      <span
                        className={`text-xs font-medium ${
                          item.status === 'Concluído'
                            ? 'text-emerald-700 dark:text-emerald-400'
                            : item.status === 'Em Progresso'
                            ? 'text-[#C2410C] dark:text-[#FB923C]'
                            : 'text-stone-500 dark:text-zinc-400'
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>

                    {scheduleEntry && (
                      <p className="mt-0.5 text-xs text-stone-500 dark:text-zinc-400 truncate">
                        {scheduleEntry.day} · {scheduleEntry.details}
                      </p>
                    )}

                    <div className="mt-2 h-1.5 w-full rounded-full bg-stone-100 dark:bg-zinc-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-[width] duration-300 ${
                          item.status === 'Concluído' ? 'bg-emerald-600' : 'bg-[#EA580C]'
                        }`}
                        style={{ width: `${item.pct}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-mono-tabular font-semibold text-stone-700 dark:text-zinc-300">
                      {item.done}/{item.total}
                    </span>
                    <ChevronRight className="w-4 h-4 text-stone-400 dark:text-zinc-500" />
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Cronograma Semanal Sugerido */}
        <section className="rounded-2xl bg-white dark:bg-[#171A1F] border border-stone-200/90 dark:border-zinc-800 p-5">
          <div className="flex items-center justify-between gap-2 mb-3.5">
            <h2 className="text-sm font-semibold text-stone-900 dark:text-zinc-100">
              Cronograma Semanal Sugerido
            </h2>
            <span className="text-xs text-stone-500 dark:text-zinc-400">Seg / Qua / Sex</span>
          </div>

          {/* Horizontal Day Selector */}
          <div className="grid grid-cols-7 gap-1.5 pb-4 border-b border-stone-100 dark:border-zinc-800">
            {spreadsheet.schedule.map((dayItem, idx) => {
              const isSelected = idx === selectedDayIdx;
              const isWorkoutDay = Boolean(dayItem.workoutId);
              return (
                <button
                  key={dayItem.day}
                  type="button"
                  onClick={() => setSelectedDayIdx(idx)}
                  className={`min-h-[52px] rounded-xl flex flex-col items-center justify-center gap-0.5 text-center transition-colors ${
                    isSelected
                      ? 'bg-[#141619] text-white dark:bg-zinc-100 dark:text-zinc-900'
                      : 'bg-stone-50 text-stone-600 hover:bg-stone-100 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800'
                  }`}
                >
                  <span className="text-[11px] font-medium">{dayItem.shortDay}</span>
                  <span
                    className={`text-xs font-mono-tabular font-bold ${
                      isSelected
                        ? 'text-white dark:text-zinc-900'
                        : isWorkoutDay
                        ? 'text-[#C2410C] dark:text-[#FB923C]'
                        : 'text-stone-400 dark:text-zinc-600'
                    }`}
                  >
                    {dayItem.workoutId ?? '—'}
                  </span>
                </button>
              );
            })}
          </div>

          {selectedDay && (
            <div className="pt-4 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-xs text-stone-500 dark:text-zinc-400">
                  <span>{selectedDay.day}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-semibold text-stone-800 dark:text-zinc-200">
                    {selectedDay.activity}
                  </span>
                </div>
                <p className="mt-1.5 text-sm leading-relaxed text-stone-700 dark:text-zinc-300">
                  {selectedDay.details}
                </p>
              </div>

              {selectedDay.workoutId && (
                <button
                  type="button"
                  onClick={() => onNavigateTab(selectedDay.workoutId!)}
                  className="min-h-[44px] px-3.5 rounded-xl bg-orange-50 text-[#C2410C] hover:bg-orange-100 dark:bg-orange-950/40 dark:text-[#FB923C] text-xs font-semibold shrink-0 whitespace-nowrap"
                >
                  Ir para Treino {selectedDay.workoutId}
                </button>
              )}
            </div>
          )}
        </section>
      </div>

      {/* Right Column on Desktop / Bottom Sections on Mobile */}
      <div className="space-y-6 lg:col-span-5">
        <GoogleSheetsSyncCard
          user={googleUser}
          hasToken={hasGoogleToken}
          isLoggingIn={isLoggingIn}
          isSyncing={isSyncing}
          connectedSheet={connectedSheet}
          syncStatusMessage={syncStatusMessage}
          syncError={syncError}
          exerciseCount={totalExercises}
          onSignIn={onSignIn}
          onSignOut={onSignOut}
          onConnectSpreadsheet={onConnectSpreadsheet}
          onDisconnectSpreadsheet={onDisconnectSpreadsheet}
          onPullFromSheet={onPullFromSheet}
          onRequestPushToSheet={onRequestPushToSheet}
          onRequestCreateSheet={onRequestCreateSheet}
        />

        {/* Guia de Execução & Conceitos-Chave */}
        <section className="rounded-2xl bg-white dark:bg-[#171A1F] border border-stone-200/90 dark:border-zinc-800 overflow-hidden">
          <div className="px-5 py-4 border-b border-stone-100 dark:border-zinc-800">
            <h2 className="text-sm font-semibold text-stone-900 dark:text-zinc-100">
              Guia de Execução & Conceitos-Chave
            </h2>
          </div>

          <div className="divide-y divide-stone-100 dark:divide-zinc-800">
            {spreadsheet.guide.map((item, idx) => {
              const isOpen = openGuideIdx === idx;
              return (
                <div key={item.concept}>
                  <button
                    type="button"
                    onClick={() => setOpenGuideIdx(isOpen ? null : idx)}
                    aria-expanded={isOpen}
                    className="w-full min-h-[52px] px-5 py-3 flex items-center justify-between gap-3 text-left hover:bg-stone-50 dark:hover:bg-zinc-900/50 transition-colors"
                  >
                    <span className="text-sm font-medium text-stone-900 dark:text-zinc-100">
                      {item.concept}
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 text-stone-400 shrink-0 transition-transform duration-150 ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <p className="px-5 pb-4 text-xs leading-relaxed text-stone-600 dark:text-zinc-400">
                      {item.description}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Planilha CSV & Gerenciamento da Semana */}
        <section className="rounded-2xl bg-white dark:bg-[#171A1F] border border-stone-200/90 dark:border-zinc-800 p-5 space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-stone-900 dark:text-zinc-100">
              Base da Planilha & Registros
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-stone-500 dark:text-zinc-400">
              {spreadsheet.meta.tip}
            </p>
          </div>

          {/* Import CSV for Treino A/B/C */}
          <div className="pt-3 border-t border-stone-100 dark:border-zinc-800 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-stone-700 dark:text-zinc-300">
                Importar aba CSV específica
              </span>
              <div className="inline-flex rounded-lg bg-stone-100 dark:bg-zinc-900 p-0.5">
                {(['A', 'B', 'C'] as WorkoutId[]).map((id) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setImportTarget(id)}
                    className={`min-h-[34px] px-2.5 rounded-md text-xs font-semibold transition-colors ${
                      importTarget === id
                        ? 'bg-white text-stone-900 shadow-xs dark:bg-zinc-800 dark:text-zinc-100'
                        : 'text-stone-500 dark:text-zinc-400'
                    }`}
                  >
                    {id}
                  </button>
                ))}
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileChange}
              className="hidden"
            />

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="min-h-[44px] px-3 rounded-xl border border-stone-200 dark:border-zinc-700 text-xs font-medium text-stone-700 dark:text-zinc-200 hover:bg-stone-50 dark:hover:bg-zinc-800 inline-flex items-center justify-center gap-1.5 whitespace-nowrap"
              >
                <Upload className="w-4 h-4 shrink-0" />
                <span>Importar CSV {importTarget}</span>
              </button>

              <button
                type="button"
                onClick={onExportCsv}
                className="min-h-[44px] px-3 rounded-xl border border-stone-200 dark:border-zinc-700 text-xs font-medium text-stone-700 dark:text-zinc-200 hover:bg-stone-50 dark:hover:bg-zinc-800 inline-flex items-center justify-center gap-1.5 whitespace-nowrap"
              >
                <Download className="w-4 h-4 shrink-0" />
                <span>Exportar CSV</span>
              </button>
            </div>

            {importFeedback && (
              <p className="text-xs text-stone-600 dark:text-zinc-300">{importFeedback}</p>
            )}
          </div>

          {/* Inline Reset Week Control */}
          <div className="pt-3 border-t border-stone-100 dark:border-zinc-800 flex items-center justify-between gap-3">
            <span className="text-xs text-stone-500 dark:text-zinc-400">
              Iniciar nova semana mantendo cargas
            </span>

            {confirmReset ? (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setConfirmReset(false)}
                  className="min-h-[40px] px-3 rounded-xl text-xs font-medium text-stone-600 dark:text-zinc-400 hover:bg-stone-100 dark:hover:bg-zinc-800"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onResetWeek();
                    setConfirmReset(false);
                  }}
                  className="min-h-[40px] px-3 rounded-xl bg-[#EA580C] text-white text-xs font-semibold hover:bg-[#DC4E07]"
                >
                  Confirmar
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmReset(true)}
                className="min-h-[44px] px-3.5 rounded-xl text-xs font-medium text-stone-700 dark:text-zinc-200 hover:bg-stone-100 dark:hover:bg-zinc-800 inline-flex items-center gap-1.5 whitespace-nowrap"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reiniciar Semana</span>
              </button>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
