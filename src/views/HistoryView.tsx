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
import { Transaction } from '../types';
import { DayDetailView } from './DayDetailView';
import { extractNumericReference } from '../engine/accounting';

interface HistoryViewProps {
  transactions: Transaction[];
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

  const receiptRef = useRef<HTMLDivElement>(null);

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

  const handleTriggerPrint = () => {
    window.print();
  };

  // 20.A : Tri chronologique des transactions de la journée (de la plus ancienne à la plus récente)
  const sortedReceiptTransactions = useMemo(() => {
    if (!printThermalDay) return [];
    return [...printThermalDay.transactions].sort((a, b) => {
      if (a.operator === 'MVOLA' && b.operator === 'MVOLA') {
        const numA = extractNumericReference(a.reference);
        const numB = extractNumericReference(b.reference);
        if (numA && numB && numA !== numB) return numA - numB;
      }
      if (a.timestamp !== b.timestamp && a.timestamp !== 0 && b.timestamp !== 0) {
        return a.timestamp - b.timestamp;
      }
      return a.id.localeCompare(b.id);
    });
  }, [printThermalDay]);

  // Section 16 : Vue Détaillée d'une date spécifique
  if (selectedDayDateStr) {
    const selectedDayTransactions = transactions.filter(
      (t) => (t.dateStr || 'Sans Date') === selectedDayDateStr
    );
    return (
      <DayDetailView
        dateStr={selectedDayDateStr}
        transactions={selectedDayTransactions}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Entête de la fenêtre modale (non imprimé) */}
            <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between bg-slate-950/60 no-print">
              <div className="flex items-center gap-2 text-sm font-bold text-white">
                <Printer className="w-4 h-4 text-blue-400" />
                <span>Reçu d&apos;Archivage Journalier Officiel · {printThermalDay.dateStr}</span>
              </div>
              <button
                type="button"
                onClick={() => setPrintThermalDay(null)}
                className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                title="Fermer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Corps du Reçu Imprimable (Partie 1 + Partie 2) */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-6 bg-slate-950/40">
              <div
                ref={receiptRef}
                id="printable-archive-receipt"
                className="bg-white text-slate-950 p-4 sm:p-6 rounded-lg font-mono text-xs border border-slate-300 shadow-sm select-text space-y-4"
              >
                {/* Entête général document */}
                <div className="border-b-2 border-slate-900 pb-3 flex flex-wrap items-end justify-between gap-2">
                  <div>
                    <h2 className="text-base font-black tracking-tight uppercase text-slate-950">
                      CASHPOINT MADA — REGISTRE &amp; ARCHIVAGE
                    </h2>
                    <p className="text-[11px] text-slate-600">
                      Journal comptable exhaustif des transactions certifiées par SMS
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold text-slate-900">DATE : {printThermalDay.dateStr}</div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      {printThermalDay.totalOperations} opération{printThermalDay.totalOperations > 1 ? 's' : ''}
                    </div>
                  </div>
                </div>

                {/* A) PARTIE 1 : LE TABLEAU COMPTABLE CHRONOLOGIQUE */}
                <div className="space-y-1.5">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-700">
                    A) Tableau des Opérations Chronologiques ({sortedReceiptTransactions.length})
                  </div>
                  
