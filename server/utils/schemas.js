const { z } = require("zod");

const createJobSchema = z.object({
  title: z.string().min(1, "Title is required").max(100, "Title is too long"),
  description: z.string().optional(),
  companyName: z.string().min(1, "Company Name is required").max(100),
  activeCapacity: z.coerce.number().int().positive("Active Capacity must be a positive integer"),
  decayWindowMinutes: z.coerce.number().int().positive().optional(),
});

const submitApplicationSchema = z.object({
  applicantName: z.string().min(1, "Applicant Name is required").max(100),
  applicantEmail: z.string().email("Invalid email address"),
});

module.exports = {
  createJobSchema,
  submitApplicationSchema,
};
