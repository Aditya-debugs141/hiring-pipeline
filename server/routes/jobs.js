const express = require("express");
const router = express.Router();
const Job = require("../models/Job");
const Application = require("../models/Application");
const AuditLog = require("../models/AuditLog");
const { submitApplication } = require("../utils/queueManager");

/**
 * DELETE /api/jobs/reset
 * Wipes the entire database for the hackathon demo.
 */
router.delete("/reset", async (req, res, next) => {
  try {
    await Job.deleteMany({});
    await Application.deleteMany({});
    await AuditLog.deleteMany({});
    res.json({ message: "Database completely wiped clean." });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/jobs
 * Create a new job opening.
 */
router.post("/", async (req, res, next) => {
  try {
    const { title, description, companyName, activeCapacity, decayWindowMinutes } = req.body;

    if (!title || !companyName || !activeCapacity) {
      return res.status(400).json({
        error: "title, companyName and activeCapacity are required",
      });
    }

    const job = await Job.create({
      title,
      description,
      companyName,
      activeCapacity,
      ...(decayWindowMinutes !== undefined && { decayWindowMinutes }),
    });

    return res.status(201).json(job);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/jobs
 * List all jobs, sorted by createdAt descending.
 */
router.get("/", async (req, res, next) => {
  try {
    const jobs = await Job.find()
      .select("_id title companyName activeCapacity activeCount isOpen createdAt")
      .sort({ createdAt: -1 });

    return res.status(200).json(jobs);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/jobs/:id
 * Get a single job with its pipeline state split into three groups.
 */
router.get("/:id", async (req, res, next) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }

    const activeApplicants = await Application.find({
      jobId: job._id,
      status: { $in: ["active", "acknowledged"] },
    });

    const waitlistedApplicants = await Application.find({
      jobId: job._id,
      status: { $in: ["waitlisted", "pending_acknowledgment"] },
    }).sort({ waitlistPosition: 1 });

    const exitedApplicants = await Application.find({
      jobId: job._id,
      status: { $in: ["accepted", "rejected", "withdrawn"] },
    });

    return res.status(200).json({
      job,
      activeApplicants,
      waitlistedApplicants,
      exitedApplicants,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/jobs/:id/audit
 * Get the full audit trail for a job.
 */
router.get("/:id/audit", async (req, res, next) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }

    const auditLogs = await AuditLog.find({ jobId: job._id }).sort({
      createdAt: -1,
    });

    return res.status(200).json(auditLogs);
  } catch (err) {
    next(err);
  }
});

const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed"));
    }
  },
});

/**
 * POST /api/jobs/:id/applications
 * Submit a new application to a job.
 */
router.post("/:id/applications", upload.single("resume"), async (req, res, next) => {
  try {
    const { applicantName, applicantEmail } = req.body;
    const resumeUrl = req.file ? `/uploads/${req.file.filename}` : null;

    if (!applicantName || !applicantEmail) {
      return res.status(400).json({
        error: "applicantName and applicantEmail are required",
      });
    }

    const application = await submitApplication(
      req.params.id,
      applicantName,
      applicantEmail,
      resumeUrl
    );

    const isActive = application.status === "active";

    return res.status(201).json({
      applicationId: application._id,
      status: application.status,
      waitlistPosition: application.waitlistPosition,
      message: isActive
        ? "You are now under active review"
        : `You are #${application.waitlistPosition} in the waitlist`,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
