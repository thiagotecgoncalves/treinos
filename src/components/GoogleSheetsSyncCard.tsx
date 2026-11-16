import {
  ArrowDownToLine,
  ArrowUpFromLine,
  ExternalLink,
  FilePlus2,
  Link2,
  LogOut,
  Unlink,
  X,
} from 'lucide-react';
import { User } from 'firebase/auth';
import { FormEvent, useState } from 'react';
import { SpreadsheetMeta, extractSpreadsheetId } from '../utils/googleSheets';

export type PendingSyncAction =
  | { type: 'push'; spreadsheetTitle: string; exerciseCount: number }
  | { type: 'create'; exerciseCount: number };

interface GoogleSheetsSyncCardProps {
  user: User | null;
  hasToken: boolean;
  isLoggingIn: boolean;
  isSyncing: boolean;
  connectedSheet: SpreadsheetMeta | null;
  syncStatusMessage: string | null;
  syncError: string | null;
  exerciseCount: number;
  onSignIn: () => void;
  onSignOut: () => void;
  onConnectSpreadsheet: (spreadsheetId: string) => Promise<void>;
  onDisconnectSpreadsheet: () => void;
  onPullFromSheet: () => Promise<void>;
  onRequestPushToSheet: () => void;
  onRequestCreateSheet: () => void;
}

