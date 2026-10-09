import React, { useState } from 'react';
import {
  TrendingUp,
  Wallet,
  AlertTriangle,
  XCircle,
  CheckCircle2,
  ArrowUpRight,
  ArrowDownLeft,
  Coins,
  BarChart3,
  Sparkles,
  PieChart,
  Lock,
} from 'lucide-react';
import { AnchorBalances, Transaction } from '../types';
import { DayClosureModal } from '../components/DayClosureModal';

interface DashboardViewProps {
  transactions: Transaction[];
  anchor: AnchorBalances;
  cumulativeMargin?: number;
  onNavigateToGuichet: () => void;
  onCloseDay?: (closureData: {
    realCash: number;
    finalMvola: number;
    finalAirtel: number;
    discrepancyReason?: string;
  }) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  transactions = [],
  anchor = { cash: 0, mvola: 0, airtel: 0, isLocked: false },
  cumulativeMargin = 0,
  onNavigateToGuichet,
  onCloseDay,
}) => {
  const [isClosureModalOpen, setIsClosureModalOpen] = useState(false);

  // Sécurisation stricte des entrées
  const safeTransactions = Array.isArray(transactions) ? transactions : [];
  const safeAnchor = anchor || { cash: 0, mvola: 0, airtel: 0, isLocked: false };

  // Calculs commissions & marge avec garde-fous
  const mvolaCommissions = safeTransactions.length > 0
    ? safeTransactions
        .filter((t) => t && t.operator === 'MVOLA')
        .reduce((sum, t) => sum + (Number(t?.commission) || 0), 0)
    : 0;

  const airtelCommissions = safeTransactions.length > 0
    ? safeTransactions
        .filter((t) => t && t.operator === 'AIRTEL')
        .reduce((sum, t) => sum + (Number(t?.commission) || 0), 0)
    : 0;

  const totalCommissionsEarned = mvolaCommissions + airtelCommissions;

  const totalHiddenFees = safeTransactions.length > 0
    ? safeTransactions.reduce((sum, t) => sum + (Number(t?.calculatedFee) || 0), 0)
    : 0;

  // INDICATEUR 1 : Marge Nette du Jour = Somme(Toutes_Les_Commissions)
  const netMarginOfDay = Number(totalCommissionsEarned) || 0;
  const displayDailyMargin = netMarginOfDay;
  const displayCumulativeMargin =
    typeof cumulativeMargin === 'number' && !isNaN(cumulativeMargin)
      ? cumulativeMargin
      : displayDailyMargin;

  const latestTx = safeTransactions.length > 0 ? safeTransactions[safeTransactions.length - 1] : null;

  // INDICATEURS 2, 3, 4 : Soldes Hypothétiques (strictement égaux à l'ancrage si 0 transaction)
  const hypotheticalCash = latestTx && typeof latestTx.cashBalanceAfter === 'number'
    ? latestTx.cashBalanceAfter
    : (Number(safeAnchor.cash) || 0);

  const hypotheticalMvola = latestTx && typeof latestTx.runningMvolaAfter === 'number'
    ? latestTx.runningMvolaAfter
    : (Number(safeAnchor.mvola) || 0);

  const hypotheticalAirtel = latestTx && typeof latestTx.runningAirtelAfter === 'number'
    ? latestTx.runningAirtelAfter
    : (Number(safeAnchor.airtel) || 0);

  const totalCapital = hypotheticalCash + hypotheticalMvola + hypotheticalAirtel;
  const anchorTotal =
    (Number(safeAnchor.cash) || 0) +
    (Number(safeAnchor.mvola) || 0) +
    (Number(safeAnchor.airtel) || 0);
  const cashRatio = totalCapital > 0 ? (hypotheticalCash / totalCapital) * 100 : 0;

  // ALERTES DE FLUX DISCRÈTES (Active uniquement si des transactions ont été enregistrées)
  const hasTransactions = safeTransactions.length > 0;
  const isCashCritical = hasTransactions && totalCapital > 0 && hypotheticalCash < 0.2 * totalCapital;
  const isMvolaExhausted = hasTransactions && hypotheticalMvola < 50000;
  const isAirtelExhausted = hasTransactions && hypotheticalAirtel < 50000;

  // Volumes
  const mvolaVolume = safeTransactions.length > 0
    ? safeTransactions
        .filter((t) => t && t.operator === 'MVOLA')
        .reduce((sum, t) => sum + (Number(t?.amount) || 0), 0)
    : 0;

  const airtelVolume = safeTransactions.length > 0
    ? safeTransactions
        .filter((t) => t && t.operator === 'AIRTEL')
        .reduce((sum, t) => sum + (Number(t?.amount) || 0), 0)
    : 0;

  const totalVolume = mvolaVolume + airtelVolume;
  const mvolaPercent = totalVolume > 0 ? Math.round((mvolaVolume / totalVolume) * 100) : 0;
  const airtelPercent = totalVolume > 0 ? 100 - mvolaPercent : 0;

  const mvolaCount = safeTransactions.filter((t) => t && t.operator === 'MVOLA').length;
  const airtelCount = safeTransactions.filter((t) => t && t.operator === 'AIRTEL').length;

  const depotCount = safeTransactions.filter((t) => t && t.typeOperation === 'dépôt').length;
  const retraitCount = safeTransactions.filter((t) => t && t.typeOperation === 'retrait').length;
  const creditCount = safeTransactions.filter((t) => t && t.typeOperation === 'crédit').length;
  const transfertCount = safeTransactions.filter((t) => t && t.typeOperation === 'transfert').length;

  // 2. DONNÉES REVENUS SUR 7 JOURS (Complètement à plat et à 0 au démarrage)
  const sevenDaysData = React.useMemo(() => {
    const days: { dateStr: string; label: string; revenue: number }[] = [];
    const today = new Date();

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const pad = (n: number) => n.toString().padStart(2, '0');
      const dateStr = `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
      const dayLabel = d.toLocaleDateString('fr-FR', { weekday: 'short' });
      const label = `${dayLabel} ${pad(d.getDate())}`;

      const dayTxs = safeTransactions.filter((t) => t && t.dateStr === dateStr);
      const dayComms = dayTxs.reduce((sum, t) => sum + (Number(t?.commission) || 0), 0);
      const revenue = dayComms;

      days.push({ dateStr, label, revenue });
    }

    return days;
  }, [safeTransactions]);

  const max7DayRevenue =
    sevenDaysData.length > 0
      ? Math.max(...sevenDaysData.map((d) => d.revenue || 0), 0)
      : 0;

  return (
    <div className="space-y-3 animate-in fade-in duration-200">
      {/* En-tête compact */}
      <div className="flex items-center justify-between border-b border-slate-900 pb-2.5">
        <div>
          <h2 className="text-sm font-bold text-white tracking-tight flex items-center gap-1.5">
            <BarChart3 className="w-4 h-4 text-amber-400" />
            <span>Tour de Contrôle Liquidités</span>
          </h2>
          <p className="text-[11px] text-slate-400">
            Gestion prédictive trésorerie physique &amp; flottes · {transactions.length} opération{transactions.length > 1 ? 's' : ''} au total.
          </p>
        </div>

        <button
          type="button"
          onClick={onNavigateToGuichet}
          className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-md transition-colors flex items-center gap-1 cursor-pointer"
        >
          <span>Guichet</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 3. ALERTES DE FLUX (OU ÉTAT VIERGE INITIAL) */}
      <div className="space-y-1.5">
        {!hasTransactions ? (
          <div className="border border-slate-800 bg-slate-900/60 text-slate-400 p-2.5 text-xs rounded-lg flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-slate-500 shrink-0" />
              <span>
                <strong>Caisse vierge (0 opération) :</strong> Enregistrez vos premières transactions au guichet pour activer le suivi en direct.
              </span>
            </div>
            <span className="text-[11px] font-mono text-slate-400 font-semibold">
              Trésorerie d&apos;ancrage de départ : {anchorTotal.toLocaleString('fr-FR')} Ar
            </span>
          </div>
        ) : (
          <>
            {isCashCritical && (
              <div className="border border-amber-900/50 bg-amber-950/30 text-amber-300 p-2 text-xs rounded-lg flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <div className="flex-1 truncate">
                  <strong>⚠️ Stock de Cash Critique :</strong> Risque de blocage sur retraits ({cashRatio.toFixed(0)}% du capital). Priorisez les Dépôts.
                </div>
              </div>
            )}

            {isMvolaExhausted && (
              <div className="border border-red-900/50 bg-red-950/30 text-red-400 p-2 text-xs rounded-lg flex items-center gap-2">
                <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                <div className="flex-1 truncate">
                  <strong>❌ Flotte MVola Épuisée :</strong> Risque de rupture ({hypotheticalMvola.toLocaleString('fr-FR')} Ar). Approvisionnez ce compte.
                </div>
              </div>
            )}

            {isAirtelExhausted && (
              <div className="border border-red-900/50 bg-red-950/30 text-red-400 p-2 text-xs rounded-lg flex items-center gap-2">
                <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                <div className="flex-1 truncate">
                  <strong>❌ Flotte Airtel Épuisée :</strong> Risque de rupture ({hypotheticalAirtel.toLocaleString('fr-FR')} Ar). Approvisionnez ce compte.
                </div>
              </div>
            )}

            {!isCashCritical && !isMvolaExhausted && !isAirtelExhausted && (
              <div className="border border-emerald-900/40 bg-emerald-950/20 text-emerald-400 p-2 text-xs rounded-lg flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  <strong>Flux Équilibrés :</strong> Cash ({cashRatio.toFixed(0)}%) et flottes opérationnels.
                </span>
              </div>
            )}
          </>
        )}
      </div>

      {/* 1. CARTE MARGE ÉLARGIE (DASH UNIQUEMENT - PLEINE LARGEUR) */}
      <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-800/80">
          {/* Bloc Gauche : Marge du Jour */}
          <div className="space-y-1 sm:pr-3">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-bold text-xs sm:text-sm text-emerald-400">
                <Sparkles className="w-3.5 h-3.5" />
                Marge du Jour
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                +{netMarginOfDay.toLocaleString('fr-FR')} Ar com.
              </span>
            </div>
            <div className="text-base font-black text-emerald-400 font-mono tracking-tight tabular-nums">
              {displayDailyMargin > 0 ? '+' : ''}
              {displayDailyMargin.toLocaleString('fr-FR')}{' '}
              <span className="text-xs font-normal text-slate-400">Ar</span>
            </div>
          </div>

          {/* Bloc Droit : Bénéfice Cumulé */}
          <div className="space-y-1 pt-2.5 sm:pt-0 sm:pl-3">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-bold text-xs sm:text-sm text-emerald-400">
                <TrendingUp className="w-3.5 h-3.5" />
                Bénéfice Cumulé
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                Cumul global
              </span>
            </div>
            <div className="text-base font-black text-emerald-400 font-mono tracking-tight tabular-nums">
              {displayCumulativeMargin > 0 ? '+' : ''}
              {displayCumulativeMargin.toLocaleString('fr-FR')}{' '}
              <span className="text-xs font-normal text-slate-400">Ar</span>
            </div>
          </div>
        </div>
      </div>

      {/* LES 3 SOLDES DE TRÉSORERIE (CASH & FLOTTES) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {/* 1. Cash */}
        <div className="py-2.5 px-3 rounded-lg bg-slate-900/80 border border-slate-800 space-y-0.5">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 font-bold text-sm text-slate-200">
              <Wallet className="w-3.5 h-3.5 text-emerald-400" />
              Cash
            </span>
            <span
              className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                isCashCritical ? 'bg-amber-500/20 text-amber-300 font-bold' : 'text-slate-400'
              }`}
            >
              {cashRatio.toFixed(0)}% capital
            </span>
          </div>

          <div className="text-xl font-black font-mono text-white tracking-tight tabular-nums">
            {hypotheticalCash.toLocaleString('fr-FR')}{' '}
            <span className="text-xs font-normal text-slate-400">Ar</span>
          </div>
        </div>

        {/* 2. MVola */}
        <div className="py-2.5 px-3 rounded-lg bg-slate-900/80 border border-slate-800 space-y-0.5">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 font-bold text-sm text-amber-400">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              MVola
            </span>
            <span
              className={`text-[10px] font-mono ${
                isMvolaExhausted ? 'text-red-400 font-bold' : 'text-slate-400'
              }`}
            >
              {isMvolaExhausted ? 'Critique < 50k' : 'OK'}
            </span>
          </div>

          <div className="text-xl font-black font-mono text-amber-300 tracking-tight tabular-nums">
            {hypotheticalMvola.toLocaleString('fr-FR')}{' '}
            <span className="text-xs font-normal text-slate-400">Ar</span>
          </div>
        </div>

        {/* 3. Airtel Money */}
        <div className="py-2.5 px-3 rounded-lg bg-slate-900/80 border border-slate-800 space-y-0.5">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 font-bold text-sm text-red-400">
              <span className="w-2 h-2 rounded-full bg-red-400" />
              Airtel Money
            </span>
            <span
              className={`text-[10px] font-mono ${
                isAirtelExhausted ? 'text-red-400 font-bold' : 'text-slate-400'
              }`}
            >
              {isAirtelExhausted ? 'Critique < 50k' : 'OK'}
            </span>
          </div>

          <div className="text-xl font-black font-mono text-red-300 tracking-tight tabular-nums">
            {hypotheticalAirtel.toLocaleString('fr-FR')}{' '}
            <span className="text-xs font-normal text-slate-400">Ar</span>
          </div>
        </div>
      </div>

      {/* 2. GRAPHIQUE EN BARRES DES REVENUS SUR 7 JOURS (COMPLÈTEMENT À PLAT À 0 AR AU DÉPART) */}
      <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-300 font-medium flex items-center gap-1.5">
            <BarChart3 className="w-3.5 h-3.5 text-emerald-400" />
            Revenus Nets (7 Derniers Jours)
          </span>
          <span className="font-mono text-emerald-400 font-bold">
            {sevenDaysData.reduce((acc, d) => acc + d.revenue, 0).toLocaleString('fr-FR')} Ar
          </span>
        </div>

        {/* Barres des 7 jours */}
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2 pt-2 items-end h-20 border-b border-slate-800/80 pb-2">
          {sevenDaysData.map((d, i) => {
            const heightPercent = max7DayRevenue > 0 ? Math.max(8, Math.round((d.revenue / max7DayRevenue) * 100)) : 4;
            return (
              <div key={i} className="flex flex-col items-center h-full justify-end gap-1 group">
                <span className="text-[9px] font-mono text-slate-500 tabular-nums">
                  {d.revenue > 0 ? `${d.revenue.toLocaleString('fr-FR')}` : '0'}
                </span>
                <div className="w-full bg-slate-800/60 rounded-t h-full flex items-end overflow-hidden">
                  <div
                    style={{ height: `${d.revenue > 0 ? heightPercent : 4}%` }}
                    className={`w-full rounded-t transition-all duration-300 ${
                      d.revenue > 0
                        ? 'bg-gradient-to-t from-emerald-600 to-emerald-400'
                        : 'bg-slate-700/30'
                    }`}
                  />
                </div>
                <span className="text-[10px] font-mono text-slate-400 capitalize truncate max-w-full">
                  {d.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* SYNTHÈSE DU CAPITAL TOTAL DISPONIBLE */}
      <div className="p-2.5 rounded-lg bg-slate-900/70 border border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <Coins className="w-3.5 h-3.5 text-amber-400" />
          <span>Capital Total Disponible (Cash + Flottes) :</span>
        </div>
        <div className="text-sm font-bold font-mono text-white tabular-nums">
          {totalCapital.toLocaleString('fr-FR')} <span className="text-[11px] font-normal text-slate-400">Ar</span>
        </div>
      </div>

      {/* RÉPARTITION DES VOLUMES TRAITÉS (MICRO-UI) */}
      <div className="p-2.5 rounded-lg bg-slate-900/70 border border-slate-800 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-300 font-medium flex items-center gap-1.5">
            <PieChart className="w-3.5 h-3.5 text-blue-400" />
            Répartition Volumes Traités
          </span>
          <span className="font-mono text-slate-400">
            Total : <strong className="text-slate-200">{totalVolume.toLocaleString('fr-FR')} Ar</strong>
          </span>
        </div>

        <div className="h-2 rounded-full bg-slate-800 overflow-hidden flex">
          <div style={{ width: `${mvolaPercent}%` }} className="h-full bg-amber-500 transition-all" />
          <div style={{ width: `${airtelPercent}%` }} className="h-full bg-red-600 transition-all" />
        </div>

        <div className="flex items-center justify-between text-[11px] font-mono">
          <div className="flex items-center gap-1.5 text-amber-300">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            <span>MVola {mvolaPercent}% ({mvolaVolume.toLocaleString('fr-FR')} Ar · {mvolaCount} op.)</span>
          </div>
          <div className="flex items-center gap-1.5 text-red-300">
            <span>Airtel {airtelPercent}% ({airtelVolume.toLocaleString('fr-FR')} Ar · {airtelCount} op.)</span>
            <span className="w-1.5 h-1.5 rounded-full bg-red-600" />
          </div>
        </div>
      </div>

      {/* DÉCOMPTE COMPACT DES OPÉRATIONS */}
      <div className="grid grid-cols-4 gap-1.5">
        <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800 text-center">
          <div className="text-xs font-bold font-mono text-blue-400">{depotCount}</div>
          <div className="text-[10px] text-slate-400">Dépôts</div>
        </div>
        <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800 text-center">
          <div className="text-xs font-bold font-mono text-amber-400">{retraitCount}</div>
          <div className="text-[10px] text-slate-400">Retraits</div>
        </div>
        <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800 text-center">
          <div className="text-xs font-bold font-mono text-purple-400">{creditCount}</div>
          <div className="text-[10px] text-slate-400">Crédits</div>
        </div>
        <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800 text-center">
          <div className="text-xs font-bold font-mono text-indigo-400">{transfertCount}</div>
          <div className="text-[10px] text-slate-400">Transferts</div>
        </div>
      </div>

      {/* 2. GRAND BOUTON D'ACTION ROUGE DE CLÔTURE DE JOURNÉE */}
      <div className="pt-2">
        <button
          type="button"
          onClick={() => setIsClosureModalOpen(true)}
          className="w-full py-3 px-4 bg-red-600 hover:bg-red-500 active:bg-red-700 text-white font-black text-xs sm:text-sm rounded-lg flex items-center justify-center gap-2 shadow-xl shadow-red-950/60 transition-all cursor-pointer border border-red-500 tracking-wider uppercase"
        >
          <Lock className="w-4 h-4" />
          <span>🔒 CLÔTURER LA JOURNÉE</span>
        </button>
      </div>

      {/* MODALE POP-UP "Audit de Clôture & Passage de Relais" */}
      {onCloseDay && (
        <DayClosureModal
          isOpen={isClosureModalOpen}
          onClose={() => setIsClosureModalOpen(false)}
          mvolaFinalBalance={hypotheticalMvola}
          airtelFinalBalance={hypotheticalAirtel}
          theoreticalCash={hypotheticalCash}
          onConfirmClosure={(data) => {
            setIsClosureModalOpen(false);
            onCloseDay({
              realCash: data.realCash,
              finalMvola: hypotheticalMvola,
              finalAirtel: hypotheticalAirtel,
              discrepancyReason: data.discrepancyReason,
            });
          }}
        />
      )}
    </div>
  );
};
