import React, { useState, useEffect } from 'react';
import {
  Settings,
  RotateCcw,
  Save,
  FileCheck,
} from 'lucide-react';

export interface OperatorTariffConfig {
  mvola: {
    bonusKeyword: string;
    defaultYasCommission: number;
    transferFeeFixed: number;
  };
  airtel: {
    hiddenFeeThreshold: number;
    default100kTransferFee: number;
    standardDepositCommissionRate: number;
  };
  general: {
    strictBalanceTolerance: number;
    autoRequalifySpecialAirtel: boolean;
  };
}

export const DEFAULT_TARIFF_CONFIG: OperatorTariffConfig = {
  mvola: {
    bonusKeyword: 'Bonus:',
    defaultYasCommission: 0,
    transferFeeFixed: 1200,
  },
  airtel: {
    hiddenFeeThreshold: 2000,
    default100kTransferFee: 2000,
    standardDepositCommissionRate: 1.0,
  },
  general: {
    strictBalanceTolerance: 0,
    autoRequalifySpecialAirtel: true,
  },
};

const LOCAL_STORAGE_SETTINGS_KEY = 'cashpoint_tariff_config_v1';

export const SettingsView: React.FC = () => {
  const [config, setConfig] = useState<OperatorTariffConfig>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_SETTINGS_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return DEFAULT_TARIFF_CONFIG;
  });

  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_SETTINGS_KEY, JSON.stringify(config));
    } catch {
      // ignore
    }
  }, [config]);

  const handleResetDefaults = () => {
    if (window.confirm('Rétablir les barèmes officiels par défaut ?')) {
      setConfig(DEFAULT_TARIFF_CONFIG);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    }
  };

  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    try {
      localStorage.setItem(LOCAL_STORAGE_SETTINGS_KEY, JSON.stringify(config));
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    } catch {
      // ignore
    }
  };

  return (
    <div className="space-y-3 animate-in fade-in duration-200 max-w-4xl mx-auto">
      {/* En-tête compact */}
      <div className="flex items-center justify-between border-b border-slate-900 pb-2.5">
        <div>
          <h2 className="text-sm font-bold text-white tracking-tight flex items-center gap-1.5">
            <Settings className="w-4 h-4 text-amber-400" />
            <span>Réglages &amp; Grilles Tarifaires</span>
          </h2>
          <p className="text-[11px] text-slate-400">
            Ajustement des barèmes de commissions et de frais à Madagascar.
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-md border border-slate-700 transition-colors flex items-center gap-1 cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Défaut</span>
          </button>

          <button
            type="button"
            onClick={() => handleSave()}
            className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-md transition-colors flex items-center gap-1 cursor-pointer"
          >
            <Save className="w-3 h-3" />
            <span>Enregistrer</span>
          </button>
        </div>
      </div>

      {savedSuccess && (
        <div className="p-2 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-xs text-emerald-300 flex items-center gap-1.5">
          <FileCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>Paramètres mis à jour avec succès dans le navigateur.</span>
        </div>
      )}

      {/* FORMULAIRE DES RÉGLAGES COMPACT */}
      <form onSubmit={handleSave} className="space-y-2.5">
        {/* SECTION 1 : GRILLE MVOLA */}
        <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-850 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span>Grille &amp; Détection MVola</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div className="space-y-1">
              <label className="text-[11px] text-slate-300 flex items-center justify-between">
                <span>Mot-clé de capture commission (&quot;Bonus&quot;) :</span>
                <span className="text-[10px] text-slate-500 font-mono">Défaut: Bonus:</span>
              </label>
              <input
                type="text"
                value={config.mvola.bonusKeyword}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    mvola: { ...config.mvola, bonusKeyword: e.target.value },
                  })
                }
                className="w-full px-2.5 py-1 bg-slate-950 border border-slate-750 rounded-md text-xs text-white font-mono focus:border-amber-400 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] text-slate-300 flex items-center justify-between">
                <span>Frais forfaitaires de transfert par défaut (Ar) :</span>
                <span className="text-[10px] text-slate-500 font-mono">Défaut: 1 200 Ar</span>
              </label>
              <input
                type="number"
                value={config.mvola.transferFeeFixed}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    mvola: { ...config.mvola, transferFeeFixed: Number(e.target.value) || 0 },
                  })
                }
                className="w-full px-2.5 py-1 bg-slate-950 border border-slate-755 rounded-md text-xs text-white font-mono focus:border-amber-400 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* SECTION 2 : GRILLE AIRTEL MONEY */}
        <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-850 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-red-400">
            <span className="w-2 h-2 rounded-full bg-red-400" />
            <span>Grille &amp; Enquête Mathématique Airtel Money</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div className="space-y-1">
              <label className="text-[11px] text-slate-300 flex items-center justify-between">
                <span>Seuil de frais cachés requalifiant (Ar) :</span>
                <span className="text-[10px] text-slate-500 font-mono">Défaut: 2 000 Ar</span>
              </label>
              <input
                type="number"
                value={config.airtel.hiddenFeeThreshold}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    airtel: { ...config.airtel, hiddenFeeThreshold: Number(e.target.value) || 0 },
                  })
                }
                className="w-full px-2.5 py-1 bg-slate-950 border border-slate-750 rounded-md text-xs text-white font-mono focus:border-red-400 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] text-slate-300 flex items-center justify-between">
                <span>Taux commission dépôt standard (%) :</span>
                <span className="text-[10px] text-slate-500 font-mono">Défaut: 1.0 %</span>
              </label>
              <input
                type="number"
                step="0.1"
                value={config.airtel.standardDepositCommissionRate}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    airtel: {
                      ...config.airtel,
                      standardDepositCommissionRate: Number(e.target.value) || 0,
                    },
                  })
                }
                className="w-full px-2.5 py-1 bg-slate-950 border border-slate-750 rounded-md text-xs text-white font-mono focus:border-red-400 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* SECTION 3 : CONTRÔLE DE TOLÉRANCE DE SOLDE */}
        <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-850 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-blue-400">
            <span className="w-2 h-2 rounded-full bg-blue-400" />
            <span>Tolérance Mathématique &amp; Audit</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div className="space-y-1">
              <label className="text-[11px] text-slate-300 flex items-center justify-between">
                <span>Tolérance d&apos;écart de solde (Ar) :</span>
                <span className="text-[10px] text-emerald-400 font-mono">0 Ar = Tolérance Zéro</span>
              </label>
              <input
                type="number"
                value={config.general.strictBalanceTolerance}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    general: {
                      ...config.general,
                      strictBalanceTolerance: Number(e.target.value) || 0,
                    },
                  })
                }
                className="w-full px-2.5 py-1 bg-slate-950 border border-slate-750 rounded-md text-xs text-white font-mono focus:border-blue-400 focus:outline-none"
              />
            </div>

            <div className="space-y-1 flex flex-col justify-center pt-2 sm:pt-0">
              <label className="flex items-center gap-2 cursor-pointer text-slate-300 text-xs">
                <input
                  type="checkbox"
                  checked={config.general.autoRequalifySpecialAirtel}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      general: {
                        ...config.general,
                        autoRequalifySpecialAirtel: e.target.checked,
                      },
                    })
                  }
                  className="rounded text-amber-500 focus:ring-amber-500/30"
                />
                <span className="font-medium">Activer la requalification automatique Airtel</span>
              </label>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};
