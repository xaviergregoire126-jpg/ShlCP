import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  ShieldCheck,
  RotateCcw,
  Zap,
} from 'lucide-react';
import { AnchorBalances, ExtractedFileSmsItem, RawParsedSms, Transaction } from './types';
import { parseSingleSms } from './engine/parser';
import {
  recalculateAllTransactions,
  processBatchAudit,
  insertMvolaTransactionByReference,
} from './engine/accounting';
import { SAMPLE_EXCLUSIVE_CSV } from './engine/sampleData';
import { parseExclusiveCsv } from './engine/fileExtractor';
import { BottomNavBar, ActiveNavWindow } from './components/BottomNavBar';
import { DashboardView } from './views/DashboardView';
import { GuichetView } from './views/GuichetView';
import { HistoryView } from './views/HistoryView';
import { SettingsView } from './views/SettingsView';
import { UnrecognizedModal } from './components/UnrecognizedModal';
import { PWAInstallButton } from './components/PWAInstallButton';

const LOCAL_STORAGE_ANCHOR_KEY = 'cashpoint_anchor_v3';
const LOCAL_STORAGE_TRANSACTIONS_KEY = 'cashpoint_transactions_v3';
const LOCAL_STORAGE_ACTIVE_WINDOW_KEY = 'cashpoint_active_window_v3';

// 3. Valeurs par défaut du Point Zéro (100% vierge au premier lancement : 0 Ar)
const DEFAULT_ANCHOR: AnchorBalances = {
  cash: 0,
  mvola: 0,
  airtel: 0,
  isLocked: false,
};

