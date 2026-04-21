import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { getApplicationStatus, acknowledgePromotion } from "../api";

function ApplicantStatus() {
  const [searchParams] = useSearchParams();
  const [appId, setAppId] = useState("");
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);

  // Handle redirect from email acknowledge link
  useEffect(() => {
    const acknowledgedId = searchParams.get("acknowledged");
    const errorMsg = searchParams.get("error");

    if (acknowledgedId) {
      setAppId(acknowledgedId);
      setSuccessMessage("Your promotion has been acknowledged successfully!");
      // Auto-fetch the status
      const fetchStatus = async () => {
        setLoading(true);
        try {
          const data = await getApplicationStatus(acknowledgedId);
          setStatus(data);
        } catch (err) {
          setError(err.message);
        }
        setLoading(false);
      };
      fetchStatus();
    } else if (errorMsg) {
      setError(errorMsg);
    }
  }, [searchParams]);

  const handleCheck = async (e) => {
    e.preventDefault();
    setError(null);
    setStatus(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      const data = await getApplicationStatus(appId.trim());
      setStatus(data);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  const handleAcknowledge = async () => {
    setLoading(true);
    try {
      await acknowledgePromotion(appId.trim());
      setSuccessMessage("Your promotion has been acknowledged successfully!");
      // Re-fetch status after acknowledging
      const data = await getApplicationStatus(appId.trim());
      setStatus(data);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  return (
    <div>
      <h1 className="page-title" style={{ textAlign: "center" }}>
        Check Your Application Status
      </h1>

      <div className="status-card">
        <form onSubmit={handleCheck}>
          <div className="form-group">
            <label>Application ID</label>
            <input
              type="text"
              value={appId}
              onChange={(e) => setAppId(e.target.value)}
              placeholder="Enter your application ID"
              required
            />
          </div>
          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: "100%" }}
            disabled={loading}
          >
            {loading ? "Checking..." : "Check Status"}
          </button>
        </form>

        {successMessage && (
          <div className="alert alert-success" style={{ marginTop: "1rem" }}>
            {successMessage}
          </div>
        )}

        {error && <div className="alert alert-error" style={{ marginTop: "1rem" }}>{error}</div>}

        {status && (
          <div className="status-result">
            <div className="status-field">
              <span className="status-field-label">Name</span>
              <span className="status-field-value">{status.applicantName}</span>
            </div>
            <div className="status-field">
              <span className="status-field-label">Job</span>
              <span className="status-field-value">{status.jobTitle}</span>
            </div>
            <div className="status-field">
              <span className="status-field-label">Status</span>
              <span className={`badge badge-${status.status}`}>
                {status.status.replace("_", " ")}
              </span>
            </div>
            {status.waitlistPosition && (
              <div className="status-field">
                <span className="status-field-label">Waitlist Position</span>
                <span className="status-field-value">
                  #{status.waitlistPosition}
                </span>
              </div>
            )}
            {status.decayCount > 0 && (
              <div className="status-field">
                <span className="status-field-label">Decay Count</span>
                <span className="status-field-value">{status.decayCount}</span>
              </div>
            )}
            {status.acknowledgeDeadline && (
              <div className="status-field">
                <span className="status-field-label">Acknowledge By</span>
                <span className="status-field-value" style={{ color: "#d29922" }}>
                  {new Date(status.acknowledgeDeadline).toLocaleString()}
                </span>
              </div>
            )}

            <div className="queue-message">{status.queueMessage}</div>

            {status.status === "pending_acknowledgment" && (
              <button
                className="btn btn-warning"
                style={{ width: "100%", marginTop: "1rem" }}
                onClick={handleAcknowledge}
                disabled={loading}
              >
                Acknowledge Promotion
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default ApplicantStatus;
