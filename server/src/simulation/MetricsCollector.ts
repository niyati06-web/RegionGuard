import { MetricSnapshot } from '../types/simulation';

export class MetricsCollector {
  private history: MetricSnapshot[] = [];
  private maxHistoryLength: number = 120; // 2 minutes at 1 tick/sec

  public recordSnapshot(snapshot: MetricSnapshot): void {
    this.history.push(snapshot);
    if (this.history.length > this.maxHistoryLength) {
      this.history.shift();
    }
  }

  public getHistory(limit?: number): MetricSnapshot[] {
    if (limit && limit > 0) {
      return this.history.slice(-limit);
    }
    return [...this.history];
  }

  public getLatest(): MetricSnapshot | null {
    if (this.history.length === 0) return null;
    return this.history[this.history.length - 1];
  }

  public clear(): void {
    this.history = [];
  }
}