                  <div className="overflow-x-auto border border-slate-300 rounded">
                    <table className="w-full text-left border-collapse text-[10px] font-mono">
                      <thead>
                        <tr className="bg-slate-100 text-slate-800 border-b border-slate-300 text-[9px] uppercase tracking-wider">
                          <th className="py-1.5 px-2 border-r border-slate-200">1. Heure</th>
                          <th className="py-1.5 px-2 border-r border-slate-200">2. Opérateur</th>
                          <th className="py-1.5 px-2 border-r border-slate-200">3. Type</th>
                          <th className="py-1.5 px-2 border-r border-slate-200">4. Numéro</th>
                          <th className="py-1.5 px-2 border-r border-slate-200 text-right">5. Montant</th>
                          <th className="py-1.5 px-2 border-r border-slate-200">6. Référence</th>
                          <th className="py-1.5 px-2 border-r border-slate-200 text-right">7. Commission</th>
                          <th className="py-1.5 px-2 text-right">8. Solde Après</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {sortedReceiptTransactions.map((tx, idx) => (
                          <tr key={tx.id || idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                            {/* 1. Heure (Format hh:mm, ou "-" pour les crédits YAS MVola sans heure) */}
                            <td className="py-1.5 px-2 whitespace-nowrap border-r border-slate-200 font-semibold text-slate-800">
                              {tx.heure && tx.heure !== '' ? tx.heure : '-'}
                            </td>

                            {/* 2. Opérateur (MVola / AirtelMoney) */}
                            <td className="py-1.5 px-2 whitespace-nowrap border-r border-slate-200 font-bold">
                              {tx.operator === 'MVOLA' ? 'MVola' : 'AirtelMoney'}
                            </td>

                            {/* 3. Type (crédit, dépôt, retrait, transfert) */}
                            <td className="py-1.5 px-2 whitespace-nowrap border-r border-slate-200 capitalize text-slate-700">
                              {tx.typeOperation}
                            </td>

                            {/* 4. Numéro (Numéro client ou "-" si masqué/vide) */}
                            <td className="py-1.5 px-2 whitespace-nowrap border-r border-slate-200 font-mono text-slate-800">
                              {tx.numero && tx.numero !== '-' ? tx.numero : '-'}
                            </td>

                            {/* 5. Montant (Valeur brute en Ar) */}
                            <td className="py-1.5 px-2 text-right whitespace-nowrap border-r border-slate-200 font-bold text-slate-900 tabular-nums">
                              {tx.montant.toLocaleString('fr-FR')} Ar
                            </td>

                            {/* 6. Référence (ID de transaction complet ou Ref MVola) */}
                            <td className="py-1.5 px-2 whitespace-nowrap border-r border-slate-200 font-mono text-[9px] text-slate-800">
                              {tx.reference}
                            </td>

                            {/* 7. Commission (Gain réel de l'agent en Ar) */}
                            <td className="py-1.5 px-2 text-right whitespace-nowrap border-r border-slate-200 font-bold text-emerald-800 tabular-nums">
                              +{(tx.commission || 0).toLocaleString('fr-FR')} Ar
                            </td>

                            {/* 8. Solde Après (Solde de flotte officiel lu à la fin du SMS) */}
                            <td className="py-1.5 px-2 text-right whitespace-nowrap font-bold text-slate-950 tabular-nums">
                              {tx.soldeApres !== undefined ? `${tx.soldeApres.toLocaleString('fr-FR')} Ar` : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* B) PARTIE 2 : LE BLOC DE SYNTHÈSE JOURNALIÈRE (EN BAS DE PAGE) */}
                <div className="pt-2">
                  <div className="max-w-md ml-auto p-4 border-2 border-dashed border-slate-400 bg-slate-50/90 rounded-lg space-y-2 text-slate-950">
                    <div className="text-center pb-2 border-b border-dashed border-slate-400">
                      <div className="font-black text-sm uppercase tracking-wide">CASHPOINT MADA</div>
                      <div className="text-xs font-bold text-slate-700">CLÔTURE DU {printThermalDay.dateStr}</div>
                    </div>

                    <div className="space-y-1 text-xs pt-1">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-700">Nombre total d&apos;opérations :</span>
                        <span className="font-bold">
                          {printThermalDay.totalOperations} ({printThermalDay.airtelCount} Airtel op. / {printThermalDay.mvolaCount} MVola op.)
                        </span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-slate-700">Volume Brut total traité :</span>
                        <span className="font-bold tabular-nums">
                          {printThermalDay.totalVolume.toLocaleString('fr-FR')} Ar
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1 pt-2 border-t border-dotted border-slate-300 text-xs">
                      <div className="flex justify-between items-center text-emerald-800 font-bold">
                        <span>Total Commissions (+) :</span>
                        <span className="tabular-nums">+{printThermalDay.totalCommissions.toLocaleString('fr-FR')} Ar</span>
                      </div>
                      {printThermalDay.totalHiddenFees > 0 && (
                        <div className="flex justify-between items-center text-slate-600 font-medium text-[11px]">
                          <span>Frais Opérateurs (Client, informatif) :</span>
                          <span className="tabular-nums">{printThermalDay.totalHiddenFees.toLocaleString('fr-FR')} Ar</span>
                        </div>
                      )}
                    </div>

                    <div className="py-2.5 mt-2 border-y-2 border-slate-950 flex justify-between items-center text-sm sm:text-base font-black">
                      <span className="underline uppercase tracking-tight">MARGE NETTE DU JOUR :</span>
                      <span className="underline tabular-nums text-emerald-950">
                        +{printThermalDay.netMargin.toLocaleString('fr-FR')} Ar
                      </span>
                    </div>

                    <div className="text-center pt-1 text-[9px] text-slate-500">
                      Cashpoint Mada · Reçu d&apos;Archivage Journalier Conforme 2026
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Pied de la fenêtre modale (non imprimé) */}
            <div className="p-3 border-t border-slate-800 bg-slate-900 flex items-center justify-between gap-3 no-print">
              <button
                type="button"
                onClick={() => setPrintThermalDay(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg cursor-pointer transition-colors"
              >
                Fermer
              </button>

              <button
                type="button"
                onClick={handleTriggerPrint}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg flex items-center gap-2 cursor-pointer shadow-lg shadow-blue-950/50 transition-all"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimer le Reçu d&apos;Archivage</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
