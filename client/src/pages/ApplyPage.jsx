import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { getJob, submitApplication } from "../api";

function ApplyPage() {
  const { jobId } = useParams();

  const [job, setJob] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({ applicantName: "", applicantEmail: "" });
  const [resumeFile, setResumeFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchJob = async () => {
      try {
        const data = await getJob(jobId);
        setJob(data.job);
      } catch (err) {
        setLoadError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchJob();
  }, [jobId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);
    try {
      const formData = new FormData();
      formData.append("applicantName", form.applicantName);
      formData.append("applicantEmail", form.applicantEmail);
      if (resumeFile) {
        formData.append("resume", resumeFile);
      }

      const data = await submitApplication(jobId, formData);
      setResult(data);
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(result.applicationId).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (loading) return <div className="loading">Loading job details...</div>;
  if (loadError) return <div className="loading">{loadError}</div>;

  return (
    <div>
      {/* Job Header */}
      <div className="job-header">
        <h1>{job.title}</h1>
        <div className="card-subtitle">{job.companyName}</div>
        {job.description && (
          <p style={{ marginTop: "0.75rem", opacity: 0.8 }}>{job.description}</p>
        )}
        <div className="job-header-meta">
          <span className={`badge ${job.isOpen ? "badge-open" : "badge-closed"}`}>
            {job.isOpen ? "Open" : "Closed"}
          </span>
        </div>
      </div>

      {result ? (
        /* ── Success: form is gone, show Application ID ── */
        <div className="status-card">
          <div className="alert alert-success">
            <div style={{ fontWeight: 600, marginBottom: "1rem" }}>{result.message}</div>
            <div style={{ marginBottom: "0.5rem" }}>Your Application ID:</div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
              <span
                style={{
                  fontFamily: "monospace",
                  background: "rgba(255, 255, 255, 0.1)",
                  padding: "0.35rem 0.75rem",
                  borderRadius: "6px",
                  userSelect: "all",
                  cursor: "copy",
                  fontSize: "0.95rem",
                  letterSpacing: "0.02em",
                }}
              >
                {result.applicationId}
              </span>
              <button className="btn btn-sm" onClick={handleCopy}>
                {copied ? "✓ Copied!" : "Copy"}
              </button>
            </div>
            <div style={{ marginTop: "1rem", fontWeight: 700 }}>
              Save this ID — you will need it to check your application status.
            </div>
          </div>
        </div>
      ) : (
        /* ── Application Form ── */
        <form className="form-inline" onSubmit={handleSubmit}>
          <h3>Apply for this Role</h3>

          {submitError && (
            <div className="alert alert-error" style={{ marginBottom: "1rem" }}>
              {submitError}
            </div>
          )}

          {!job.isOpen && (
            <div className="alert alert-error" style={{ marginBottom: "1rem" }}>
              This position is no longer accepting applications.
            </div>
          )}

          <div className="form-row">
            <div className="form-group">
              <label>Full Name *</label>
              <input
                type="text"
                value={form.applicantName}
                onChange={(e) => setForm({ ...form, applicantName: e.target.value })}
                placeholder="Your full name"
                required
              />
            </div>
            <div className="form-group">
              <label>Email *</label>
              <input
                type="email"
                value={form.applicantEmail}
                onChange={(e) => setForm({ ...form, applicantEmail: e.target.value })}
                placeholder="your@email.com"
                required
              />
            </div>
          </div>
          
          <div className="form-group">
            <label>Resume (PDF only) *</label>
            <input
              type="file"
              accept=".pdf,application/pdf"
              onChange={(e) => setResumeFile(e.target.files[0])}
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={submitting || !job.isOpen}
          >
            {submitting ? "Submitting..." : "Submit Application"}
          </button>
        </form>
      )}
    </div>
  );
}

export default ApplyPage;
