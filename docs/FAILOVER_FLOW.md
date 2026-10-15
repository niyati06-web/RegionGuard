# RegionGuard Failover & Failback State Machine Flow
## PS No. 23: Multi-Region Active-Passive Failover Controller

---

## 1. Automated Safe Failover Sequence Diagram

The following Mermaid sequence diagram outlines the exact sequence of events during a regional failure of Region A:

```mermaid
sequenceDiagram
    autonumber
    actor Client as Global Clients
    participant DNS as Route 53 / DNS Router
    participant RegionA as Primary Region (US-East)
    participant Witnesses as Quorum Witnesses (3 Nodes)
    participant Ctrl as Failover Controller
    participant SBGuard as Split-Brain Guard
    participant RegionB as Standby Region (US-West)

    Note over Client, RegionB: Baseline State: PRIMARY_ACTIVE (Epoch #1, Lease: Region A)
    Client->>DNS: Inbound API Request
    DNS->>RegionA: Route to 100% Active Endpoint
    RegionA-->>RegionB: Async Replication Stream (Lag ~42ms)

    Note over RegionA: Catastrophic Power Failure in Region A!
    RegionA-xWitnesses: Probe Miss #1 (Transient)
    RegionA-xWitnesses: Probe Miss #2 -> Controller marks PRIMARY_SUSPECTED
    RegionA-xWitnesses: Probe Miss #3 -> Controller triggers FAILOVER_EVALUATION

    Ctrl->>RegionB: Check Secondary App & Database Health
    RegionB-->>Ctrl: Secondary Tier Healthy (HTTP 200, DB Ready)

    Ctrl->>RegionB: Evaluate Replica Lag & Consistency Policy
    RegionB-->>Ctrl: Replica Lag OK (Within allowable threshold)

    Ctrl->>Witnesses: Poll Witness Votes (Threshold: 2 of 3)
    Witnesses-->>Ctrl: Majority Vote Achieved (2/3 Favor Region B)

    Note over Ctrl, SBGuard: State: FENCING_OLD_PRIMARY
    Ctrl->>SBGuard: Fence Region A
    SBGuard->>RegionA: Revoke Write Capabilities (Lease Terminated)

    Note over Ctrl, SBGuard: State: PROMOTION_AUTHORIZED
    Ctrl->>SBGuard: Authorize Single-Writer Promotion for Region B
    SBGuard-->>Ctrl: New Leadership Epoch #2 & Fencing Token #110 Issued

    Note over Ctrl, RegionB: State: SECONDARY_PROMOTED
    Ctrl->>RegionB: Promote Replica DB to Read-Write Primary
    RegionB-->>Ctrl: Promotion Succeeded (Writer Active)

    Note over Ctrl, DNS: State: DNS_UPDATING
    Ctrl->>DNS: Update A-Record target to Region B (TTL: 5s)
    DNS-->>Ctrl: Record Set Updated (INSYNC)

    loop Resolver TTL Expiry
        Client->>DNS: Recursive DNS Query
        Note over DNS, Client: Cached resolvers expire; traffic migrates (0% -> 100% to Region B)
    end

    Note over Client, RegionB: Final State: SECONDARY_ACTIVE (Epoch #2, Lease: Region B)
    Client->>RegionB: 100% Traffic Serviced by Region B
```

---

## 2. Finite State Machine: 15 Documented States

| State | Category | Description | Safety Invariant Preserved |
| :--- | :--- | :--- | :--- |
| `PRIMARY_ACTIVE` | Normal | Region A is authorized primary writer; Region B is standby replica; DNS targets Region A. | Exactly 1 writer. |
| `PRIMARY_SUSPECTED` | Monitoring | Region A missed 2 consecutive health checks. Flagged for close scrutiny without jumping to premature failover. | Prevents flapping. |
| `FAILOVER_EVALUATION` | Evaluation | 3 consecutive failures confirmed. Controller verifies Region B readiness, health, and replication backlog. | Prevents promoting broken replica. |
| `QUORUM_CHECK` | Consensus | Polling 3 independent witness nodes. Evaluates whether a strict majority (2/3) authorizes failover. | Prevents unilateral takeover. |
| `FENCING_OLD_PRIMARY` | Safety | Writes revoked from Region A; lease forcibly expired or wait-time satisfied. | Prevents split-brain write collisions. |
| `PROMOTION_AUTHORIZED` | Consensus | Split-Brain Guard issues incremented leadership epoch and fencing token. | Monotonic epoch ordering. |
| `SECONDARY_PROMOTED` | Promotion | Region B database replica unlocked to primary read-write role. | Data-loss window calculated. |
| `DNS_UPDATING` | Networking | DNS A-record updated to point to Region B endpoint; TTL countdown begins. | Orderly traffic cutover. |
| `SECONDARY_ACTIVE` | Normal | Traffic completely migrated to Region B; failover sequence finished. | Exactly 1 writer. |
| `RECOVERY_DETECTED` | Failback | Region A has recovered; health checks stabilized for consecutive cycles. | Controlled failback initiation. |
| `FAILBACK_EVALUATION` | Failback | Checking if Region A replica has caught up with all transactions written to Region B. | Prevents data regression. |
| `FAILBACK_IN_PROGRESS` | Failback | Region B lease relinquished, Region A authorized under new epoch, DNS updated. | Safe leader handover. |
| `PRIMARY_RESTORED` | Normal | Region A active writer again, Region B returned to standby follower. | Steady state restored. |
| `DEGRADED_NO_QUORUM` | Safety Halt | Witness majority unavailable or partitioned; controller **fails closed**. | Refuses unsafe promotion. |
| `DEGRADED_NO_SAFE_WRITER` | Safety Halt | Replica lag too high under Safety-First policy, or both regions unhealthy. | Prioritizes safety over availability. |

---

## 3. Controlled Failback Workflow

Unlike basic demonstrations that automatically snap traffic back as soon as Region A responds, RegionGuard enforces **controlled failback**:

1. **Why Instant Failback is Forbidden:** While Region B was active, it accepted new transactions. Region A's database is stale. Instant traffic cutover would cause severe data loss and dirty reads.
2. **Reverse Replication Catch-Up:** Region A must connect as a replica of Region B and apply all interim WAL transactions.
3. **Quorum Authorization:** Quorum witnesses verify that both regions are stable.
4. **Planned Handover:** Region B gracefully forfeits its lease. Region A is granted a new leadership epoch (e.g. Epoch 3) and DNS is redirected.
