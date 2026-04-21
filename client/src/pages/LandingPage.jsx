import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getJobs } from "../api";

function LandingPage() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const data = await getJobs();
        setJobs(data);
      } catch (err) {
        console.error("Failed to fetch jobs:", err);
      }
      setLoading(false);
    };
    fetchJobs();
  }, []);

  const openJobs = jobs.filter((j) => j.isOpen);

  return (
    <div>
      {/* Hero Section */}
      <section className="hero">
        <div className="hero-glow" />
        <div className="hero-content">
          <span className="hero-badge">Queue-Based Pipeline Management</span>
          <h1 className="hero-title">
            Smarter Hiring,
            <br />
            <span className="hero-gradient">Fair Queues</span>
          </h1>
          <p className="hero-subtitle">
            A transparent hiring pipeline where applicants are placed in fair,
            capacity-limited queues with automatic promotion, decay-based
            accountability, and full audit trails.
          </p>
          <div className="hero-actions">
            <a href="#open-positions" className="btn btn-primary btn-lg">
              View Open Positions
            </a>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="how-it-works">
        <h2 className="section-title" style={{ textAlign: "center", marginBottom: "1.75rem" }}>
          How It Works
        </h2>
        <div className="steps-grid">
          <div className="step-card">
            <div className="step-number">1</div>
            <h3>Apply</h3>
            <p>
              Submit your application to any open position. If active slots are
              available, you enter active review immediately.
            </p>
          </div>
          <div className="step-card">
            <div className="step-number">2</div>
            <h3>Queue</h3>
            <p>
              If capacity is full, you join a fair waitlist. When a slot opens,
              the next person is automatically promoted.
            </p>
          </div>
          <div className="step-card">
            <div className="step-number">3</div>
            <h3>Acknowledge</h3>
            <p>
              Promoted applicants must acknowledge within a time window. If they
              don't, they decay back and the next person moves up.
            </p>
          </div>
        </div>
      </section>

      {/* Open Positions */}
      <section id="open-positions" className="section">
        <h2 className="section-title" style={{ marginBottom: "1.25rem" }}>
          Open Positions ({openJobs.length})
        </h2>

        {loading ? (
          <div className="loading">Loading positions...</div>
        ) : openJobs.length === 0 ? (
          <div className="empty-state">
            <p>No open positions right now</p>
            <p>Check back soon — new roles are posted regularly.</p>
          </div>
        ) : (
          <div className="jobs-grid">
            {openJobs.map((job) => (
              <div key={job._id} className="card job-card-public">
                <div className="card-title">{job.title}</div>
                <div className="card-subtitle">{job.companyName}</div>
                <div className="card-meta">
                  <span>
                    {job.activeCount}/{job.activeCapacity} active
                  </span>
                  <span className="badge badge-open">Open</span>
                </div>
                <Link
                  to={`/apply/${job._id}`}
                  className="btn btn-primary btn-apply"
                >
                  Apply Now →
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default LandingPage;
