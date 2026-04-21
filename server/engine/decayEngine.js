const mongoose = require("mongoose");
const Application = require("../models/Application");
const Job = require("../models/Job");
const AuditLog = require("../models/AuditLog");
const { promoteNext } = require("../utils/queueManager");

/**
 * Process a single expired application within its own transaction.
 * Decays the applicant back to the end of the waitlist with a penalty,
 * then triggers cascading promotion via promoteNext.
 */
async function processDecayedApplication(application) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const jobId = application.jobId;

    // Find the current highest waitlist position for this job
    const lastInLine = await Application.findOne({
      jobId,
      status: "waitlisted",
    })
      .sort({ waitlistPosition: -1 })
      .session(session);

    const penalizedPosition = lastInLine ? lastInLine.waitlistPosition + 1 : 1;

    // Atomically decay the application — but ONLY if it is still pending_acknowledgment.
    // This guards against a TOCTOU race: the applicant could acknowledge between the
    // decayTick() bulk fetch and this transaction executing.
    const freshApplication = await Application.findOneAndUpdate(
      { _id: application._id, status: "pending_acknowledgment" },
      {
        status: "waitlisted",
        waitlistPosition: penalizedPosition,
        $inc: { decayCount: 1 },
        promotedAt: null,
        acknowledgeDeadline: null,
      },
      { session, new: true }
    );

    if (!freshApplication) {
      // Applicant acknowledged between the decayTick fetch and now.
      // Their state is already correct — abort cleanly, do not touch activeCount.
      await session.abortTransaction();
      console.log(
        `[DecayEngine] Skipped decay for application ${application._id} — already acknowledged.`
      );
      return;
    }

    // Decrement job's activeCount
    await Job.findByIdAndUpdate(
      jobId,
      { $inc: { activeCount: -1 } },
      { session }
    );

    // Audit log
    await AuditLog.create(
      [
        {
          applicationId: freshApplication._id,
          jobId,
          applicantName: freshApplication.applicantName,
          applicantEmail: freshApplication.applicantEmail,
          fromStatus: "pending_acknowledgment",
          toStatus: "waitlisted",
          reason: "decayed",
          metadata: {
            decayCount: freshApplication.decayCount,
            penalizedPosition,
          },
        },
      ],
      { session }
    );

    // Cascade: promote the next person in line
    await promoteNext(jobId, session);

    await session.commitTransaction();

    console.log(
      `[DecayEngine] Decayed application ${freshApplication._id} for job ${jobId}. Decay count: ${freshApplication.decayCount}`
    );
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
}

/**
 * Single tick of the decay engine.
 * Finds all expired pending_acknowledgment applications and processes them one by one.
 */
async function decayTick() {
  try {
    console.log("[DecayEngine] Tick — checking for expired promotions...");

    const expiredApplications = await Application.find({
      status: "pending_acknowledgment",
      acknowledgeDeadline: { $lt: new Date() },
    });

    if (expiredApplications.length === 0) {
      return;
    }

    console.log(
      `[DecayEngine] Found ${expiredApplications.length} expired promotion(s)`
    );

    // Process one by one — not in parallel
    for (const application of expiredApplications) {
      await processDecayedApplication(application);
    }
  } catch (err) {
    console.error("[DecayEngine] Error during tick:", err.message);
  }
}

/**
 * Start the decay engine. Runs every 60 seconds.
 */
function startDecayEngine() {
  setInterval(decayTick, 60 * 1000);
}

module.exports = { startDecayEngine };
