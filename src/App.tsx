import { User } from 'firebase/auth';
import { Dumbbell, LayoutGrid, Moon, Sun } from 'lucide-react';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ExerciseEditorSheet } from './components/ExerciseEditorSheet';
import { PendingSyncAction, SyncConfirmDialog } from './components/GoogleSheetsSyncCard';
import { OverviewTab } from './components/OverviewTab';
import { RestTimerBar } from './components/RestTimerBar';
import { WorkoutTab } from './components/WorkoutTab';
import {
  DEFAULT_EXERCISES,
  FALLBACK_SPREADSHEET_DATA,
  SPREADSHEET_ASSET_PATH,
} from './data/defaultWorkouts';
import { Exercise, ParsedSpreadsheetData, TabId, WorkoutId } from './types/workout';
import {
  exportExercisesToCsv,
  parseMainSpreadsheetCsv,
  parseWorkoutTabCsv,
} from './utils/csvParser';
import {
  getAccessToken,
  getCurrentUser,
  googleSignIn,
  initAuth,
  logout,
} from './utils/googleAuth';
import {
  SpreadsheetMeta,
  createWorkoutGoogleSheet,
  fetchSpreadsheetMetadata,
  pullWorkoutsFromGoogleSheet,
  pushWorkoutsToGoogleSheet,
} from './utils/googleSheets';

const STORAGE_KEY_EXERCISES = 'fb3x_exercises_v1';
const STORAGE_KEY_TAB = 'fb3x_active_tab_v1';
const STORAGE_KEY_THEME = 'fb3x_theme_v1';
const STORAGE_KEY_AUTOTIMER = 'fb3x_autotimer_v1';
const STORAGE_KEY_SHEET_ID = 'fb3x_google_sheet_id_v1';

function playCompletionBeep() {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    [880, 1174.66].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.14);
      gain.gain.setValueAtTime(0.08, now + i * 0.14);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.14 + 0.16);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.14);
      osc.stop(now + i * 0.14 + 0.18);
    });
  } catch {
    // Ignore audio context restriction errors
  }
}

