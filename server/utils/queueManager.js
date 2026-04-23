const mongoose = require("mongoose");
const Job = require("../models/Job");
const Application = require("../models/Application");
const AuditLog = require("../models/AuditLog");
const { sendPromotionEmail } = require("./mailer");

/**
 * Creates an audit log entry within the given session.
 */
async function createAuditLog(data, session) {
  await AuditLog.create(
    [
      {
        applicationId: data.applicationId,
        jobId: data.jobId,
        applicantName: data.applicantName,
        applicantEmail: data.applicantEmail,
        fromStatus: data.fromStatus || null,
        toStatus: data.toStatus,
        reason: data.reason,
        metadata: data.metadata || {},
      },
    ],
    { session }
  );
}

/**
 * Submit a new application to a job.
 *
 * Atomically attempts to claim an active slot. If capacity is full,
 * the applicant is placed at the end of the waitlist.
 */
async function submitApplication(jobId, applicantName, applicantEmail, resumeUrl = null) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 1. Check for duplicate application
    const existingApplication = await Application.findOne({
      jobId,
      applicantEmail: { $regex: new RegExp(`^${applicantEmail}$`, "i") }
    }).session(session);

    if (existingApplication) {
      throw new Error("Duplicate Application: You have already applied for this role.");
    }

    // 2. Attempt to atomically claim an active slot
    const job = await Job.findOneAndUpdate(
      {
        _id: jobId,
        isOpen: true,
        $expr: { $lt: ["$activeCount", "$activeCapacity"] },
      },
      { $inc: { activeCount: 1 } },
      { new: true, session }
    );

    let application;

    if (job) {
      // Slot claimed — applicant goes active immediately
      [application] = await Application.create(
        [
          {
            jobId,
            applicantName,
            applicantEmail,
            resumeUrl,
            status: "active",
            waitlistPosition: null,
          },
        ],
        { session }
      );

      await createAuditLog(
        {
          applicationId: application._id,
          jobId,
          applicantName,
          applicantEmail,
          fromStatus: null,
          toStatus: "active",
          reason: "applied",
        },
        session
      );
    } else {
      // No slot available — verify the job exists and is open
      const existingJob = await Job.findById(jobId).session(session);
      if (!existingJob) {
        throw Object.assign(new Error("Job not found"), { statusCode: 404 });
      }
      if (!existingJob.isOpen) {
        throw Object.assign(new Error("Job is no longer accepting applications"), { statusCode: 400 });
      }

      // Find the current max waitlist position for this job
      const lastInLine = await Application.findOne({ jobId, status: "waitlisted" })
        .sort({ waitlistPosition: -1 })
        .session(session);

      const nextPosition = lastInLine ? lastInLine.waitlistPosition + 1 : 1;

      [application] = await Application.create(
        [
          {
            jobId,
            applicantName,
            applicantEmail,
            resumeUrl,
            status: "waitlisted",
            waitlistPosition: nextPosition,
          },
        ],
        { session }
      );

      await createAuditLog(
        {
          applicationId: application._id,
          jobId,
          applicantName,
          applicantEmail,
          fromStatus: null,
          toStatus: "waitlisted",
          reason: "capacity_full",
          metadata: { waitlistPosition: nextPosition },
        },
        session
      );
    }

    await session.commitTransaction();
    return application;
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
}

/**
 * Reindexes all waitlisted applications for a job to contiguous positions 1, 2, 3...
 * Eliminates gaps that can accumulate from concurrent submissions or repeated decay
 * cycles. Sorts by current waitlistPosition first, then createdAt as a tiebreaker
 * so that relative ordering is always deterministic.
 */
async function reindexWaitlist(jobId, session) {
  const waitlisted = await Application.find({ jobId, status: "waitlisted" })
    .sort({ waitlistPosition: 1, createdAt: 1 })
    .session(session);

  if (waitlisted.length === 0) return;

  const bulkOps = waitlisted.map((app, index) => ({
    updateOne: {
      filter: { _id: app._id },
      update: { $set: { waitlistPosition: index + 1 } },
    },
  }));

  await Application.bulkWrite(bulkOps, { session });
}

