import { useState, useEffect, useCallback, useRef } from 'react';
import { SimulationEvent, SimulationState, ScenarioDefinition } from '../types';
import { socket } from '../services/socket';
import * as api from '../services/api';

export function useSimulation() {
  const [state, setState] = useState<SimulationState | null>(null);
  const [events, setEvents] = useState<SimulationEvent[]>([]);
  const [scenarios, setScenarios] = useState<ScenarioDefinition[]>([]);
  const [isConnected, setIsConnected] = useState<boolean>(socket.connected);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>('router-dns');
  const [lastExplanation, setLastExplanation] = useState<{ title: string; text: string; severity: string } | null>(null);

  const prevStateRef = useRef<SimulationState | null>(null);

  // Initial load via REST
  useEffect(() => {
    api.fetchState().then(setState).catch(console.error);
    api.fetchEvents({ limit: 50 }).then(setEvents).catch(console.error);
    api.fetchScenarios().then(setScenarios).catch(console.error);
  }, []);

  // Listen to Socket.IO events
  useEffect(() => {
    function onConnect() {
      setIsConnected(true);
    }
    function onDisconnect() {
      setIsConnected(false);
    }
    function onStateUpdate(newState: SimulationState) {
      setState((prev) => {
        // Detect state transition to trigger educational explanation
        if (prev && prev.failover.currentState !== newState.failover.currentState) {
          triggerExplanation(prev.failover.currentState, newState.failover.currentState, newState.failover.transitionReason);
        }
        prevStateRef.current = prev;
        return newState;
      });
    }
    function onNewEvent(newEvent: SimulationEvent) {
      setEvents((prev) => [newEvent, ...prev.slice(0, 150)]);
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('simulation:state', onStateUpdate);
    socket.on('simulation:event', onNewEvent);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('simulation:state', onStateUpdate);
      socket.off('simulation:event', onNewEvent);
    };
  }, []);

  const triggerExplanation = (fromState: string, toState: string, reason: string) => {
    let explanationText = reason;
    let title = `State Changed: ${toState}`;
    let severity = 'info';

    if (toState === 'PRIMARY_SUSPECTED') {
      title = 'Health Check Warning: Primary Region A Suspected';
      explanationText = 'Synthetic health check probes failed consecutively. The system does not immediately panic failover on 1 failure (anti-hysteresis/anti-flapping).';
      severity = 'warn';
    } else if (toState === 'FAILOVER_EVALUATION') {
      title = 'Failover Initiated: Evaluating Readiness';
      explanationText = 'Region A failure confirmed by 3 consecutive misses. The controller now verifies that Region B is healthy and its database replica is sufficiently caught up.';
      severity = 'warn';
    } else if (toState === 'QUORUM_CHECK') {
      title = 'Quorum Voting in Progress';
      explanationText = 'The controller is collecting heartbeat votes from 3 independent witness nodes. A majority of 2/3 votes is required to establish leadership.';
      severity = 'info';
    } else if (toState === 'FENCING_OLD_PRIMARY') {
      title = 'Critical Step: Fencing Old Primary Region A';
      explanationText = 'To prevent Split-Brain (two simultaneous writers), Region A write capability is strictly revoked and its write lease is terminated.';
      severity = 'warn';
    } else if (toState === 'PROMOTION_AUTHORIZED') {
      title = 'Single-Writer Promotion Authorized';
      explanationText = 'Split-Brain Guard granted a new leadership epoch and fencing token to Region B. Region A can no longer commit transactions.';
      severity = 'success';
    } else if (toState === 'SECONDARY_PROMOTED') {
      title = 'Secondary Region Promoted to Active Primary';
      explanationText = 'Database replica promoted to primary read-write role. Ready to accept live traffic.';
      severity = 'success';
    } else if (toState === 'DNS_UPDATING') {
      title = 'Global DNS A-Record Cutover';
      explanationText = 'DNS record for api.regionguard.net redirected to Region B endpoint. Traffic will gradually migrate as client resolver TTL caches expire.';
      severity = 'info';
    } else if (toState === 'SECONDARY_ACTIVE') {
      title = 'Failover Sequence Complete: Region B Active';
      explanationText = '100% of global client traffic is now serviced by Region B. System availability restored with zero split-brain mutations.';
      severity = 'success';
    } else if (toState.includes('DEGRADED')) {
      title = 'Safety Halt: Degraded State (Fail-Closed)';
      explanationText = 'Safe consensus could not be established (e.g. quorum loss or high replication lag). The system failed closed rather than corrupting data.';
      severity = 'error';
    } else if (toState === 'PRIMARY_RESTORED' || toState === 'PRIMARY_ACTIVE') {
      title = 'Cluster Restored to Normal Operation';
      explanationText = 'Controlled failback completed safely with full replica synchronization and lease handover.';
      severity = 'success';
    }

    setLastExplanation({ title, text: explanationText, severity });
  };

  const handleStart = useCallback(() => api.startSimulation(), []);
  const handlePause = useCallback(() => api.pauseSimulation(), []);
  const handleStep = useCallback(() => api.stepSimulation(), []);
  const handleReset = useCallback(() => api.resetSimulation(), []);

  const handleSelectScenario = useCallback((id: string) => {
    api.applyScenario(id).then(() => {
      api.fetchState().then(setState);
    });
  }, []);

  const handleToggleFault = useCallback(
    (key: string, value: any) => {
      api.applyFaults({ [key]: value }).then(() => {
        api.fetchState().then(setState);
      });
    },
    []
  );

  const handleClearFaults = useCallback(() => {
    api.clearAllFaults().then(() => {
      api.fetchState().then(setState);
    });
  }, []);

  const handleSubmitWrite = useCallback(
    async (params: { originRegion: 'region-a' | 'region-b'; type: string; description: string; requestEpoch?: number }) => {
      return api.submitDatabaseWrite(params);
    },
    []
  );

  const handleTriggerFailback = useCallback(async () => {
    return api.triggerFailback();
  }, []);

  return {
    state,
    events,
    scenarios,
    isConnected,
    selectedNodeId,
    setSelectedNodeId,
    lastExplanation,
    clearExplanation: () => setLastExplanation(null),
    handleStart,
    handlePause,
    handleStep,
    handleReset,
    handleSelectScenario,
    handleToggleFault,
    handleClearFaults,
    handleSubmitWrite,
    handleTriggerFailback,
  };
}
