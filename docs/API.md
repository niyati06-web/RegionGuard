# RegionGuard API & WebSocket Reference
## PS No. 23: Multi-Region Active-Passive Failover Controller

---

## 1. Overview & Base Configuration

- **Local Server Base URL:** `http://localhost:4000`
- **REST Endpoints Prefix:** `/api`
- **WebSocket Protocol:** Socket.IO v4
- **CORS Allowed Origins:** Configurable via `CORS_ORIGIN` environment variable (defaults to `http://localhost:5173`)
- **Payload Validation:** All request bodies are strictly validated with Zod schemas.

---

## 2. REST Endpoints

### 2.1 Health Check
```http
GET /api/health
```
**Response (200 OK):**
```json
{
  "status": "ok",
  "service": "RegionGuard Failover Controller API",
  "version": "1.0.0",
  "problemStatement": "PS 23",
  "timestamp": "2026-10-15T15:45:00.000Z"
}
```

---

### 2.2 Get Authoritative Simulation State
```http
GET /api/simulation/state
```
Returns the complete real-time cluster state, including regional health, quorum votes, split-brain guard tokens, replication lag, DNS distribution, and safety invariant results.

---

### 2.3 Submit Database Mutation
```http
POST /api/simulation/write
Content-Type: application/json
```
**Request Body:**
```json
{
  "originRegion": "region-a",
  "type": "STUDENT_ATTENDANCE",
  "description": "Student #1042 check-in verified",
  "requestEpoch": 1
}
```
**Response (200 OK - Authorized):**
```json
{
  "accepted": true,
  "record": {
    "id": "tx-1006",
    "sequenceNumber": 1006,
    "type": "STUDENT_ATTENDANCE",
    "description": "Student #1042 check-in verified",
    "originRegion": "region-a",
    "epoch": 1,
    "timestamp": 1729007100000,
    "replicated": false
  },
  "reason": "Write ACCEPTED under Epoch 1 (Fencing Token: 100)."
}
```
**Response (200 OK - Blocked by Split-Brain Guard):**
```json
{
  "accepted": false,
  "reason": "Write REJECTED: Region [region-b] is not the designated lease holder (Current: region-a)."
}
```

---

### 2.4 Apply Scenario Preset
```http
POST /api/simulation/scenario/:id
```
**Supported IDs:**
`NORMAL_OPERATION`, `PRIMARY_REGION_FAILURE`, `PRIMARY_DATABASE_FAILURE`, `NETWORK_PARTITION`, `QUORUM_LOSS`, `REPLICATION_LAG`, `DNS_PROPAGATION_DELAY`, `FALSE_HEALTH_CHECK_FLAPPING`, `SECONDARY_REGION_FAILURE`, `RECOVERY_AND_FAILBACK`.

---

### 2.5 Inject Live Faults
```http
POST /api/simulation/faults
Content-Type: application/json
```
**Request Body:**
```json
{
  "regionAFailed": true,
  "replicationLinkSevered": false,
  "quorumWitnessIdsFailed": ["witness-1"],
  "highReplicationLagInjected": true
}
```

---

### 2.6 Simulation Execution Controls
- `POST /api/simulation/start` — Starts continuous simulation ticks.
- `POST /api/simulation/pause` — Pauses clock execution.
- `POST /api/simulation/step` — Steps clock forward by exactly 1 tick (1s).
- `POST /api/simulation/reset` — Resets all state, faults, epochs, and database to baseline.
- `POST /api/simulation/failback` — Triggers manual controlled failback when Region B is active.

---

### 2.7 Configure DNS Parameters
```http
POST /api/simulation/dns/config
Content-Type: application/json
```
```json
{
  "ttlSeconds": 10,
  "propagationDelaySeconds": 5,
  "providerType": "simulated"
}
```

---

### 2.8 Audit Logs & Reporting
- `GET /api/simulation/events?severity=WARN&search=lease` — Filterable event audit trail.
- `GET /api/simulation/report` — JSON simulation scorecard.
- `GET /api/simulation/report/html` — Formatted printable HTML report.
- `GET /api/simulation/export/json` — Download audit trail as JSON file.
- `GET /api/simulation/export/csv` — Download audit trail as CSV file.

---

## 3. WebSocket Real-Time Event Contract

### Server to Client Broadcasts:
- `simulation:state` — Emitted every tick with updated `SimulationState`.
- `simulation:event` — Emitted immediately when any component logs a new event.
- `write:result` — Emitted in response to remote write transactions.

### Client to Server Remote Commands:
- `command:start`
- `command:pause`
- `command:step`
- `command:reset`
- `command:scenario` (payload: `ScenarioId`)
- `command:fault` (payload: `{ key: string, value: any }`)
- `command:write` (payload: `{ originRegion, type, description }`)
