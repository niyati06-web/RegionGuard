import { ComponentHealth, RegionId, RegionState } from '../types/simulation';
import { EventLogger } from './EventLogger';

export class HealthMonitor {
  private suspectFailureThreshold: number = 2; // consecutive checks to suspect
  private failoverFailureThreshold: number = 3; // consecutive checks to confirm failure
  private logger: EventLogger;

  constructor(logger: EventLogger) {
    this.logger = logger;
  }

  public updateRegionHealth(params: {
    regionState: RegionState;
    simTime: number;
    forceAppDown: boolean;
    forceDbDown: boolean;
    isFlapping: boolean;
  }): void {
    const { regionState, simTime, forceAppDown, forceDbDown, isFlapping } = params;

    // Simulate synthetic probe check
    let appCheckPassed = !forceAppDown;
    let dbCheckPassed = !forceDbDown;

    if (isFlapping) {
      // Simulate flapping: alternates every 2 ticks
      const flapFail = Math.floor(simTime / 2) % 2 === 0;
      if (flapFail) {
        appCheckPassed = false;
      }
    }

    const overallHealthy = appCheckPassed && dbCheckPassed;

    if (!overallHealthy) {
      regionState.consecutiveFailedChecks += 1;
    } else {
      if (regionState.consecutiveFailedChecks > 0) {
        regionState.consecutiveFailedChecks = Math.max(0, regionState.consecutiveFailedChecks - 1);
      }
    }

    // Set App status
    regionState.appStatus = appCheckPassed ? 'HEALTHY' : 'FAILED';
    regionState.dbStatus = dbCheckPassed ? 'HEALTHY' : 'FAILED';
    regionState.lastHealthCheckTime = simTime;

    // Determine aggregate regional health status
    const previousStatus = regionState.status;

    if (regionState.role === 'FENCED') {
      regionState.status = 'FENCED';
    } else if (regionState.consecutiveFailedChecks >= this.failoverFailureThreshold) {
      regionState.status = 'FAILED';
      regionState.isOnline = false;
      regionState.availabilityPercent = Math.max(0, regionState.availabilityPercent - 15);
    } else if (regionState.consecutiveFailedChecks >= this.suspectFailureThreshold) {
      regionState.status = 'DEGRADED';
      regionState.isOnline = true;
      regionState.availabilityPercent = Math.max(50, regionState.availabilityPercent - 5);
    } else if (!overallHealthy) {
      regionState.status = 'DEGRADED';
      regionState.isOnline = true;
    } else {
      // Healing or Healthy
      if (previousStatus === 'FAILED' || previousStatus === 'DEGRADED') {
        regionState.status = 'RECOVERING';
        regionState.availabilityPercent = Math.min(100, regionState.availabilityPercent + 10);
        if (regionState.consecutiveFailedChecks === 0) {
          regionState.status = 'HEALTHY';
          regionState.isOnline = true;
          regionState.availabilityPercent = 99.99;
        }
      } else {
        regionState.status = 'HEALTHY';
        regionState.isOnline = true;
        regionState.availabilityPercent = 99.99;
      }
    }

    // Log significant status changes
    if (regionState.status !== previousStatus) {
      this.logger.log({
        simulationTime: simTime,
        eventType: regionState.status === 'FAILED' ? 'REGION_MARKED_UNHEALTHY' : 'HEALTH_CHECK_STATUS_CHANGED',
        severity: regionState.status === 'FAILED' ? 'ERROR' : regionState.status === 'DEGRADED' ? 'WARN' : 'INFO',
        component: `HealthMonitor (${regionState.name})`,
        description: `Region health transitioned from [${previousStatus}] to [${regionState.status}]. Consecutive probe failures: ${regionState.consecutiveFailedChecks}.`,
        previousState: previousStatus,
        newState: regionState.status,
        decisionReason: !overallHealthy
          ? `Probe failure: App [${regionState.appStatus}], Database [${regionState.dbStatus}].`
          : 'Health probes returned HTTP 200 OK.',
      });
    }
  }

  public getSuspectThreshold(): number {
    return this.suspectFailureThreshold;
  }

  public getFailoverThreshold(): number {
    return this.failoverFailureThreshold;
  }
}