export function GoogleSheetsSyncCard({
  user,
  hasToken,
  isLoggingIn,
  isSyncing,
  connectedSheet,
  syncStatusMessage,
  syncError,
  exerciseCount,
  onSignIn,
  onSignOut,
  onConnectSpreadsheet,
  onDisconnectSpreadsheet,
  onPullFromSheet,
  onRequestPushToSheet,
  onRequestCreateSheet,
}: GoogleSheetsSyncCardProps) {
  const [urlInput, setUrlInput] = useState('');
  const [inputError, setInputError] = useState<string | null>(null);

  const handleConnectSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const id = extractSpreadsheetId(urlInput);
    if (!id) {
      setInputError('Cole o link completo do Google Sheets ou o ID da planilha.');
      return;
    }
    setInputError(null);
    await onConnectSpreadsheet(id);
    setUrlInput('');
  };

  return (
    <section className="rounded-2xl bg-white dark:bg-[#171A1F] border border-stone-200/90 dark:border-zinc-800 p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-stone-900 dark:text-zinc-100">
            Sincronização com Google Sheets
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-stone-500 dark:text-zinc-400">
            Preencha suas cargas e marcações no celular e grave diretamente na sua planilha do Google Sheets.
          </p>
        </div>

        {user && hasToken && (
          <button
            type="button"
            onClick={onSignOut}
            aria-label="Sair da conta Google"
            className="min-h-[40px] px-2.5 rounded-xl text-xs font-medium text-stone-500 hover:bg-stone-100 dark:text-zinc-400 dark:hover:bg-zinc-800 inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sair</span>
          </button>
        )}
      </div>

      {/* Step 1: Google Sign-In */}
      {!hasToken || !user ? (
        <div className="pt-1 space-y-3">
          {user && !hasToken && (
            <p className="text-xs text-stone-600 dark:text-zinc-400">
              Conecte novamente sua conta Google ({user.email}) para liberar o acesso à planilha.
            </p>
          )}
          <button
            type="button"
            onClick={onSignIn}
            disabled={isLoggingIn}
            className="w-full min-h-[44px] px-4 rounded-xl bg-white border border-stone-300 hover:bg-stone-50 active:scale-[0.99] transition-all text-[#1F1F1F] text-sm font-medium inline-flex items-center justify-center gap-3 shadow-xs disabled:opacity-60 dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-800"
          >
            <svg
              version="1.1"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 48 48"
              className="w-5 h-5 shrink-0"
              aria-hidden="true"
            >
              <path
                fill="#EA4335"
                d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
              />
              <path
                fill="#4285F4"
                d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
              />
              <path
                fill="#FBBC05"
                d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
              />
              <path
                fill="#34A853"
                d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
              />
            </svg>
            <span className="whitespace-nowrap">
              {isLoggingIn ? 'Conectando...' : 'Sign in with Google'}
            </span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="text-xs text-stone-500 dark:text-zinc-400">
            Conta conectada: <span className="font-medium text-stone-800 dark:text-zinc-200">{user.email}</span>
          </div>

          {/* Connected Sheet Details & Two-Way Actions */}
          {connectedSheet ? (
            <div className="pt-3 border-t border-stone-100 dark:border-zinc-800 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs text-stone-500 dark:text-zinc-400">Planilha vinculada</p>
                  <p className="text-sm font-semibold text-stone-900 dark:text-zinc-100 truncate">
                    {connectedSheet.title}
                  </p>
                  <p className="text-[11px] text-stone-500 dark:text-zinc-400 mt-0.5">
                    Abas: {connectedSheet.sheets.map((s) => s.title).join(' · ')}
                  </p>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <a
                    href={connectedSheet.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Abrir planilha no Google Sheets"
                    className="min-h-[40px] min-w-[40px] rounded-xl text-stone-500 hover:bg-stone-100 dark:text-zinc-400 dark:hover:bg-zinc-800 flex items-center justify-center"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                  <button
                    type="button"
                    onClick={onDisconnectSpreadsheet}
                    aria-label="Desvincular planilha"
                    className="min-h-[40px] min-w-[40px] rounded-xl text-stone-400 hover:text-red-600 hover:bg-red-50 dark:text-zinc-500 dark:hover:bg-red-950/30 flex items-center justify-center"
                  >
                    <Unlink className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={onPullFromSheet}
                  disabled={isSyncing}
                  className="min-h-[44px] px-3 rounded-xl border border-stone-200 dark:border-zinc-700 text-xs font-medium text-stone-700 dark:text-zinc-200 hover:bg-stone-50 dark:hover:bg-zinc-800 inline-flex items-center justify-center gap-1.5 disabled:opacity-60 whitespace-nowrap"
                >
                  <ArrowDownToLine className="w-4 h-4 shrink-0" />
                  <span>Ler da Planilha</span>
                </button>

                <button
                  type="button"
                  onClick={onRequestPushToSheet}
                  disabled={isSyncing}
                  className="min-h-[44px] px-3 rounded-xl bg-[#EA580C] text-white text-xs font-semibold hover:bg-[#DC4E07] active:scale-[0.99] transition-all inline-flex items-center justify-center gap-1.5 disabled:opacity-60 whitespace-nowrap"
                >
                  <ArrowUpFromLine className="w-4 h-4 shrink-0" />
                  <span>Salvar na Planilha ({exerciseCount})</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="pt-3 border-t border-stone-100 dark:border-zinc-800 space-y-3">
              <form onSubmit={handleConnectSubmit} className="space-y-2">
                <label className="block text-xs font-medium text-stone-700 dark:text-zinc-300">
                  Vincular planilha existente (link do Google Sheets)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="https://docs.google.com/spreadsheets/d/..."
                    className="flex-1 min-w-0 min-h-[44px] px-3 rounded-xl border border-stone-200 bg-stone-50 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#EA580C] dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                  />
                  <button
                    type="submit"
                    disabled={isSyncing}
                    className="min-h-[44px] px-3.5 rounded-xl bg-stone-900 text-white dark:bg-zinc-100 dark:text-zinc-900 text-xs font-semibold inline-flex items-center gap-1.5 shrink-0 whitespace-nowrap disabled:opacity-60"
                  >
                    <Link2 className="w-4 h-4" />
                    <span>Conectar</span>
                  </button>
                </div>
                {inputError && (
                  <p className="text-xs text-red-600 dark:text-red-400">{inputError}</p>
                )}
              </form>

              <div className="pt-2 border-t border-stone-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={onRequestCreateSheet}
                  disabled={isSyncing}
                  className="w-full min-h-[44px] px-3.5 rounded-xl border border-stone-200 dark:border-zinc-700 text-xs font-medium text-stone-800 dark:text-zinc-200 hover:bg-stone-50 dark:hover:bg-zinc-800 inline-flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  <FilePlus2 className="w-4 h-4 shrink-0 text-[#EA580C]" />
                  <span>Criar Nova Planilha Pronta no Google Sheets</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {syncStatusMessage && (
        <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
          {syncStatusMessage}
        </p>
      )}

      {syncError && (
        <p className="text-xs font-medium text-red-600 dark:text-red-400">{syncError}</p>
      )}
    </section>
  );
}

interface SyncConfirmDialogProps {
  action: PendingSyncAction;
  isSyncing: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function SyncConfirmDialog({
  action,
  isSyncing,
  onConfirm,
  onCancel,
}: SyncConfirmDialogProps) {
  const isPush = action.type === 'push';

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-label="Confirmar atualização no Google Sheets"
    >
      <div className="w-full md:max-w-md rounded-t-3xl md:rounded-2xl bg-white dark:bg-[#171A1F] border-t md:border border-stone-200 dark:border-zinc-800 shadow-2xl p-5 pb-safe">
        <div className="md:hidden pb-3">
          <div className="w-10 h-1.5 bg-stone-300 dark:bg-zinc-700 rounded-full mx-auto" />
        </div>

        <div className="flex items-start justify-between gap-3">
          <h3 className="text-base font-semibold text-stone-900 dark:text-zinc-100">
            {isPush
              ? 'Atualizar planilha no Google Sheets?'
              : 'Criar nova planilha no Google Sheets?'}
          </h3>
          <button
            type="button"
            onClick={onCancel}
            disabled={isSyncing}
            aria-label="Fechar confirmação"
            className="min-h-[40px] min-w-[40px] -mr-2 -mt-2 rounded-xl flex items-center justify-center text-stone-400 hover:bg-stone-100 dark:hover:bg-zinc-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="mt-2.5 text-sm leading-relaxed text-stone-600 dark:text-zinc-300">
          {isPush ? (
            <>
              Esta ação vai atualizar os dados das abas{' '}
              <span className="font-semibold text-stone-900 dark:text-zinc-100">
                Resumo, Treino A, Treino B e Treino C
              </span>{' '}
              na planilha{' '}
              <span className="font-semibold text-stone-900 dark:text-zinc-100">
                "{action.spreadsheetTitle}"
              </span>{' '}
              com todos os {action.exerciseCount} exercícios, cargas e checkboxes atuais.
            </>
          ) : (
            <>
              Uma nova planilha chamada{' '}
              <span className="font-semibold text-stone-900 dark:text-zinc-100">
                "Programa Full Body 3x - Sincronizado"
              </span>{' '}
              será criada na sua conta Google com as abas Resumo, Treino A, Treino B e Treino C ({action.exerciseCount} exercícios).
            </>
          )}
        </p>

        <div className="mt-5 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSyncing}
            className="min-h-[44px] px-4 rounded-xl border border-stone-200 dark:border-zinc-700 text-sm font-medium text-stone-700 dark:text-zinc-300 hover:bg-stone-50 dark:hover:bg-zinc-800"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSyncing}
            className="min-h-[44px] px-5 rounded-xl bg-[#EA580C] text-white text-sm font-semibold hover:bg-[#DC4E07] active:scale-95 transition-transform disabled:opacity-60"
          >
            {isSyncing ? 'Sincronizando...' : 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  );
}
