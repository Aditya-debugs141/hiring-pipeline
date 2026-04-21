const express = require("express");
const router = express.Router();
const Application = require("../models/Application");
const { exitPipeline, acknowledgePromotion } = require("../utils/queueManager");

/**
 * GET /api/applications/search
 * Search applications by applicantEmail
 */
router.get("/search", async (req, res, next) => {
  try {
    const { email } = req.query;
    if (!email) return res.status(400).json({ error: "Email query parameter is required" });

    const applications = await Application.find({
      applicantEmail: { $regex: new RegExp(`^${email}$`, "i") }
    }).populate("jobId", "title").sort({ createdAt: -1 });

    const results = applications.map(app => {
      let queueMessage;
      switch (app.status) {
        case "active":
        case "acknowledged": queueMessage = "You are currently under active review"; break;
        case "waitlisted": queueMessage = `You are #${app.waitlistPosition} in the waitlist`; break;
        case "pending_acknowledgment": queueMessage = `You have been promoted. Please acknowledge before ${new Date(app.acknowledgeDeadline).toLocaleString()}`; break;
        case "accepted": queueMessage = "Congratulations, you have been accepted"; break;
        case "rejected": queueMessage = "Your application was not selected"; break;
        case "withdrawn": queueMessage = "You have withdrawn your application"; break;
        default: queueMessage = "Unknown status";
      }

      return {
        applicationId: app._id,
        applicantName: app.applicantName,
        status: app.status,
        waitlistPosition: app.waitlistPosition,
        acknowledgeDeadline: app.acknowledgeDeadline,
        decayCount: app.decayCount,
        jobTitle: app.jobId?.title || null,
        queueMessage,
      };
    });

    return res.status(200).json(results);
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/applications/:id/status
 * Exit an applicant from the pipeline (accepted, rejected, or withdrawn).
 */
router.patch("/:id/status", async (req, res, next) => {
  try {
    const { newStatus } = req.body;
    const validStatuses = ["accepted", "rejected", "withdrawn"];

    if (!newStatus || !validStatuses.includes(newStatus)) {
      return res.status(400).json({
        error: "newStatus must be accepted, rejected, or withdrawn",
      });
    }

    const application = await exitPipeline(req.params.id, newStatus);
    return res.status(200).json(application);
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/applications/:id/acknowledge
 * Acknowledge a promotion from the waitlist.
 */
router.patch("/:id/acknowledge", async (req, res, next) => {
  try {
    const application = await acknowledgePromotion(req.params.id);
    return res.status(200).json(application);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/applications/:id/status
 * Get the current status of an application with a human-readable queue message.
 */
router.get("/:id/status", async (req, res, next) => {
  try {
    const application = await Application.findById(req.params.id).populate(
      "jobId",
      "title"
    );

    if (!application) {
      return res.status(404).json({ error: "Application not found" });
    }

    let queueMessage;
    switch (application.status) {
      case "active":
      case "acknowledged":
        queueMessage = "You are currently under active review";
        break;
      case "waitlisted":
        queueMessage = `You are #${application.waitlistPosition} in the waitlist`;
        break;
      case "pending_acknowledgment":
        queueMessage = `You have been promoted. Please acknowledge before ${new Date(application.acknowledgeDeadline).toLocaleString()}`;
        break;
      case "accepted":
        queueMessage = "Congratulations, you have been accepted";
        break;
      case "rejected":
        queueMessage = "Your application was not selected";
        break;
      case "withdrawn":
        queueMessage = "You have withdrawn your application";
        break;
      default:
        queueMessage = "Unknown status";
    }

    return res.status(200).json({
      applicationId: application._id,
      applicantName: application.applicantName,
      status: application.status,
      waitlistPosition: application.waitlistPosition,
      acknowledgeDeadline: application.acknowledgeDeadline,
      decayCount: application.decayCount,
      jobTitle: application.jobId?.title || null,
      queueMessage,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/applications/:id/acknowledge-email
 * One-click acknowledge from email link.
 * Acknowledges the promotion and redirects to the frontend status page.
 */
router.get("/:id/acknowledge-email", async (req, res) => {
  const APP_URL = process.env.APP_URL || "http://localhost:5173";

  try {
    await acknowledgePromotion(req.params.id);
    // Redirect to status page with success indicator
    return res.redirect(`${APP_URL}/status?acknowledged=${req.params.id}`);
  } catch (err) {
    // Redirect to status page with error — don't show raw error page
    return res.redirect(`${APP_URL}/status?error=${encodeURIComponent(err.message)}`);
  }
});

module.exports = router;
