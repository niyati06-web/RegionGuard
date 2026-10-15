import React from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  StepForward,
  BookOpen,
  FileText,
  Activity,
  Layers,
  RotateCw,
} from 'lucide-react';
import { ScenarioDefinition, SimulationState } from '../../types';
import { StatusBadge } from '../common/StatusBadge';

interface NavbarProps {
  state: SimulationState | null;
  scenarios: ScenarioDefinition[];
  onStart: () => void;
  onPause: () => void;
  onStep: () => void;
  onReset: () => void;
  onSelectScenario: (id: string) => void;
  onOpenLearn: () => void;
  onOpenReport: () => void;
  onTriggerFailback: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  state,
  scenarios,
  onStart,
  onPause,
  onStep,
  onReset,
  onSelectScenario,
  onOpenLearn,
  onOpenReport,
  onTriggerFailback,
}) => {
  const isRunning = state?.status === 'RUNNING';
  const currentState = state?.failover.currentState || 'PRIMARY_ACTIVE';
  const canFailback = currentState === 'SECONDARY_ACTIVE';

  return (
    <header className="bg-navy-950 border-b border-slate-800/80 px-4 py-2.5 flex items-center justify-between shadow-md">
      {/* Brand & PS Badge */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-teal-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Layers className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base tracking-tight text-slate-100">RegionGuard</span>
              <span className="bg-blue-900/60 border border-blue-700/70 text-blue-300 text-[10px] font-mono font-bold px-1.5 py-0.2 rounded">
                PS 23
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">Multi-Region Active-Passive Failover Controller</p>
          </div>
        </div>

        {/* State Machine Status Badge */}
        <div className="hidden md:flex items-center gap-2 ml-4 pl-4 border-l border-slate-800">
          <span className="text-xs text-slate-400 font-medium">State:</span>
          <StatusBadge status={currentState} size="md" />
        </div>
      </div>

      {/* Center Controls */}
      <div className="flex items-center gap-2">
        {/* Play/Pause */}
        {isRunning ? (
          <button
            onClick={onPause}
            className="flex items-center gap-1.5 bg-amber-600/90 hover:bg-amber-600 text-white text-xs font-semibold px-3 py-1.5 rounded-md shadow-sm transition"
            title="Pause continuous simulation"
          >
            <Pause className="w-3.5 h-3.5" />
            <span>Pause</span>
          </button>
        ) : (
          <button
            onClick={onStart}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-3 py-1.5 rounded-md shadow-sm transition"
            title="Start continuous simulation ticks"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Start</span>
          </button>
        )}

        {/* Step Forward */}
        <button
          onClick={onStep}
          className="flex items-center gap-1.5 bg-navy-850 hover:bg-navy-800 text-slate-200 border border-slate-700/70 text-xs font-semibold px-2.5 py-1.5 rounded-md shadow-sm transition"
          title="Step simulation forward by 1 tick (1s)"
        >
          <StepForward className="w-3.5 h-3.5 text-blue-400" />
          <span>Step 1s</span>
        </button>

        {/* Reset */}
        <button
          onClick={onReset}
          className="flex items-center gap-1.5 bg-navy-850 hover:bg-navy-800 text-slate-300 border border-slate-700/70 text-xs font-semibold px-2.5 py-1.5 rounded-md shadow-sm transition"
          title="Reset simulation to pristine baseline"
        >
          <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
          <span>Reset</span>
        </button>

        {/* Failback Button (Visible when Secondary is Active) */}
        {canFailback && (
          <button
            onClick={onTriggerFailback}
            className="flex items-center gap-1.5 bg-purple-700 hover:bg-purple-600 text-white text-xs font-semibold px-3 py-1.5 rounded-md shadow-sm transition animate-pulse"
            title="Initiate safe controlled failback to restored Region A"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>Initiate Failback</span>
          </button>
        )}

        {/* Scenarios Preset Dropdown */}
        <div className="hidden lg:block ml-2">
          <select
            value={state?.activeScenario || ''}
            onChange={(e) => e.target.value && onSelectScenario(e.target.value)}
            className="bg-navy-900 border border-slate-700 text-slate-200 text-xs rounded-md px-2.5 py-1.5 font-medium focus:outline-none focus:border-blue-500"
          >
            <option value="" disabled>Select Scenario Preset...</option>
            {scenarios.map((sc) => (
              <option key={sc.id} value={sc.id}>
                {sc.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Right Action Tools */}
      <div className="flex items-center gap-2">
        {/* Learn Mode */}
        <button
          onClick={onOpenLearn}
          className="flex items-center gap-1.5 bg-blue-950/80 hover:bg-blue-900 text-blue-300 border border-blue-700/70 text-xs font-semibold px-3 py-1.5 rounded-md shadow-sm transition"
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Learn Mode & Viva</span>
        </button>

        {/* Report Generator */}
        <button
          onClick={onOpenReport}
          className="flex items-center gap-1.5 bg-navy-850 hover:bg-navy-800 text-slate-200 border border-slate-700/80 text-xs font-semibold px-3 py-1.5 rounded-md shadow-sm transition"
        >
          <FileText className="w-3.5 h-3.5 text-emerald-400" />
          <span>Simulation Report</span>
        </button>
      </div>
    </header>
  );
};