/**
 * Promote the next waitlisted applicant for a job.
 *
 * Called internally after an active applicant exits the pipeline.
 * Uses the provided session to stay within the caller's transaction.
 */
async function promoteNext(jobId, session) {
  // Find the waitlisted applicant with the lowest position
  const nextApplicant = await Application.findOne({
    jobId,
    status: "waitlisted",
  })
    .sort({ waitlistPosition: 1 })
    .session(session);

  if (!nextApplicant) {
    return null;
  }

  const job = await Job.findById(jobId).session(session);

  const now = new Date();
  const deadline = new Date(now.getTime() + job.decayWindowMinutes * 60 * 1000);

  // Promote to pending_acknowledgment
  nextApplicant.status = "pending_acknowledgment";
  nextApplicant.promotedAt = now;
  nextApplicant.acknowledgeDeadline = deadline;
  nextApplicant.waitlistPosition = null;
  await nextApplicant.save({ session });

  // Increment activeCount for the promoted applicant
  await Job.findByIdAndUpdate(jobId, { $inc: { activeCount: 1 } }, { session });

  await createAuditLog(
    {
      applicationId: nextApplicant._id,
      jobId,
      applicantName: nextApplicant.applicantName,
      applicantEmail: nextApplicant.applicantEmail,
      fromStatus: "waitlisted",
      toStatus: "pending_acknowledgment",
      reason: "promoted",
      metadata: { acknowledgeDeadline: deadline },
    },
    session
  );

  // Reindex remaining waitlisted applicants — guarantees gap-free positions 1, 2, 3...
  // Also corrects any pre-existing gaps from concurrent submissions.
  await reindexWaitlist(jobId, session);

  // Fire-and-forget — must not block or delay the caller's transaction commit.
  // sendPromotionEmail handles all errors internally; .catch() is a safety net
  // for any unexpected synchronous-style rejection.
  sendPromotionEmail({
    applicantName: nextApplicant.applicantName,
    applicantEmail: nextApplicant.applicantEmail,
    applicationId: nextApplicant._id.toString(),
    acknowledgeDeadline: deadline,
  }).catch((err) => console.error("[QueueManager] Email send error:", err.message));

  return nextApplicant;
}

/**
 * Remove an applicant from the active pipeline.
 *
 * Valid exit statuses: accepted, rejected, withdrawn.
 * Automatically triggers promotion of the next waitlisted applicant.
 */