export default function App() {
  const [spreadsheet, setSpreadsheet] = useState<ParsedSpreadsheetData>(FALLBACK_SPREADSHEET_DATA);

  const [exercises, setExercises] = useState<Exercise[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_EXERCISES);
      if (saved) {
        const parsed = JSON.parse(saved) as Exercise[];
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // Fallback to default
    }
    return DEFAULT_EXERCISES;
  });

  const [activeTab, setActiveTab] = useState<TabId>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_TAB) as TabId | null;
      if (saved === 'resumo' || saved === 'A' || saved === 'B' || saved === 'C') {
        return saved;
      }
    } catch {
      // Ignore
    }
    return 'resumo';
  });

  const [darkMode, setDarkMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY_THEME) === 'dark';
    } catch {
      return false;
    }
  });

  const [autoTimer, setAutoTimer] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_AUTOTIMER);
      return saved === null ? true : saved === 'true';
    } catch {
      return true;
    }
  });

  const [timerState, setTimerState] = useState<{
    active: boolean;
    secondsLeft: number;
    totalSeconds: number;
    exerciseName: string;
  }>({
    active: false,
    secondsLeft: 0,
    totalSeconds: 0,
    exerciseName: '',
  });

  const [editingTarget, setEditingTarget] = useState<{
    open: boolean;
    exercise: Exercise | null;
    workoutId: WorkoutId;
  }>({ open: false, exercise: null, workoutId: 'A' });

  // Google Sheets & Firebase Auth state (access token kept strictly in memory)
  const [googleUser, setGoogleUser] = useState<User | null>(() => getCurrentUser());
  const [hasGoogleToken, setHasGoogleToken] = useState<boolean>(() => Boolean(getAccessToken()));
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [connectedSheet, setConnectedSheet] = useState<SpreadsheetMeta | null>(null);
  const [syncStatusMessage, setSyncStatusMessage] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [pendingSyncAction, setPendingSyncAction] = useState<PendingSyncAction | null>(null);

  const chimePlayedRef = useRef(false);

  // Initialize Firebase Auth listener
  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setGoogleUser(user);
        setHasGoogleToken(Boolean(token));
      },
      () => {
        setGoogleUser(getCurrentUser());
        setHasGoogleToken(false);
      }
    );
    return unsubscribe;
  }, []);

  // Reconnect saved spreadsheet metadata once token is available in memory
  useEffect(() => {
    const token = getAccessToken();
    if (!hasGoogleToken || !token || connectedSheet) return;
    let savedId: string | null = null;
    try {
      savedId = localStorage.getItem(STORAGE_KEY_SHEET_ID);
    } catch {
      savedId = null;
    }
    if (!savedId) return;

    fetchSpreadsheetMetadata(token, savedId)
      .then((meta) => setConnectedSheet(meta))
      .catch(() => {
        // Leave disconnected if saved sheet is no longer accessible
      });
  }, [hasGoogleToken, connectedSheet]);

  // Load and parse the attached CSV spreadsheet file directly
  useEffect(() => {
    let cancelled = false;
    fetch(SPREADSHEET_ASSET_PATH)
      .then((res) => {
        if (!res.ok) throw new Error('Falha ao carregar planilha');
        return res.text();
      })
      .then((csvText) => {
        if (cancelled || !csvText.trim()) return;
        const parsed = parseMainSpreadsheetCsv(csvText);
        setSpreadsheet(parsed);
      })
      .catch(() => {
        // Keep parsed fallback matching the attached CSV
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    try {
      localStorage.setItem(STORAGE_KEY_THEME, darkMode ? 'dark' : 'light');
    } catch {
      // Ignore
    }
  }, [darkMode]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_EXERCISES, JSON.stringify(exercises));
    } catch {
      // Ignore
    }
  }, [exercises]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_TAB, activeTab);
    } catch {
      // Ignore
    }
  }, [activeTab]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_AUTOTIMER, String(autoTimer));
    } catch {
      // Ignore
    }
  }, [autoTimer]);

  // Countdown timer loop
  useEffect(() => {
    if (!timerState.active || timerState.secondsLeft <= 0) {
      if (timerState.active && timerState.secondsLeft === 0 && !chimePlayedRef.current) {
        chimePlayedRef.current = true;
        playCompletionBeep();
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          navigator.vibrate([120, 60, 120]);
        }
      }
      return;
    }

    const interval = window.setInterval(() => {
      setTimerState((prev) => {
        if (!prev.active) return prev;
        const next = Math.max(0, prev.secondsLeft - 1);
        return { ...prev, secondsLeft: next };
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [timerState.active, timerState.secondsLeft]);

  const startRestTimer = useCallback((exercise: Exercise) => {
    chimePlayedRef.current = false;
    setTimerState({
      active: true,
      secondsLeft: exercise.restSeconds,
      totalSeconds: exercise.restSeconds,
      exerciseName: exercise.name,
    });
  }, []);

  const handleAdjustTimer = useCallback((delta: number) => {
    setTimerState((prev) => {
      const next = Math.max(0, prev.secondsLeft + delta);
      if (next > 0) chimePlayedRef.current = false;
      return {
        ...prev,
        secondsLeft: next,
        totalSeconds: Math.max(prev.totalSeconds, next),
      };
    });
  }, []);

  const handleToggleComplete = useCallback((id: string) => {
    setExercises((prev) =>
      prev.map((ex) => {
        if (ex.id !== id) return ex;
        const nextDone = !ex.completed;
        return {
          ...ex,
          completed: nextDone,
          completedSets: Array(ex.sets).fill(nextDone),
        };
      })
    );
  }, []);

  const handleToggleSet = useCallback(
    (id: string, setIndex: number) => {
      let triggeredExercise: Exercise | null = null;
      let checkedSet = false;

      setExercises((prev) =>
        prev.map((ex) => {
          if (ex.id !== id) return ex;
          const nextSets = [...ex.completedSets];
          nextSets[setIndex] = !nextSets[setIndex];
          checkedSet = nextSets[setIndex];
          if (checkedSet) triggeredExercise = ex;
          const allDone = nextSets.every(Boolean);
          return {
            ...ex,
            completedSets: nextSets,
            completed: allDone,
          };
        })
      );

      if (autoTimer && checkedSet && triggeredExercise) {
        startRestTimer(triggeredExercise);
      }
    },
    [autoTimer, startRestTimer]
  );

  const handleChangeWeight = useCallback((id: string, weight: string) => {
    const sanitized = weight.replace(/[^\d.,]/g, '');
    setExercises((prev) =>
      prev.map((ex) => (ex.id === id ? { ...ex, weightKg: sanitized } : ex))
    );
  }, []);

  const handleSaveExercise = useCallback((updated: Exercise) => {
    setExercises((prev) => {
      const exists = prev.some((e) => e.id === updated.id);
      if (exists) {
        return prev.map((e) => (e.id === updated.id ? updated : e));
      }
      return [...prev, updated];
    });
    setEditingTarget({ open: false, exercise: null, workoutId: updated.workoutId });
  }, []);

  const handleDeleteExercise = useCallback((id: string) => {
    setExercises((prev) => prev.filter((e) => e.id !== id));
    setEditingTarget((prev) => ({ ...prev, open: false, exercise: null }));
  }, []);

  const handleResetWorkout = useCallback((workoutId: WorkoutId) => {
    setExercises((prev) =>
      prev.map((ex) => {
        if (ex.workoutId !== workoutId) return ex;
        return {
          ...ex,
          previousWeightKg: ex.weightKg || ex.previousWeightKg,
          completed: false,
          completedSets: Array(ex.sets).fill(false),
        };
      })
    );
  }, []);

  const handleCompleteAll = useCallback((workoutId: WorkoutId) => {
    setExercises((prev) =>
      prev.map((ex) => {
        if (ex.workoutId !== workoutId) return ex;
        return {
          ...ex,
          completed: true,
          completedSets: Array(ex.sets).fill(true),
        };
      })
    );
  }, []);

  const handleResetWeek = useCallback(() => {
    setExercises((prev) =>
      prev.map((ex) => ({
        ...ex,
        previousWeightKg: ex.weightKg || ex.previousWeightKg,
        completed: false,
        completedSets: Array(ex.sets).fill(false),
      }))
    );
  }, []);

  const handleImportWorkoutCsv = useCallback(
    (workoutId: WorkoutId, csvText: string) => {
      const parsed = parseWorkoutTabCsv(csvText, workoutId);
      if (parsed.length === 0) {
        return {
          ok: false,
          message: 'Nenhum exercício reconhecido no CSV selecionado.',
        };
      }
      setExercises((prev) => [
        ...prev.filter((e) => e.workoutId !== workoutId),
        ...parsed,
      ]);
      return {
        ok: true,
        message: `${parsed.length} exercícios importados para o Treino ${workoutId}.`,
      };
    },
    []
  );

  const handleExportCsv = useCallback(() => {
    const csv = exportExercisesToCsv(exercises);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'treino-full-body-3x-progresso.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [exercises]);

  const handleGoogleSignIn = useCallback(async () => {
    setIsLoggingIn(true);
    setSyncError(null);
    setSyncStatusMessage(null);
    try {
      const res = await googleSignIn();
      if (res) {
        setGoogleUser(res.user);
        setHasGoogleToken(true);
      }
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : 'Falha ao entrar com o Google.');
    } finally {
      setIsLoggingIn(false);
    }
  }, []);

  const handleGoogleSignOut = useCallback(async () => {
    await logout();
    setGoogleUser(null);
    setHasGoogleToken(false);
    setSyncStatusMessage(null);
    setSyncError(null);
  }, []);

  const handleConnectSpreadsheet = useCallback(async (spreadsheetId: string) => {
    const token = getAccessToken();
    if (!token) {
      setHasGoogleToken(false);
      setSyncError('Faça login com o Google novamente para conectar a planilha.');
      return;
    }
    setIsSyncing(true);
    setSyncError(null);
    setSyncStatusMessage(null);
    try {
      const meta = await fetchSpreadsheetMetadata(token, spreadsheetId);
      setConnectedSheet(meta);
      try {
        localStorage.setItem(STORAGE_KEY_SHEET_ID, meta.spreadsheetId);
      } catch {
        // Ignore storage error
      }
      setSyncStatusMessage(`Planilha "${meta.title}" conectada.`);
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : 'Erro ao conectar planilha.');
    } finally {
      setIsSyncing(false);
    }
  }, []);

  const handleDisconnectSpreadsheet = useCallback(() => {
    setConnectedSheet(null);
    setSyncStatusMessage(null);
    setSyncError(null);
    try {
      localStorage.removeItem(STORAGE_KEY_SHEET_ID);
    } catch {
      // Ignore
    }
  }, []);

  const handlePullFromSheet = useCallback(async () => {
    const token = getAccessToken();
    if (!token || !connectedSheet) {
      setHasGoogleToken(Boolean(token));
      setSyncError('Sessão do Google expirada. Faça login novamente.');
      return;
    }
    setIsSyncing(true);
    setSyncError(null);
    setSyncStatusMessage(null);
    try {
      const result = await pullWorkoutsFromGoogleSheet(token, connectedSheet.spreadsheetId);
      setConnectedSheet(result.meta);
      setExercises(result.exercises);
      setSyncStatusMessage(
        `${result.exercises.length} exercícios carregados das abas: ${result.importedTabs.join(', ')}.`
      );
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : 'Erro ao ler dados da planilha.');
    } finally {
      setIsSyncing(false);
    }
  }, [connectedSheet]);

  const handleConfirmSyncMutation = useCallback(async () => {
    if (!pendingSyncAction) return;
    const token = getAccessToken();
    if (!token) {
      setPendingSyncAction(null);
      setHasGoogleToken(false);
      setSyncError('Sessão do Google expirada. Faça login novamente.');
      return;
    }

    setIsSyncing(true);
    setSyncError(null);
    setSyncStatusMessage(null);
    try {
      if (pendingSyncAction.type === 'push' && connectedSheet) {
        const res = await pushWorkoutsToGoogleSheet(
          token,
          connectedSheet.spreadsheetId,
          exercises,
          spreadsheet
        );
        setConnectedSheet(res.meta);
        setSyncStatusMessage(
          `Planilha "${res.meta.title}" atualizada (${res.updatedTabs.join(', ')}).`
        );
      } else if (pendingSyncAction.type === 'create') {
        const meta = await createWorkoutGoogleSheet(token, exercises, spreadsheet);
        setConnectedSheet(meta);
        try {
          localStorage.setItem(STORAGE_KEY_SHEET_ID, meta.spreadsheetId);
        } catch {
          // Ignore
        }
        setSyncStatusMessage(`Planilha "${meta.title}" criada e sincronizada.`);
      }
      setPendingSyncAction(null);
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : 'Erro ao gravar na planilha.');
      setPendingSyncAction(null);
    } finally {
      setIsSyncing(false);
    }
  }, [pendingSyncAction, connectedSheet, exercises, spreadsheet]);

  const countsByWorkout = useMemo(() => {
    const counts: Record<WorkoutId, { done: number; total: number }> = {
      A: { done: 0, total: 0 },
      B: { done: 0, total: 0 },
      C: { done: 0, total: 0 },
    };
    for (const ex of exercises) {
      counts[ex.workoutId].total += 1;
      if (ex.completed) counts[ex.workoutId].done += 1;
    }
    return counts;
  }, [exercises]);

  const activeWorkoutExercises = useMemo(() => {
    if (activeTab === 'resumo') return [];
    return exercises
      .filter((e) => e.workoutId === activeTab)
      .sort((a, b) => a.order - b.order);
  }, [exercises, activeTab]);

  const navigateTab = (tab: TabId) => {
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen flex flex-col">
        {/* Desktop Top Navigation Bar (3-zone Top Bar Contract) + Compact Mobile Header */}
        <header className="border-b border-stone-200/80 dark:border-zinc-800 bg-white/85 dark:bg-[#141619]/90 backdrop-blur-md md:sticky md:top-0 md:z-30">
          <div className="max-w-6xl mx-auto px-4 md:px-6 h-14 md:h-16 flex items-center justify-between gap-8">
            <button
              type="button"
              onClick={() => navigateTab('resumo')}
              className="text-xl md:text-2xl font-bold font-display tracking-tight text-stone-900 dark:text-zinc-100 whitespace-nowrap shrink-0 text-left"
            >
              {spreadsheet.meta.title}
            </button>

            <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-stone-600 dark:text-zinc-400">
              <button
                type="button"
                onClick={() => navigateTab('resumo')}
                className={`relative py-2 whitespace-nowrap shrink-0 transition-colors ${
                  activeTab === 'resumo'
                    ? 'text-stone-900 dark:text-zinc-100 font-semibold'
                    : 'hover:text-stone-900 dark:hover:text-zinc-100'
                }`}
              >
                Resumo
                {activeTab === 'resumo' && (
                  <motion.span
                    layoutId="desktopNavIndicator"
                    transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#EA580C] rounded-full"
                  />
                )}
              </button>
              {(['A', 'B', 'C'] as WorkoutId[]).map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => navigateTab(id)}
                  className={`relative py-2 whitespace-nowrap shrink-0 transition-colors ${
                    activeTab === id
                      ? 'text-stone-900 dark:text-zinc-100 font-semibold'
                      : 'hover:text-stone-900 dark:hover:text-zinc-100'
                  }`}
                >
                  Treino {id} ({countsByWorkout[id].done}/{countsByWorkout[id].total})
                  {activeTab === id && (
                    <motion.span
                      layoutId="desktopNavIndicator"
                      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#EA580C] rounded-full"
                    />
                  )}
                </button>
              ))}
            </nav>

            <div className="flex items-center shrink-0">
              <button
                type="button"
                onClick={() => setDarkMode((v) => !v)}
                aria-label={darkMode ? 'Ativar modo claro' : 'Ativar modo escuro'}
                className="min-h-[40px] px-3 rounded-xl border border-stone-200 dark:border-zinc-700 text-xs font-medium text-stone-700 dark:text-zinc-200 hover:bg-stone-50 dark:hover:bg-zinc-800 inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
              >
                {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                <span className="hidden sm:inline">{darkMode ? 'Modo Claro' : 'Modo Escuro'}</span>
              </button>
            </div>
          </div>
        </header>

        {/* Main Content Container */}
        <main
          className={`flex-1 w-full max-w-6xl mx-auto px-4 md:px-6 pt-4 md:pt-7 ${
            timerState.active ? 'pb-40 md:pb-24' : 'pb-24 md:pb-12'
          }`}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            >
              {activeTab === 'resumo' ? (
                <>
                  <div className="mb-4 md:mb-6">
                    <p className="text-xs md:text-sm text-stone-500 dark:text-zinc-400">
                      {spreadsheet.meta.subtitle}
                    </p>
                  </div>
                  <OverviewTab
                    spreadsheet={spreadsheet}
                    exercises={exercises}
                    onNavigateTab={navigateTab}
                    onResetWeek={handleResetWeek}
                    onExportCsv={handleExportCsv}
                    onImportWorkoutCsv={handleImportWorkoutCsv}
                    googleUser={googleUser}
                    hasGoogleToken={hasGoogleToken}
                    isLoggingIn={isLoggingIn}
                    isSyncing={isSyncing}
                    connectedSheet={connectedSheet}
                    syncStatusMessage={syncStatusMessage}
                    syncError={syncError}
                    onSignIn={handleGoogleSignIn}
                    onSignOut={handleGoogleSignOut}
                    onConnectSpreadsheet={handleConnectSpreadsheet}
                    onDisconnectSpreadsheet={handleDisconnectSpreadsheet}
                    onPullFromSheet={handlePullFromSheet}
                    onRequestPushToSheet={() => {
                      if (connectedSheet) {
                        setPendingSyncAction({
                          type: 'push',
                          spreadsheetTitle: connectedSheet.title,
                          exerciseCount: exercises.length,
                        });
                      }
                    }}
                    onRequestCreateSheet={() =>
                      setPendingSyncAction({
                        type: 'create',
                        exerciseCount: exercises.length,
                      })
                    }
                  />
                </>
              ) : (
                <WorkoutTab
                  workoutId={activeTab}
                  exercises={activeWorkoutExercises}
                  autoTimer={autoTimer}
                  canSyncToSheet={Boolean(hasGoogleToken && connectedSheet)}
                  onRequestPushToSheet={() => {
                    if (connectedSheet) {
                      setPendingSyncAction({
                        type: 'push',
                        spreadsheetTitle: connectedSheet.title,
                        exerciseCount: exercises.length,
                      });
                    }
                  }}
                  onToggleAutoTimer={() => setAutoTimer((v) => !v)}
                  onToggleComplete={handleToggleComplete}
                  onToggleSet={handleToggleSet}
                  onChangeWeight={handleChangeWeight}
                  onStartRest={startRestTimer}
                  onEditExercise={(exercise) =>
                    setEditingTarget({ open: true, exercise, workoutId: activeTab })
                  }
                  onAddExercise={() =>
                    setEditingTarget({ open: true, exercise: null, workoutId: activeTab })
                  }
                  onResetWorkout={handleResetWorkout}
                  onCompleteAll={handleCompleteAll}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Floating Rest Timer Bar */}
        <AnimatePresence>
          {timerState.active && (
            <RestTimerBar
              secondsLeft={timerState.secondsLeft}
              totalSeconds={timerState.totalSeconds}
              exerciseName={timerState.exerciseName}
              onAdjust={handleAdjustTimer}
              onDismiss={() => setTimerState((prev) => ({ ...prev, active: false }))}
            />
          )}
        </AnimatePresence>

        {/* Mobile Fixed Bottom Tab Bar (Thumb Zone, <= 64px height) */}
        <nav
          aria-label="Navegação de treinos"
          className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#141619]/95 backdrop-blur-md border-t border-stone-200 dark:border-zinc-800 pb-safe"
        >
          <div className="grid grid-cols-4 h-16">
            <button
              type="button"
              onClick={() => navigateTab('resumo')}
              className={`relative flex flex-col items-center justify-center gap-0.5 transition-colors ${
                activeTab === 'resumo'
                  ? 'text-[#EA580C] dark:text-[#FB923C]'
                  : 'text-stone-500 dark:text-zinc-400'
              }`}
            >
              {activeTab === 'resumo' && (
                <motion.span
                  layoutId="mobileBottomIndicator"
                  transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                  className="absolute top-0 left-4 right-4 h-0.5 bg-[#EA580C] rounded-full"
                />
              )}
              <LayoutGrid className="w-5 h-5" />
              <span className="text-[11px] font-semibold tracking-tight whitespace-nowrap">
                Resumo
              </span>
            </button>

            {(['A', 'B', 'C'] as WorkoutId[]).map((id) => {
              const isActive = activeTab === id;
              const stat = countsByWorkout[id];
              const isComplete = stat.total > 0 && stat.done === stat.total;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => navigateTab(id)}
                  className={`relative flex flex-col items-center justify-center gap-0.5 transition-colors ${
                    isActive
                      ? 'text-[#EA580C] dark:text-[#FB923C]'
                      : 'text-stone-500 dark:text-zinc-400'
                  }`}
                >
                  {isActive && (
                    <motion.span
                      layoutId="mobileBottomIndicator"
                      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                      className="absolute top-0 left-4 right-4 h-0.5 bg-[#EA580C] rounded-full"
                    />
                  )}
                  <div className="flex items-center gap-1">
                    <Dumbbell className="w-4 h-4" />
                    <span
                      className={`text-[10px] font-mono-tabular font-semibold ${
                        isComplete
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : isActive
                          ? 'text-[#EA580C] dark:text-[#FB923C]'
                          : 'text-stone-400 dark:text-zinc-500'
                      }`}
                    >
                      {stat.done}/{stat.total}
                    </span>
                  </div>
                  <span className="text-[11px] font-semibold tracking-tight whitespace-nowrap">
                    Treino {id}
                  </span>
                </button>
              );
            })}
          </div>
        </nav>

        {/* Exercise Editor Bottom Sheet / Modal */}
        {editingTarget.open && (
          <ExerciseEditorSheet
            exercise={editingTarget.exercise}
            workoutId={editingTarget.workoutId}
            nextOrder={
              exercises.filter((e) => e.workoutId === editingTarget.workoutId).length + 1
            }
            onSave={handleSaveExercise}
            onDelete={handleDeleteExercise}
            onClose={() =>
              setEditingTarget((prev) => ({ ...prev, open: false, exercise: null }))
            }
          />
        )}

        {/* Explicit Confirmation Dialog for Google Sheets Write/Create Mutations */}
        {pendingSyncAction && (
          <SyncConfirmDialog
            action={pendingSyncAction}
            isSyncing={isSyncing}
            onConfirm={handleConfirmSyncMutation}
            onCancel={() => setPendingSyncAction(null)}
          />
        )}
      </div>
    </MotionConfig>
  );
}
