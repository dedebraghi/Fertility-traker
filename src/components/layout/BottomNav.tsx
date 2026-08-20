import React from 'react';
import { ActiveTab } from '../../types';
import { Calendar, LineChart, BookOpen, Settings, Sparkles } from 'lucide-react';

interface BottomNavProps {
  activeTab: ActiveTab;
  onChangeTab: (tab: ActiveTab) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onChangeTab }) => {
  const tabs = [
    { id: 'today' as ActiveTab, label: 'Oggi', icon: Calendar },
    { id: 'chart' as ActiveTab, label: 'Grafico', icon: LineChart },
    { id: 'analysis' as ActiveTab, label: 'Analisi AI', icon: Sparkles },
    { id: 'cycles' as ActiveTab, label: 'Cicli', icon: BookOpen },
    { id: 'settings' as ActiveTab, label: 'Impostazioni', icon: Settings },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-lg border-t border-nature-200/80 px-2 py-1.5 safe-area-bottom shadow-lg">
      <div className="max-w-lg mx-auto flex items-center justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onChangeTab(tab.id)}
              className={`flex flex-col items-center justify-center flex-1 py-1.5 px-2 rounded-2xl transition-all duration-200 ${
                isActive
                  ? 'text-nature-700 font-bold scale-105'
                  : 'text-stone-400 hover:text-stone-600 font-medium'
              }`}
            >
              <div
                className={`p-1.5 rounded-xl transition-all ${
                  isActive ? 'bg-nature-100 text-nature-600' : 'bg-transparent'
                }`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-[11px] mt-0.5 tracking-tight">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
