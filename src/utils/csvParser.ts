import {
  Exercise,
  GuideConcept,
  ParsedSpreadsheetData,
  ScheduleDay,
  WorkoutId,
  WorkoutSummaryMeta,
} from '../types/workout';

function stripLeadingEmoji(text: string): string {
  return text
    .replace(/^[\p{Emoji_Presentation}\p{Extended_Pictographic}\uFE0F\u200D]+\s*/gu, '')
    .trim();
}

export function parseCsvRows(csvText: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let inQuotes = false;

  const cleanText = csvText.replace(/^\uFEFF/, '');

  for (let i = 0; i < cleanText.length; i++) {
    const char = cleanText[i];
    const nextChar = cleanText[i + 1];

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        currentCell += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        currentCell += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        currentRow.push(currentCell.trim());
        currentCell = '';
      } else if (char === '\r' && nextChar === '\n') {
        currentRow.push(currentCell.trim());
        rows.push(currentRow);
        currentRow = [];
        currentCell = '';
        i++;
      } else if (char === '\n' || char === '\r') {
        currentRow.push(currentCell.trim());
        rows.push(currentRow);
        currentRow = [];
        currentCell = '';
      } else {
        currentCell += char;
      }
    }
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    rows.push(currentRow);
  }

  return rows;
}

const SHORT_DAY_MAP: Record<string, string> = {
  'segunda-feira': 'Seg',
  'terça-feira': 'Ter',
  'quarta-feira': 'Qua',
  'quinta-feira': 'Qui',
  'sexta-feira': 'Sex',
  'sábado': 'Sáb',
  'domingo': 'Dom',
};

export function parseMainSpreadsheetCsv(csvText: string): ParsedSpreadsheetData {
  const rows = parseCsvRows(csvText);

  let title = 'Programa Full Body 3x';
  let subtitle = 'Rotina de Força & Hipertrofia | 3 Sessões Semanais (Seg / Qua / Sex)';
  let tip =
    "Toque nas abas inferiores ('Treino A', 'Treino B', 'Treino C') para registrar cargas e marcar checkboxes.";

  const summaries: WorkoutSummaryMeta[] = [];
  const guide: GuideConcept[] = [];
  const schedule: ScheduleDay[] = [];

  type Section = 'none' | 'status' | 'guide' | 'schedule';
  let section: Section = 'none';

  for (const row of rows) {
    const first = row[0] ?? '';
    const cleanFirst = stripLeadingEmoji(first);
    const nonEmpty = row.map((c) => c.trim()).filter(Boolean);

    if (nonEmpty.length === 0) continue;

    if (cleanFirst.toUpperCase().includes('PROGRAMA FULL BODY')) {
      title = cleanFirst.replace(/\s*-\s*MOBILE$/i, '').trim();
      continue;
    }

    if (cleanFirst.startsWith('Rotina de Força')) {
      subtitle = cleanFirst;
      continue;
    }

    if (cleanFirst.toUpperCase().includes('STATUS SEMANAL')) {
      section = 'status';
      continue;
    }

    if (cleanFirst.toUpperCase().includes('GUIA DE EXECUÇÃO')) {
      section = 'guide';
      continue;
    }

    if (cleanFirst.toUpperCase().includes('CRONOGRAMA SEMANAL')) {
      section = 'schedule';
      continue;
    }

    if (cleanFirst.startsWith('Dica Mobile:')) {
      tip = cleanFirst.replace(/^Dica Mobile:\s*/i, '').trim();
      section = 'none';
      continue;
    }

    if (section === 'status') {
      if (cleanFirst === 'Treino' || cleanFirst.startsWith('TOTAL')) continue;
      const match = cleanFirst.match(/^Treino\s+([ABC])$/i);
      if (match) {
        const id = match[1].toUpperCase() as WorkoutId;
        const countCell = row[1] ?? '';
        const countMatch = countCell.match(/de\s+(\d+)/i);
        summaries.push({
          id,
          label: cleanFirst,
          targetCount: countMatch ? parseInt(countMatch[1], 10) : 7,
        });
      }
    } else if (section === 'guide') {
      if (cleanFirst === 'Conceito') continue;
      const description = row.slice(1).find((c) => c.trim().length > 0) ?? '';
      if (cleanFirst && description) {
        guide.push({
          concept: cleanFirst,
          description: description.trim(),
        });
      }
    } else if (section === 'schedule') {
      if (cleanFirst === 'Dia') continue;
      const activity = (row[1] ?? '').trim();
      const details = (row[2] ?? '').trim();
      if (cleanFirst && activity) {
        const workoutMatch = activity.match(/^Treino\s+([ABC])$/i);
        const lowerDay = cleanFirst.toLowerCase();
        schedule.push({
          day: cleanFirst,
          shortDay: SHORT_DAY_MAP[lowerDay] ?? cleanFirst.slice(0, 3),
          activity,
          details,
          workoutId: workoutMatch ? (workoutMatch[1].toUpperCase() as WorkoutId) : undefined,
        });
      }
    }
  }

  return {
    meta: { title, subtitle, tip },
    summaries:
      summaries.length === 3
        ? summaries
        : [
            { id: 'A', label: 'Treino A', targetCount: 7 },
            { id: 'B', label: 'Treino B', targetCount: 7 },
            { id: 'C', label: 'Treino C', targetCount: 7 },
          ],
    guide,
    schedule,
  };
}

