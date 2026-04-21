const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema(
  {
    applicationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Application",
    },
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
    },
    applicantName: {
      type: String,
    },
    applicantEmail: {
      type: String,
    },
    fromStatus: {
      type: String,
    },
    toStatus: {
      type: String,
    },
    reason: {
      type: String,
      enum: [
        "applied",
        "promoted",
        "acknowledged",
        "decayed",
        "accepted",
        "rejected",
        "withdrawn",
        "capacity_full",
        "job_auto_closed",
        "job_filled",
      ],
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("AuditLog", auditLogSchema);
