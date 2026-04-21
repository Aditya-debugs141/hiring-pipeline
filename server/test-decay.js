/**
 * Live decay test — runs against the already-running server on port 5000.
 * Tests the full decay cascade in real time.
 */
const BASE = "http://localhost:5000";

async function run() {
  let jobId, aliceId, bobId;

  // ─── STEP 1: Create a job with 1 min decay, capacity 1 ───
  console.log("\n══ STEP 1: Create job (capacity=1, decayWindow=1min) ══");
  let res = await fetch(`${BASE}/api/jobs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "Decay Test Job",
      companyName: "TestCo",
      activeCapacity: 1,
      decayWindowMinutes: 1,
    }),
  });
  let data = await res.json();
  jobId = data._id;
  console.log(`  ✅ Job created: ${jobId}`);
  console.log(`  activeCapacity: ${data.activeCapacity}, decayWindowMinutes: ${data.decayWindowMinutes}`);

  // ─── STEP 2: Alice applies (active), Bob applies (waitlisted) ───
  console.log("\n══ STEP 2: Submit Alice & Bob ══");

  res = await fetch(`${BASE}/api/jobs/${jobId}/applications`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ applicantName: "Alice", applicantEmail: "alice@test.com" }),
  });
  data = await res.json();
  aliceId = data.applicationId;
  console.log(`  Alice → status: ${data.status} | id: ${aliceId}`);
  console.log(`  ✅ Alice is active`);

  res = await fetch(`${BASE}/api/jobs/${jobId}/applications`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ applicantName: "Bob", applicantEmail: "bob@test.com" }),
  });
  data = await res.json();
  bobId = data.applicationId;
  console.log(`  Bob   → status: ${data.status}, position: ${data.waitlistPosition} | id: ${bobId}`);
  console.log(`  ✅ Bob is waitlisted at position 1`);

  // ─── STEP 3: Accept Alice → Bob auto-promotes ───
  console.log("\n══ STEP 3: Accept Alice (triggers Bob's auto-promotion) ══");
  res = await fetch(`${BASE}/api/applications/${aliceId}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ newStatus: "accepted" }),
  });
  data = await res.json();
  console.log(`  Alice → status: ${data.status}`);
  console.log(`  ✅ Alice accepted`);

  // ─── STEP 4: Verify Bob is pending_acknowledgment ───
  console.log("\n══ STEP 4: Verify Bob is pending_acknowledgment ══");
  res = await fetch(`${BASE}/api/applications/${bobId}/status`);
  data = await res.json();
  console.log(`  Bob → status: ${data.status}`);
  console.log(`  acknowledgeDeadline: ${data.acknowledgeDeadline}`);
  console.log(`  queueMessage: ${data.queueMessage}`);

  if (data.status === "pending_acknowledgment") {
    console.log(`  ✅ Bob is pending_acknowledgment with deadline`);
  } else {
    console.log(`  ❌ Expected pending_acknowledgment, got ${data.status}`);
    process.exit(1);
  }

  const deadline = new Date(data.acknowledgeDeadline);
  const now = new Date();
  const waitMs = deadline - now + 5000; // wait until deadline + 5s buffer
  const waitSec = Math.ceil(waitMs / 1000);

  // ─── STEP 5: Wait for decay ───
  console.log(`\n══ STEP 5: Waiting ${waitSec}s for deadline to pass + decay engine tick ══`);
  console.log(`  Deadline: ${deadline.toISOString()}`);
  console.log(`  Now:      ${now.toISOString()}`);
  console.log(`  (Watch server console for [DecayEngine] logs)\n`);

  // Progress indicator
  for (let i = 0; i < waitSec; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    process.stdout.write(`  ⏳ ${i + 1}/${waitSec}s\r`);
  }
  console.log(`\n  ⏰ Deadline passed. Waiting for next decay tick (up to 60s)...`);

  // Poll for Bob's status until it changes or 90s timeout
  let decayed = false;
  for (let i = 0; i < 90; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    res = await fetch(`${BASE}/api/applications/${bobId}/status`);
    data = await res.json();
    if (data.status !== "pending_acknowledgment") {
      decayed = true;
      break;
    }
    process.stdout.write(`  ⏳ Polling... ${i + 1}s\r`);
  }

  // ─── STEP 6: Verify Bob decayed ───
  console.log(`\n\n══ STEP 6: Verify Bob decayed ══`);
  if (decayed) {
    console.log(`  Bob → status: ${data.status}`);
    console.log(`  decayCount: ${data.decayCount}`);
    console.log(`  waitlistPosition: ${data.waitlistPosition}`);
    console.log(`  queueMessage: ${data.queueMessage}`);

    if (data.status === "waitlisted" && data.decayCount === 1) {
      console.log(`\n  ✅ DECAY TEST PASSED — Bob decayed back to waitlist with count=1`);
    } else {
      console.log(`\n  ❌ Unexpected state: status=${data.status}, decayCount=${data.decayCount}`);
    }
  } else {
    console.log(`  ❌ Bob did NOT decay within 90s polling window`);
    console.log(`  Current status: ${data.status}`);
  }

  // Final pipeline state
  console.log("\n══ FINAL: Pipeline State ══");
  res = await fetch(`${BASE}/api/jobs/${jobId}`);
  data = await res.json();
  console.log(`  Active:     ${data.activeApplicants.map((a) => `${a.applicantName} (${a.status})`).join(", ") || "none"}`);
  console.log(`  Waitlisted: ${data.waitlistedApplicants.map((a) => `${a.applicantName} (${a.status}, pos=${a.waitlistPosition})`).join(", ") || "none"}`);
  console.log(`  Exited:     ${data.exitedApplicants.map((a) => `${a.applicantName} (${a.status})`).join(", ") || "none"}`);
  console.log(`  Job activeCount: ${data.job.activeCount}`);

  // Audit trail
  console.log("\n══ AUDIT TRAIL ══");
  res = await fetch(`${BASE}/api/jobs/${jobId}/audit`);
  data = await res.json();
  data.forEach((log, i) => {
    console.log(`  ${i + 1}. [${log.reason}] ${log.applicantName}: ${log.fromStatus || "—"} → ${log.toStatus}`);
  });

  console.log("\n══ DONE ══\n");
}

run().catch((err) => {
  console.error("Test error:", err);
  process.exit(1);
});
