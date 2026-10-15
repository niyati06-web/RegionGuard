# RegionGuard Testing & Verification Guide
## PS No. 23: Multi-Region Active-Passive Failover Controller

---

## 1. Automated Test Suite Overview

RegionGuard uses **Vitest** for fast, deterministic unit and integration testing. The test suite verifies distributed systems properties, consensus decisions, and all 10 safety invariants without requiring a live cloud account.

### How to Run the Tests

From the project root:
```bash
npm run test
```
Or inside the `server/` directory:
```bash
cd server
npm test
```

---

## 2. Test File Breakdown

### 2.1 Split-Brain & Invariant Tests (`server/src/tests/splitBrain.test.ts`)
- **`starts in a valid single-writer state`**: Verifies Region A is active leader, active writer count is 1, and initial epoch is 1.
- **`strictly rejects any write from non-lease holder or standby region`**: Verifies that any write directed at Region B while Region A holds the lease is rejected and increments `staleWritesBlockedCount`.
- **`strictly rejects write with stale leadership epoch`**: Ensures storage layer checks epochs; writes with outdated epochs are discarded.
- **`rejects writes from a fenced primary`**: Verifies that fencing a node revokes its write authority.
- **`INVARIANT TEST: Cluster NEVER permits two simultaneous active writers`**: Simulates an unauthorized dual-promotion during network partition and proves the system maintains `activeWriterCount <= 1`.
- **`monotonically increments leadership epoch when safe promotion succeeds`**: Verifies `epoch` strictly increases upon promotion.

### 2.2 Quorum & Majority Consensus Tests (`server/src/tests/quorum.test.ts`)
- **`starts with all 3 witnesses online and favoring Region A`**: Confirms baseline quorum state.
- **`reaches majority (2/3) when 1 witness fails`**: Proves that 2 live witnesses satisfy the majority threshold.
- **`FAILS CLOSED when 2 witnesses fail (loss of quorum)`**: Proves that if 2 witnesses fail, the cluster enters `SPLIT_NO_QUORUM` and fails closed.
- **`switches quorum vote to Region B when Region A fails`**: Verifies dynamic probe evaluation by neutral witnesses.

### 2.3 Automated Failover & Failback State Machine Tests (`server/src/tests/failover.test.ts`)
- **`progresses through all 15 states during outage`**: Tests the full transition pipeline: `PRIMARY_ACTIVE` &rarr; `PRIMARY_SUSPECTED` &rarr; `FAILOVER_EVALUATION` &rarr; `QUORUM_CHECK` &rarr; `FENCING_OLD_PRIMARY` &rarr; `PROMOTION_AUTHORIZED` &rarr; `SECONDARY_PROMOTED` &rarr; `DNS_UPDATING` &rarr; `SECONDARY_ACTIVE`.
- **`rejects promotion under SAFETY_FIRST policy when replication lag is high`**: Halts in `DEGRADED_NO_SAFE_WRITER` if replica lag is unsafe.
- **`allows promotion under AVAILABILITY_FIRST policy with data loss exposure tracking`**: Allows promotion when configured for availability.
- **`prevents premature failover during temporary health check flapping`**: Proves consecutive failure threshold prevents erratic panic cutover.
- **`executes controlled failback back to Region A after restoration`**: Tests reverse synchronization and coordinated handover.

### 2.4 REST API & Zod Validation Tests (`server/src/tests/api.test.ts`)
- **`GET /api/health`**: Verifies 200 OK and service status.
- **`GET /api/simulation/state`**: Verifies schema integrity of cluster state.
- **`GET /api/simulation/scenarios`**: Confirms all 10 presets are registered.
- **`POST /api/simulation/write`**: Validates Zod schema validation rules.
- **`POST /api/simulation/step`**: Tests clock stepping.
- **`GET /api/simulation/report`**: Validates JSON scorecard generation.
- **`GET /api/simulation/report/html`**: Validates HTML report generation.

---

## 3. Verified Test Results

All 22 test cases pass deterministically:

```text
 ✓ src/tests/quorum.test.ts (4 tests)
 ✓ src/tests/splitBrain.test.ts (6 tests)
 ✓ src/tests/failover.test.ts (5 tests)
 ✓ src/tests/api.test.ts (7 tests)

 Test Files  4 passed (4)
      Tests  22 passed (22)
```
