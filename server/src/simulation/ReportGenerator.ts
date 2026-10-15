import { SimulationState } from '../types/simulation';
import { EventLogger } from './EventLogger';

export interface SimulationReportData {
  generatedAt: string;
  simulationTimeSeconds: number;
  activeScenario: string;
  failoverState: string;
  failoverDurationMs: number | null;
  totalFailoversCount: number;
  activeWriter: string | null;
  singleWriterInvariantSatisfied: boolean;
  splitBrainAttemptsPrevented: number;
  staleWritesBlocked: number;
  quorumDecision: string;
  dnsTarget: string;
  dnsClientTrafficA: number;
  dnsClientTrafficB: number;
  totalWritesSubmitted: number;
  totalWritesAccepted: number;
  totalWritesRejected: number;
  dataLossExposureCount: number;
  invariantsSummary: {
    totalChecked: number;
    passed: number;
    failed: number;
    results: any[];
  };
  recentKeyEvents: any[];
}

export class ReportGenerator {
  public static generateReportData(state: SimulationState, logger: EventLogger): SimulationReportData {
    const invariants = state.invariants;
    const passedInvariants = invariants.filter(i => i.passed).length;

    return {
      generatedAt: new Date().toISOString(),
      simulationTimeSeconds: state.simulationTime,
      activeScenario: state.activeScenario || 'Custom Simulation',
      failoverState: state.failover.currentState,
      failoverDurationMs: state.failover.lastFailoverDurationMs,
      totalFailoversCount: state.failover.failoverCount,
      activeWriter: state.splitBrainGuard.currentLeaseHolder,
      singleWriterInvariantSatisfied: state.splitBrainGuard.invariantSatisfied,
      splitBrainAttemptsPrevented: state.splitBrainGuard.splitBrainAttemptsPreventedCount,
      staleWritesBlocked: state.splitBrainGuard.staleWritesBlockedCount,
      quorumDecision: state.quorum.decision,
      dnsTarget: state.dns.currentRecordTarget,
      dnsClientTrafficA: state.dns.clientTrafficDistribution.regionA,
      dnsClientTrafficB: state.dns.clientTrafficDistribution.regionB,
      totalWritesSubmitted: state.database.totalWritesSubmitted,
      totalWritesAccepted: state.database.totalWritesAccepted,
      totalWritesRejected: state.database.totalWritesRejected,
      dataLossExposureCount: state.database.dataLossExposureCount,
      invariantsSummary: {
        totalChecked: invariants.length,
        passed: passedInvariants,
        failed: invariants.length - passedInvariants,
        results: invariants,
      },
      recentKeyEvents: logger.getEvents({ limit: 20 }),
    };
  }

