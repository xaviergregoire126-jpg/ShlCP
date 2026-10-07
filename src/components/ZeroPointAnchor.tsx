import React, { useState } from 'react';
import { Lock, Unlock, ShieldCheck, Coins, Smartphone, DollarSign, RotateCcw } from 'lucide-react';
import { AnchorBalances } from '../types';

interface ZeroPointAnchorProps {
  anchor: AnchorBalances;
  onUpdateAnchor: (updated: AnchorBalances) => void;
  onResetSession: () => void;
  onResetAll?: () => void;
  transactionCount: number;
}

export const ZeroPointAnchor: React.FC<ZeroPointAnchorProps> = ({
  anchor,
  onUpdateAnchor,
  onResetSession,
  onResetAll,
  transactionCount,
}) => {
  const [cashInput, setCashInput] = useState(anchor.cash.toString());
  const [mvolaInput, setMvolaInput] = useState(anchor.mvola.toString());
  const [airtelInput, setAirtelInput] = useState(anchor.airtel.toString());

  React.useEffect(() => {
    setCashInput(anchor.cash.toString());
    setMvolaInput(anchor.mvola.toString());
    setAirtelInput(anchor.airtel.toString());
  }, [anchor.cash, anchor.mvola, anchor.airtel]);

  const handleToggleLock = () => {
    if (!anchor.isLocked) {
      const newCash = parseInt(cashInput.replace(/[^\d]/g, ''), 10) || 0;
      const newMvola = parseInt(mvolaInput.replace(/[^\d]/g, ''), 10) || 0;
      const newAirtel = parseInt(airtelInput.replace(/[^\d]/g, ''), 10) || 0;

      onUpdateAnchor({
        cash: newCash,
        mvola: newMvola,
        airtel: newAirtel,
        isLocked: true,
      });
      setCashInput(newCash.toString());
      setMvolaInput(newMvola.toString());
      setAirtelInput(newAirtel.toString());
    } else {
      onUpdateAnchor({
        ...anchor,
        isLocked: false,
      });
    }
  };

  const handleInputChange = (
    field: 'cash' | 'mvola' | 'airtel',
    value: string
  ) => {
    const rawVal = value.replace(/[^\d]/g, '');
    if (field === 'cash') setCashInput(rawVal);
    if (field === 'mvola') setMvolaInput(rawVal);
    if (field === 'airtel') setAirtelInput(rawVal);
  };

  return (
    <div className="bg-slate-900/90 border border-slate-850 rounded-lg overflow-hidden">
      {/* En-tête compact */}
      <div className="px-3 py-2 border-b border-slate-850/80 flex flex-wrap items-center justify-between gap-2 bg-slate-950/40">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-md bg-slate-800 text-slate-300">
            {anchor.isLocked ? (
              <Lock className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Unlock className="w-3.5 h-3.5 text-amber-400" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-white">Point Zéro : Soldes de Caisse</span>
              <span
                className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold uppercase ${
                  anchor.isLocked
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    : 'bg-amber-500/15 text-amber-300 border border-amber-500/30 animate-pulse'
                }`}
              >
                {anchor.isLocked ? 'Verrouillé' : 'Éditable'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {transactionCount > 0 && (
            <button
              onClick={onResetSession}
              title="Vider le registre"
              className="px-2 py-1 text-[11px] text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-md transition-colors flex items-center gap-1 border border-slate-800 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Vider</span>
            </button>
          )}

          <button
            onClick={handleToggleLock}
            className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors flex items-center gap-1 cursor-pointer ${
              anchor.isLocked
                ? 'bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
            }`}
          >
            {anchor.isLocked ? (
              <>
                <Unlock className="w-3 h-3" />
                <span>Déverrouiller</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-3 h-3" />
                <span>Verrouiller</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Inputs Grid Compact */}
      <div className="p-2.5 grid grid-cols-1 sm:grid-cols-3 gap-2">
        {/* Caisse Cash */}
        <div className="space-y-0.5">
          <label className="flex items-center justify-between text-[11px] text-slate-300">
            <span className="flex items-center gap-1">
              <DollarSign className="w-3 h-3 text-emerald-400" />
              Caisse Cash
            </span>
            <span className="text-[10px] text-slate-500 font-mono">Ar</span>
          </label>
          <div className="relative">
            <input
              type="text"
              disabled={anchor.isLocked}
              value={anchor.isLocked ? anchor.cash.toLocaleString('fr-FR') : cashInput}
              onChange={(e) => handleInputChange('cash', e.target.value)}
              placeholder="Ex: 1 000 000"
              className={`w-full px-2.5 py-1.5 text-xs font-mono font-semibold rounded-md border transition-colors ${
                anchor.isLocked
                  ? 'bg-slate-950/60 border-slate-850 text-slate-200 cursor-not-allowed'
                  : 'bg-slate-950 border-slate-700 text-emerald-300 focus:border-emerald-500'
              }`}
            />
            <span className="absolute right-2.5 top-1.5 text-[10px] font-mono text-slate-500">Ar</span>
          </div>
        </div>

        {/* Flotte MVola */}
        <div className="space-y-0.5">
          <label className="flex items-center justify-between text-[11px] text-slate-300">
            <span className="flex items-center gap-1">
              <Coins className="w-3 h-3 text-amber-400" />
              Flotte MVola
            </span>
            <span className="text-[10px] text-slate-500 font-mono">Ar</span>
          </label>
          <div className="relative">
            <input
              type="text"
              disabled={anchor.isLocked}
              value={anchor.isLocked ? anchor.mvola.toLocaleString('fr-FR') : mvolaInput}
              onChange={(e) => handleInputChange('mvola', e.target.value)}
              placeholder="Ex: 500 000"
              className={`w-full px-2.5 py-1.5 text-xs font-mono font-semibold rounded-md border transition-colors ${
                anchor.isLocked
                  ? 'bg-slate-950/60 border-slate-850 text-slate-200 cursor-not-allowed'
                  : 'bg-slate-950 border-slate-700 text-amber-300 focus:border-amber-500'
              }`}
            />
            <span className="absolute right-2.5 top-1.5 text-[10px] font-mono text-slate-500">Ar</span>
          </div>
        </div>

        {/* Flotte Airtel */}
        <div className="space-y-0.5">
          <label className="flex items-center justify-between text-[11px] text-slate-300">
            <span className="flex items-center gap-1">
              <Smartphone className="w-3 h-3 text-red-400" />
              Flotte Airtel
            </span>
            <span className="text-[10px] text-slate-500 font-mono">Ar</span>
          </label>
          <div className="relative">
            <input
              type="text"
              disabled={anchor.isLocked}
              value={anchor.isLocked ? anchor.airtel.toLocaleString('fr-FR') : airtelInput}
              onChange={(e) => handleInputChange('airtel', e.target.value)}
              placeholder="Ex: 500 000"
              className={`w-full px-2.5 py-1.5 text-xs font-mono font-semibold rounded-md border transition-colors ${
                anchor.isLocked
                  ? 'bg-slate-950/60 border-slate-850 text-slate-200 cursor-not-allowed'
                  : 'bg-slate-950 border-slate-700 text-red-300 focus:border-red-500'
              }`}
            />
            <span className="absolute right-2.5 top-1.5 text-[10px] font-mono text-slate-500">Ar</span>
          </div>
        </div>
      </div>

      {/* Barre Trésorerie d'ancrage totale */}
      <div className="px-3 py-1.5 bg-slate-950/70 border-t border-slate-850/80 flex items-center justify-between text-xs">
        <span className="text-slate-400">Trésorerie d&apos;ancrage totale (Somme des 3 caisses de départ) :</span>
        <span className="font-mono font-bold text-white tabular-nums">
          {(anchor.cash + anchor.mvola + anchor.airtel).toLocaleString('fr-FR')} Ar
        </span>
      </div>
    </div>
  );
};
