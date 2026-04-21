/**
 * Integration test script for the hiring pipeline.
 * Uses mongodb-memory-server so no local MongoDB installation is needed.
 * Runs all 7 test steps sequentially and reports results.
 */
const { MongoMemoryReplSet } = require("mongodb-memory-server");

async function runTests() {
  console.log("=== Starting MongoDB In-Memory Replica Set ===\n");

  // mongodb-memory-server needs a replica set for transactions
  const replSet = await MongoMemoryReplSet.create({
    replSet: { count: 1, storageEngine: "wiredTiger" },
  });

  const mongoUri = replSet.getUri();
  console.log(`MongoDB URI: ${mongoUri}\n`);

  // Set env vars before requiring app
  process.env.MONGO_URI = mongoUri;
  process.env.PORT = "5111"; // avoid conflicts

  const mongoose = require("mongoose");
  await mongoose.connect(mongoUri);
  console.log("Connected to in-memory MongoDB\n");

  const express = require("express");
  const cors = require("cors");
  const errorHandler = require("./middleware/errorHandler");
  const jobsRouter = require("./routes/jobs");
  const applicationsRouter = require("./routes/applications");

  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use("/api/jobs", jobsRouter);
  app.use("/api/applications", applicationsRouter);
  app.use(errorHandler);

  const server = app.listen(5111, () => {
    console.log("Test server running on port 5111\n");
  });

  const BASE = "http://localhost:5111";

  let jobId, aliceId, bobId, charlieId;
  let passed = 0;
  let failed = 0;

  function assert(label, condition, detail) {
    if (condition) {
      console.log(`  ✅ ${label}`);
      passed++;
    } else {
      console.log(`  ❌ ${label} — ${detail || "FAILED"}`);
      failed++;
    }
  }

  try {
    // ─── STEP 1: Create a job ───
    console.log("\n── STEP 1: POST /api/jobs ──");
    let res = await fetch(`${BASE}/api/jobs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Backend Engineer",
        companyName: "TestCo",
        activeCapacity: 2,
        decayWindowMinutes: 1,
      }),
    });
    let data = await res.json();
    jobId = data._id;
    assert("Status 201", res.status === 201, `Got ${res.status}`);
    assert("Job created with _id", !!jobId, "No _id returned");
    assert("Title is correct", data.title === "Backend Engineer", `Got ${data.title}`);
    assert("activeCapacity is 2", data.activeCapacity === 2, `Got ${data.activeCapacity}`);
    console.log(`  📌 Job ID: ${jobId}`);

    // ─── STEP 2: Alice applies (should be active) ───
    console.log("\n── STEP 2: POST /api/jobs/:id/applications (Alice) ──");
    res = await fetch(`${BASE}/api/jobs/${jobId}/applications`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ applicantName: "Alice", applicantEmail: "alice@test.com" }),
    });
    data = await res.json();
    aliceId = data.applicationId;
    assert("Status 201", res.status === 201, `Got ${res.status}`);
    assert("Alice is active", data.status === "active", `Got ${data.status}`);
    assert("waitlistPosition is null", data.waitlistPosition === null, `Got ${data.waitlistPosition}`);
    console.log(`  📌 Alice ID: ${aliceId}`);

    // ─── STEP 3: Bob applies (should be active) ───
    console.log("\n── STEP 3: POST /api/jobs/:id/applications (Bob) ──");
    res = await fetch(`${BASE}/api/jobs/${jobId}/applications`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ applicantName: "Bob", applicantEmail: "bob@test.com" }),
    });
    data = await res.json();
    bobId = data.applicationId;
    assert("Status 201", res.status === 201, `Got ${res.status}`);
    assert("Bob is active", data.status === "active", `Got ${data.status}`);
    assert("waitlistPosition is null", data.waitlistPosition === null, `Got ${data.waitlistPosition}`);
    console.log(`  📌 Bob ID: ${bobId}`);

    // ─── STEP 4: Charlie applies (should be waitlisted) ───
    console.log("\n── STEP 4: POST /api/jobs/:id/applications (Charlie) ──");
    res = await fetch(`${BASE}/api/jobs/${jobId}/applications`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ applicantName: "Charlie", applicantEmail: "charlie@test.com" }),
    });
    data = await res.json();
    charlieId = data.applicationId;
    assert("Status 201", res.status === 201, `Got ${res.status}`);
    assert("Charlie is waitlisted", data.status === "waitlisted", `Got ${data.status}`);
    assert("waitlistPosition is 1", data.waitlistPosition === 1, `Got ${data.waitlistPosition}`);
    console.log(`  📌 Charlie ID: ${charlieId}`);

    // ─── STEP 5: GET /api/jobs/:id (pipeline state) ───
    console.log("\n── STEP 5: GET /api/jobs/:id ──");
    res = await fetch(`${BASE}/api/jobs/${jobId}`);
    data = await res.json();
    assert("Status 200", res.status === 200, `Got ${res.status}`);
    assert("2 active applicants", data.activeApplicants.length === 2, `Got ${data.activeApplicants.length}`);
    const activeNames = data.activeApplicants.map((a) => a.applicantName).sort();
    assert("Active: Alice & Bob", activeNames.includes("Alice") && activeNames.includes("Bob"), `Got ${activeNames}`);
    assert("1 waitlisted applicant", data.waitlistedApplicants.length === 1, `Got ${data.waitlistedApplicants.length}`);
    assert("Waitlisted: Charlie", data.waitlistedApplicants[0].applicantName === "Charlie", `Got ${data.waitlistedApplicants[0]?.applicantName}`);
    assert("0 exited applicants", data.exitedApplicants.length === 0, `Got ${data.exitedApplicants.length}`);

    // ─── STEP 6: Accept Alice → Charlie should auto-promote ───
    console.log("\n── STEP 6: PATCH /api/applications/:id/status (Accept Alice) ──");
    res = await fetch(`${BASE}/api/applications/${aliceId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newStatus: "accepted" }),
    });
    data = await res.json();
    assert("Status 200", res.status === 200, `Got ${res.status}`);
    assert("Alice status is accepted", data.status === "accepted", `Got ${data.status}`);

    // Verify Charlie was promoted
    res = await fetch(`${BASE}/api/applications/${charlieId}/status`);
    data = await res.json();
    assert("Charlie auto-promoted to pending_acknowledgment", data.status === "pending_acknowledgment", `Got ${data.status}`);
    assert("Charlie has acknowledgeDeadline set", data.acknowledgeDeadline !== null, "No deadline");
    console.log(`  📌 Charlie's deadline: ${data.acknowledgeDeadline}`);

    // ─── STEP 7: GET /api/jobs/:id (final pipeline state) ───
    console.log("\n── STEP 7: GET /api/jobs/:id (Final State) ──");
    res = await fetch(`${BASE}/api/jobs/${jobId}`);
    data = await res.json();
    assert("Status 200", res.status === 200, `Got ${res.status}`);

    // Active: Bob (active) — Charlie is pending_acknowledgment so in waitlisted group per route logic
    assert("1 active applicant (Bob)", data.activeApplicants.length === 1, `Got ${data.activeApplicants.length}`);
    assert("Active is Bob", data.activeApplicants[0]?.applicantName === "Bob", `Got ${data.activeApplicants[0]?.applicantName}`);

    // Waitlisted group includes pending_acknowledgment
    assert("1 in waitlisted group (Charlie as pending_acknowledgment)", data.waitlistedApplicants.length === 1, `Got ${data.waitlistedApplicants.length}`);
    assert("Charlie is pending_acknowledgment", data.waitlistedApplicants[0]?.status === "pending_acknowledgment", `Got ${data.waitlistedApplicants[0]?.status}`);

    // Exited: Alice (accepted)
    assert("1 exited applicant (Alice)", data.exitedApplicants.length === 1, `Got ${data.exitedApplicants.length}`);
    assert("Alice is accepted", data.exitedApplicants[0]?.applicantName === "Alice", `Got ${data.exitedApplicants[0]?.applicantName}`);

  } catch (err) {
    console.error("\n💥 Test error:", err.message);
    console.error(err.stack);
  }

  // ─── Summary ───
  console.log(`\n${"═".repeat(50)}`);
  console.log(`  RESULTS: ${passed} passed, ${failed} failed, ${passed + failed} total`);
  console.log(`${"═".repeat(50)}\n`);

  server.close();
  await mongoose.disconnect();
  await replSet.stop();
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