export function parseWorkoutTabCsv(csvText: string, workoutId: WorkoutId): Exercise[] {
  const rows = parseCsvRows(csvText);
  const exercises: Exercise[] = [];

  for (const row of rows) {
    const joined = row.join(' ').trim();
    if (!joined) continue;

    // Skip obvious header rows
    const col0 = (row[0] ?? '').toLowerCase();
    const col1 = (row[1] ?? '').toLowerCase();
    if (
      col0.includes('exerc') ||
      col1.includes('exerc') ||
      col0.includes('treino ') ||
      col0.includes('ordem') ||
      col0 === '#'
    ) {
      continue;
    }

    // Flexible column mapping for exported workout tabs
    // Support formats like: [Ordem?, Exercício, Séries, Reps, Carga, RIR, Descanso, Notas?]
    // or [Grupo, Exercício, Séries, Reps, RIR, Descanso, Carga]
    const cleanCols = row.map((c) => stripLeadingEmoji(c));
    let order = exercises.length + 1;
    let startIdx = 0;

    if (/^\d+$/.test(cleanCols[0])) {
      order = parseInt(cleanCols[0], 10);
      startIdx = 1;
    }

    const nameOrGroup = cleanCols[startIdx] ?? '';
    const secondCol = cleanCols[startIdx + 1] ?? '';
    if (!nameOrGroup) continue;

    // Detect if col1 is muscle group and col2 is exercise name, or col1 is exercise name
    const hasSeparateGroup =
      secondCol.length > 0 && !/^\d+$/.test(secondCol) && !/^\d+\s*x/i.test(secondCol);

    const muscleGroup = hasSeparateGroup ? nameOrGroup : 'Geral';
    const name = hasSeparateGroup ? secondCol : nameOrGroup;
    const offset = hasSeparateGroup ? startIdx + 2 : startIdx + 1;

    const rawSets = cleanCols[offset] ?? '3';
    const setsMatch = rawSets.match(/\d+/);
    const sets = setsMatch ? Math.min(8, Math.max(1, parseInt(setsMatch[0], 10))) : 3;

    const reps = cleanCols[offset + 1] || '8–12';
    const rir = cleanCols[offset + 2] || 'RIR 2';
    const restText = cleanCols[offset + 3] || '90s';
    const restNumMatch = restText.match(/\d+/);
    let restSeconds = 90;
    if (restNumMatch) {
      const val = parseInt(restNumMatch[0], 10);
      restSeconds = restText.toLowerCase().includes('min') || val <= 5 ? val * 60 : val;
    }

    const weightKg = (cleanCols[offset + 4] ?? '').replace(/[^\d.,]/g, '');

    exercises.push({
      id: `${workoutId.toLowerCase()}-csv-${Date.now()}-${exercises.length}`,
      workoutId,
      order,
      muscleGroup,
      name,
      sets,
      reps,
      rir,
      restSeconds,
      weightKg,
      previousWeightKg: weightKg,
      completedSets: Array(sets).fill(false),
      completed: false,
      notes: cleanCols[offset + 5] ?? '',
    });
  }

  return exercises;
}

export function exportExercisesToCsv(exercises: Exercise[]): string {
  const header = ['Treino', 'Ordem', 'Grupo Muscular', 'Exercício', 'Séries', 'Reps', 'RIR', 'Descanso (s)', 'Carga (kg)', 'Concluído', 'Notas'];
  const lines = [
    header.join(','),
    ...exercises.map((ex) =>
      [
        `Treino ${ex.workoutId}`,
        ex.order,
        `"${ex.muscleGroup.replace(/"/g, '""')}"`,
        `"${ex.name.replace(/"/g, '""')}"`,
        ex.sets,
        `"${ex.reps.replace(/"/g, '""')}"`,
        `"${ex.rir.replace(/"/g, '""')}"`,
        ex.restSeconds,
        ex.weightKg || '0',
        ex.completed ? 'Sim' : 'Não',
        `"${ex.notes.replace(/"/g, '""')}"`,
      ].join(',')
    ),
  ];
  return lines.join('\n');
}
