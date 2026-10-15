import { SimulationEvent } from '../types/simulation';

export type EventListener = (event: SimulationEvent) => void;

export class EventLogger {
  private events: SimulationEvent[] = [];
  private maxEvents: number = 1000;
  private listeners: EventListener[] = [];
  private eventIdCounter: number = 1;

  public log(params: {
    simulationTime: number;
    eventType: string;
    severity: 'INFO' | 'WARN' | 'ERROR' | 'SUCCESS' | 'CRITICAL';
    component: string;
    description: string;
    previousState?: string;
    newState?: string;
    decisionReason?: string;
  }): SimulationEvent {
    const event: SimulationEvent = {
      id: `evt-${this.eventIdCounter++}-${Date.now().toString(36)}`,
      simulationTime: params.simulationTime,
      wallClockTimestamp: Date.now(),
      eventType: params.eventType,
      severity: params.severity,
      component: params.component,
      description: params.description,
      previousState: params.previousState,
      newState: params.newState,
      decisionReason: params.decisionReason,
    };

    this.events.unshift(event);
    if (this.events.length > this.maxEvents) {
      this.events.pop();
    }

    // Notify listeners
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (err) {
        console.error('Error in event listener:', err);
      }
    }

    return event;
  }

  public subscribe(listener: EventListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  public getEvents(filter?: {
    severity?: string;
    component?: string;
    eventType?: string;
    search?: string;
    limit?: number;
  }): SimulationEvent[] {
    let result = [...this.events];

    if (filter) {
      if (filter.severity && filter.severity !== 'ALL') {
        result = result.filter(e => e.severity === filter.severity);
      }
      if (filter.component && filter.component !== 'ALL') {
        result = result.filter(e => e.component.toLowerCase().includes(filter.component!.toLowerCase()));
      }
      if (filter.eventType && filter.eventType !== 'ALL') {
        result = result.filter(e => e.eventType === filter.eventType);
      }
      if (filter.search) {
        const query = filter.search.toLowerCase();
        result = result.filter(e =>
          e.description.toLowerCase().includes(query) ||
          e.component.toLowerCase().includes(query) ||
          e.eventType.toLowerCase().includes(query)
        );
      }
      if (filter.limit && filter.limit > 0) {
        result = result.slice(0, filter.limit);
      }
    }

    return result;
  }

  public clear(): void {
    this.events = [];
    this.eventIdCounter = 1;
  }

  public exportJson(): string {
    return JSON.stringify(this.events, null, 2);
  }

  public exportCsv(): string {
    if (this.events.length === 0) {
      return 'id,simulationTime,wallClockTimestamp,eventType,severity,component,description,previousState,newState,decisionReason\n';
    }

    const headers = ['id', 'simulationTime', 'wallClockTimestamp', 'eventType', 'severity', 'component', 'description', 'previousState', 'newState', 'decisionReason'];
    const rows = this.events.map(e => {
      return [
        e.id,
        e.simulationTime,
        new Date(e.wallClockTimestamp).toISOString(),
        `"${e.eventType}"`,
        `"${e.severity}"`,
        `"${e.component}"`,
        `"${e.description.replace(/"/g, '""')}"`,
        `"${(e.previousState || '').replace(/"/g, '""')}"`,
        `"${(e.newState || '').replace(/"/g, '""')}"`,
        `"${(e.decisionReason || '').replace(/"/g, '""')}"`
      ].join(',');
    });

    return [headers.join(','), ...rows].join('\n');
  }
}
