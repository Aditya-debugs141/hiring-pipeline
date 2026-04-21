const mongoose = require("mongoose");

const applicationSchema = new mongoose.Schema(
  {
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      required: [true, "Job ID is required"],
    },
    applicantName: {
      type: String,
      required: [true, "Applicant name is required"],
    },
    applicantEmail: {
      type: String,
      required: [true, "Applicant email is required"],
    },
    resumeUrl: {
      type: String,
      required: [true, "Resume is required"],
    },
    status: {
      type: String,
      enum: [
        "waitlisted",
        "active",
        "pending_acknowledgment",
        "acknowledged",
        "accepted",
        "rejected",
        "withdrawn",
      ],
      default: "waitlisted",
    },
    waitlistPosition: {
      type: Number,
      default: null,
    },
    promotedAt: {
      type: Date,
      default: null,
    },
    acknowledgeDeadline: {
      type: Date,
      default: null,
    },
    decayCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Application", applicationSchema);
