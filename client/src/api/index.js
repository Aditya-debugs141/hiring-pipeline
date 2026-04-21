const BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

/**
 * Shared fetch wrapper.
 * Throws an Error (with .status) for any non-2xx response,
 * extracting the server's error message from the JSON body when available.
 */
async function request(url, options = {}) {
  const res = await fetch(url, options);
  if (!res.ok) {
    let message = `Request failed with status ${res.status}`;
    try {
      const body = await res.json();
      if (body.error) message = body.error;
    } catch (_) {
      // Response body is not JSON — keep the default message.
    }
    const err = new Error(message);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

export const getJobs = () => request(`${BASE}/jobs`);

export const resetDatabase = () =>
  request(`${BASE}/jobs/reset`, { method: "DELETE" });

export const createJob = (data) =>
  request(`${BASE}/jobs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

export const getJob = (id) => request(`${BASE}/jobs/${id}`);

export const getJobAudit = (id) => request(`${BASE}/jobs/${id}/audit`);

export const submitApplication = (jobId, data) => {
  const isFormData = data instanceof FormData;
  return request(`${BASE}/jobs/${jobId}/applications`, {
    method: "POST",
    headers: isFormData ? {} : { "Content-Type": "application/json" },
    body: isFormData ? data : JSON.stringify(data),
  });
};

export const updateStatus = (appId, newStatus) =>
  request(`${BASE}/applications/${appId}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ newStatus }),
  });

export const acknowledgePromotion = (appId) =>
  request(`${BASE}/applications/${appId}/acknowledge`, {
    method: "PATCH",
  });

export const getApplicationStatus = (appId) =>
  request(`${BASE}/applications/${appId}/status`);

export const getApplicationsByEmail = (email) =>
  request(`${BASE}/applications/search?email=${encodeURIComponent(email)}`);
