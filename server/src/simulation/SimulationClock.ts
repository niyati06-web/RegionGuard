export type TickCallback = (simTime: number) => void;

export class SimulationClock {
  private simTime: number = 0; // In seconds
  private intervalId: NodeJS.Timeout | null = null;
  private tickRateMs: number = 1000;
  private isRunning: boolean = false;
  private onTickCallbacks: TickCallback[] = [];

  constructor(tickRateMs: number = 1000) {
    this.tickRateMs = tickRateMs;
  }

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.intervalId = setInterval(() => {
      this.step();
    }, this.tickRateMs);
  }

  public pause(): void {
    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  public step(): void {
    this.simTime += 1;
    for (const cb of this.onTickCallbacks) {
      cb(this.simTime);
    }
  }

  public reset(): void {
    this.pause();
    this.simTime = 0;
  }

  public getTime(): number {
    return this.simTime;
  }

  public isActive(): boolean {
    return this.isRunning;
  }

  public setTickRate(ms: number): void {
    this.tickRateMs = Math.max(100, Math.min(ms, 10000));
    if (this.isRunning) {
      this.pause();
      this.start();
    }
  }

  public getTickRate(): number {
    return this.tickRateMs;
  }

  public onTick(cb: TickCallback): () => void {
    this.onTickCallbacks.push(cb);
    return () => {
      this.onTickCallbacks = this.onTickCallbacks.filter(c => c !== cb);
    };
  }
}
