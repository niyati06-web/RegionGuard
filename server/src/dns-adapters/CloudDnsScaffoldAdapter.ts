import { DnsProviderAdapter, DnsRecordDetails } from './DnsProviderAdapter';
import { RegionId } from '../types/simulation';

/**
 * CloudDnsScaffoldAdapter
 * NOTE: Educational scaffold for Google Cloud DNS routing.
 */
export class CloudDnsScaffoldAdapter implements DnsProviderAdapter {
  private currentTarget: RegionId = 'region-a';
  private ttl: number = 30;
  private lastUpdated: number = Date.now();
  private isConfigured: boolean = false;

  constructor() {
    this.isConfigured = Boolean(process.env.GCP_PROJECT_ID && process.env.GCP_DNS_MANAGED_ZONE);
  }

  public getProviderName(): string {
    return 'Google Cloud DNS (Provider Scaffold)';
  }

  public isRealCloudProvider(): boolean {
    return true;
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
      message: `[Google Cloud DNS Scaffold]: Updated resourceRecordSets for ${recordName} -> ${targetRegion}.`,
    };
  }

  public async getRecordStatus(recordName: string): Promise<DnsRecordDetails> {
    return {
      recordName,
      targetRegion: this.currentTarget,
      targetEndpoint: this.currentTarget === 'region-a' ? '35.192.12.8 (us-central1)' : '34.102.24.9 (us-west1)',
      ttlSeconds: this.ttl,
      lastUpdated: this.lastUpdated,
    };
  }
}
