import React, { useState } from 'react';
import { AuthProvider } from './context/AuthContext';
import { useCycleData } from './hooks/useCycleData';
import { usePWAInstall } from './hooks/usePWAInstall';
import { ActiveTab, Cycle } from './types';
import { Header } from './components/layout/Header';
import { BottomNav } from './components/layout/BottomNav';
import { TodayView } from './components/today/TodayView';
import { CalendarView } from './components/calendar/CalendarView';
import { ChartView } from './components/chart/ChartView';
import { AnalysisView } from './components/analysis/AnalysisView';
import { CyclesListView } from './components/cycles/CyclesListView';
import { SettingsView } from './components/settings/SettingsView';
import { AuthModal } from './components/auth/AuthModal';
import { CycleModal } from './components/cycles/CycleModal';
import { InstallModal } from './components/pwa/InstallModal';

const MainContent: React.FC = () => {
  const {
    cycles,
    symptothermalCycles,
    fullCycleSequence,
    activeCycle,
    activeCycleId,
    setActiveCycleId,
    dailyEntries,
    allEntriesByDate,
    allEntriesList,
    stats,
    saveDailyEntry,
    saveEntryForDate,
    transitionToNewCycle,
    startFirstCycle,
    createCycle,
    updateCycle,
    deleteCycle,
    importLegacyCycle,
    resetAllUserData,
    reconcileAndReindexAllCycles,
  } = useCycleData();

  const { isIOS, isStandalone, triggerInstall } = usePWAInstall();

  const [activeTab, setActiveTab] = useState<ActiveTab>('today');
  const [isAuthOpen, setIsAuthOpen] = useState<boolean>(false);
  const [isCycleModalOpen, setIsCycleModalOpen] = useState<boolean>(false);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState<boolean>(false);
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

  const handleTriggerNativeInstall = async () => {
    await triggerInstall();
    setIsInstallModalOpen(false);
  };

  const nextCycleNumber = cycles.length > 0 ? Math.max(...cycles.map((c) => c.cycle_number)) + 1 : 1;

  return (
    <div className="min-h-screen bg-sand-50/50 flex flex-col font-sans text-stone-800 antialiased selection:bg-nature-200">
      
      {/* Header with cycle selector and Auth */}
      <Header
        activeCycle={activeCycle}
        cycles={symptothermalCycles && symptothermalCycles.length > 0 ? symptothermalCycles : cycles}
        onSelectCycle={setActiveCycleId}
        onOpenAuth={() => setIsAuthOpen(true)}
        onOpenInstall={() => setIsInstallModalOpen(true)}
        isStandalone={isStandalone}
      />

      {/* Main View Switcher */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6">
        {activeTab === 'today' && (
          <TodayView
            activeCycle={activeCycle}
            allCycles={cycles}
            fullCycleSequence={fullCycleSequence}
            stats={stats}
            dailyEntries={dailyEntries}
            allEntriesByDate={allEntriesByDate}
            onSaveEntryForDate={saveEntryForDate}
            onStartFirstCycle={startFirstCycle}
            onOpenNewCycleModal={handleOpenNewCycle}
          />
        )}

        {activeTab === 'calendar' && (
          <CalendarView
            cycles={cycles}
            activeCycle={activeCycle}
            allEntriesByDate={allEntriesByDate}
            allEntriesList={allEntriesList}
            onSaveEntryForDate={saveEntryForDate}
          />
        )}

        {activeTab === 'chart' && (
          <ChartView
            activeCycle={activeCycle}
            dailyEntries={dailyEntries}
            onSelectDayForEdit={handleSelectDayForEdit}
          />
        )}

        {activeTab === 'analysis' && (
          <AnalysisView
            activeCycle={activeCycle}
            dailyEntries={dailyEntries}
            allCycles={symptothermalCycles && symptothermalCycles.length > 0 ? symptothermalCycles : cycles}
            onNavigateToSettings={() => setActiveTab('settings')}
          />
        )}

        {activeTab === 'cycles' && (
          <CyclesListView
            cycles={cycles}
            symptothermalCycles={symptothermalCycles}
            fullCycleSequence={fullCycleSequence}
            activeCycleId={activeCycleId}
            onSelectActiveCycle={(id) => {
              setActiveCycleId(id);
              setActiveTab('chart');
            }}
            onSelectEstimatedCycle={(startDate) => {
              setActiveTab('calendar');
            }}
            onOpenNewCycleModal={handleOpenNewCycle}
            onOpenEditCycleModal={handleOpenEditCycle}
            onDeleteCycle={deleteCycle}
            onImportLegacy={importLegacyCycle}
            onReindexCycles={reconcileAndReindexAllCycles}
            onOpenAuth={() => setIsAuthOpen(true)}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsView
            onImportLegacy={importLegacyCycle}
            onResetAllUserData={resetAllUserData}
            onOpenAuth={() => setIsAuthOpen(true)}
            onOpenInstall={() => setIsInstallModalOpen(true)}
            isStandalone={isStandalone}
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

      <InstallModal
        isOpen={isInstallModalOpen}
        onClose={() => setIsInstallModalOpen(false)}
        isIOS={isIOS}
        isStandalone={isStandalone}
        onTriggerNativeInstall={handleTriggerNativeInstall}
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
