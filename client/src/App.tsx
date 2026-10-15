import React, { useState } from 'react';
import { useSimulation } from './hooks/useSimulation';
import { Navbar } from './components/layout/Navbar';
import { InvariantBanner } from './components/layout/InvariantBanner';
import { Sidebar } from './components/layout/Sidebar';
import { ArchitectureCanvas } from './components/canvas/ArchitectureCanvas';
import { InspectorPanel } from './components/layout/InspectorPanel';
import { BottomPanel } from './components/layout/BottomPanel';
import { ExplanationToast } from './components/panels/ExplanationToast';
import { LearnModal } from './components/panels/LearnModal';
import { ReportModal } from './components/panels/ReportModal';

export const App: React.FC = () => {
  const {
    state,
    events,
    scenarios,
    isConnected,
    selectedNodeId,
    setSelectedNodeId,
    lastExplanation,
    clearExplanation,
    handleStart,
    handlePause,
    handleStep,
    handleReset,
    handleSelectScenario,
    handleToggleFault,
    handleClearFaults,
    handleSubmitWrite,
    handleTriggerFailback,
  } = useSimulation();

  const [isLearnOpen, setIsLearnOpen] = useState<boolean>(false);
  const [isReportOpen, setIsReportOpen] = useState<boolean>(false);

  return (
    <div className="flex flex-col h-screen w-screen bg-navy-950 text-slate-100 overflow-hidden font-sans select-none">
      {/* 1. Top Navigation Bar */}
      <Navbar
        state={state}
        scenarios={scenarios}
        onStart={handleStart}
        onPause={handlePause}
        onStep={handleStep}
        onReset={handleReset}
        onSelectScenario={handleSelectScenario}
        onOpenLearn={() => setIsLearnOpen(true)}
        onOpenReport={() => setIsReportOpen(true)}
        onTriggerFailback={handleTriggerFailback}
      />

      {/* 2. Safety Invariant Banner */}
      <InvariantBanner
        splitBrainGuard={state?.splitBrainGuard}
        isConnected={isConnected}
        simulationTime={state?.simulationTime ?? 0}
      />

      {/* 3. Main Central Workspace */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Sidebar */}
        <Sidebar
          state={state}
          scenarios={scenarios}
          onSelectScenario={handleSelectScenario}
          onToggleFault={handleToggleFault}
          onClearFaults={handleClearFaults}
          onSubmitWrite={handleSubmitWrite}
        />

        {/* Central React Flow Architecture Canvas */}
        <div className="flex-1 h-full relative overflow-hidden">
          <ArchitectureCanvas
            state={state}
            selectedNodeId={selectedNodeId}
            onSelectNode={setSelectedNodeId}
          />

          {/* Real-time State Transition Walkthrough Toast */}
          <ExplanationToast
            explanation={lastExplanation}
            onClose={clearExplanation}
          />
        </div>

        {/* Right Inspector Panel */}
        {selectedNodeId && (
          <InspectorPanel
            selectedNodeId={selectedNodeId}
            state={state}
            onClose={() => setSelectedNodeId(null)}
            onRefreshState={handleStep}
          />
        )}
      </div>

      {/* 4. Bottom Collapsible Monitoring Panel */}
      <BottomPanel state={state} events={events} />

      {/* 5. Modals */}
      <LearnModal isOpen={isLearnOpen} onClose={() => setIsLearnOpen(false)} />
      <ReportModal isOpen={isReportOpen} onClose={() => setIsReportOpen(false)} />
    </div>
  );
};

export default App;
