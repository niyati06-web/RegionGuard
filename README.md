# RegionGuard: Multi-Region Active-Passive Failover Controller
### Problem Statement No. 23 &bull; Distributed Systems Virtual Lab

![Safety Invariant](https://img.shields.io/badge/Safety%20Invariant-ACTIVE%20WRITERS%3A%200%20OR%201%20--%20NEVER%202-emerald?style=for-the-badge)
![Vitest Tests](https://img.shields.io/badge/Vitest%20Tests-22%2F22%20Passing-brightgreen?style=for-the-badge)
![Tech Stack](https://img.shields.io/badge/Stack-React%20%7C%20Node.js%20%7C%20Socket.IO%20%7C%20Tailwind%20%7C%20React%20Flow-blue?style=for-the-badge)

---

## 1. Problem Statement & Objectives

### Problem Statement (PS 23)
In modern cloud architectures, critical enterprise services must survive total regional outages without subjecting relational databases to the catastrophic data corruption of a **Split-Brain disaster**.

**RegionGuard** is a comprehensive, interactive, educational virtual lab and simulation engine built to demonstrate:
1. **Primary and Secondary Cloud Regions** (US-East Virginia vs US-West Oregon).
2. **Active-Passive Redundancy** with single-writer guarantees.
3. **Automated Quorum-Based Health Monitoring** with 3 independent witness nodes and majority voting (2 of 3).
4. **Split-Brain Prevention Agent** enforcing time-bounded write leases, pre-promotion fencing, and monotonically increasing leadership epochs.
5. **Cross-Region Database Replication Simulator** modeling asynchronous replication pipelines, lag, backlog queues, and consistency vs availability trade-offs.
6. **Route 53 / Anycast DNS Simulator** modeling TTL caching, resolver propagation delays, and gradual client traffic cutover.
7. **Failure Injection & Controlled Recovery** supporting regional outages, database crashes, WAN network partitions, witness failures, high replication lag, and health probe flapping.
8. **Real-time Live Metrics, Audit Logs, and Downloadable Simulation Reports** in JSON and printable HTML PDF formats.

---

## 2. Technology Stack

- **Frontend:**
  - React 18 & TypeScript
  - Vite for ultra-fast HMR and bundling
  - Tailwind CSS for modern cloud console UI/UX
  - React Flow (`@xyflow/react`) for interactive canvas with draggable nodes and animated edges
  - Recharts for real-time telemetry charts
  - Lucide React for modern iconography
  - Socket.IO Client for millisecond-grade live simulation broadcasts
- **Backend:**
  - Node.js & TypeScript
  - Express REST API
  - Socket.IO Server for event-driven simulation streaming
  - Zod for strict request validation
  - Pluggable DNS Adapter Architecture (Simulated, AWS Route 53 scaffold, Google Cloud DNS scaffold)
- **Testing:**
  - Vitest test suite with 22 automated tests covering safety invariants, failover state machine, quorum decisions, and API schemas.

---

## 3. Project Directory Structure

```text
RegionGuard/
├── .env.example                     # Root environment configuration
├── package.json                     # Monorepo task orchestration (dev, build, test)
├── README.md                        # Master project documentation
├── docs/
│   ├── ARCHITECTURE.md              # Detailed architecture & Mermaid diagram
│   ├── FAILOVER_FLOW.md             # 15-state FSM flow & Mermaid sequence diagram
│   ├── API.md                       # Complete REST & WebSocket specification
│   ├── TESTING.md                   # Vitest testing suite documentation
│   ├── DEPLOYMENT.md                # Render & Vercel deployment instructions
│   └── VIVA_PREPARATION.md          # 16 Viva Voce questions & model answers
├── client/                          # React + Vite + Tailwind + React Flow Frontend
│   ├── index.html                   # HTML entrypoint
│   ├── package.json                 # Client dependencies
│   ├── vite.config.ts               # Vite configuration with proxy to port 4000
│   ├── tailwind.config.js           # Cloud console color themes
│   └── src/
│       ├── App.tsx                  # Root dashboard layout
│       ├── components/
│       │   ├── canvas/              # React Flow canvas, custom nodes, edges, legend
│       │   ├── layout/              # Navbar, Sidebar, InspectorPanel, BottomPanel
│       │   ├── monitoring/          # Recharts metrics, audit trail table
│       │   └── panels/              # LearnModal, ReportModal, ExplanationToast
│       ├── hooks/useSimulation.ts   # Real-time WebSocket hook & transition explanations
│       └── services/                # API fetch client and Socket.IO client
└── server/                          # Node.js + Express + Socket.IO Simulation Engine
    ├── package.json                 # Server dependencies & test scripts
    ├── tsconfig.json                # TypeScript configuration
    └── src/
        ├── index.ts                 # Express & Socket.IO server entrypoint
        ├── dns-adapters/            # Simulated, Route 53, and Cloud DNS adapters
        ├── routes/                  # Express REST API routes
        ├── sockets/                 # Socket.IO event broadcaster
        ├── validation/              # Zod schemas for input validation
        ├── tests/                   # 22 Vitest unit & integration tests
        └── simulation/              # Deterministic simulation sub-systems
            ├── SimulationEngine.ts  # Master coordinator
            ├── SplitBrainGuard.ts   # Invariant enforcement, leases, epochs, fencing
            ├── QuorumManager.ts     # 3 witness nodes & majority voting
            ├── FailoverController.ts# 15-state failover/failback state machine
            ├── ReplicationSimulator.ts # Cross-region DB sync & lag modeling
            ├── DnsSimulator.ts      # Route 53 / Anycast TTL propagation
            ├── HealthMonitor.ts     # Probes & consecutive failure counters
            ├── InvariantChecker.ts  # Real-time evaluation of all 10 invariants
            └── ReportGenerator.ts   # JSON scorecard & printable HTML reports
```

---

## 4. Prerequisites

- **Node.js:** v18.0.0 or newer (tested on Node v25.6.0)
- **npm:** v9.0.0 or newer
- **Operating System:** Windows, macOS, or Linux

---

## 5. Quick Installation & Startup

### Step 1: Install Dependencies
From the project root:
```powershell
npm run install:all
```
*(This automatically installs root, server, and client dependencies).*

### Step 2: Start Full Application
Run both backend server and frontend client concurrently with one command:
```powershell
npm run dev
```

### Step 3: Access the Local Application
- **Frontend Dashboard:** [http://localhost:5173](http://localhost:5173)
- **Backend Health Check:** [http://localhost:4000/api/health](http://localhost:4000/api/health)
- **Backend State Endpoint:** [http://localhost:4000/api/simulation/state](http://localhost:4000/api/simulation/state)

---

## 6. How to Run the Test Suite

Execute the 22 Vitest tests covering distributed invariants, quorum, failover, and API routes:
```powershell
npm test
```

Expected output:
```text
 ✓ src/tests/quorum.test.ts (4 tests)
 ✓ src/tests/splitBrain.test.ts (6 tests)
 ✓ src/tests/failover.test.ts (5 tests)
 ✓ src/tests/api.test.ts (7 tests)

 Test Files  4 passed (4)
      Tests  22 passed (22)
```

---

## 7. How to Demonstrate Major Lab Scenarios

### Scenario A: Normal Operation (Steady State)
1. Click **Scenario 1** in the left sidebar or select from the top dropdown.
2. Observe Region A as the active primary holding the write lease (Epoch #1).
3. Observe DNS routing 100% traffic to Region A.
4. Click **Test Writes** &rarr; Submit a transaction to Region A &rarr; Observe it commit and replicate to Region B with ~42ms lag.
5. Invariant status: **ACTIVE WRITERS: 1 (0 OR 1 — NEVER 2)**.

### Scenario B: Primary Region Failure & Automated Failover
1. Click **Scenario 2** in the left sidebar or toggle **Shut Down Region A**.
2. Click **Start** or use **Step 1s** to watch the state machine progress:
   - Consecutive probe failures reach 3 &rarr; `PRIMARY_SUSPECTED` &rarr; `FAILOVER_EVALUATION`.
   - Quorum witnesses vote 2/3 in favor of Region B &rarr; `QUORUM_CHECK`.
   - Region A write lease revoked & fenced &rarr; `FENCING_OLD_PRIMARY`.
   - Split-Brain Guard increments epoch (Epoch #2) & issues Fencing Token #110 &rarr; `PROMOTION_AUTHORIZED`.
   - Secondary promoted & DNS updated &rarr; `DNS_UPDATING`.
   - TTL countdown migrates traffic &rarr; `SECONDARY_ACTIVE`.
3. Try submitting a write to Region A &rarr; Observe Split-Brain Guard **REJECT** the write with `STALE_LEADER_WRITE_REJECTED`!
4. Submit a write to Region B &rarr; Commits successfully under Epoch #2!

### Scenario C: Cross-Region Network Partition (Split-Brain Prevention)
1. Click **Scenario 4: WAN Network Partition**.
2. Both regions are alive, but the replication link and inter-region communication are severed.
3. Observe how the isolated old primary cannot renew its lease because it cannot reach the majority quorum.
4. The invariant banner strictly holds: **ACTIVE WRITERS: 0 OR 1 — NEVER 2**.

### Scenario D: Quorum Loss (Fail-Closed Safety)
1. Click **Scenario 5: Loss of Witness Quorum** (crashes 2 of 3 witnesses).
2. The cluster enters `DEGRADED_NO_QUORUM`.
3. The system **fails closed**: unsafe leadership promotions are strictly rejected to prevent split-brain.

### Scenario E: High Replication Lag & Consistency Trade-Off
1. Click **Scenario 6: High Replication Lag**.
2. Switch policy in the Inspector between **Safety-First** (halts promotion if lag is too high to protect against data loss) and **Availability-First** (promotes immediately and calculates data-loss window).

### Scenario F: Controlled Recovery & Planned Failback
1. When Region B is active, clear Region A outage fault.
2. Observe Region A recover and stabilize. Notice that traffic does **NOT** abruptly snap back.
3. Click the purple **Initiate Failback** button in the top navbar.
4. Watch the coordinated handover: Region B forfeits lease &rarr; Region A promoted under Epoch #3 &rarr; DNS smoothly updated.

---

## 8. Generating & Exporting Simulation Reports

1. Click **Simulation Report** in the top navbar.
2. View the live summary scorecard and the 10 invariant check results.
3. Click **Print / Save HTML PDF** to open the styled report formatted for printing or PDF export.
4. Click **Export CSV** or **Export JSON** in the Bottom Panel &rarr; Event Audit Log tab to download the complete event history.

---

## 9. Deployment Instructions

- **Backend (Render):** Deploy the `server/` folder as a Node.js Web Service (`npm install && npm run build`, start: `npm start`).
- **Frontend (Vercel):** Deploy the `client/` folder with `VITE_API_URL` and `VITE_SOCKET_URL` pointing to your Render backend.
- See detailed instructions in [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

---

## 10. Troubleshooting

| Issue | Cause | Solution |
| :--- | :--- | :--- |
| `Backend Disconnected` warning on frontend | Backend server is not running on port 4000 | Run `npm run dev:server` in `server/` or `npm run dev` in root |
| Port 4000 or 5173 already in use | Previous process holding the port | Change `PORT` in `.env` or terminate the lingering process |
| Test writes rejected | Attempted write to standby region or stale epoch | Only the active lease holder can commit writes |
| Missing node_modules | Dependencies not installed | Run `npm run install:all` |
