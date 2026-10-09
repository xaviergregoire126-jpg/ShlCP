import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  ShieldCheck,
  RotateCcw,
  Zap,
} from 'lucide-react';
import {
  AnchorBalances,
  ExtractedFileSmsItem,
  RawParsedSms,
  Transaction,
  NetworkInversionProof,
} from './types';
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
import { OfficialArchiveReceiptModal } from './components/OfficialArchiveReceiptModal';

const LOCAL_STORAGE_ANCHOR_KEY = 'cashpoint_anchor_v3';
const LOCAL_STORAGE_TRANSACTIONS_KEY = 'cashpoint_transactions_v3';
const LOCAL_STORAGE_ACTIVE_WINDOW_KEY = 'cashpoint_active_window_v3';
const LOCAL_STORAGE_PROOFS_KEY = 'cashpoint_network_proofs_v3';
const LOCAL_STORAGE_ARCHIVED_TXS_KEY = 'cashpoint_archived_txs_v3';

// 3. Valeurs par défaut du Point Zéro (100% vierge au premier lancement : 0 Ar)
const DEFAULT_ANCHOR: AnchorBalances = {
  cash: 0,
  mvola: 0,
  airtel: 0,
  isLocked: false,
};

export default function App() {
  // 1. Navigation par onglets locale stricte (Démarrage immédiat sur 'dash' sans vérification externe)
  const [activeWindow, setActiveWindow] = useState<ActiveNavWindow>('dash');

  // Sauvegarde fenêtre active pour persistance locale optionnelle
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
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          return {
            cash: Number(parsed.cash) || 0,
            mvola: Number(parsed.mvola) || 0,
            airtel: Number(parsed.airtel) || 0,
            isLocked: Boolean(parsed.isLocked),
          };
        }
      }
    } catch {
      // ignore
    }
    return DEFAULT_ANCHOR;
  });

  // 3. Transactions brutes (Strictement vide à la livraison)
  const [rawTransactions, setRawTransactions] = useState<RawParsedSms[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_TRANSACTIONS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
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

  // Preuves d'inversion réseau (Module Anti-Fraude)
  const [networkProofs, setNetworkProofs] = useState<NetworkInversionProof[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_PROOFS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore
    }
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_PROOFS_KEY, JSON.stringify(networkProofs));
    } catch {
      // Fallback
    }
  }, [networkProofs]);

  // Transactions archivées et scellées lors des clôtures de journées
  const [archivedTransactions, setArchivedTransactions] = useState<Transaction[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_ARCHIVED_TXS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore
    }
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_ARCHIVED_TXS_KEY, JSON.stringify(archivedTransactions));
    } catch {
      // Fallback
    }
  }, [archivedTransactions]);

  // État de la clôture de la journée active (bien initialisé par défaut à 'ouvert' / false)
  const [isDayClosed, setIsDayClosed] = useState<boolean>(false);

  // Modale de reçu d'archivage généré suite à la clôture de journée
  const [closureReceiptModal, setClosureReceiptModal] = useState<{
    isOpen: boolean;
    dateStr: string;
    transactions: Transaction[];
    proofs: NetworkInversionProof[];
    discrepancyReason?: string;
  } | null>(null);

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

  // Recalcul en cascade de toutes les transactions à chaque changement avec garde-fous
  const transactions: Transaction[] = React.useMemo(() => {
    if (!Array.isArray(rawTransactions) || rawTransactions.length === 0) {
      return [];
    }
    try {
      return recalculateAllTransactions(rawTransactions, anchor || DEFAULT_ANCHOR) || [];
    } catch {
      return [];
    }
  }, [rawTransactions, anchor]);

  const safeTransactions = Array.isArray(transactions) ? transactions : [];
  const safeArchived = Array.isArray(archivedTransactions) ? archivedTransactions : [];

  // Détection des écarts de solde MVola & Airtel Money
  const mvolaMismatches = safeTransactions.filter(
    (t) => t && t.operator === 'MVOLA' && t.balanceMismatch
  );
  const airtelMismatches = safeTransactions.filter(
    (t) => t && t.operator === 'AIRTEL' && t.balanceMismatch
  );

  // Analyse de l'équilibre des flux pour badge d'alerte Dash
  const latestTx = safeTransactions.length > 0 ? safeTransactions[safeTransactions.length - 1] : null;
  const currentCash = latestTx && typeof latestTx.cashBalanceAfter === 'number'
    ? latestTx.cashBalanceAfter
    : (Number(anchor?.cash) || 0);
  const currentMvola = latestTx && typeof latestTx.runningMvolaAfter === 'number'
    ? latestTx.runningMvolaAfter
    : (Number(anchor?.mvola) || 0);
  const currentAirtel = latestTx && typeof latestTx.runningAirtelAfter === 'number'
    ? latestTx.runningAirtelAfter
    : (Number(anchor?.airtel) || 0);
  const totalCapital = currentCash + currentMvola + currentAirtel;

  const isCashCritical = totalCapital > 0 && currentCash < 0.2 * totalCapital;
  const isMvolaExhausted = currentMvola < 50000;
  const isAirtelExhausted = currentAirtel < 50000;
  const hasFlowAlert = isCashCritical || isMvolaExhausted || isAirtelExhausted;

  // Calcul permanent de la marge journalière et du bénéfice cumulé avec garde-fous stricts
  const dailyMargin = safeTransactions.length > 0
    ? safeTransactions.reduce((sum, t) => sum + (Number(t?.commission) || 0), 0)
    : 0;
  const archivedMargin = safeArchived.length > 0
    ? safeArchived.reduce((sum, t) => sum + (Number(t?.commission) || 0), 0)
    : 0;
  const cumulativeMargin = archivedMargin + dailyMargin;

  const formattedMargin = `${dailyMargin >= 0 ? '+' : ''}${(Number(dailyMargin) || 0).toLocaleString('fr-FR')} Ar`;
  const formattedCash = `${(Number(currentCash) || 0).toLocaleString('fr-FR')} Ar`;

  // Toutes les transactions (historique archivé + journée active)
  const allTransactions = React.useMemo(() => {
    return [...safeArchived, ...safeTransactions];
  }, [safeArchived, safeTransactions]);

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

  // Enregistrement d'une justification d'inversion réseau (Module Anti-Fraude)
  const handleSaveNetworkProof = (proof: {
    reference?: string;
    smsProof1: string;
    smsProof2: string;
    dateStr: string;
  }) => {
    const newProof: NetworkInversionProof = {
      id: `proof-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      dateStr: proof.dateStr,
      timestamp: Date.now(),
      reference: proof.reference,
      smsProof1: proof.smsProof1,
      smsProof2: proof.smsProof2,
      operator: 'MVOLA',
    };
    setNetworkProofs((prev) => [...prev, newProof]);
    setIsMvolaBannerDismissed(true);
  };

  // 4. EFFET DE LA VALIDATION DE LA CLÔTURE DE JOURNÉE
  // - Gèle définitivement toutes les transactions de la journée active (plus aucun SMS sans date ne peut s'y incruster).
  // - Génère le rapport d'archivage (PDF) en incluant la raison de l'écart si elle existe.
  // - Bascule automatiquement les valeurs (Soldes Flottes finaux et Cash Réel saisi) pour devenir le nouveau "Point Zéro" (solde d'ouverture) de la journée suivante.
  const handleCloseDay = ({
    realCash,
    finalMvola,
    finalAirtel,
    discrepancyReason,
  }: {
    realCash: number;
    finalMvola: number;
    finalAirtel: number;
    discrepancyReason?: string;
  }) => {
    const currentActiveTxs = [...transactions];
    const dateStr =
      currentActiveTxs.length > 0
        ? currentActiveTxs[currentActiveTxs.length - 1].dateStr
        : (() => {
            const now = new Date();
            const pad = (n: number) => n.toString().padStart(2, '0');
            return `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}`;
          })();

    // 1. Gèle définitivement toutes les transactions de la journée active
    setArchivedTransactions((prev) => [...prev, ...currentActiveTxs]);

    // 2. Bascule automatiquement les valeurs (Soldes Flottes finaux et Cash Réel saisi)
    // pour devenir le nouveau "Point Zéro" (solde d'ouverture) de la journée suivante
    const newAnchor: AnchorBalances = {
      cash: realCash,
      mvola: finalMvola,
      airtel: finalAirtel,
      isLocked: true,
    };
    setAnchor(newAnchor);

    // Vider les transactions brutes de la journée active afin de sceller la session
    setRawTransactions([]);
    setResetSignal((prev) => prev + 1);

    // 3. Génère le rapport d'archivage (PDF) en incluant la raison de l'écart si elle existe
    setClosureReceiptModal({
      isOpen: true,
      dateStr,
      transactions: currentActiveTxs,
      proofs: networkProofs.filter((p) => p.dateStr === dateStr),
      discrepancyReason,
    });
  };

  // Suppression d'une transaction unique
  const handleDeleteTransaction = (id: string) => {
    setRawTransactions((prev) => prev.filter((t) => t.id !== id));
    setArchivedTransactions((prev) => prev.filter((t) => t.id !== id));
  };

  // Suppression de toutes les transactions d'une journée (Section 15.A)
  const handleDeleteDay = (dateStr: string) => {
    if (window.confirm(`Supprimer l'intégralité des transactions de la journée du ${dateStr} ?`)) {
      setRawTransactions((prev) => prev.filter((t) => t.dateStr !== dateStr));
      setArchivedTransactions((prev) => prev.filter((t) => t.dateStr !== dateStr));
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
          {/* À gauche : Logo et nom du CashPoint, avec espèce disponible juste en dessous */}
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-gradient-to-br from-amber-500 to-amber-700 rounded-md text-slate-950 font-black text-xs flex items-center justify-center tracking-wider select-none shrink-0">
              CP
            </div>
            <div>
              <h1 className="text-xs sm:text-sm font-bold tracking-tight text-white flex items-center gap-1.5">
                <span>Cashpoint Mada</span>
                <span className="hidden sm:inline-block px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                  MVola &amp; Airtel
                </span>
              </h1>
              {/* Espèce disponible subtile mais visible */}
              <div className="text-[11px] text-slate-400 font-mono">
                Cash : {formattedCash}
              </div>
            </div>
          </div>

          {/* À droite : Marge journalière permanente bien visible + actions */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            <div className="text-emerald-400 font-bold font-mono text-xs bg-emerald-950/40 border border-emerald-500/30 px-2.5 py-1 rounded-md shadow-xs">
              Marge : {formattedMargin}
            </div>
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
            cumulativeMargin={cumulativeMargin}
            onNavigateToGuichet={() => setActiveWindow('guichet')}
            onCloseDay={handleCloseDay}
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
            onNavigateToSettings={() => setActiveWindow('settings')}
            resetSignal={resetSignal}
            isMvolaBannerDismissed={isMvolaBannerDismissed}
            onDismissMvolaBanner={() => setIsMvolaBannerDismissed(true)}
            isAirtelBannerDismissed={isAirtelBannerDismissed}
            onDismissAirtelBanner={() => setIsAirtelBannerDismissed(true)}
            onSaveNetworkProof={handleSaveNetworkProof}
          />
        )}

        {activeWindow === 'history' && (
          <HistoryView
            transactions={allTransactions}
            networkProofs={networkProofs}
            onDeleteTransaction={handleDeleteTransaction}
            onDeleteDay={handleDeleteDay}
          />
        )}

        {activeWindow === 'settings' && (
          <SettingsView
            anchor={anchor}
            onUpdateAnchor={setAnchor}
            onResetSession={handleResetSession}
            transactionCount={transactions.length}
          />
        )}
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

      {/* MODALE DU REÇU D'ARCHIVAGE OFFICIEL (GÉNÉRÉ LORS DE LA CLÔTURE) */}
      {closureReceiptModal && closureReceiptModal.isOpen && (
        <OfficialArchiveReceiptModal
          dateStr={closureReceiptModal.dateStr}
          transactions={closureReceiptModal.transactions}
          proofs={closureReceiptModal.proofs}
          discrepancyReason={closureReceiptModal.discrepancyReason}
          onClose={() => setClosureReceiptModal(null)}
        />
      )}
    </div>
  );
}
