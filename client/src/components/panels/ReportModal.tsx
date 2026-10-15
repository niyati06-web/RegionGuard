import React, { useEffect, useState } from 'react';
import { FileText, Download, Printer, CheckCircle2, XCircle, X } from 'lucide-react';
import * as api from '../../services/api';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ReportModal: React.FC<ReportModalProps> = ({ isOpen, onClose }) => {
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      api.fetchReportData()
        .then(setReport)
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isAllPassed = report?.invariantsSummary?.failed === 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm select-none">
      <div className="bg-navy-900 border border-slate-700 rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden text-xs">
        {/* Header */}
        <div className="p-4 bg-navy-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-950 border border-emerald-700 text-emerald-400 rounded-lg">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">
                RegionGuard Simulation Audit Report
              </h2>
              <p className="text-slate-400 text-xs">
                Generated from backend simulation state and distributed consensus audit log
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 p-1 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 text-slate-300 space-y-4">
          {loading ? (
            <div className="py-12 text-center text-slate-400">Loading simulation report...</div>
          ) : report ? (
            <>
              {/* Summary Scorecard */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-navy-950 p-3 rounded-lg border border-slate-800">
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Invariant Status</div>
                  <div className={`text-base font-bold font-mono mt-1 ${isAllPassed ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {isAllPassed ? 'ALL PASSED' : 'VIOLATION DETECTED'}
                  </div>
                </div>

                <div className="bg-navy-950 p-3 rounded-lg border border-slate-800">
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Active Leader</div>
                  <div className="text-base font-bold font-mono text-emerald-400 mt-1">
                    {report.activeWriter ? report.activeWriter.toUpperCase() : 'NONE'}
                  </div>
                </div>

                <div className="bg-navy-950 p-3 rounded-lg border border-slate-800">
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Failover Duration</div>
                  <div className="text-base font-bold font-mono text-slate-100 mt-1">
                    {report.failoverDurationMs ? `${report.failoverDurationMs} ms` : 'N/A'}
                  </div>
                </div>

                <div className="bg-navy-950 p-3 rounded-lg border border-slate-800">
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Split-Brains Blocked</div>
                  <div className="text-base font-bold font-mono text-amber-400 mt-1">
                    {report.splitBrainAttemptsPrevented}
                  </div>
                </div>
              </div>

              {/* Invariants Table */}
              <div className="bg-navy-950 rounded-lg border border-slate-800 p-3.5 space-y-2">
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-300">
                  Consensus & Safety Invariant Audits
                </h3>
                <div className="space-y-1.5 font-mono text-[11px]">
                  {report.invariantsSummary?.results?.map((inv: any) => (
                    <div key={inv.id} className="flex items-start justify-between p-2 rounded bg-navy-900 border border-slate-800">
                      <div>
                        <div className="font-bold text-slate-200">
                          [{inv.id}] {inv.name}
                        </div>
                        <div className="text-[10.5px] text-slate-400 font-sans mt-0.5">{inv.details}</div>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        inv.passed ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-rose-950 text-rose-300 border border-rose-800'
                      }`}>
                        {inv.passed ? 'PASSED' : 'FAILED'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="py-12 text-center text-rose-400">Failed to load report data.</div>
          )}
        </div>

        {/* Footer with Action Buttons */}
        <div className="p-3 bg-navy-950 border-t border-slate-800 flex items-center justify-between">
          <div className="text-[11px] text-slate-400">
            Audit report includes simulation state machine timeline and invariant verifications.
          </div>
          <div className="flex items-center gap-2">
            <a
              href={api.getHtmlReportUrl()}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs px-3 py-1.5 rounded transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Save HTML PDF</span>
            </a>
            <button
              onClick={onClose}
              className="bg-navy-850 hover:bg-navy-800 text-slate-300 border border-slate-700 text-xs px-3 py-1.5 rounded transition"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
