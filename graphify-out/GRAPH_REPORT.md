# Graph Report - C:\Users\adith\OneDrive\Desktop\hiring-pipeline  (2026-04-22)

## Corpus Check
- 23 files · ~22,823 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 58 nodes · 55 edges · 22 communities detected
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 3 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]

## God Nodes (most connected - your core abstractions)
1. `request()` - 11 edges
2. `promoteNext()` - 6 edges
3. `createAuditLog()` - 5 edges
4. `processDecayedApplication()` - 3 edges
5. `exitPipeline()` - 3 edges
6. `getJobs()` - 2 edges
7. `resetDatabase()` - 2 edges
8. `createJob()` - 2 edges
9. `getJob()` - 2 edges
10. `getJobAudit()` - 2 edges

## Surprising Connections (you probably didn't know these)
- `promoteNext()` --calls--> `sendPromotionEmail()`  [INFERRED]
  C:\Users\adith\OneDrive\Desktop\hiring-pipeline\server\utils\queueManager.js → C:\Users\adith\OneDrive\Desktop\hiring-pipeline\server\utils\mailer.js
- `processDecayedApplication()` --calls--> `promoteNext()`  [INFERRED]
  C:\Users\adith\OneDrive\Desktop\hiring-pipeline\server\engine\decayEngine.js → C:\Users\adith\OneDrive\Desktop\hiring-pipeline\server\utils\queueManager.js
- `startServer()` --calls--> `startDecayEngine()`  [INFERRED]
  C:\Users\adith\OneDrive\Desktop\hiring-pipeline\server\index.js → C:\Users\adith\OneDrive\Desktop\hiring-pipeline\server\engine\decayEngine.js

## Communities

### Community 0 - "Community 0"
Cohesion: 0.32
Nodes (11): acknowledgePromotion(), createJob(), getApplicationsByEmail(), getApplicationStatus(), getJob(), getJobAudit(), getJobs(), request() (+3 more)

### Community 1 - "Community 1"
Cohesion: 0.57
Nodes (6): acknowledgePromotion(), createAuditLog(), exitPipeline(), promoteNext(), reindexWaitlist(), submitApplication()

### Community 2 - "Community 2"
Cohesion: 0.4
Nodes (4): decayTick(), processDecayedApplication(), startDecayEngine(), startServer()

### Community 3 - "Community 3"
Cohesion: 0.5
Nodes (0): 

### Community 4 - "Community 4"
Cohesion: 0.67
Nodes (1): sendPromotionEmail()

### Community 5 - "Community 5"
Cohesion: 1.0
Nodes (0): 

### Community 6 - "Community 6"
Cohesion: 1.0
Nodes (0): 

### Community 7 - "Community 7"
Cohesion: 1.0
Nodes (0): 

### Community 8 - "Community 8"
Cohesion: 1.0
Nodes (0): 

### Community 9 - "Community 9"
Cohesion: 1.0
Nodes (0): 

### Community 10 - "Community 10"
Cohesion: 1.0
Nodes (0): 

### Community 11 - "Community 11"
Cohesion: 1.0
Nodes (0): 

### Community 12 - "Community 12"
Cohesion: 1.0
Nodes (0): 

### Community 13 - "Community 13"
Cohesion: 1.0
Nodes (0): 

### Community 14 - "Community 14"
Cohesion: 1.0
Nodes (0): 

### Community 15 - "Community 15"
Cohesion: 1.0
Nodes (0): 

### Community 16 - "Community 16"
Cohesion: 1.0
Nodes (0): 

### Community 17 - "Community 17"
Cohesion: 1.0
Nodes (0): 

### Community 18 - "Community 18"
Cohesion: 1.0
Nodes (0): 

### Community 19 - "Community 19"
Cohesion: 1.0
Nodes (0): 

### Community 20 - "Community 20"
Cohesion: 1.0
Nodes (0): 

### Community 21 - "Community 21"
Cohesion: 1.0
Nodes (0): 

## Knowledge Gaps
- **Thin community `Community 5`** (2 nodes): `ApplicantStatus()`, `ApplicantStatus.jsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 6`** (2 nodes): `ApplyPage()`, `ApplyPage.jsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 7`** (2 nodes): `CompanyDashboard.jsx`, `CompanyDashboard()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 8`** (2 nodes): `JobPipeline.jsx`, `JobPipeline()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 9`** (2 nodes): `LandingPage.jsx`, `LandingPage()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 10`** (2 nodes): `test-autoclose.js`, `testAutoClose()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 11`** (2 nodes): `test-decay.js`, `run()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 12`** (2 nodes): `test-pipeline.js`, `runTests()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 13`** (2 nodes): `errorHandler.js`, `errorHandler()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 14`** (1 nodes): `eslint.config.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 15`** (1 nodes): `vite.config.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 16`** (1 nodes): `main.jsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 17`** (1 nodes): `Application.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 18`** (1 nodes): `AuditLog.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 19`** (1 nodes): `Job.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 20`** (1 nodes): `applications.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 21`** (1 nodes): `jobs.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `promoteNext()` connect `Community 1` to `Community 2`, `Community 4`?**
  _High betweenness centrality (0.046) - this node is a cross-community bridge._
- **Why does `processDecayedApplication()` connect `Community 2` to `Community 1`?**
  _High betweenness centrality (0.031) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `promoteNext()` (e.g. with `processDecayedApplication()` and `sendPromotionEmail()`) actually correct?**
  _`promoteNext()` has 2 INFERRED edges - model-reasoned connections that need verification._