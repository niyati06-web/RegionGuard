# College Viva Voce & Project Defense Guide
## PS No. 23: Multi-Region Active-Passive Failover Controller

---

## 1. Project Pitch (30-Second Elevator Pitch)

> "Respected Evaluator, my project is **RegionGuard**, a distributed systems virtual lab built for **Problem Statement 23: Multi-Region Active-Passive Failover Controller**.
>
> When a major cloud region experiences an outage—like an earthquake or fiber sever—enterprise applications must redirect traffic to a backup region. However, if both regions believe they are active at the same time, a catastrophic **Split-Brain disaster** occurs, leading to silent, irrecoverable database corruption.
>
> RegionGuard demonstrates how to achieve 100% automated regional disaster recovery while mathematically guaranteeing the invariant: **ACTIVE WRITERS: 0 OR 1 — NEVER 2**. It coordinates Route 53 DNS routing, cross-region asynchronous database replicas, 3 independent quorum witness nodes, and a Split-Brain Prevention Agent with time-bounded write leases and fencing tokens."

---

## 2. Core Concepts Explained Simply

### Why Active-Passive instead of Active-Active?
In an **Active-Active** setup, both regions accept writes concurrently. This requires complex multi-master synchronization (like Spanner Paxos or Dynamo vector clocks), which introduces high latency and write conflict resolution challenges.
In an **Active-Passive** architecture, exactly one region is the designated writer, and the backup is a read replica. It offers clean consistency guarantees and zero write-write locking overhead during normal operation.

### What is Quorum?
Quorum is the minimum number of independent voters required to make a binding cluster decision. In RegionGuard, we use 3 witnesses with a **majority threshold of 2 out of 3** ($\lfloor N/2 \rfloor + 1$).
If a network partition divides the cluster, only the majority side can vote. The minority side **fails closed** and cannot promote a leader.

### What is Split-Brain?
Split-brain happens when two halves of a partitioned distributed system both think the other side is dead, resulting in two simultaneous primary writers. Both write conflicting transactions to storage, permanently corrupting database history.

### What are Leases and Fencing Tokens?
- **Write Lease:** A short-term authorization (e.g. 8 seconds) granted to the primary. If the primary loses contact with the quorum witnesses, its lease expires, and it voluntarily relinquishes leadership.
- **Fencing Token:** A monotonically increasing number (e.g. Epoch 1, 2, 3...) issued to every new leader. If an old "zombie" leader wakes up and tries to commit a transaction, the storage layer checks the token. Since the zombie's token is stale, the write is immediately rejected.

### How does DNS Failover work?
Route 53 or Cloud DNS updates the A-record for the domain (e.g. `api.regionguard.net`) from Region A's IP to Region B's IP. However, client DNS resolvers cache records for the duration of the TTL (Time-To-Live). Therefore, traffic migrates smoothly over the TTL window rather than snapping over in 0ms.

---

## 3. Likely Viva Questions & Model Answers

### Q1: What happens if the network between Region A and Region B is completely cut (WAN partition)?
**Answer:**
TheWAN partition severs communication between Region A and Region B. Both regions attempt to contact the 3 independent witness nodes.
Only the region that can reach at least 2 of the 3 witnesses achieves quorum. The isolated region cannot renew its write lease. When its lease expires, its write capabilities are terminated. RegionGuard strictly prevents two writers from operating concurrently.

### Q2: What if 2 out of the 3 witness nodes crash?
**Answer:**
With only 1 witness remaining alive, the quorum threshold (2/3) cannot be met. The system **fails closed**: the Failover Controller enters `DEGRADED_NO_QUORUM`. It halts any new leadership promotion to avoid an unverified takeover, preserving data safety over availability.

### Q3: Why does asynchronous replication have a risk of data loss?
**Answer:**
Because the primary database confirms commits to the client before the transaction has physically crossed the WAN to the replica. If the primary loses power abruptly, transactions remaining in the replication buffer are lost when the replica is promoted. RegionGuard provides two policies: **Safety-First** (rejects promotion if lag is too high) and **Availability-First** (accepts promotion and reports the exact data loss window).

### Q4: Why don't you failover immediately on the very first failed health check?
**Answer:**
A single probe failure is often caused by temporary network jitter, packet drops, or a momentary CPU spike (flapping). Failing over on 1 miss would cause chaotic, unnecessary regional cutovers. RegionGuard uses a consecutive failure threshold (3 consecutive misses) to verify true outage.

### Q5: Can the old primary wake up after failover and write to the database?
**Answer:**
No. The Split-Brain Guard fences the old primary, revokes its write lease, and increments the leadership epoch. If the old primary submits a transaction with its old epoch or while fenced, the write is rejected with `STALE_LEADER_WRITE_REJECTED`.

### Q6: What is the difference between RTO and RPO?
**Answer:**
- **RTO (Recovery Time Objective):** How long the application is offline before traffic is restored (e.g. < 15 seconds in our simulation).
- **RPO (Recovery Point Objective):** The maximum amount of data loss acceptable (e.g. bounded by our replication lag window in ms).

### Q7: Where should quorum witnesses be located in real cloud deployments?
**Answer:**
In neutral, independent failure domains:
1. A third Availability Zone (AZ-3) in an independent region.
2. An Anycast edge network (such as Cloudflare Workers or AWS Lambda@Edge).
3. A neutral secondary cloud provider (e.g. GCP when primary regions are on AWS).

### Q8: What is the CAP theorem implication for this system?
**Answer:**
Under the CAP theorem, during a network Partition (P), a distributed system must choose between Consistency (C) and Availability (A). RegionGuard chooses **Consistency and Safety** (CP-biased), prioritizing the prevention of dual writers over unconditional availability.

---

## 4. Simulator Limitations (Honest Academic Disclosure)

For the viva, transparently disclose:
1. **Network Latency Simulation:** In-memory event ticks model network delay and TTL countdowns deterministically; real physical cloud cross-region replication involves physical fiber jitter.
2. **Cloud DNS Scaffolding:** Route 53 and Cloud DNS integration is provided via adapter scaffolding and runs offline by default so students don't need expensive paid cloud subscriptions or AWS credentials to demonstrate the project.
