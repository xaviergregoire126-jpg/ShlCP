import React, { useState, useMemo, useRef } from 'react';
import {
  History,
  Search,
  Filter,
  Printer,
  Trash2,
  MoreVertical,
  Calendar,
  AlertTriangle,
  X,
  ChevronRight,
} from 'lucide-react';
import { Transaction, NetworkInversionProof } from '../types';
import { DayDetailView } from './DayDetailView';
import { OfficialArchiveReceiptModal } from '../components/OfficialArchiveReceiptModal';

interface HistoryViewProps {
  transactions: Transaction[];
  networkProofs?: NetworkInversionProof[];
  onDeleteTransaction: (id: string) => void;
  onDeleteDay?: (dateStr: string) => void;
}

type FilterMode = 'all' | 'mvola' | 'airtel' | 'transfert' | 'echange';

interface DayGroup {
  dateStr: string;
  formattedDateLabel: string;
  isToday: boolean;
  transactions: Transaction[];
  totalOperations: number;
  totalCommissions: number;
  totalHiddenFees: number;
  netMargin: number;
  totalVolume: number;
  airtelCount: number;
  mvolaCount: number;
  latestMvolaBalance?: number;
  latestAirtelBalance?: number;
  startTime?: string;
  endTime?: string;
}

function parseDayMetadata(dateStr: string): { label: string; isToday: boolean } {
  if (!dateStr) return { label: 'Date inconnue', isToday: false };

  const parts = dateStr.split(/[\/\-]/);
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    let year = parseInt(parts[2], 10);
    if (year < 100) year += 2000;

    const dateObj = new Date(year, month - 1, day);
    const now = new Date();
    const isToday =
      now.getDate() === day &&
      now.getMonth() === month - 1 &&
      now.getFullYear() === year;

    const weekday = dateObj.toLocaleDateString('fr-FR', { weekday: 'short' });
    const pad = (n: number) => n.toString().padStart(2, '0');
    const label = `${weekday}. ${pad(day)}/${pad(month)}`;

    return { label, isToday };
  }

  return { label: dateStr, isToday: false };
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  transactions,
  networkProofs = [],
  onDeleteTransaction,
  onDeleteDay,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMode, setFilterMode] = useState<FilterMode>('all');

  // Sélection d'une journée (Section 16)
  const [selectedDayDateStr, setSelectedDayDateStr] = useState<string | null>(null);

  // Menu contextuel ouvert
  const [openMenuDay, setOpenMenuDay] = useState<string | null>(null);

  // Boîte de dialogue de confirmation de suppression
  const [deleteConfirmDay, setDeleteConfirmDay] = useState<DayGroup | null>(null);

  // Modal d'impression thermique
  const [printThermalDay, setPrintThermalDay] = useState<DayGroup | null>(null);

  // Filtrage combiné
  const filteredTransactions = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return transactions.filter((tx) => {
      if (filterMode === 'mvola' && tx.operator !== 'MVOLA') return false;
      if (filterMode === 'airtel' && tx.operator !== 'AIRTEL') return false;
      if (filterMode === 'transfert' && tx.typeOperation !== 'transfert') return false;
      if (filterMode === 'echange' && tx.typeOperation !== 'echange') return false;

      if (!term) return true;

      const numMatch = tx.numero.toLowerCase().includes(term);
      const refMatch = tx.reference.toLowerCase().includes(term);
      const idMatch = tx.id.toLowerCase().includes(term);
      const rawMatch = tx.rawText.toLowerCase().includes(term);

      return numMatch || refMatch || idMatch || rawMatch;
    });
  }, [transactions, searchTerm, filterMode]);

  // Regroupement par journées
  const dayGroups = useMemo<DayGroup[]>(() => {
    const map = new Map<string, Transaction[]>();

    for (const tx of filteredTransactions) {
      const key = tx.dateStr || 'Sans Date';
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(tx);
    }

    const groups: DayGroup[] = [];

    map.forEach((txList, dateStr) => {
      const { label, isToday } = parseDayMetadata(dateStr);

      const airtelCount = txList.filter((t) => t.operator === 'AIRTEL').length;
      const mvolaCount = txList.filter((t) => t.operator === 'MVOLA').length;

      const totalCommissions = txList.reduce((sum, t) => sum + (t.commission || 0), 0);
      const totalHiddenFees = txList.reduce((sum, t) => sum + (t.calculatedFee || 0), 0);
      // Formule de la marge corrigée : Marge_Journée = Somme(Toutes_Les_Commissions); (sans soustraction des frais)
      const netMargin = totalCommissions;
      const totalVolume = txList.reduce((sum, t) => sum + t.montant, 0);

      const lastMvolaTx = [...txList].reverse().find((t) => t.operator === 'MVOLA');
      const lastAirtelTx = [...txList].reverse().find((t) => t.operator === 'AIRTEL');

      const sortedByTime = [...txList].sort((a, b) => a.heure.localeCompare(b.heure));
      const startTime = sortedByTime[0]?.heure;
      const endTime = sortedByTime[sortedByTime.length - 1]?.heure;

      groups.push({
        dateStr,
        formattedDateLabel: label,
        isToday,
        transactions: txList,
        totalOperations: txList.length,
        totalCommissions,
        totalHiddenFees,
        netMargin,
        totalVolume,
        airtelCount,
        mvolaCount,
        latestMvolaBalance: lastMvolaTx?.soldeApres,
        latestAirtelBalance: lastAirtelTx?.soldeApres,
        startTime,
        endTime,
      });
    });

    groups.sort((a, b) => {
      const timeA = a.transactions[0]?.timestamp || 0;
      const timeB = b.transactions[0]?.timestamp || 0;
      return timeB - timeA;
    });

    return groups;
  }, [filteredTransactions]);

  React.useEffect(() => {
    const handleOutsideClick = () => setOpenMenuDay(null);
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  // Section 16 : Vue Détaillée d'une date spécifique
  if (selectedDayDateStr) {
    const selectedDayTransactions = transactions.filter(
      (t) => (t.dateStr || 'Sans Date') === selectedDayDateStr
    );
    const dayProofs = networkProofs.filter(
      (p) => p.dateStr === selectedDayDateStr
    );
    return (
      <DayDetailView
        dateStr={selectedDayDateStr}
        transactions={selectedDayTransactions}
        networkProofs={dayProofs}
        onBack={() => setSelectedDayDateStr(null)}
        onDeleteTransaction={onDeleteTransaction}
      />
    );
  }

  return (
    <div className="space-y-3 animate-in fade-in duration-200">
      {/* En-tête compact de l'historique */}
      <div className="flex items-center justify-between border-b border-slate-900 pb-2.5">
        <div>
          <h2 className="text-sm font-bold text-white tracking-tight flex items-center gap-1.5">
            <History className="w-4 h-4 text-blue-400" />
            <span>Historique par Journées</span>
            <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-semibold bg-blue-500/15 text-blue-300">
              {dayGroups.length} j. ({filteredTransactions.length} op.)
            </span>
          </h2>
          <p className="text-[11px] text-slate-400">
            Cartes compactes journalières avec consultation détaillée au clic.
          </p>
        </div>
      </div>

      {/* Barre de recherche compacte & filtres fins */}
      <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-850 space-y-2">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher par numéro (038...), référence Ref/ID..."
            className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-md text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 font-mono transition-colors"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 hover:text-slate-200 px-1 py-0.5 rounded bg-slate-800"
            >
              Effacer
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          <span className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1 mr-0.5">
            <Filter className="w-3 h-3" />
            Filtres :
          </span>

          <button
            type="button"
            onClick={() => setFilterMode('all')}
            className={`px-2 py-0.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
              filterMode === 'all'
                ? 'bg-slate-200 text-slate-950 font-bold'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            Tous ({transactions.length})
          </button>

          <button
            type="button"
            onClick={() => setFilterMode('mvola')}
            className={`px-2 py-0.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1 cursor-pointer ${
              filterMode === 'mvola'
                ? 'bg-amber-500 text-slate-950 font-bold'
                : 'bg-amber-500/10 text-amber-300 hover:bg-amber-500/20'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            <span>MVola</span>
          </button>

          <button
            type="button"
            onClick={() => setFilterMode('airtel')}
            className={`px-2 py-0.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1 cursor-pointer ${
              filterMode === 'airtel'
                ? 'bg-red-600 text-white font-bold'
                : 'bg-red-500/10 text-red-300 hover:bg-red-500/20'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
            <span>Airtel</span>
          </button>

          <button
            type="button"
            onClick={() => setFilterMode('transfert')}
            className={`px-2 py-0.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
              filterMode === 'transfert'
                ? 'bg-purple-600 text-white font-bold'
                : 'bg-purple-500/10 text-purple-300 hover:bg-purple-500/20'
            }`}
          >
            Transferts
          </button>

          <button
            type="button"
            onClick={() => setFilterMode('echange')}
            className={`px-2 py-0.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1 cursor-pointer ${
              filterMode === 'echange'
                ? 'bg-indigo-600 text-white font-bold'
                : 'bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20'
            }`}
          >
            <span>🔄</span>
            <span>Échanges</span>
          </button>
        </div>
      </div>

      {/* LISTE DES CARTES COMPACTES (SPACE-Y-1.5, ROUNDED-LG, P-2 À PY-2 PX-3) */}
      <div className="space-y-1.5">
        {dayGroups.length === 0 ? (
          <div className="p-8 text-center space-y-2 bg-slate-900/60 border border-slate-800 rounded-lg">
            <p className="text-xs text-slate-400 font-mono">
              Aucune transaction enregistrée pour le moment. Veuillez coller un SMS ou importer un fichier CSV.
            </p>
          </div>
        ) : (
          dayGroups.map((day) => {
            const isMenuOpen = openMenuDay === day.dateStr;

            return (
              <div
                key={day.dateStr}
                onClick={() => setSelectedDayDateStr(day.dateStr)}
                className="bg-slate-900/90 border border-slate-850 hover:border-slate-700 rounded-lg py-2 px-3 transition-colors cursor-pointer select-none flex items-center justify-between gap-3 group"
              >
                {/* À GAUCHE : Date format court, badge vert "aujourd'hui", résumé "[Nombre] op. — [Bénéfice] Ar" */}
                <div className="flex items-center gap-2.5 min-w-[160px]">
                  <div className="p-1.5 rounded-md bg-slate-800 text-slate-300 shrink-0 border border-slate-700/60">
                    <Calendar className="w-3.5 h-3.5 text-amber-400" />
                  </div>

                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-white capitalize">
                        {day.formattedDateLabel}
                      </span>
                      {day.isToday && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-emerald-500/20 text-emerald-400 uppercase">
                          aujourd&apos;hui
                        </span>
                      )}
                    </div>

                    <div className="text-[11px] text-slate-400 font-mono">
                      <span>{day.totalOperations} op.</span>
                      <span className="mx-1 text-slate-600">—</span>
                      <span className={day.netMargin >= 0 ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
                        {day.netMargin > 0 ? '+' : ''}
                        {day.netMargin.toLocaleString('fr-FR')} Ar
                      </span>
                    </div>
                  </div>
                </div>

                {/* AU CENTRE (RATIO OPÉRATEURS) : Mini-étiquettes compactes */}
                <div className="hidden sm:flex items-center gap-1.5">
                  {day.airtelCount > 0 && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-red-500/15 text-red-300 border border-red-500/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                      <span>Airtel x{day.airtelCount}</span>
                    </span>
                  )}

                  {day.mvolaCount > 0 && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/15 text-amber-300 border border-amber-500/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                      <span>MVola x{day.mvolaCount}</span>
                    </span>
                  )}
                </div>

                {/* À DROITE : Marge nette totale 24h & EXTRÊME DROITE : Menu 3 points */}
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-[10px] uppercase font-medium text-slate-500">
                      Marge Jour
                    </div>
                    <div className="text-sm sm:text-base font-bold text-emerald-500 font-mono tracking-tight tabular-nums">
                      {day.netMargin > 0 ? '+' : ''}
                      {day.netMargin.toLocaleString('fr-FR')}{' '}
                      <span className="text-[11px] font-normal text-emerald-400/80">Ar</span>
                    </div>
                  </div>

                  {/* Bouton 3 points avec menu contextuel exclusif : 1. Imprimer, 2. Supprimer */}
                  <div className="relative" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMenuDay(isMenuOpen ? null : day.dateStr);
                      }}
                      className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                      title="Menu contextuel"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>

                    {isMenuOpen && (
                      <div
                        className="absolute right-0 top-8 w-40 bg-slate-950 border border-slate-800 rounded-lg shadow-xl p-1 z-40 text-xs space-y-0.5 animate-in fade-in"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setOpenMenuDay(null);
                            setPrintThermalDay(day);
                          }}
                          className="w-full text-left px-2.5 py-1.5 rounded-md text-slate-200 hover:text-white hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
                        >
                          <Printer className="w-3.5 h-3.5 text-blue-400" />
                          <span>Imprimer</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setOpenMenuDay(null);
                            setDeleteConfirmDay(day);
                          }}
                          className="w-full text-left px-2.5 py-1.5 rounded-md text-red-400 hover:text-red-300 hover:bg-red-950/40 flex items-center gap-2 border-t border-slate-850 pt-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Supprimer</span>
                        </button>
                      </div>
                    )}
                  </div>

                  <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-amber-400 transition-colors shrink-0" />
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* BOÎTE DE DIALOGUE COMPACTE : CONFIRMATION DE SUPPRESSION */}
      {deleteConfirmDay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-lg max-w-sm w-full p-4 shadow-xl space-y-3">
            <div className="flex items-start gap-2.5">
              <div className="p-1.5 rounded-md bg-red-500/15 text-red-400 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xs font-bold text-white">
                  Supprimer la journée du {deleteConfirmDay.dateStr} ?
                </h3>
                <p className="text-[11px] text-slate-400">
                  {deleteConfirmDay.totalOperations} transaction(s) seront supprimées et les soldes de caisse recalculés rétroactivement.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setDeleteConfirmDay(null)}
                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-md cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onDeleteDay) {
                    onDeleteDay(deleteConfirmDay.dateStr);
                  }
                  setDeleteConfirmDay(null);
                }}
                className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-md flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Confirmer</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 20. MODAL REÇU D'ARCHIVAGE JOURNALIER OFFICIEL */}
      {printThermalDay && (
        <OfficialArchiveReceiptModal
          dateStr={printThermalDay.dateStr}
          transactions={printThermalDay.transactions}
          proofs={networkProofs.filter((p) => p.dateStr === printThermalDay.dateStr)}
          onClose={() => setPrintThermalDay(null)}
        />
      )}
    </div>
  );
};
