import React, { useState } from 'react';
import {
  Search,
  Filter,
  ArrowUpDown,
  AlertTriangle,
  Info,
  Trash2,
  CheckCircle,
  Eye,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Operator, Transaction, TransactionType } from '../types';

interface AccountingLedgerProps {
  transactions: Transaction[];
  onDeleteTransaction: (id: string) => void;
}

export const AccountingLedger: React.FC<AccountingLedgerProps> = ({
  transactions,
  onDeleteTransaction,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [operatorFilter, setOperatorFilter] = useState<'ALL' | Operator>('ALL');
  const [typeFilter, setTypeFilter] = useState<'ALL' | TransactionType>('ALL');
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

  // Filtrage
  const filtered = transactions.filter((t) => {
    if (operatorFilter !== 'ALL' && t.operator !== operatorFilter) {
      return false;
    }
    if (typeFilter !== 'ALL' && t.type !== typeFilter) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchRef = t.reference.toLowerCase().includes(q) || t.id.toLowerCase().includes(q);
      const matchText = t.rawText.toLowerCase().includes(q);
      const matchType = t.typeOperation.toLowerCase().includes(q) || t.typeLabel.toLowerCase().includes(q);
      const matchPhone = t.numero.toLowerCase().includes(q);
      const matchAmount = t.montant.toString().includes(q);
      return matchRef || matchText || matchType || matchPhone || matchAmount;
    }
    return true;
  });

  // Affichage du plus récent au plus ancien pour l'ergonomie visuelle ou inverse
  const [sortDescending, setSortDescending] = useState(true);
  const displayList = [...filtered].sort((a, b) => {
    return sortDescending ? b.timestamp - a.timestamp : a.timestamp - b.timestamp;
  });

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
      {/* Barre d'outils et filtres */}
      <div className="p-4 bg-slate-850 border-b border-slate-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold text-white tracking-tight">
            Registre Comptable des Opérations
          </h3>
          <span className="text-xs font-mono text-slate-400">
            ({transactions.length} enregistrement{transactions.length > 1 ? 's' : ''})
          </span>
        </div>

        {/* Contrôles de filtrage */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Recherche */}
          <div className="relative min-w-[180px] flex-1 sm:flex-initial">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Ref, ID, Tél, Montant..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-950 border border-slate-700 rounded-lg text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Filtre Opérateur */}
          <div className="flex items-center gap-1 p-0.5 bg-slate-950 border border-slate-800 rounded-lg text-xs">
            <button
              onClick={() => setOperatorFilter('ALL')}
              className={`px-2 py-1 rounded font-medium transition-colors ${
                operatorFilter === 'ALL'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Tous
            </button>
            <button
              onClick={() => setOperatorFilter('MVOLA')}
              className={`px-2 py-1 rounded font-medium transition-colors ${
                operatorFilter === 'MVOLA'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              MVola
            </button>
            <button
              onClick={() => setOperatorFilter('AIRTEL')}
              className={`px-2 py-1 rounded font-medium transition-colors ${
                operatorFilter === 'AIRTEL'
                  ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Airtel
            </button>
          </div>

          {/* Ordre de tri */}
          <button
            onClick={() => setSortDescending(!sortDescending)}
            title={sortDescending ? 'Plus récent en premier' : 'Plus ancien en premier'}
            className="p-1.5 text-slate-400 hover:text-white bg-slate-950 border border-slate-800 rounded-lg transition-colors flex items-center gap-1 text-xs"
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{sortDescending ? 'Récent' : 'Chrono'}</span>
          </button>
        </div>
      </div>

      {/* Tableau dynamique */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-950/80 text-slate-400 border-b border-slate-800 font-semibold tracking-wider">
              <th className="py-2.5 px-3 whitespace-nowrap">Heure</th>
              <th className="py-2.5 px-3 whitespace-nowrap">Opérateur</th>
              <th className="py-2.5 px-3 whitespace-nowrap">Type d&apos;opération</th>
              <th className="py-2.5 px-3 whitespace-nowrap">Numéro</th>
              <th className="py-2.5 px-3 text-right whitespace-nowrap">Montant</th>
              <th className="py-2.5 px-3 text-right whitespace-nowrap">Commission</th>
              <th className="py-2.5 px-3 text-right whitespace-nowrap">Frais</th>
              <th className="py-2.5 px-3 text-right whitespace-nowrap">Solde après</th>
              <th className="py-2.5 px-3 whitespace-nowrap">Référence</th>
              <th className="py-2.5 px-2 text-center whitespace-nowrap">Détails</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80 font-mono">
            {displayList.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-12 text-center text-slate-500 font-sans">
                  {transactions.length === 0 ? (
                    <div className="space-y-2">
                      <p className="text-sm text-slate-400 font-medium">
                        Aucune opération enregistrée pour le moment.
                      </p>
                      <p className="text-xs text-slate-500 max-w-sm mx-auto">
                        Collez un SMS dans l&apos;onglet &quot;Saisie au fil de l&apos;eau&quot; ou effectuez une &quot;Importation Groupée&quot; pour démarrer le cahier.
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs">Aucun résultat correspondant aux filtres actifs.</p>
                  )}
                </td>
              </tr>
            ) : (
              displayList.map((tx) => {
                const isExpanded = expandedRowId === tx.id;

                // Mise en évidence visuelle (orange ou rouge) des lignes Airtel qualifiées de 'Transfert' ou de 'MB'
                const isSpecialHighlight = tx.operator === 'AIRTEL' && tx.isSpecialAirtel;

                const rowBgClass = isSpecialHighlight
                  ? tx.airtelVerdict === 'TRANSFERT_FRAIS_CACHES'
                    ? 'bg-amber-950/25 hover:bg-amber-950/40 text-amber-100 border-l-4 border-l-amber-500'
                    : 'bg-rose-950/25 hover:bg-rose-950/40 text-rose-100 border-l-4 border-l-rose-500'
                  : 'hover:bg-slate-800/40 text-slate-200 border-l-4 border-l-transparent';

                return (
                  <React.Fragment key={tx.id}>
                    <tr className={`transition-colors ${rowBgClass}`}>
                      {/* 1. Heure ou Référence pour MVola */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {tx.operator === 'MVOLA' ? (
                          <div className="font-semibold text-amber-400 tracking-tight">Ref: {tx.reference}</div>
                        ) : (
                          <div className="font-semibold text-slate-100 tracking-tight">{tx.heure}</div>
                        )}
                        <div className="text-[10px] text-slate-400">{tx.dateStr}</div>
                      </td>

                      {/* 2. Opérateur ("MVola" ou "Airtel Money") */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span
                          className={`font-sans font-semibold text-xs ${
                            tx.operateur === 'MVola' ? 'text-amber-400' : 'text-red-400'
                          }`}
                        >
                          {tx.operateur}
                        </span>
                      </td>

                      {/* 3. Type d'opération ("crédit" | "dépôt" | "retrait" | "transfert") */}
                      <td className="py-2.5 px-3 whitespace-nowrap font-sans">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`font-semibold capitalize ${
                              isSpecialHighlight
                                ? 'text-amber-300 font-bold'
                                : tx.typeOperation === 'retrait'
                                ? 'text-emerald-400'
                                : tx.typeOperation === 'dépôt'
                                ? 'text-blue-400'
                                : tx.typeOperation === 'crédit'
                                ? 'text-purple-400'
                                : 'text-amber-300'
                            }`}
                          >
                            {tx.typeOperation}
                          </span>
                          {tx.balanceMismatch && (
                            <span
                              title="Écart détecté avec le solde du SMS !"
                              className="text-amber-400"
                            >
                              <AlertTriangle className="w-3.5 h-3.5 inline" />
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 4. Numéro (Téléphone du client ou "-") */}
                      <td className="py-2.5 px-3 whitespace-nowrap font-mono text-slate-300">
                        {tx.numero}
                      </td>

                      {/* 5. Montant (Valeur numérique pure) */}
                      <td className="py-2.5 px-3 text-right tabular-nums whitespace-nowrap font-bold text-slate-100">
                        {tx.montant.toLocaleString('fr-FR')} <span className="text-[10px] font-normal text-slate-400">Ar</span>
                      </td>

                      {/* 6. Commission (Valeur numérique pure) */}
                      <td className="py-2.5 px-3 text-right tabular-nums whitespace-nowrap">
                        {tx.commission > 0 ? (
                          <span className="text-emerald-400 font-medium">
                            +{tx.commission.toLocaleString('fr-FR')} Ar
                          </span>
                        ) : (
                          <span className="text-slate-500">0</span>
                        )}
                      </td>

                      {/* 7. Frais (Valeur numérique pure) */}
                      <td className="py-2.5 px-3 text-right tabular-nums whitespace-nowrap">
                        {tx.frais > 0 ? (
                          <span className="text-amber-400 font-bold">
                            {tx.frais.toLocaleString('fr-FR')} Ar
                          </span>
                        ) : (
                          <span className="text-slate-500">0</span>
                        )}
                      </td>

                      {/* 8. Solde après (Solde inscrit dans le corps du SMS) */}
                      <td className="py-2.5 px-3 text-right tabular-nums whitespace-nowrap font-semibold">
                        <span
                          className={
                            tx.operateur === 'MVola' ? 'text-amber-300' : 'text-red-300'
                          }
                        >
                          {tx.soldeApres.toLocaleString('fr-FR')} Ar
                        </span>
                      </td>

                      {/* 9. Référence (Numéro après "Ref:" pour MVola ou ID complet pour Airtel) */}
                      <td className="py-2.5 px-3 whitespace-nowrap font-mono text-slate-300 max-w-[140px] truncate" title={tx.reference}>
                        {tx.reference}
                      </td>

                      {/* Actions & Détails */}
                      <td className="py-2.5 px-2 text-center whitespace-nowrap font-sans">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() =>
                              setExpandedRowId(isExpanded ? null : tx.id)
                            }
                            className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-700/50 transition-colors"
                            title="Voir les calculs et le SMS brut"
                          >
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            onClick={() => {
                              if (
                                window.confirm(
                                  `Supprimer la transaction ${tx.reference} ? Les soldes en cascade seront recalculés automatiquement.`
                                )
                              ) {
                                onDeleteTransaction(tx.id);
                              }
                            }}
                            className="p-1 text-slate-500 hover:text-red-400 rounded hover:bg-slate-700/50 transition-colors"
                            title="Supprimer la transaction"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Ligne dépliée pour audit mathématique détaillé */}
                    {isExpanded && (
                      <tr className="bg-slate-950 border-b border-slate-800 font-sans">
                        <td colSpan={10} className="p-4 space-y-3">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                            {/* Démonstration mathématique & Soldes Caisse */}
                            <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-2">
                              <div className="font-semibold text-slate-300 flex items-center gap-1.5">
                                <Info className="w-3.5 h-3.5 text-blue-400" />
                                Variables extraites &amp; audit algorithmique :
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-400">
                                <div>Heure : <strong className="text-white">{tx.heure}</strong></div>
                                <div>Opérateur : <strong className="text-white">{tx.operateur}</strong></div>
                                <div>Type normalisé : <strong className="text-white">{tx.typeOperation}</strong></div>
                                <div>Numéro client : <strong className="text-white">{tx.numero}</strong></div>
                                <div>Montant brut : <strong className="text-white">{tx.montant.toLocaleString('fr-FR')} Ar</strong></div>
                                <div>Commission agent : <strong className="text-emerald-400">{tx.commission.toLocaleString('fr-FR')} Ar</strong></div>
                                <div>Frais calculés : <strong className="text-amber-400">{tx.frais.toLocaleString('fr-FR')} Ar</strong></div>
                                <div>Solde après SMS : <strong className="text-white">{tx.soldeApres.toLocaleString('fr-FR')} Ar</strong></div>
                                <div className="col-span-2">Référence unique : <strong className="text-white">{tx.reference}</strong></div>
                              </div>
                              <div className="pt-2 border-t border-slate-800/80 text-[11px] font-mono text-slate-300">
                                <div className="text-slate-400">Impact comptable sur les caisses :</div>
                                <div className="mt-1 flex items-center justify-between">
                                  <span>Solde Cash en caisse : <strong className="text-emerald-300">{tx.cashBalanceAfter.toLocaleString('fr-FR')} Ar</strong></span>
                                  <span>Solde Flotte opérateur : <strong className="text-amber-300">{tx.flotteBalanceAfter.toLocaleString('fr-FR')} Ar</strong></span>
                                </div>
                                <p className="mt-1.5 text-slate-400 text-[10px]">
                                  {tx.explanation}
                                </p>
                              </div>
                              {tx.balanceMismatch && (
                                <div className="p-2 rounded bg-amber-950/60 border border-amber-500/30 text-amber-300 text-[11px]">
                                  Écart de solde MVola détecté : Différence de{' '}
                                  {tx.balanceGap?.toLocaleString('fr-FR')} Ar avec le solde du SMS !
                                </div>
                              )}
                            </div>

                            {/* SMS Brut original */}
                            <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1.5">
                              <div className="font-semibold text-slate-400">
                                Texte officiel du SMS :
                              </div>
                              <div className="p-2 bg-slate-950 rounded border border-slate-800/80 font-mono text-[11px] text-slate-300 break-words leading-relaxed select-all">
                                {tx.rawText}
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pied de tableau avec totaux filtrés */}
      {displayList.length > 0 && (
        <div className="px-4 py-2.5 bg-slate-950/60 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400 font-mono">
          <div>
            Affichage de <strong className="text-white">{displayList.length}</strong> transaction(s)
          </div>
          <div className="flex items-center gap-4">
            <span>
              Volume cumulé :{' '}
              <strong className="text-white">
                {displayList.reduce((s, t) => s + t.amount, 0).toLocaleString('fr-FR')} Ar
              </strong>
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
