import React from 'react';
import { Cycle } from '../../types';
import { Sparkles, LogIn, ChevronDown, Download } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface HeaderProps {
  activeCycle: Cycle | null;
  cycles: Cycle[];
  onSelectCycle: (id: string) => void;
  onOpenAuth: () => void;
  onOpenInstall: () => void;
  isStandalone?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeCycle,
  cycles,
  onSelectCycle,
  onOpenAuth,
  onOpenInstall,
  isStandalone,
}) => {
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-30 bg-[#FAF8F5]/90 backdrop-blur-md border-b border-nature-200/80 px-4 py-3 sm:px-6">
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        
        {/* App Title & Active Cycle Selector */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-nature-500 to-nature-400 flex items-center justify-center text-white shadow-soft">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="font-bold text-lg text-stone-900 tracking-tight leading-none">
                Sintotermico
              </h1>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-full bg-nature-100 text-nature-700">
                CAMEN
              </span>
            </div>

            {/* Cycle dropdown selector */}
            {activeCycle ? (
              <div className="relative group inline-block mt-0.5">
                <select
                  value={activeCycle.id}
                  onChange={(e) => onSelectCycle(e.target.value)}
                  className="appearance-none bg-transparent pr-5 text-xs font-medium text-stone-500 hover:text-nature-700 cursor-pointer focus:outline-none"
                >
                  {cycles.map((c) => (
                    <option key={c.id} value={c.id}>
                      Ciclo {c.cycle_number} • {c.name || 'Senza nome'} ({c.year})
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3 h-3 text-stone-400 absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            ) : (
              <p className="text-xs text-stone-400">Nessun ciclo attivo</p>
            )}
          </div>
        </div>

        {/* Action Buttons: Install PWA + User Login */}
        <div className="flex items-center gap-2">
          
          {/* Install PWA Button (Hidden if already in standalone app mode) */}
          {!isStandalone && (
            <button
              type="button"
              onClick={onOpenInstall}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-nature-100 hover:bg-nature-200/80 text-nature-800 text-xs font-semibold transition-colors"
              title="Installa come App sullo Smartphone"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Installa App</span>
            </button>
          )}

          {/* User Account / Login Button */}
          {user ? (
            <div
              onClick={onOpenAuth}
              className="flex items-center gap-2 pl-3 pr-3.5 py-1.5 rounded-full bg-nature-100 hover:bg-nature-200/80 text-nature-800 text-xs font-semibold cursor-pointer transition-colors"
            >
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="max-w-[110px] truncate">{user.email}</span>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-nature-600 hover:bg-nature-700 text-white text-xs font-semibold shadow-soft transition-colors"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Accedi</span>
            </button>
          )}

        </div>

      </div>
    </header>
  );
};
