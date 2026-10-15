import { RegionId } from '../types/simulation';

export interface DnsRecordDetails {
  recordName: string;
  targetRegion: RegionId;
  targetEndpoint: string;
  ttlSeconds: number;
  lastUpdated: number;
}

export interface DnsProviderAdapter {
  getProviderName(): string;
  isRealCloudProvider(): boolean;
  updateRecord(recordName: string, targetRegion: RegionId, ttl: number): Promise<{ success: boolean; message: string }>;
  getRecordStatus(recordName: string): Promise<DnsRecordDetails>;
}
