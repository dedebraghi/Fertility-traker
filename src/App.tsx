import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { useCycleData } from './hooks/useCycleData';
import { ActiveTab, Cycle } from './types';
import { Header } from './components/layout/Header';
import { BottomNav } from './components/layout/BottomNav';
import { TodayView } from './components/today/TodayView';
import { ChartView } from './components/chart/ChartView';
import { CyclesListView } from './components/cycles/CyclesListView';
import { SettingsView } from './components/settings/SettingsView';
import { AuthModal } from './components/auth/AuthModal';
import { CycleModal } from './components/cycles/CycleModal';
import { AlertCircle } from 'lucide-react';

const MainContent: React.FC = () => {
  const { isConfigured } = useAuth();
  const {
    cycles,
    activeCycle,
    activeCycleId,
    setActiveCycleId,
    dailyEntries,
    saveDailyEntry,
    createCycle,
    updateCycle,
    deleteCycle,
    importLegacyCycle,
  } = useCycleData();

  const [activeTab, setActiveTab] = useState<ActiveTab>('today');
  const [isAuthOpen, setIsAuthOpen] = useState<boolean>(false);
  const [isCycleModalOpen, setIsCycleModalOpen] = useState<boolean>(false);
  const [cycleToEdit, setCycleToEdit] = useState<Cycle | null>(null);

  const handleOpenNewCycle = () => {
    setCycleToEdit(null);
    setIsCycleModalOpen(true);
  };

  const handleOpenEditCycle = (cycle: Cycle) => {
    setCycleToEdit(cycle);
    setIsCycleModalOpen(true);
  };

  const handleSaveCycle = async (data: Omit<Cycle, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (cycleToEdit) {
      await updateCycle(cycleToEdit.id, data);
    } else {
      await createCycle(data);
    }
  };

  const handleSelectDayForEdit = () => {
    setActiveTab('today');
  };

  const nextCycleNumber = cycles.length > 0 ? Math.max(...cycles.map((c) => c.cycle_number)) + 1 : 1;

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF8F5]">
      
      {/* Header */}
      <Header
        activeCycle={activeCycle}
        cycles={cycles}
        onSelectCycle={setActiveCycleId}
        onOpenAuth={() => setIsAuthOpen(true)}
      />

      {/* Supabase unconfigured warning banner */}
      {!isConfigured && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 text-center text-xs text-amber-900 flex items-center justify-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            Database Supabase non configurato.{' '}
            <button
              onClick={() => setActiveTab('settings')}
              className="underline font-bold hover:text-amber-950"
            >
              Apri Impostazioni
            </button>{' '}
            per inserire le tue credenziali.
          </span>
        </div>
      )}

      {/* Main View Switcher */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6">
        {activeTab === 'today' && (
          <TodayView
            activeCycle={activeCycle}
            dailyEntries={dailyEntries}
            onSaveEntry={saveDailyEntry}
            onOpenNewCycleModal={handleOpenNewCycle}
          />
        )}

        {activeTab === 'chart' && (
          <ChartView
            activeCycle={activeCycle}
            dailyEntries={dailyEntries}
            onSelectDayForEdit={handleSelectDayForEdit}
          />
        )}

        {activeTab === 'cycles' && (
          <CyclesListView
            cycles={cycles}
            activeCycleId={activeCycleId}
            onSelectActiveCycle={setActiveCycleId}
            onOpenNewCycleModal={handleOpenNewCycle}
            onOpenEditCycleModal={handleOpenEditCycle}
            onDeleteCycle={deleteCycle}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsView
            onImportLegacy={importLegacyCycle}
            onOpenAuth={() => setIsAuthOpen(true)}
          />
        )}
      </main>

      {/* Bottom Nav */}
      <BottomNav activeTab={activeTab} onChangeTab={setActiveTab} />

      {/* Modals */}
      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
      
      <CycleModal
        isOpen={isCycleModalOpen}
        cycleToEdit={cycleToEdit}
        onClose={() => setIsCycleModalOpen(false)}
        onSave={handleSaveCycle}
        nextCycleNumber={nextCycleNumber}
      />

    </div>
  );
};

export function App() {
  return (
    <AuthProvider>
      <MainContent />
    </AuthProvider>
  );
}

export default App;
