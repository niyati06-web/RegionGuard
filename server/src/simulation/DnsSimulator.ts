import { DnsState, RegionId } from '../types/simulation';
import { DnsProviderAdapter } from '../dns-adapters/DnsProviderAdapter';
import { SimulatedDnsAdapter } from '../dns-adapters/SimulatedDnsAdapter';
import { Route53ScaffoldAdapter } from '../dns-adapters/Route53ScaffoldAdapter';
import { CloudDnsScaffoldAdapter } from '../dns-adapters/CloudDnsScaffoldAdapter';
import { EventLogger } from './EventLogger';

export class DnsSimulator {
  private adapter: DnsProviderAdapter;
  private recordName: string = 'api.regionguard.net';
  private currentRecordTarget: RegionId = 'region-a';
  private effectiveTarget: RegionId = 'region-a';
  private dnsTtlSeconds: number = 5;
  private propagationDelaySeconds: number = 3;
  private propagationProgressPercent: number = 100;
  private isPropagating: boolean = false;
  private propagationStartSimTime: number = 0;
  private lastRecordUpdateTimestamp: number = Date.now();
  private logger: EventLogger;

  private clientTrafficDistribution = {
    regionA: 100,
    regionB: 0,
  };

  private endpoints = {
    'region-a': 'us-east-1.alb.regionguard.net',
    'region-b': 'us-west-2.alb.regionguard.net',
  };

  constructor(logger: EventLogger, providerType: 'simulated' | 'route53' | 'clouddns' = 'simulated') {
    this.logger = logger;
    this.adapter = this.createAdapter(providerType);
  }

  private createAdapter(type: 'simulated' | 'route53' | 'clouddns'): DnsProviderAdapter {
    switch (type) {
      case 'route53':
        return new Route53ScaffoldAdapter();
      case 'clouddns':
        return new CloudDnsScaffoldAdapter();
      default:
        return new SimulatedDnsAdapter();
    }
  }

  public setProviderType(type: 'simulated' | 'route53' | 'clouddns'): void {
    this.adapter = this.createAdapter(type);
  }

  public getState(): DnsState {
    const providerType =
      this.adapter instanceof Route53ScaffoldAdapter
        ? 'route53'
        : this.adapter instanceof CloudDnsScaffoldAdapter
        ? 'clouddns'
        : 'simulated';

    return {
      providerType,
      recordName: this.recordName,
      currentRecordTarget: this.currentRecordTarget,
      effectiveTarget: this.effectiveTarget,
      dnsTtlSeconds: this.dnsTtlSeconds,
      propagationDelaySeconds: this.propagationDelaySeconds,
      propagationProgressPercent: Math.round(this.propagationProgressPercent),
      isPropagating: this.isPropagating,
      clientTrafficDistribution: { ...this.clientTrafficDistribution },
      endpoints: { ...this.endpoints },
      lastRecordUpdateTimestamp: this.lastRecordUpdateTimestamp,
    };
  }

  public setTtl(seconds: number): void {
    this.dnsTtlSeconds = Math.max(1, Math.min(seconds, 300));
  }

  public setPropagationDelay(seconds: number): void {
    this.propagationDelaySeconds = Math.max(0, Math.min(seconds, 60));
  }

  public async updateTarget(newTarget: RegionId, simTime: number, isDelayInjected: boolean = false): Promise<void> {
    if (this.currentRecordTarget === newTarget && !this.isPropagating) {
      return;
    }

    const prevTarget = this.currentRecordTarget;
    this.currentRecordTarget = newTarget;
    this.lastRecordUpdateTimestamp = Date.now();
    this.isPropagating = true;
    this.propagationStartSimTime = simTime;
    this.propagationProgressPercent = 0;

    const delay = isDelayInjected ? this.propagationDelaySeconds + 5 : this.propagationDelaySeconds;
    this.propagationDelaySeconds = delay;

    await this.adapter.updateRecord(this.recordName, newTarget, this.dnsTtlSeconds);

    this.logger.log({
      simulationTime: simTime,
      eventType: 'DNS_RECORD_UPDATED',
      severity: 'SUCCESS',
      component: 'DnsRouter',
      description: `DNS A-Record for "${this.recordName}" updated from [${prevTarget.toUpperCase()}] to [${newTarget.toUpperCase()}]. TTL: ${this.dnsTtlSeconds}s.`,
      previousState: prevTarget,
      newState: newTarget,
      decisionReason: `Client caches will honor old TTL for up to ${this.dnsTtlSeconds}s before complete traffic cutover.`,
    });
  }

  public tickPropagation(simTime: number): void {
    if (!this.isPropagating) {
      // Steady state traffic
      if (this.currentRecordTarget === 'region-a') {
        this.clientTrafficDistribution.regionA = 100;
        this.clientTrafficDistribution.regionB = 0;
        this.effectiveTarget = 'region-a';
      } else {
        this.clientTrafficDistribution.regionA = 0;
        this.clientTrafficDistribution.regionB = 100;
        this.effectiveTarget = 'region-b';
      }
      return;
    }

    const elapsed = simTime - this.propagationStartSimTime;
    const totalMigrationTime = Math.max(1, this.dnsTtlSeconds + this.propagationDelaySeconds);
    const progress = Math.min(100, (elapsed / totalMigrationTime) * 100);

    this.propagationProgressPercent = progress;

    if (this.currentRecordTarget === 'region-b') {
      // Moving from A to B
      this.clientTrafficDistribution.regionB = Math.round(progress);
      this.clientTrafficDistribution.regionA = 100 - this.clientTrafficDistribution.regionB;
    } else {
      // Moving from B to A
      this.clientTrafficDistribution.regionA = Math.round(progress);
      this.clientTrafficDistribution.regionB = 100 - this.clientTrafficDistribution.regionA;
    }

    if (progress >= 100) {
      this.isPropagating = false;
      this.effectiveTarget = this.currentRecordTarget;

      this.logger.log({
        simulationTime: simTime,
        eventType: 'TRAFFIC_MIGRATED',
        severity: 'INFO',
        component: 'DnsRouter',
        description: `Global client resolver cache TTL expired. 100% client traffic now successfully flowing to [${this.currentRecordTarget.toUpperCase()}].`,
        newState: `100% -> ${this.currentRecordTarget.toUpperCase()}`,
      });
    }
  }

  public reset(): void {
    this.currentRecordTarget = 'region-a';
    this.effectiveTarget = 'region-a';
    this.isPropagating = false;
    this.propagationProgressPercent = 100;
    this.clientTrafficDistribution = { regionA: 100, regionB: 0 };
    this.dnsTtlSeconds = 5;
    this.propagationDelaySeconds = 3;
    this.lastRecordUpdateTimestamp = Date.now();
  }
}
