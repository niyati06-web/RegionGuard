import { DnsProviderAdapter, DnsRecordDetails } from './DnsProviderAdapter';
import { RegionId } from '../types/simulation';

export class SimulatedDnsAdapter implements DnsProviderAdapter {
  private currentTarget: RegionId = 'region-a';
  private ttl: number = 5;
  private lastUpdated: number = Date.now();

  public getProviderName(): string {
    return 'Simulated Route 53 / Anycast DNS';
  }

  public isRealCloudProvider(): boolean {
    return false;
  }

  public async updateRecord(
    recordName: string,
    targetRegion: RegionId,
    ttl: number
  ): Promise<{ success: boolean; message: string }> {
    this.currentTarget = targetRegion;
    this.ttl = ttl;
    this.lastUpdated = Date.now();
    return {
      success: true,
      message: `Simulated DNS record "${recordName}" pointed to ${targetRegion} with TTL ${ttl}s.`,
    };
  }

  public async getRecordStatus(recordName: string): Promise<DnsRecordDetails> {
    return {
      recordName,
      targetRegion: this.currentTarget,
      targetEndpoint: this.currentTarget === 'region-a' ? 'us-east.regionguard.net' : 'us-west.regionguard.net',
      ttlSeconds: this.ttl,
      lastUpdated: this.lastUpdated,
    };
  }
}
