import { ScenarioDefinition, SimulationEvent, SimulationState } from '../types';

const DEFAULT_BACKEND_URL = 'https://regionguard-backend.onrender.com';

const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : import.meta.env.DEV
  ? '/api'
  : `${DEFAULT_BACKEND_URL}/api`;

export async function fetchHealth() {
  const res = await fetch(`${API_BASE}/health`);
  return res.json();
}

export async function fetchState(): Promise<SimulationState> {
  const res = await fetch(`${API_BASE}/simulation/state`);
  return res.json();
}

export async function fetchMetrics(limit?: number) {
  const url = limit ? `${API_BASE}/simulation/metrics?limit=${limit}` : `${API_BASE}/simulation/metrics`;
  const res = await fetch(url);
  return res.json();
}

export async function fetchEvents(params?: { severity?: string; component?: string; search?: string; limit?: number }): Promise<SimulationEvent[]> {
  const query = new URLSearchParams();
  if (params?.severity) query.append('severity', params.severity);
  if (params?.component) query.append('component', params.component);
  if (params?.search) query.append('search', params.search);
  if (params?.limit) query.append('limit', params.limit.toString());

  const res = await fetch(`${API_BASE}/simulation/events?${query.toString()}`);
  return res.json();
}

export async function fetchScenarios(): Promise<ScenarioDefinition[]> {
  const res = await fetch(`${API_BASE}/simulation/scenarios`);
  return res.json();
}

export async function startSimulation() {
  const res = await fetch(`${API_BASE}/simulation/start`, { method: 'POST' });
  return res.json();
}

export async function pauseSimulation() {
  const res = await fetch(`${API_BASE}/simulation/pause`, { method: 'POST' });
  return res.json();
}

export async function stepSimulation() {
  const res = await fetch(`${API_BASE}/simulation/step`, { method: 'POST' });
  return res.json();
}

export async function resetSimulation() {
  const res = await fetch(`${API_BASE}/simulation/reset`, { method: 'POST' });
  return res.json();
}

export async function applyScenario(scenarioId: string) {
  const res = await fetch(`${API_BASE}/simulation/scenario/${scenarioId}`, { method: 'POST' });
  return res.json();
}

export async function applyFaults(faults: Record<string, any>) {
  const res = await fetch(`${API_BASE}/simulation/faults`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(faults),
  });
  return res.json();
}

export async function clearAllFaults() {
  const res = await fetch(`${API_BASE}/simulation/faults/clear`, { method: 'POST' });
  return res.json();
}

export async function submitDatabaseWrite(data: {
  originRegion: 'region-a' | 'region-b';
  type: string;
  description: string;
  requestEpoch?: number;
}) {
  const res = await fetch(`${API_BASE}/simulation/write`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function triggerFailback() {
  const res = await fetch(`${API_BASE}/simulation/failback`, { method: 'POST' });
  return res.json();
}

export async function updateDnsConfig(config: { ttlSeconds?: number; propagationDelaySeconds?: number; providerType?: string }) {
  const res = await fetch(`${API_BASE}/simulation/dns/config`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  });
  return res.json();
}

export async function updatePromotionPolicy(policy: 'SAFETY_FIRST' | 'AVAILABILITY_FIRST') {
  const res = await fetch(`${API_BASE}/simulation/policy`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ policy }),
  });
  return res.json();
}

export async function fetchReportData() {
  const res = await fetch(`${API_BASE}/simulation/report`);
  return res.json();
}

export function getHtmlReportUrl(): string {
  return `${API_BASE}/simulation/report/html`;
}

export function getExportJsonUrl(): string {
  return `${API_BASE}/simulation/export/json`;
}

export function getExportCsvUrl(): string {
  return `${API_BASE}/simulation/export/csv`;
}
