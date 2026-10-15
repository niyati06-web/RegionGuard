import { z } from 'zod';

export const WriteRequestSchema = z.object({
  originRegion: z.enum(['region-a', 'region-b']),
  type: z.enum(['STUDENT_ATTENDANCE', 'ORDER', 'SYSTEM_TRANSACTION']).default('SYSTEM_TRANSACTION'),
  description: z.string().min(1, 'Description is required').max(200),
  requestEpoch: z.number().int().positive().optional(),
});

export const FaultInjectionSchema = z.object({
  regionAFailed: z.boolean().optional(),
  regionBFailed: z.boolean().optional(),
  regionADbFailed: z.boolean().optional(),
  regionBDbFailed: z.boolean().optional(),
  replicationLinkSevered: z.boolean().optional(),
  networkPartitionActive: z.boolean().optional(),
  quorumWitnessIdsFailed: z.array(z.string()).optional(),
  highReplicationLagInjected: z.boolean().optional(),
  dnsPropagationDelayed: z.boolean().optional(),
  healthFlappingActive: z.boolean().optional(),
});

export const DnsConfigSchema = z.object({
  ttlSeconds: z.number().int().min(1).max(300).optional(),
  propagationDelaySeconds: z.number().int().min(0).max(60).optional(),
  providerType: z.enum(['simulated', 'route53', 'clouddns']).optional(),
});

export const PromotionPolicySchema = z.object({
  policy: z.enum(['SAFETY_FIRST', 'AVAILABILITY_FIRST']),
});
