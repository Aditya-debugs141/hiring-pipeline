const mongoose = require("mongoose");

const jobSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Job title is required"],
    },
    description: {
      type: String,
    },
    companyName: {
      type: String,
      required: [true, "Company name is required"],
    },
    activeCapacity: {
      type: Number,
      required: [true, "Active capacity is required"],
      min: [1, "Active capacity must be at least 1"],
    },
    activeCount: {
      type: Number,
      default: 0,
    },
    isOpen: {
      type: Boolean,
      default: true,
    },
    decayWindowMinutes: {
      type: Number,
      default: 30,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Job", jobSchema);
