const baseUrl = "http://127.0.0.1:5000/api";

async function testAutoClose() {
  console.log("--- Starting Auto-Close Test ---");
  
  // 1. Create Job with capacity 2
  console.log("\n1. Creating job with activeCapacity: 2...");
  const jobRes = await fetch(`${baseUrl}/jobs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "Auto-Close Test Engineer",
      companyName: "TestCorp",
      activeCapacity: 2
    })
  });
  const job = await jobRes.json();
  const jobId = job._id;
  console.log("   Job created:", jobId);

  // 2. Submit 3 applications
  console.log("\n2. Submitting 3 applications (2 should be active, 1 waitlisted)...");
  
  const app1Res = await fetch(`${baseUrl}/jobs/${jobId}/applications`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ applicantName: "Alice", applicantEmail: "alice@example.com" })
  });
  const app1 = await app1Res.json();
  console.log(`   Alice applied (Status: ${app1.status || app1.message})`);

  const app2Res = await fetch(`${baseUrl}/jobs/${jobId}/applications`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ applicantName: "Bob", applicantEmail: "bob@example.com" })
  });
  const app2 = await app2Res.json();
  console.log(`   Bob applied (Status: ${app2.status || app2.message})`);

  const app3Res = await fetch(`${baseUrl}/jobs/${jobId}/applications`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ applicantName: "Charlie", applicantEmail: "charlie@example.com" })
  });
  const app3 = await app3Res.json();
  console.log(`   Charlie applied (Status: ${app3.status || app3.message})`);

  // 3. Accept first applicant (Alice)
  console.log("\n3. Accepting Alice (1/2 positions filled)...");
  await fetch(`${baseUrl}/applications/${app1.applicationId}/status`, {
    method: "PATCH", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ newStatus: "accepted" })
  });

  // Check job status
  let checkJobRes = await fetch(`${baseUrl}/jobs/${jobId}`);
  let checkJob = await checkJobRes.json();
  console.log(`   Job isOpen: ${checkJob.job.isOpen} | Accepted Count: ${checkJob.exitedApplicants.filter(a => a.status === 'accepted').length}`);

  // 4. Accept second applicant (Bob) - should auto-close
  console.log("\n4. Accepting Bob (2/2 positions filled, should auto-close)...");
  await fetch(`${baseUrl}/applications/${app2.applicationId}/status`, {
    method: "PATCH", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ newStatus: "accepted" })
  });

  // 5. Verify Job state and Charlie's state
  console.log("\n5. Verifying final state...");
  
  const finalJobRes = await fetch(`${baseUrl}/jobs/${jobId}`);
  const finalJobState = await finalJobRes.json();
  console.log(`   Job isOpen: ${finalJobState.job.isOpen} (Expected: false)`);
  
  const charlieStatusRes = await fetch(`${baseUrl}/applications/${app3.applicationId}/status`);
  const charlieStatus = await charlieStatusRes.json();
  console.log(`   Charlie's final status: ${charlieStatus.status} (Expected: rejected)`);
  
  console.log("\n--- Test Finished ---");
}

testAutoClose().catch(console.error);
