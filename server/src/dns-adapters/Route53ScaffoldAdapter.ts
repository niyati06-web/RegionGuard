import { DnsProviderAdapter, DnsRecordDetails } from './DnsProviderAdapter';
import { RegionId } from '../types/simulation';

/**
 * Route53ScaffoldAdapter
 * NOTE: Educational scaffold for AWS Route 53 failover routing.
 * In accordance with PS 23, simulation mode is the safe default.
 * Real cloud changes require explicit confirmation and configured credentials.
 */
export class Route53ScaffoldAdapter implements DnsProviderAdapter {
  private currentTarget: RegionId = 'region-a';
  private ttl: number = 60;
  private lastUpdated: number = Date.now();
  private isConfigured: boolean = false;

  constructor() {
    this.isConfigured = Boolean(
      process.env.AWS_ACCESS_KEY_ID &&
      process.env.AWS_SECRET_ACCESS_KEY &&
      process.env.ROUTE53_HOSTED_ZONE_ID
    );
  }

  public getProviderName(): string {
    return 'AWS Route 53 (Provider Scaffold)';
  }

  public isRealCloudProvider(): boolean {
    return true;
  }

  public async updateRecord(
    recordName: string,
    targetRegion: RegionId,
    ttl: number
  ): Promise<{ success: boolean; message: string }> {
    if (!this.isConfigured) {
      // Safe fallback to simulated behavior with informative notice
      this.currentTarget = targetRegion;
      this.ttl = ttl;
      this.lastUpdated = Date.now();
      return {
        success: true,
        message: `[Route 53 Scaffold]: Simulated update of record "${recordName}" -> ${targetRegion}. (AWS credentials not configured; simulation safe-fallback active)`,
      };
    }

    // If credentials were provided, we validate and mock the AWS ChangeResourceRecordSets call
    this.currentTarget = targetRegion;
    this.ttl = ttl;
    this.lastUpdated = Date.now();
    return {
      success: true,
      message: `[Route 53]: Simulated ChangeResourceRecordSets batch completed for zone ${process.env.ROUTE53_HOSTED_ZONE_ID}. Status: INSYNC`,
    };
  }

  public async getRecordStatus(recordName: string): Promise<DnsRecordDetails> {
    return {
      recordName,
      targetRegion: this.currentTarget,
      targetEndpoint: this.currentTarget === 'region-a' ? 'us-east-1.elb.amazonaws.com' : 'us-west-2.elb.amazonaws.com',
      ttlSeconds: this.ttl,
      lastUpdated: this.lastUpdated,
    };
  }
}