export default function App() {
  // 1. Navigation Multi-Fenêtres (Bottom Navigation Bar)
  const [activeWindow, setActiveWindow] = useState<ActiveNavWindow>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_ACTIVE_WINDOW_KEY);
      if (saved && ['dash', 'guichet', 'history', 'settings'].includes(saved)) {
        return saved as ActiveNavWindow;
      }
    } catch {
      // ignore
    }
    return 'guichet'; // Guichet par défaut pour les opérations directes
  });

  // Sauvegarde fenêtre active
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_ACTIVE_WINDOW_KEY, activeWindow);
    } catch {
      // ignore
    }
  }, [activeWindow]);

  // 2. État du Point Zéro (Ancrage)
  const [anchor, setAnchor] = useState<AnchorBalances>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_ANCHOR_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return DEFAULT_ANCHOR;
  });

  // 3. Transactions brutes (Strictement vide à la livraison)
  const [rawTransactions, setRawTransactions] = useState<RawParsedSms[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_TRANSACTIONS_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return [];
  });

  // Sauvegarde automatique localStorage
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_ANCHOR_KEY, JSON.stringify(anchor));
    } catch {
      // Fallback
    }
  }, [anchor]);

  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_TRANSACTIONS_KEY, JSON.stringify(rawTransactions));
    } catch {
      // Fallback
    }
  }, [rawTransactions]);

  // Signal de réinitialisation pour vider les champs de saisie (unitaire et groupé)
  const [resetSignal, setResetSignal] = useState(0);

  // État de masquage manuel des bandeaux d'alerte MVola et Airtel Money
  const [isMvolaBannerDismissed, setIsMvolaBannerDismissed] = useState(false);
  const [isAirtelBannerDismissed, setIsAirtelBannerDismissed] = useState(false);

  // État de la modale de sécurité "SMS non reconnu"
  const [unrecognizedModal, setUnrecognizedModal] = useState<{
    isOpen: boolean;
    rawText: string;
  }>({
    isOpen: false,
    rawText: '',
  });

  // Recalcul en cascade de toutes les transactions à chaque changement
  const transactions: Transaction[] = React.useMemo(() => {
    return recalculateAllTransactions(rawTransactions, anchor);
  }, [rawTransactions, anchor]);

  // Détection des écarts de solde MVola & Airtel Money
  const mvolaMismatches = transactions.filter(
    (t) => t.operator === 'MVOLA' && t.balanceMismatch
  );
  const airtelMismatches = transactions.filter(
    (t) => t.operator === 'AIRTEL' && t.balanceMismatch
  );

  // Analyse de l'équilibre des flux pour badge d'alerte Dash
  const latestTx = transactions.length > 0 ? transactions[transactions.length - 1] : null;
  const currentCash = latestTx ? latestTx.cashBalanceAfter : anchor.cash;
  const currentMvola = latestTx ? latestTx.runningMvolaAfter : anchor.mvola;
  const currentAirtel = latestTx ? latestTx.runningAirtelAfter : anchor.airtel;
  const totalCapital = currentCash + currentMvola + currentAirtel;

  const isCashCritical = totalCapital > 0 && currentCash < 0.2 * totalCapital;
  const isMvolaExhausted = currentMvola < 50000;
  const isAirtelExhausted = currentAirtel < 50000;
  const hasFlowAlert = isCashCritical || isMvolaExhausted || isAirtelExhausted;

  // -------------------------------------------------------------
  // HANDLERS
  // -------------------------------------------------------------

  // Validation d'un SMS unique (Guichet : Au fil de l'eau)
  const handleValidateSingleSms = (smsText: string) => {
    setIsMvolaBannerDismissed(false);
    setIsAirtelBannerDismissed(false);
    const parseRes = parseSingleSms(smsText);

    if (!parseRes.success || !parseRes.data) {
      return { success: false, message: 'Format non reconnu' };
    }

    const raw = parseRes.data;

    // Détection anti-doublon par Ref / ID
    const exists = rawTransactions.some((t) => t.id === raw.id);
    if (exists) {
      return {
        success: true,
        isDuplicate: true,
        message: `Doublon ignoré : La transaction ${raw.id} est déjà enregistrée.`,
      };
    }

    // 19. ALGORITHME D'INTERCALATION DYNAMIQUE (INDEXATION PAR REF) POUR LES SMS MVOLA SANS HEURE
    const { updatedList, wasIntercalated, predecessorRef, successorRef } =
      insertMvolaTransactionByReference(raw, rawTransactions);
    setRawTransactions(updatedList);

    const message = wasIntercalated
      ? `Transaction MVola (Ref: ${raw.reference}) réintercalée chronologiquement entre Ref ${predecessorRef || 'début'} et Ref ${successorRef || 'fin'}. Recalcul rétroactif des soldes effectué.`
      : `Transaction ${raw.id} (${raw.operator}) validée et inscrite au registre.`;

    return {
      success: true,
      message,
    };
  };

  // Traitement d'un bloc de SMS ou fichier PDF/CSV (Guichet : Importation groupée)
  const handleProcessBatch = (bulkInput: string | ExtractedFileSmsItem[]) => {
    setIsMvolaBannerDismissed(false);
    setIsAirtelBannerDismissed(false);
    const { updatedRawTransactions, summary } = processBatchAudit(
      bulkInput,
      rawTransactions,
      anchor
    );
    setRawTransactions(updatedRawTransactions);
    return summary;
  };

  // Suppression d'une transaction unique
  const handleDeleteTransaction = (id: string) => {
    setRawTransactions((prev) => prev.filter((t) => t.id !== id));
  };

  // Suppression de toutes les transactions d'une journée (Section 15.A)
  const handleDeleteDay = (dateStr: string) => {
    if (window.confirm(`Supprimer l'intégralité des transactions de la journée du ${dateStr} ?`)) {
      setRawTransactions((prev) => prev.filter((t) => t.dateStr !== dateStr));
    }
  };

  // 8. COMPORTEMENT DU BOUTON RÉINITIALISER (UI STATE RESET)
  const handleResetSession = () => {
    if (
      window.confirm(
        'Réinitialiser la session ? Le registre comptable et les zones de saisie seront vidés. Les soldes du Point Zéro restent intacts.'
      )
    ) {
      setRawTransactions([]);
      setResetSignal((prev) => prev + 1);
      setUnrecognizedModal({ isOpen: false, rawText: '' });
      setIsMvolaBannerDismissed(true);
      setIsAirtelBannerDismissed(true);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950">
      {/* Top Bar Fixe (Titre wordmark - indicateurs - statut) */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 py-2 flex items-center justify-between gap-3">
          {/* Zone 1: Single text wordmark */}
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-gradient-to-br from-amber-500 to-amber-700 rounded-md text-slate-950 font-black text-xs flex items-center justify-center tracking-wider select-none">
              CP
            </div>
            <div>
              <h1 className="text-xs sm:text-sm font-bold tracking-tight text-white flex items-center gap-1.5">
                <span>Cashpoint Mada</span>
                <span className="hidden sm:inline-block px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                  MVola &amp; Airtel
                </span>
              </h1>
              <div className="text-[10px] text-slate-400 font-mono">
                {activeWindow === 'dash' && '1. Vue Analytique · Bénéfice & Volumes'}
                {activeWindow === 'guichet' && '2. Guichet Opérationnel · Saisie & Point Zéro'}
                {activeWindow === 'history' && '3. Grand Registre Comptable Historique'}
                {activeWindow === 'settings' && '4. Configuration des Grilles & Frais'}
              </div>
            </div>
          </div>

          {/* Zone 2: Navigation / Indicateurs discrets */}
          <nav className="hidden md:flex items-center gap-4 text-xs text-slate-400">
            <span className="flex items-center gap-1 text-slate-300 text-[11px]">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              Anti-Doublons
            </span>
            <span aria-hidden="true" className="text-slate-700">·</span>
            <span className="flex items-center gap-1 text-slate-300 text-[11px]">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Frais Cachés Détectés
            </span>
          </nav>

          {/* Zone 3: Actions rapides */}
          <div className="flex items-center gap-1.5">
            <PWAInstallButton />
            {rawTransactions.length > 0 && (
              <button
                type="button"
                onClick={handleResetSession}
                className="px-2 py-1 text-slate-400 hover:text-red-300 bg-slate-800/80 hover:bg-red-950/40 border border-slate-750 rounded-md transition-colors flex items-center gap-1 cursor-pointer text-xs"
                title="Vider la session (Point Zéro préservé)"
              >
                <RotateCcw className="w-3 h-3" />
                <span className="hidden sm:inline">Réinitialiser</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ZONE CENTRALE (DYNAMIQUE SELON LA FENÊTRE ACTIVE) */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-3 sm:px-4 py-3 pb-20">
        {activeWindow === 'dash' && (
          <DashboardView
            transactions={transactions}
            anchor={anchor}
            onNavigateToGuichet={() => setActiveWindow('guichet')}
          />
        )}

        {activeWindow === 'guichet' && (
          <GuichetView
            anchor={anchor}
            onUpdateAnchor={setAnchor}
            transactions={transactions}
            rawTransactions={rawTransactions}
            onValidateSingleSms={handleValidateSingleSms}
            onProcessBatch={handleProcessBatch}
            onDeleteTransaction={handleDeleteTransaction}
            onOpenUnrecognizedModal={(rejectedText) =>
              setUnrecognizedModal({ isOpen: true, rawText: rejectedText })
            }
            onResetSession={handleResetSession}
            onNavigateToHistory={() => setActiveWindow('history')}
            resetSignal={resetSignal}
            isMvolaBannerDismissed={isMvolaBannerDismissed}
            onDismissMvolaBanner={() => setIsMvolaBannerDismissed(true)}
            isAirtelBannerDismissed={isAirtelBannerDismissed}
            onDismissAirtelBanner={() => setIsAirtelBannerDismissed(true)}
          />
        )}

        {activeWindow === 'history' && (
          <HistoryView
            transactions={transactions}
            onDeleteTransaction={handleDeleteTransaction}
            onDeleteDay={handleDeleteDay}
          />
        )}

        {activeWindow === 'settings' && <SettingsView />}
      </main>

      {/* BARRE DE NAVIGATION FIXE BAS D'ÉCRAN (BOTTOM NAVIGATION BAR) */}
      <BottomNavBar
        activeWindow={activeWindow}
        onSelectWindow={setActiveWindow}
        transactionsCount={transactions.length}
        hasDiscrepancies={mvolaMismatches.length > 0 || airtelMismatches.length > 0}
        hasFlowAlert={hasFlowAlert}
      />

      {/* MODALE DE SÉCURITÉ : SMS NON RECONNU (SECTION 5) */}
      <UnrecognizedModal
        isOpen={unrecognizedModal.isOpen}
        rawText={unrecognizedModal.rawText}
        onClose={() => setUnrecognizedModal({ isOpen: false, rawText: '' })}
      />
    </div>
  );
}
