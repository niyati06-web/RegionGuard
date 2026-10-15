import React from 'react';
import { Database, ArrowRight, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import { DatabaseState } from '../../types';
import { StatusBadge } from '../common/StatusBadge';

interface DatabaseReplicationPanelProps {
  database: DatabaseState;
}

export const DatabaseReplicationPanel: React.FC<DatabaseReplicationPanelProps> = ({ database }) => {
  return (
    <div className="flex flex-col h-full p-3 text-xs space-y-3 overflow-y-auto">
      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-navy-950 p-2.5 rounded border border-slate-800">
          <div className="text-slate-400 text-[10.5px] uppercase font-semibold">Active Writer</div>
          <div className="text-base font-bold font-mono text-emerald-400 mt-0.5">
            {database.activeWriter?.toUpperCase() || 'NONE'}
          </div>
        </div>

        <div className="bg-navy-950 p-2.5 rounded border border-slate-800">
          <div className="text-slate-400 text-[10.5px] uppercase font-semibold">Read Replica</div>
          <div className="text-base font-bold font-mono text-blue-400 mt-0.5">
            {database.readReplica?.toUpperCase() || 'NONE'}
          </div>
        </div>

        <div className="bg-navy-950 p-2.5 rounded border border-slate-800">
          <div className="text-slate-400 text-[10.5px] uppercase font-semibold">Replication Lag</div>
          <div className={`text-base font-bold font-mono mt-0.5 ${database.replicationLagMs > 500 ? 'text-rose-400' : 'text-slate-200'}`}>
            {database.replicationLagMs} ms
          </div>
        </div>

        <div className="bg-navy-950 p-2.5 rounded border border-slate-800">
          <div className="text-slate-400 text-[10.5px] uppercase font-semibold">Promotion Policy</div>
          <div className="text-base font-bold font-mono text-purple-400 mt-0.5">
            {database.promotionPolicy}
          </div>
        </div>
      </div>

      {/* Transaction Log Table */}
      <div className="flex-1 bg-navy-950 rounded border border-slate-800 flex flex-col overflow-hidden">
        <div className="p-2 border-b border-slate-800 flex items-center justify-between">
          <div className="font-bold text-slate-300 text-[11px] uppercase tracking-wide flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5 text-blue-400" />
            <span>Transaction Replication Ledger (Committed & In-Flight)</span>
          </div>
          <span className="text-slate-400 font-mono text-[11px]">
            Backlog: {database.replicationQueueSize} tx pending replication
          </span>
        </div>

        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-left font-mono text-[11px]">
            <thead className="bg-navy-900 text-slate-400 sticky top-0">
              <tr>
                <th className="py-1.5 px-3">Tx ID</th>
                <th className="py-1.5 px-3">Type</th>
                <th className="py-1.5 px-3">Description</th>
                <th className="py-1.5 px-3">Origin</th>
                <th className="py-1.5 px-3">Epoch</th>
                <th className="py-1.5 px-3">Replication Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {database.records.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-slate-500 font-sans">
                    No transactions recorded yet.
                  </td>
                </tr>
              ) : (
                database.records.slice().reverse().map((tx) => (
                  <tr key={tx.id} className="hover:bg-navy-850/50">
                    <td className="py-1.5 px-3 font-bold text-slate-200">#{tx.sequenceNumber}</td>
                    <td className="py-1.5 px-3 text-purple-300">{tx.type}</td>
                    <td className="py-1.5 px-3 font-sans text-slate-200">{tx.description}</td>
                    <td className="py-1.5 px-3 uppercase text-blue-400 font-semibold">{tx.originRegion}</td>
                    <td className="py-1.5 px-3 text-slate-400">Epoch {tx.epoch}</td>
                    <td className="py-1.5 px-3">
                      {tx.replicated ? (
                        <span className="inline-flex items-center gap-1 text-emerald-400 font-sans text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Replicated to {database.readReplica?.toUpperCase()}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-amber-400 font-sans text-[11px] animate-pulse">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Queued in replication backlog</span>
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
