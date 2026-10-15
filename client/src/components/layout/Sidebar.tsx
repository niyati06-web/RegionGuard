import React, { useState } from 'react';
import {
  AlertTriangle,
  PlayCircle,
  Database,
  Flame,
  Network,
  Radio,
  Clock,
  Sparkles,
  Send,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { ScenarioDefinition, SimulationState } from '../../types';

interface SidebarProps {
  state: SimulationState | null;
  scenarios: ScenarioDefinition[];
  onSelectScenario: (id: string) => void;
  onToggleFault: (key: string, value: any) => void;
  onClearFaults: () => void;
  onSubmitWrite: (data: {
    originRegion: 'region-a' | 'region-b';
    type: string;
    description: string;
  }) => Promise<any>;
}

export const Sidebar: React.FC<SidebarProps> = ({
  state,
  scenarios,
  onSelectScenario,
  onToggleFault,
  onClearFaults,
  onSubmitWrite,
}) => {
  const [activeTab, setActiveTab] = useState<'scenarios' | 'faults' | 'writes'>('scenarios');
  const [writeRegion, setWriteRegion] = useState<'region-a' | 'region-b'>('region-a');
  const [writeType, setWriteType] = useState<string>('STUDENT_ATTENDANCE');
  const [writeDesc, setWriteDesc] = useState<string>('Student check-in roll call verify #1092');
  const [writeResult, setWriteResult] = useState<{ accepted: boolean; message: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const faults = state?.faults;

  const handleWriteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setWriteResult(null);
    try {
      const res = await onSubmitWrite({
        originRegion: writeRegion,
        type: writeType,
        description: writeDesc,
      });
      setWriteResult({
        accepted: res.accepted,
        message: res.reason || (res.accepted ? 'Transaction accepted and queued for replication.' : 'Rejected by guard.'),
      });
    } catch (err: any) {
      setWriteResult({ accepted: false, message: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <aside className="w-80 h-full bg-navy-900 border-r border-slate-800 flex flex-col shrink-0 select-none overflow-hidden">
      {/* Sidebar Tabs */}
      <div className="flex border-b border-slate-800 bg-navy-950 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('scenarios')}
          className={`flex-1 py-2.5 px-3 flex items-center justify-center gap-1.5 transition ${
            activeTab === 'scenarios'
              ? 'text-blue-400 border-b-2 border-blue-500 bg-navy-900/60'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <PlayCircle className="w-3.5 h-3.5" />
          <span>Scenarios</span>
        </button>

        <button
          onClick={() => setActiveTab('faults')}
          className={`flex-1 py-2.5 px-3 flex items-center justify-center gap-1.5 transition ${
            activeTab === 'faults'
              ? 'text-rose-400 border-b-2 border-rose-500 bg-navy-900/60'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Flame className="w-3.5 h-3.5" />
          <span>Fault Injection</span>
        </button>

        <button
          onClick={() => setActiveTab('writes')}
          className={`flex-1 py-2.5 px-3 flex items-center justify-center gap-1.5 transition ${
            activeTab === 'writes'
              ? 'text-emerald-400 border-b-2 border-emerald-500 bg-navy-900/60'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Database className="w-3.5 h-3.5" />
          <span>Test Writes</span>
        </button>
      </div>

      {/* Tab 1: Scenarios Presets */}
      {activeTab === 'scenarios' && (
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5 text-xs">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 px-1">
            PS 23 Guided Lab Experiments
          </div>
          {scenarios.map((sc, idx) => {
            const isActive = state?.activeScenario === sc.id;
            return (
              <div
                key={sc.id}
                className={`p-3 rounded-lg border transition ${
                  isActive
                    ? 'bg-blue-950/40 border-blue-600 shadow-md'
                    : 'bg-navy-850/80 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-slate-200 text-xs">
                    #{idx + 1} {sc.category}
                  </span>
                  <button
                    onClick={() => onSelectScenario(sc.id)}
                    className="bg-blue-600 hover:bg-blue-500 text-white font-semibold text-[11px] px-2 py-0.5 rounded shadow-sm transition"
                  >
                    Run
                  </button>
                </div>
                <div className="font-medium text-slate-300 text-xs mb-1">{sc.title}</div>
                <p className="text-slate-400 text-[11px] leading-relaxed mb-2">{sc.shortDescription}</p>
                <div className="bg-navy-950/80 p-2 rounded border border-slate-800 text-[10.5px] text-slate-300 font-mono">
                  <span className="text-emerald-400 font-semibold">Expected: </span>
                  {sc.expectedBehavior}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Tab 2: Chaos & Fault Injection */}
      {activeTab === 'faults' && (
        <div className="flex-1 overflow-y-auto p-3 space-y-3 text-xs">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Live Failure Injection
            </span>
            <button
              onClick={onClearFaults}
              className="text-[11px] text-emerald-400 hover:underline font-semibold"
            >
              Clear All Faults
            </button>
          </div>

          {/* Regional Outages */}
          <div className="bg-navy-850/80 border border-slate-800 rounded-lg p-3 space-y-2.5">
            <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wide flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-rose-400" />
              <span>Regional Outages</span>
            </div>

            <label className="flex items-center justify-between cursor-pointer py-1">
              <div>
                <div className="font-semibold text-slate-200">Shut Down Region A</div>
                <div className="text-[10.5px] text-slate-400">Primary US-East total outage</div>
              </div>
              <input
                type="checkbox"
                checked={Boolean(faults?.regionAFailed)}
                onChange={(e) => onToggleFault('regionAFailed', e.target.checked)}
                className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 bg-slate-900 border-slate-700"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer py-1">
              <div>
                <div className="font-semibold text-slate-200">Shut Down Region B</div>
                <div className="text-[10.5px] text-slate-400">Standby US-West total outage</div>
              </div>
              <input
                type="checkbox"
                checked={Boolean(faults?.regionBFailed)}
                onChange={(e) => onToggleFault('regionBFailed', e.target.checked)}
                className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 bg-slate-900 border-slate-700"
              />
            </label>
          </div>

          {/* Database Failures */}
          <div className="bg-navy-850/80 border border-slate-800 rounded-lg p-3 space-y-2.5">
            <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wide flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-amber-400" />
              <span>Database Tier Failures</span>
            </div>

            <label className="flex items-center justify-between cursor-pointer py-1">
              <div>
                <div className="font-semibold text-slate-200">Crash Primary DB</div>
                <div className="text-[10.5px] text-slate-400">Region A DB down, app web alive</div>
              </div>
              <input
                type="checkbox"
                checked={Boolean(faults?.regionADbFailed)}
                onChange={(e) => onToggleFault('regionADbFailed', e.target.checked)}
                className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 bg-slate-900 border-slate-700"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer py-1">
              <div>
                <div className="font-semibold text-slate-200">Sever Replication Link</div>
                <div className="text-[10.5px] text-slate-400">Cut DB sync pipeline</div>
              </div>
              <input
                type="checkbox"
                checked={Boolean(faults?.replicationLinkSevered)}
                onChange={(e) => onToggleFault('replicationLinkSevered', e.target.checked)}
                className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 bg-slate-900 border-slate-700"
              />
            </label>
          </div>

          {/* Network & Split-Brain */}
          <div className="bg-navy-850/80 border border-slate-800 rounded-lg p-3 space-y-2.5">
            <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wide flex items-center gap-1.5">
              <Network className="w-3.5 h-3.5 text-purple-400" />
              <span>Split-Brain & Network</span>
            </div>

            <label className="flex items-center justify-between cursor-pointer py-1">
              <div>
                <div className="font-semibold text-slate-200">WAN Network Partition</div>
                <div className="text-[10.5px] text-slate-400">Regions isolated from each other</div>
              </div>
              <input
                type="checkbox"
                checked={Boolean(faults?.networkPartitionActive)}
                onChange={(e) => onToggleFault('networkPartitionActive', e.target.checked)}
                className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 bg-slate-900 border-slate-700"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer py-1">
              <div>
                <div className="font-semibold text-slate-200">Crash Witness Quorum (2/3)</div>
                <div className="text-[10.5px] text-slate-400">Loss of majority consensus</div>
              </div>
              <input
                type="checkbox"
                checked={Boolean(faults?.quorumWitnessIdsFailed?.length && faults.quorumWitnessIdsFailed.length >= 2)}
                onChange={(e) =>
                  onToggleFault(
                    'quorumWitnessIdsFailed',
                    e.target.checked ? ['witness-1', 'witness-2'] : []
                  )
                }
                className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 bg-slate-900 border-slate-700"
              />
            </label>
          </div>

          {/* Latency & Flapping */}
          <div className="bg-navy-850/80 border border-slate-800 rounded-lg p-3 space-y-2.5">
            <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wide flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-blue-400" />
              <span>Lag, Caching & Flapping</span>
            </div>

            <label className="flex items-center justify-between cursor-pointer py-1">
              <div>
                <div className="font-semibold text-slate-200">Inject High Replication Lag</div>
                <div className="text-[10.5px] text-slate-400">4000ms+ backlog (tests policy)</div>
              </div>
              <input
                type="checkbox"
                checked={Boolean(faults?.highReplicationLagInjected)}
                onChange={(e) => onToggleFault('highReplicationLagInjected', e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 bg-slate-900 border-slate-700"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer py-1">
              <div>
                <div className="font-semibold text-slate-200">Intermittent Flapping Probes</div>
                <div className="text-[10.5px] text-slate-400">Simulate packet jitter blips</div>
              </div>
              <input
                type="checkbox"
                checked={Boolean(faults?.healthFlappingActive)}
                onChange={(e) => onToggleFault('healthFlappingActive', e.target.checked)}
                className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 bg-slate-900 border-slate-700"
              />
            </label>
          </div>
        </div>
      )}

      {/* Tab 3: Test Writes & Split-Brain Attempt */}
      {activeTab === 'writes' && (
        <div className="flex-1 overflow-y-auto p-3 text-xs">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2 px-1">
            Database Transaction Generator
          </div>

          <form onSubmit={handleWriteSubmit} className="space-y-3 bg-navy-850/80 border border-slate-800 p-3 rounded-lg">
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Target Region:</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setWriteRegion('region-a')}
                  className={`py-1.5 rounded font-mono font-semibold text-center border transition ${
                    writeRegion === 'region-a'
                      ? 'bg-blue-900/60 border-blue-500 text-blue-200'
                      : 'bg-navy-950 border-slate-700 text-slate-400'
                  }`}
                >
                  Region A
                </button>
                <button
                  type="button"
                  onClick={() => setWriteRegion('region-b')}
                  className={`py-1.5 rounded font-mono font-semibold text-center border transition ${
                    writeRegion === 'region-b'
                      ? 'bg-purple-900/60 border-purple-500 text-purple-200'
                      : 'bg-navy-950 border-slate-700 text-slate-400'
                  }`}
                >
                  Region B (Standby)
                </button>
              </div>
              <p className="text-[10.5px] text-slate-400 mt-1">
                Tip: Writing to standby Region B while Region A is active tests Split-Brain rejection!
              </p>
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">Transaction Type:</label>
              <select
                value={writeType}
                onChange={(e) => setWriteType(e.target.value)}
                className="w-full bg-navy-950 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 font-medium"
              >
                <option value="STUDENT_ATTENDANCE">Student Attendance Record</option>
                <option value="ORDER">E-Commerce Order</option>
                <option value="SYSTEM_TRANSACTION">System Auth Transaction</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">Description:</label>
              <input
                type="text"
                value={writeDesc}
                onChange={(e) => setWriteDesc(e.target.value)}
                className="w-full bg-navy-950 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 font-medium"
                placeholder="Description of mutation..."
                required
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2 rounded shadow transition disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Submit Test Mutation</span>
            </button>

            {writeResult && (
              <div
                className={`p-2.5 rounded border text-[11px] font-mono leading-relaxed ${
                  writeResult.accepted
                    ? 'bg-emerald-950/80 border-emerald-800 text-emerald-300'
                    : 'bg-rose-950/80 border-rose-800 text-rose-300'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold mb-0.5">
                  {writeResult.accepted ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-400" />
                  )}
                  <span>{writeResult.accepted ? 'WRITE COMMITTED' : 'BLOCKED BY SPLIT-BRAIN GUARD'}</span>
                </div>
                <div>{writeResult.message}</div>
              </div>
            )}
          </form>
        </div>
      )}
    </aside>
  );
};
