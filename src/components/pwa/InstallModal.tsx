import React from 'react';
import { X, Download, Share, PlusSquare, Smartphone, Check } from 'lucide-react';

interface InstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  isIOS: boolean;
  isStandalone: boolean;
  onTriggerNativeInstall: () => void;
}

export const InstallModal: React.FC<InstallModalProps> = ({
  isOpen,
  onClose,
  isIOS,
  isStandalone,
  onTriggerNativeInstall,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm fade-in">
      <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl relative border border-nature-100 slide-up">
        
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-2 rounded-full text-stone-400 hover:text-stone-700 hover:bg-nature-50 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-5">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-nature-500 to-nature-400 text-white flex items-center justify-center mx-auto mb-3 shadow-soft">
            <Smartphone className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-stone-900">
            {isStandalone ? 'App Già Installata' : "Installa l'App sullo Smartphone"}
          </h3>
          <p className="text-xs text-stone-500 mt-1">
            {isStandalone
              ? "Stai già utilizzando la versione app a schermo intero!"
              : 'Accedi istantaneamente dalla schermata Home, a schermo intero e senza barre del browser.'}
          </p>
        </div>

        {isStandalone ? (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs text-center font-semibold space-y-1">
            <Check className="w-5 h-5 mx-auto text-emerald-600 mb-1" />
            <p>L'app è già installata correttamente sul tuo dispositivo.</p>
          </div>
        ) : isIOS ? (
          /* iOS Safari Guide */
          <div className="space-y-3 text-xs text-stone-700 bg-nature-50/60 p-4 rounded-2xl border border-nature-100">
            <p className="font-bold text-nature-900 mb-1">Come installare su iPhone / iPad (Safari):</p>
            
            <div className="flex items-start gap-2.5">
              <div className="w-6 h-6 rounded-lg bg-nature-200 text-nature-800 flex items-center justify-center font-bold text-[11px] shrink-0">
                1
              </div>
              <p className="pt-0.5">
                Tocca l'icona <strong>Condividi</strong> <Share className="w-3.5 h-3.5 inline mx-0.5 text-blue-500" /> in basso su Safari.
              </p>
            </div>

            <div className="flex items-start gap-2.5">
              <div className="w-6 h-6 rounded-lg bg-nature-200 text-nature-800 flex items-center justify-center font-bold text-[11px] shrink-0">
                2
              </div>
              <p className="pt-0.5">
                Scorri verso il basso e seleziona <strong>"Aggiungi alla schermata Home"</strong> <PlusSquare className="w-3.5 h-3.5 inline mx-0.5" />.
              </p>
            </div>

            <div className="flex items-start gap-2.5">
              <div className="w-6 h-6 rounded-lg bg-nature-200 text-nature-800 flex items-center justify-center font-bold text-[11px] shrink-0">
                3
              </div>
              <p className="pt-0.5">
                Tocca <strong>"Aggiungi"</strong> in alto a destra. L'icona apparirà tra le tue app!
              </p>
            </div>
          </div>
        ) : (
          /* Android / Chrome / Edge Native Install */
          <div className="space-y-3">
            <button
              type="button"
              onClick={onTriggerNativeInstall}
              className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-nature-600 to-nature-500 hover:from-nature-700 hover:to-nature-600 text-white font-bold text-xs shadow-soft transition-all active:scale-98 flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              <span>Aggiungi alla Schermata Home</span>
            </button>
            <p className="text-[11px] text-stone-400 text-center">
              Compatibile con Android (Chrome), Edge, e desktop.
            </p>
          </div>
        )}

      </div>
    </div>
  );
};
