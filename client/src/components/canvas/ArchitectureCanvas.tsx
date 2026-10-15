import React, { useMemo } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  BackgroundVariant,
  Node,
  Edge,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { SimulationState } from '../../types';
import { ClientNode } from './nodes/ClientNode';
import { DnsNode } from './nodes/DnsNode';
import { RegionGroupNode } from './nodes/RegionGroupNode';
import { WitnessGroupNode } from './nodes/WitnessGroupNode';
import { ControllerNode } from './nodes/ControllerNode';
import { SplitBrainNode } from './nodes/SplitBrainNode';
import { CanvasLegend } from './CanvasLegend';

interface ArchitectureCanvasProps {
  state: SimulationState | null;
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string) => void;
}

const nodeTypes = {
  clientNode: ClientNode,
  dnsNode: DnsNode,
  regionNode: RegionGroupNode,
  witnessNode: WitnessGroupNode,
  controllerNode: ControllerNode,
  splitBrainNode: SplitBrainNode,
};

export const ArchitectureCanvas: React.FC<ArchitectureCanvasProps> = ({
  state,
  selectedNodeId,
  onSelectNode,
}) => {
  if (!state) return null;

  const currentDnsTarget = state.dns.currentRecordTarget;
  const isTrafficFlowingToA = currentDnsTarget === 'region-a' && state.regions['region-a'].appStatus === 'HEALTHY';
  const isTrafficFlowingToB = currentDnsTarget === 'region-b' && state.regions['region-b'].appStatus === 'HEALTHY';
  const isReplicationLive = state.database.replicationStatus === 'HEALTHY' || state.database.replicationStatus === 'LAGGING';
  const isRegionAFenced = state.splitBrainGuard.fencedRegions.includes('region-a');
  const isRegionBFenced = state.splitBrainGuard.fencedRegions.includes('region-b');

  // Define Nodes
  const nodes: Node[] = useMemo(
    () => [
      {
        id: 'client-traffic',
        type: 'clientNode',
        position: { x: 480, y: 20 },
        data: {
          label: 'Global Clients',
          rps: isTrafficFlowingToA ? 280 : isTrafficFlowingToB ? 280 : 0,
          effectiveTarget: state.dns.effectiveTarget,
        },
      },
      {
        id: 'router-dns',
        type: 'dnsNode',
        position: { x: 460, y: 150 },
        data: {
          recordName: state.dns.recordName,
          target: state.dns.currentRecordTarget,
          ttl: state.dns.dnsTtlSeconds,
          isPropagating: state.dns.isPropagating,
          provider: state.dns.providerType,
          trafficA: state.dns.clientTrafficDistribution.regionA,
          trafficB: state.dns.clientTrafficDistribution.regionB,
        },
      },
      {
        id: 'region-a',
        type: 'regionNode',
        position: { x: 80, y: 320 },
        data: {
          region: state.regions['region-a'],
          dbRole: state.database.activeWriter === 'region-a' ? 'PRIMARY WRITER' : 'REPLICA',
          dbStatus: state.regions['region-a'].dbStatus,
          isPrimaryWriter: state.splitBrainGuard.currentLeaseHolder === 'region-a',
          isFenced: isRegionAFenced,
          replicationLag: state.database.replicationLagMs,
          unreplicatedTxCount: state.database.unreplicatedTxCount,
          hasLease: state.splitBrainGuard.currentLeaseHolder === 'region-a',
          side: 'left',
        },
      },
      {
        id: 'region-b',
        type: 'regionNode',
        position: { x: 820, y: 320 },
        data: {
          region: state.regions['region-b'],
          dbRole: state.database.activeWriter === 'region-b' ? 'PRIMARY WRITER' : 'REPLICA',
          dbStatus: state.regions['region-b'].dbStatus,
          isPrimaryWriter: state.splitBrainGuard.currentLeaseHolder === 'region-b',
          isFenced: isRegionBFenced,
          replicationLag: state.database.replicationLagMs,
          unreplicatedTxCount: state.database.unreplicatedTxCount,
          hasLease: state.splitBrainGuard.currentLeaseHolder === 'region-b',
          side: 'right',
        },
      },
      {
        id: 'quorum-plane',
        type: 'witnessNode',
        position: { x: 450, y: 560 },
        data: {
          witnesses: state.quorum.witnesses,
          hasQuorum: state.quorum.hasQuorum,
          decision: state.quorum.decision,
          threshold: state.quorum.quorumThreshold,
        },
      },
      {
        id: 'controller-plane',
        type: 'controllerNode',
        position: { x: 460, y: 740 },
        data: {
          currentState: state.failover.currentState,
          transitionReason: state.failover.transitionReason,
          failoverCount: state.failover.failoverCount,
          durationMs: state.failover.lastFailoverDurationMs,
        },
      },
      {
        id: 'split-brain-plane',
        type: 'splitBrainNode',
        position: { x: 455, y: 920 },
        data: {
          invariantSatisfied: state.splitBrainGuard.invariantSatisfied,
          activeWriterCount: state.splitBrainGuard.activeWriterCount,
          currentLeader: state.splitBrainGuard.currentLeaseHolder,
          epoch: state.splitBrainGuard.leadershipEpoch,
          fencingToken: state.splitBrainGuard.fencingToken,
          blockedCount: state.splitBrainGuard.splitBrainAttemptsPreventedCount,
          fencedRegions: state.splitBrainGuard.fencedRegions,
        },
      },
    ],
    [state, isTrafficFlowingToA, isTrafficFlowingToB, isRegionAFenced, isRegionBFenced]
  );

  // Define Edges
  const edges: Edge[] = useMemo(
    () => [
      // 1. Client -> DNS Router
      {
        id: 'e-client-dns',
        source: 'client-traffic',
        target: 'router-dns',
        animated: state.status === 'RUNNING',
        style: { stroke: '#3b82f6', strokeWidth: 2.5 },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6' },
      },
      // 2. DNS -> Region A
      {
        id: 'e-dns-regionA',
        source: 'router-dns',
        sourceHandle: 'dns-to-a',
        target: 'region-a',
        animated: isTrafficFlowingToA,
        label: isTrafficFlowingToA ? `${state.dns.clientTrafficDistribution.regionA}% traffic` : undefined,
        labelStyle: { fill: '#93c5fd', fontSize: 10, fontFamily: 'monospace' },
        labelBgStyle: { fill: '#0f172a', fillOpacity: 0.8 },
        style: {
          stroke: isTrafficFlowingToA ? '#3b82f6' : '#334155',
          strokeWidth: isTrafficFlowingToA ? 3 : 1.5,
        },
        markerEnd: { type: MarkerType.ArrowClosed, color: isTrafficFlowingToA ? '#3b82f6' : '#334155' },
      },
      // 3. DNS -> Region B
      {
        id: 'e-dns-regionB',
        source: 'router-dns',
        sourceHandle: 'dns-to-b',
        target: 'region-b',
        animated: isTrafficFlowingToB,
        label: isTrafficFlowingToB ? `${state.dns.clientTrafficDistribution.regionB}% traffic` : undefined,
        labelStyle: { fill: '#c084fc', fontSize: 10, fontFamily: 'monospace' },
        labelBgStyle: { fill: '#0f172a', fillOpacity: 0.8 },
        style: {
          stroke: isTrafficFlowingToB ? '#a855f7' : '#334155',
          strokeWidth: isTrafficFlowingToB ? 3 : 1.5,
        },
        markerEnd: { type: MarkerType.ArrowClosed, color: isTrafficFlowingToB ? '#a855f7' : '#334155' },
      },
      // 4. Cross-Region Database Replication Link
      {
        id: 'e-db-replication',
        source: 'region-a',
        sourceHandle: 'db-rep-out',
        target: 'region-b',
        targetHandle: 'db-rep-in',
        animated: isReplicationLive,
        label: isReplicationLive
          ? `Async Replication (${state.database.replicationLagMs}ms lag)`
          : `Replication ${state.database.replicationStatus}`,
        labelStyle: {
          fill: isReplicationLive ? '#fcd34d' : '#f87171',
          fontSize: 10,
          fontFamily: 'monospace',
          fontWeight: 600,
        },
        labelBgStyle: { fill: '#0b1120', fillOpacity: 0.85 },
        style: {
          stroke: isReplicationLive ? '#f59e0b' : '#e11d48',
          strokeWidth: 2,
          strokeDasharray: isReplicationLive ? '5,5' : '2,2',
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: isReplicationLive ? '#f59e0b' : '#e11d48',
        },
      },
      // 5. Region A Health Heartbeat -> Quorum
      {
        id: 'e-heartbeat-a',
        source: 'region-a',
        target: 'quorum-plane',
        animated: state.regions['region-a'].appStatus === 'HEALTHY',
        style: { stroke: '#14b8a6', strokeWidth: 1.5, strokeDasharray: '3,3' },
      },
      // 6. Region B Health Heartbeat -> Quorum
      {
        id: 'e-heartbeat-b',
        source: 'region-b',
        target: 'quorum-plane',
        animated: state.regions['region-b'].appStatus === 'HEALTHY',
        style: { stroke: '#14b8a6', strokeWidth: 1.5, strokeDasharray: '3,3' },
      },
      // 7. Quorum Consensus -> Controller
      {
        id: 'e-quorum-controller',
        source: 'quorum-plane',
        target: 'controller-plane',
        animated: state.quorum.hasQuorum,
        style: { stroke: '#10b981', strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#10b981' },
      },
      // 8. Controller -> Split-Brain Guard
      {
        id: 'e-controller-splitbrain',
        source: 'controller-plane',
        target: 'split-brain-plane',
        animated: state.splitBrainGuard.invariantSatisfied,
        style: { stroke: '#8b5cf6', strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#8b5cf6' },
      },
    ],
    [state, isTrafficFlowingToA, isTrafficFlowingToB, isReplicationLive]
  );

  return (
    <div className="flex-1 w-full h-full relative bg-navy-950">
      <CanvasLegend />
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodeClick={(_, node) => onSelectNode(node.id)}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        minZoom={0.3}
        maxZoom={1.5}
        className="bg-navy-950"
      >
        <Background color="#1e293b" gap={20} size={1} variant={BackgroundVariant.Dots} />
        <Controls className="bg-navy-900 border-slate-700 text-slate-100 fill-slate-100" />
        <MiniMap
          nodeStrokeColor="#3b82f6"
          nodeColor="#111c34"
          maskColor="rgba(7, 11, 20, 0.7)"
          className="bg-navy-900 border-slate-800 rounded-lg overflow-hidden"
        />
      </ReactFlow>
    </div>
  );
};
