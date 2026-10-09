import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { ShieldAlert, X, Clipboard, CheckCircle2 } from 'lucide-react';

interface NetworkInversionModalProps {
  isOpen: boolean;
  reference?: string;
  defaultDateStr?: string;
  onClose: () => void;
  onValidate: (proof: {
    reference?: string;
    smsProof1: string;
    smsProof2: string;
  }) => void;
}

export const NetworkInversionModal: React.FC<NetworkInversionModalProps> = ({
  isOpen,
  reference,
  onClose,
  onValidate,
}) => {
  const [smsProof1, setSmsProof1] = useState('');
  const [smsProof2, setSmsProof2] = useState('');
  const [copiedField, setCopiedField] = useState<'1' | '2' | null>(null);

  if (!isOpen) return null;

  const handlePaste = async (fieldNum: '1' | '2') => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        if (fieldNum === '1') {
          setSmsProof1(text);
        } else {
          setSmsProof2(text);
        }
        setCopiedField(fieldNum);
        setTimeout(() => setCopiedField(null), 1500);
      }
    } catch {
      // Fallback: user can paste directly into the textarea
    }
  };

  const handleConfirm = () => {
    if (!smsProof1.trim() && !smsProof2.trim()) return;
    onValidate({
      reference,
      smsProof1: smsProof1.trim(),
      smsProof2: smsProof2.trim(),
    });
    setSmsProof1('');
    setSmsProof2('');
    onClose();
  };

  const isSavable = smsProof1.trim().length > 0 || smsProof2.trim().length > 0;

  const modalNode = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-xl w-full shadow-2xl overflow-hidden flex flex-col">
        {/* En-tête */}
        <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2">
            <span className="text-base">🛡️</span>
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight">
                Justification d&apos;Inversion Réseau (Anti-Fraude)
              </h3>
              {reference && (
                <div className="text-[10px] font-mono text-amber-400">
                  Réf concernée : {reference}
                </div>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Corps */}
        <div className="p-4 space-y-4">
          {/* Explication officielle */}
          <div className="p-3 rounded-lg bg-amber-950/30 border border-amber-500/30 text-amber-200 text-xs leading-relaxed">
            <p>
              L&apos;opérateur emmêle parfois l&apos;ordre des références lors d&apos;opérations simultanées.
              Veuillez coller les deux SMS concernés pour valider l&apos;intégrité de la caisse.
            </p>
          </div>

          {/* SMS Preuve N°1 */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="sms-proof-1"
                className="text-xs font-semibold text-slate-300 flex items-center gap-1.5"
              >
                <span>SMS Preuve N°1</span>
                {smsProof1 && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
              </label>
              <button
                type="button"
                onClick={() => handlePaste('1')}
                className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700 flex items-center gap-1 cursor-pointer transition-colors"
              >
                <Clipboard className="w-3 h-3 text-amber-400" />
                <span>{copiedField === '1' ? 'Collé !' : 'Coller dédié'}</span>
              </button>
            </div>
            <textarea
              id="sms-proof-1"
              value={smsProof1}
              onChange={(e) => setSmsProof1(e.target.value)}
              placeholder="Collez ici le premier SMS officiel de l'opérateur..."
              rows={3}
              className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-amber-500 transition-colors resize-none leading-relaxed"
            />
          </div>

          {/* SMS Preuve N°2 */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="sms-proof-2"
                className="text-xs font-semibold text-slate-300 flex items-center gap-1.5"
              >
                <span>SMS Preuve N°2</span>
                {smsProof2 && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
              </label>
              <button
                type="button"
                onClick={() => handlePaste('2')}
                className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700 flex items-center gap-1 cursor-pointer transition-colors"
              >
                <Clipboard className="w-3 h-3 text-amber-400" />
                <span>{copiedField === '2' ? 'Collé !' : 'Coller dédié'}</span>
              </button>
            </div>
            <textarea
              id="sms-proof-2"
              value={smsProof2}
              onChange={(e) => setSmsProof2(e.target.value)}
              placeholder="Collez ici le second SMS officiel de l'opérateur..."
              rows={3}
              className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-amber-500 transition-colors resize-none leading-relaxed"
            />
          </div>
        </div>

        {/* Pied de page et Bouton de validation */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-semibold rounded-lg cursor-pointer transition-colors"
          >
            Annuler
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            disabled={!isSavable}
            className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-md ${
              isSavable
                ? 'bg-amber-600 hover:bg-amber-500 text-slate-950 shadow-amber-950/40'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-750'
            }`}
          >
            <span>🛡️ Éteindre l&apos;alerte &amp; Archiver la preuve</span>
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalNode, document.body) : modalNode;
};
