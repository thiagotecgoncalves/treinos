import { Exercise, ParsedSpreadsheetData, WorkoutId } from '../types/workout';

const SHEETS_API_BASE = 'https://sheets.googleapis.com/v4/spreadsheets';

export interface SheetTabMeta {
  sheetId: number;
  title: string;
}

export interface SpreadsheetMeta {
  spreadsheetId: string;
  title: string;
  url: string;
  sheets: SheetTabMeta[];
}

export function extractSpreadsheetId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const urlMatch = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (urlMatch?.[1]) return urlMatch[1];

  if (/^[a-zA-Z0-9-_]{20,}$/.test(trimmed)) {
    return trimmed;
  }

  return null;
}

async function sheetsFetch<T>(
  url: string,
  accessToken: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...(options?.headers ?? {}),
    },
  });

  if (!res.ok) {
    let detail = `Erro ${res.status}`;
    try {
      const errJson = await res.json();
      detail = errJson?.error?.message || detail;
    } catch {
      // Ignore json parse error
    }
    if (res.status === 401) {
      throw new Error('Sessão do Google expirada. Faça login novamente para continuar.');
    }
    if (res.status === 403) {
      throw new Error('Sem permissão para acessar esta planilha no Google Sheets.');
    }
    if (res.status === 404) {
      throw new Error('Planilha não encontrada. Verifique o link ou ID informado.');
    }
    throw new Error(detail);
  }

  return res.json() as Promise<T>;
}