async function exitPipeline(applicationId, newStatus) {
  const validStatuses = ["accepted", "rejected", "withdrawn"];
  if (!validStatuses.includes(newStatus)) {
    throw Object.assign(
      new Error(`Invalid exit status: ${newStatus}. Must be one of: ${validStatuses.join(", ")}`),
      { statusCode: 400 }
    );
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const EXITABLE_STATUSES = ["active", "acknowledged", "pending_acknowledgment"];
    
    // Use findOneAndUpdate with status guard for strict TOCTOU concurrency control
    const application = await Application.findOneAndUpdate(
      { _id: applicationId, status: { $in: EXITABLE_STATUSES } },
      { status: newStatus },
      { session, new: true }
    );

    if (!application) {
      // If not found, either it doesn't exist or it's in a non-exitable state
      const checkApp = await Application.findById(applicationId).session(session);
      if (!checkApp) {
        throw Object.assign(new Error("Application not found"), { statusCode: 404 });
      } else {
        throw Object.assign(new Error(`Cannot exit application with status '${checkApp.status}'`), { statusCode: 409 });
      }
    }

    const previousStatus = application.status;

    // Decrement job's active count
    await Job.findByIdAndUpdate(
      application.jobId,
      { $inc: { activeCount: -1 } },
      { session }
    );

    await createAuditLog(
      {
        applicationId: application._id,
        jobId: application.jobId,
        applicantName: application.applicantName,
        applicantEmail: application.applicantEmail,
        fromStatus: previousStatus,
        toStatus: newStatus,
        reason: newStatus,
      },
      session
    );

    // --- Auto-close check: if all positions are now filled, close the job ---
    let jobAutoClosed = false;
    if (newStatus === "accepted") {
      const job = await Job.findById(application.jobId).session(session);
      const acceptedCount = await Application.countDocuments({
        jobId: application.jobId,
        status: "accepted",
      }).session(session);

      console.log(`[QueueManager Debug] Accepted Count: ${acceptedCount}, Active Capacity: ${job.activeCapacity}`);

      if (acceptedCount >= job.activeCapacity) {
        // Close the job — no more applications accepted
        job.isOpen = false;
        await job.save({ session });
        jobAutoClosed = true;

        await createAuditLog(
          {
            applicationId: application._id,
            jobId: application.jobId,
            applicantName: "SYSTEM",
            applicantEmail: "system",
            fromStatus: null,
            toStatus: null,
            reason: "job_auto_closed",
            metadata: { acceptedCount, activeCapacity: job.activeCapacity },
          },
          session
        );

        // Bulk-reject all remaining waitlisted and pending_acknowledgment applicants
        const remainingApplicants = await Application.find({
          jobId: application.jobId,
          status: { $in: ["waitlisted", "pending_acknowledgment"] },
        }).session(session);

        if (remainingApplicants.length > 0) {
          // Decrement activeCount for each pending_acknowledgment applicant being rejected
          const pendingCount = remainingApplicants.filter(
            (a) => a.status === "pending_acknowledgment"
          ).length;

          if (pendingCount > 0) {
            await Job.findByIdAndUpdate(
              application.jobId,
              { $inc: { activeCount: -pendingCount } },
              { session }
            );
          }

          // Bulk update all remaining to rejected
          await Application.updateMany(
            {
              jobId: application.jobId,
              status: { $in: ["waitlisted", "pending_acknowledgment"] },
            },
            {
              $set: {
                status: "rejected",
                waitlistPosition: null,
                promotedAt: null,
                acknowledgeDeadline: null,
              },
            },
            { session }
          );

          // Create audit logs for each rejected applicant
          const auditEntries = remainingApplicants.map((a) => ({
            applicationId: a._id,
            jobId: application.jobId,
            applicantName: a.applicantName,
            applicantEmail: a.applicantEmail,
            fromStatus: a.status,
            toStatus: "rejected",
            reason: "job_filled",
            metadata: { acceptedCount, activeCapacity: job.activeCapacity },
          }));

          await AuditLog.insertMany(auditEntries, { session });

          console.log(
            `[QueueManager] Job ${application.jobId} auto-closed. Rejected ${remainingApplicants.length} remaining applicant(s).`
          );
        }
      }
    }

    // Only promote the next waitlisted applicant if the job wasn't just auto-closed
    if (!jobAutoClosed) {
      await promoteNext(application.jobId, session);
    }

    await session.commitTransaction();
    return application;
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
}

/**
 * Acknowledge a promotion within the allowed time window.
 *
 * Transitions applicant from pending_acknowledgment to acknowledged.
 */
async function acknowledgePromotion(applicationId) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Use findOneAndUpdate with strict status filter for TOCTOU prevention
    const application = await Application.findOneAndUpdate(
      { _id: applicationId, status: "pending_acknowledgment" },
      { status: "acknowledged" },
      { session, new: true }
    );

    if (!application) {
      const checkApp = await Application.findById(applicationId).session(session);
      if (!checkApp) {
        throw Object.assign(new Error("Application not found"), { statusCode: 404 });
      } else {
        throw Object.assign(
          new Error(`Cannot acknowledge: application status is "${checkApp.status}", expected "pending_acknowledgment"`),
          { statusCode: 400 }
        );
      }
    }

    await createAuditLog(
      {
        applicationId: application._id,
        jobId: application.jobId,
        applicantName: application.applicantName,
        applicantEmail: application.applicantEmail,
        fromStatus: "pending_acknowledgment",
        toStatus: "acknowledged",
        reason: "acknowledged",
      },
      session
    );

    await session.commitTransaction();
    return application;
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
}

module.exports = {
  submitApplication,
  promoteNext,
  exitPipeline,
  acknowledgePromotion,
};