  public static generateHtmlReport(data: SimulationReportData): string {
    const isOverallPass = data.invariantsSummary.failed === 0 && data.singleWriterInvariantSatisfied;

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>RegionGuard Simulation Audit Report - PS 23</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background: #0b1120; color: #f1f5f9; margin: 0; padding: 32px; }
    .container { max-width: 900px; margin: 0 auto; background: #111c34; border: 1px solid #1e293b; border-radius: 12px; padding: 32px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5); }
    .header { border-bottom: 2px solid #223561; padding-bottom: 20px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center; }
    .title { font-size: 24px; font-weight: 700; color: #38bdf8; margin: 0; }
    .subtitle { font-size: 14px; color: #94a3b8; margin-top: 4px; }
    .badge { padding: 6px 14px; border-radius: 9999px; font-size: 13px; font-weight: 600; text-transform: uppercase; }
    .badge-pass { background: rgba(16, 185, 129, 0.2); color: #34d399; border: 1px solid #059669; }
    .badge-fail { background: rgba(244, 63, 94, 0.2); color: #fb7185; border: 1px solid #e11d48; }
    .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 28px; }
    .card { background: #0d1527; border: 1px solid #1e293b; border-radius: 8px; padding: 16px; }
    .card-label { font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; font-weight: 600; }
    .card-value { font-size: 20px; font-weight: 700; color: #e2e8f0; margin-top: 6px; }
    h2 { font-size: 16px; text-transform: uppercase; letter-spacing: 0.05em; color: #38bdf8; border-bottom: 1px solid #223561; padding-bottom: 8px; margin-top: 28px; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 13px; }
    th { text-align: left; background: #070b14; padding: 10px; color: #94a3b8; font-weight: 600; border-bottom: 1px solid #223561; }
    td { padding: 10px; border-bottom: 1px solid #162342; color: #cbd5e1; }
    .status-pill { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; }
    .status-ok { background: #064e3b; color: #6ee7b7; }
    .status-err { background: #881337; color: #fda4af; }
    .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #1e293b; padding-top: 16px; }
    @media print {
      body { background: white; color: black; }
      .container { background: white; border: none; box-shadow: none; }
      .card { background: #f8fafc; border: 1px solid #e2e8f0; }
      .card-value { color: #0f172a; }
      th { background: #f1f5f9; color: #334155; }
      td { border-bottom: 1px solid #e2e8f0; color: #1e293b; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div>
        <h1 class="title">RegionGuard Virtual Lab Report</h1>
        <div class="subtitle">PS 23: Multi-Region Active-Passive Failover Controller &bull; Generated: ${data.generatedAt}</div>
      </div>
      <div>
        <span class="badge ${isOverallPass ? 'badge-pass' : 'badge-fail'}">
          ${isOverallPass ? 'SAFETY PASSED' : 'SAFETY VIOLATION'}
        </span>
      </div>
    </div>

    <div class="grid">
      <div class="card">
        <div class="card-label">Active Scenario</div>
        <div class="card-value">${data.activeScenario}</div>
      </div>
      <div class="card">
        <div class="card-label">Failover State</div>
        <div class="card-value">${data.failoverState}</div>
      </div>
      <div class="card">
        <div class="card-label">Failover Duration</div>
        <div class="card-value">${data.failoverDurationMs ? `${data.failoverDurationMs} ms` : 'N/A'}</div>
      </div>
      <div class="card">
        <div class="card-label">Active Writer</div>
        <div class="card-value" style="color: #34d399;">${data.activeWriter ? data.activeWriter.toUpperCase() : 'NONE'}</div>
      </div>
      <div class="card">
        <div class="card-label">Split-Brain Invariant</div>
        <div class="card-value" style="color: ${data.singleWriterInvariantSatisfied ? '#34d399' : '#fb7185'};">
          ${data.singleWriterInvariantSatisfied ? '0 OR 1 (STRICT)' : 'VIOLATED'}
        </div>
      </div>
      <div class="card">
        <div class="card-label">Prevented Split-Brains</div>
        <div class="card-value">${data.splitBrainAttemptsPrevented}</div>
      </div>
      <div class="card">
        <div class="card-label">DNS Target & Traffic</div>
        <div class="card-value">${data.dnsTarget.toUpperCase()} (A: ${data.dnsClientTrafficA}%, B: ${data.dnsClientTrafficB}%)</div>
      </div>
      <div class="card">
        <div class="card-label">Writes (Acc / Rej)</div>
        <div class="card-value">${data.totalWritesAccepted} / ${data.totalWritesRejected}</div>
      </div>
      <div class="card">
        <div class="card-label">Data Loss Exposure</div>
        <div class="card-value" style="color: ${data.dataLossExposureCount > 0 ? '#fb7185' : '#34d399'};">
          ${data.dataLossExposureCount} transactions
        </div>
      </div>
    </div>

    <h2>Distributed Correctness Invariants</h2>
    <table>
      <thead>
        <tr>
          <th>ID</th>
          <th>Invariant Rule</th>
          <th>Status</th>
          <th>Verification Detail</th>
        </tr>
      </thead>
      <tbody>
        ${data.invariantsSummary.results
          .map(
            inv => `<tr>
              <td><strong>${inv.id}</strong></td>
              <td>${inv.name}</td>
              <td><span class="status-pill ${inv.passed ? 'status-ok' : 'status-err'}">${inv.passed ? 'PASSED' : 'FAIL'}</span></td>
              <td>${inv.details}</td>
            </tr>`
          )
          .join('')}
      </tbody>
    </table>

    <h2>Recent Key Events Audit Trail</h2>
    <table>
      <thead>
        <tr>
          <th>Sim Time</th>
          <th>Severity</th>
          <th>Component</th>
          <th>Event Description</th>
        </tr>
      </thead>
      <tbody>
        ${data.recentKeyEvents
          .slice(0, 10)
          .map(
            evt => `<tr>
              <td>t=${evt.simulationTime}s</td>
              <td><span class="status-pill ${evt.severity === 'ERROR' || evt.severity === 'CRITICAL' ? 'status-err' : 'status-ok'}">${evt.severity}</span></td>
              <td>${evt.component}</td>
              <td>${evt.description}</td>
            </tr>`
          )
          .join('')}
      </tbody>
    </table>

    <div class="footer">
      RegionGuard Multi-Region Active-Passive Failover Simulation Engine &bull; Educational Virtual Lab &bull; Google Antigravity
    </div>
  </div>
</body>
</html>`;
  }
}