export async function fetchSpreadsheetMetadata(
  accessToken: string,
  spreadsheetId: string
): Promise<SpreadsheetMeta> {
  const data = await sheetsFetch<{
    spreadsheetId: string;
    spreadsheetUrl: string;
    properties: { title: string };
    sheets: Array<{ properties: { sheetId: number; title: string } }>;
  }>(
    `${SHEETS_API_BASE}/${spreadsheetId}?fields=spreadsheetId,spreadsheetUrl,properties.title,sheets.properties(sheetId,title)`,
    accessToken
  );

  return {
    spreadsheetId: data.spreadsheetId,
    title: data.properties?.title || 'Planilha sem título',
    url: data.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${data.spreadsheetId}/edit`,
    sheets: (data.sheets ?? []).map((s) => ({
      sheetId: s.properties.sheetId,
      title: s.properties.title,
    })),
  };
}

function findTabByWorkoutId(sheets: SheetTabMeta[], workoutId: WorkoutId): SheetTabMeta | undefined {
  const target = `treino ${workoutId.toLowerCase()}`;
  return (
    sheets.find((s) => s.title.trim().toLowerCase() === target) ||
    sheets.find((s) => s.title.trim().toLowerCase().includes(target))
  );
}

function findOverviewTab(sheets: SheetTabMeta[]): SheetTabMeta | undefined {
  const candidates = ['resumo', 'visão geral', 'dashboard', 'painel', 'geral', 'full body'];
  return (
    sheets.find((s) =>
      candidates.some((c) => s.title.trim().toLowerCase().includes(c))
    ) || sheets[0]
  );
}

function parseBoolCell(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  const str = String(value ?? '').trim().toLowerCase();
  return str === 'true' || str === 'sim' || str === 's' || str === '1' || str === 'x' || str === 'concluído' || str === 'concluido';
}

function parseRestSeconds(value: unknown): number {
  const str = String(value ?? '').trim().toLowerCase();
  const match = str.match(/\d+/);
  if (!match) return 90;
  const num = parseInt(match[0], 10);
  if (str.includes('min') || num <= 5) return num * 60;
  return num;
}

function parseSheetRowsToExercises(
  rows: unknown[][],
  workoutId: WorkoutId
): Exercise[] {
  const exercises: Exercise[] = [];
  if (!rows || rows.length === 0) return exercises;

  // Locate header row to map columns flexibly
  let headerIdx = -1;
  let colMap = {
    order: -1,
    muscle: -1,
    name: -1,
    sets: -1,
    reps: -1,
    rir: -1,
    rest: -1,
    weight: -1,
    done: -1,
    notes: -1,
  };

  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    const row = rows[i].map((c) => String(c ?? '').trim().toLowerCase());
    const hasEx = row.some((c) => c.includes('exerc'));
    if (hasEx) {
      headerIdx = i;
      row.forEach((cell, idx) => {
        if (cell === '#' || cell.includes('ordem')) colMap.order = idx;
        else if (cell.includes('grupo') || cell.includes('músc') || cell.includes('musc')) colMap.muscle = idx;
        else if (cell.includes('exerc')) colMap.name = idx;
        else if (cell.includes('série') || cell.includes('serie')) colMap.sets = idx;
        else if (cell.includes('rep')) colMap.reps = idx;
        else if (cell.includes('rir')) colMap.rir = idx;
        else if (cell.includes('descanso') || cell.includes('pausa')) colMap.rest = idx;
        else if (cell.includes('carga') || cell.includes('peso')) colMap.weight = idx;
        else if (cell.includes('conclu') || cell.includes('check') || cell.includes('feito') || cell.includes('status')) colMap.done = idx;
        else if (cell.includes('nota') || cell.includes('obs')) colMap.notes = idx;
      });
      break;
    }
  }

  const startRow = headerIdx >= 0 ? headerIdx + 1 : 0;

  for (let r = startRow; r < rows.length; r++) {
    const rawRow = rows[r];
    if (!rawRow || rawRow.every((c) => !String(c ?? '').trim())) continue;

    const get = (idx: number, fallbackIdx: number) =>
      String(rawRow[idx >= 0 ? idx : fallbackIdx] ?? '').trim();

    const name = colMap.name >= 0 ? get(colMap.name, 1) : get(1, 1) || get(0, 0);
    if (!name || name.toLowerCase().startsWith('total') || name.toLowerCase().includes('dica mobile')) {
      continue;
    }

    const orderVal = colMap.order >= 0 ? parseInt(get(colMap.order, 0), 10) : exercises.length + 1;
    const order = Number.isNaN(orderVal) ? exercises.length + 1 : orderVal;

    const muscleGroup = colMap.muscle >= 0 ? get(colMap.muscle, 0) : 'Geral';
    const setsRaw = colMap.sets >= 0 ? get(colMap.sets, 2) : '3';
    const setsMatch = setsRaw.match(/\d+/);
    const sets = setsMatch ? Math.min(8, Math.max(1, parseInt(setsMatch[0], 10))) : 3;

    const reps = colMap.reps >= 0 ? get(colMap.reps, 3) || '8–12' : '8–12';
    const rir = colMap.rir >= 0 ? get(colMap.rir, 4) || 'RIR 2' : 'RIR 2';
    const restSeconds = colMap.rest >= 0 ? parseRestSeconds(get(colMap.rest, 5)) : 90;
    const weightRaw = colMap.weight >= 0 ? get(colMap.weight, 6) : '';
    const weightKg = weightRaw.replace(/[^\d.,]/g, '');
    const done = colMap.done >= 0 ? parseBoolCell(rawRow[colMap.done]) : false;
    const notes = colMap.notes >= 0 ? get(colMap.notes, 8) : '';

    exercises.push({
      id: `${workoutId.toLowerCase()}-gs-${order}-${exercises.length}`,
      workoutId,
      order,
      muscleGroup: muscleGroup || 'Geral',
      name,
      sets,
      reps,
      rir,
      restSeconds,
      isBiset: name.toLowerCase().includes('bi-set') || notes.toLowerCase().includes('bi-set'),
      weightKg,
      previousWeightKg: weightKg,
      completedSets: Array(sets).fill(done),
      completed: done,
      notes,
    });
  }

  return exercises;
}

export async function pullWorkoutsFromGoogleSheet(
  accessToken: string,
  spreadsheetId: string
): Promise<{
  meta: SpreadsheetMeta;
  exercises: Exercise[];
  importedTabs: string[];
}> {
  const meta = await fetchSpreadsheetMetadata(accessToken, spreadsheetId);
  const workoutIds: WorkoutId[] = ['A', 'B', 'C'];
  const tabsToRead: Array<{ workoutId: WorkoutId; tab: SheetTabMeta }> = [];

  for (const id of workoutIds) {
    const tab = findTabByWorkoutId(meta.sheets, id);
    if (tab) tabsToRead.push({ workoutId: id, tab });
  }

  if (tabsToRead.length === 0) {
    throw new Error(
      'Nenhuma aba chamada "Treino A", "Treino B" ou "Treino C" foi encontrada nesta planilha.'
    );
  }

  const rangesQuery = tabsToRead
    .map((t) => `ranges=${encodeURIComponent(`'${t.tab.title}'!A1:K50`)}`)
    .join('&');

  const batchRes = await sheetsFetch<{
    valueRanges: Array<{ range: string; values?: unknown[][] }>;
  }>(`${SHEETS_API_BASE}/${spreadsheetId}/values:batchGet?${rangesQuery}`, accessToken);

  const importedExercises: Exercise[] = [];
  const importedTabs: string[] = [];

  tabsToRead.forEach((item, index) => {
    const values = batchRes.valueRanges?.[index]?.values ?? [];
    const parsed = parseSheetRowsToExercises(values, item.workoutId);
    if (parsed.length > 0) {
      importedExercises.push(...parsed);
      importedTabs.push(item.tab.title);
    }
  });

  if (importedExercises.length === 0) {
    throw new Error(
      'As abas foram encontradas, mas não contêm linhas de exercícios preenchidas.'
    );
  }

  return {
    meta,
    exercises: importedExercises,
    importedTabs,
  };
}

function buildWorkoutSheetRows(exercises: Exercise[], workoutId: WorkoutId): (string | number | boolean)[][] {
  const list = exercises
    .filter((e) => e.workoutId === workoutId)
    .sort((a, b) => a.order - b.order);

  const header = [
    'Ordem',
    'Grupo Muscular',
    'Exercício',
    'Séries',
    'Reps',
    'RIR',
    'Descanso (s)',
    'Carga (kg)',
    'Séries Feitas',
    'Concluído',
    'Notas',
  ];

  const rows = list.map((ex) => {
    const doneSets = ex.completedSets.filter(Boolean).length;
    return [
      ex.order,
      ex.muscleGroup,
      ex.name,
      ex.sets,
      ex.reps,
      ex.rir,
      ex.restSeconds,
      ex.weightKg ? Number(ex.weightKg.replace(',', '.')) || ex.weightKg : 0,
      `${doneSets}/${ex.sets}`,
      ex.completed,
      ex.notes || '',
    ];
  });

  return [header, ...rows];
}

function buildOverviewRows(
  exercises: Exercise[],
  spreadsheetData: ParsedSpreadsheetData
): (string | number)[][] {
  const countFor = (id: WorkoutId) => {
    const list = exercises.filter((e) => e.workoutId === id);
    const done = list.filter((e) => e.completed).length;
    const total = list.length;
    const status =
      done === 0 ? '⚪ Pendente' : done === total && total > 0 ? '✅ Concluído' : '🟡 Em Progresso';
    return { done, total, status };
  };

  const a = countFor('A');
  const b = countFor('B');
  const c = countFor('C');
  const totalDone = a.done + b.done + c.done;
  const totalAll = a.total + b.total + c.total;
  const pct = totalAll > 0 ? Math.round((totalDone / totalAll) * 100) : 0;

  return [
    [`🏋️ ${spreadsheetData.meta.title.toUpperCase()} - MOBILE`, '', '', '', ''],
    [spreadsheetData.meta.subtitle, '', '', '', ''],
    ['📊 STATUS SEMANAL DOS TREINOS', '', '', '', ''],
    ['Treino', 'Exercícios Concluídos', '', 'Status', 'Progresso'],
    ['Treino A', `Exercícios: ${a.done} de ${a.total}`, '', a.status, `${a.total > 0 ? Math.round((a.done / a.total) * 100) : 0}%`],
    ['Treino B', `Exercícios: ${b.done} de ${b.total}`, '', b.status, `${b.total > 0 ? Math.round((b.done / b.total) * 100) : 0}%`],
    ['Treino C', `Exercícios: ${c.done} de ${c.total}`, '', c.status, `${c.total > 0 ? Math.round((c.done / c.total) * 100) : 0}%`],
    ['TOTAL GERAL', `Total: ${totalDone} de ${totalAll} (${pct}%)`, '', totalDone === totalAll && totalAll > 0 ? 'Concluído' : 'Em Progresso', `${pct}%`],
    ['', '', '', '', ''],
    ['📖 GUIA DE EXECUÇÃO & CONCEITOS-CHAVE', '', '', '', ''],
    ['Conceito', '', 'Como Aplicar no Treino', '', ''],
    ...spreadsheetData.guide.map((g) => [g.concept, '', g.description, '', '']),
    ['', '', '', '', ''],
    ['📅 CRONOGRAMA SEMANAL SUGERIDO', '', '', '', ''],
    ['Dia', 'Atividade', 'Foco Muscular / Detalhes', '', ''],
    ...spreadsheetData.schedule.map((s) => [s.day, s.activity, s.details, '', '']),
    [`💡 Dica Mobile: ${spreadsheetData.meta.tip}`, '', '', '', ''],
  ];
}

export async function pushWorkoutsToGoogleSheet(
  accessToken: string,
  spreadsheetId: string,
  exercises: Exercise[],
  spreadsheetData: ParsedSpreadsheetData
): Promise<{ meta: SpreadsheetMeta; updatedTabs: string[] }> {
  let meta = await fetchSpreadsheetMetadata(accessToken, spreadsheetId);
  const workoutIds: WorkoutId[] = ['A', 'B', 'C'];

  // Create any missing Treino A / Treino B / Treino C tabs first
  const missingTabs = workoutIds.filter((id) => !findTabByWorkoutId(meta.sheets, id));
  if (missingTabs.length > 0) {
    await sheetsFetch(`${SHEETS_API_BASE}/${spreadsheetId}:batchUpdate`, accessToken, {
      method: 'POST',
      body: JSON.stringify({
        requests: missingTabs.map((id) => ({
          addSheet: { properties: { title: `Treino ${id}` } },
        })),
      }),
    });
    meta = await fetchSpreadsheetMetadata(accessToken, spreadsheetId);
  }

  const dataPayload: Array<{ range: string; values: unknown[][] }> = [];
  const updatedTabs: string[] = [];

  for (const id of workoutIds) {
    const tab = findTabByWorkoutId(meta.sheets, id);
    if (!tab) continue;
    const rows = buildWorkoutSheetRows(exercises, id);
    dataPayload.push({
      range: `'${tab.title}'!A1:K${rows.length}`,
      values: rows,
    });
    updatedTabs.push(tab.title);
  }

  const overviewTab = findOverviewTab(meta.sheets);
  if (overviewTab && !['treino a', 'treino b', 'treino c'].includes(overviewTab.title.trim().toLowerCase())) {
    const overviewRows = buildOverviewRows(exercises, spreadsheetData);
    dataPayload.push({
      range: `'${overviewTab.title}'!A1:E${overviewRows.length}`,
      values: overviewRows,
    });
    updatedTabs.unshift(overviewTab.title);
  }

  // Clear old extra rows in Treino A/B/C before writing so deleted exercises don't linger
  const clearRanges = workoutIds
    .map((id) => findTabByWorkoutId(meta.sheets, id))
    .filter((t): t is SheetTabMeta => Boolean(t))
    .map((t) => `'${t.title}'!A1:K50`);

  if (clearRanges.length > 0) {
    await sheetsFetch(`${SHEETS_API_BASE}/${spreadsheetId}/values:batchClear`, accessToken, {
      method: 'POST',
      body: JSON.stringify({ ranges: clearRanges }),
    });
  }

  await sheetsFetch(`${SHEETS_API_BASE}/${spreadsheetId}/values:batchUpdate`, accessToken, {
    method: 'POST',
    body: JSON.stringify({
      valueInputOption: 'USER_ENTERED',
      data: dataPayload,
    }),
  });

  return { meta, updatedTabs };
}

export async function createWorkoutGoogleSheet(
  accessToken: string,
  exercises: Exercise[],
  spreadsheetData: ParsedSpreadsheetData
): Promise<SpreadsheetMeta> {
  const created = await sheetsFetch<{
    spreadsheetId: string;
    spreadsheetUrl: string;
  }>(SHEETS_API_BASE, accessToken, {
    method: 'POST',
    body: JSON.stringify({
      properties: {
        title: `${spreadsheetData.meta.title} - Sincronizado`,
        locale: 'pt_BR',
      },
      sheets: [
        { properties: { title: 'Resumo', gridProperties: { frozenRowCount: 3 } } },
        { properties: { title: 'Treino A', gridProperties: { frozenRowCount: 1 } } },
        { properties: { title: 'Treino B', gridProperties: { frozenRowCount: 1 } } },
        { properties: { title: 'Treino C', gridProperties: { frozenRowCount: 1 } } },
      ],
    }),
  });

  const { meta } = await pushWorkoutsToGoogleSheet(
    accessToken,
    created.spreadsheetId,
    exercises,
    spreadsheetData
  );

  return meta;
}
