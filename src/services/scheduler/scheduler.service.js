// sajilo-backend/src/services/scheduler/scheduler.service.js
// Phase 13D – Lightweight in‑process scheduler
const { AUTOMATION_JOBS } = require('../../config/automationRegistry');

// Store active interval handles so they can be cleared later
const activeJobs = new Map();

/**
 * Register and start all enabled jobs from the registry.
 * Each job function must be provided via its own module.
 * @param {Object} jobImplementations – map of automation id → async function
 */
function startAll(jobImplementations = {}) {
  for (const [key, config] of Object.entries(AUTOMATION_JOBS)) {
    if (!config.enabled) continue;

    const fn = jobImplementations[config.id];
    if (typeof fn !== 'function') {
      console.warn(`[Scheduler] No implementation registered for "${config.id}" — skipping`);
      continue;
    }

    const intervalHandle = setInterval(async () => {
      try {
        await fn();
      } catch (err) {
        console.error(`[Scheduler] Job "${config.id}" failed:`, err.message);
      }
    }, config.intervalMs);

    activeJobs.set(config.id, intervalHandle);
    console.log(`[Scheduler] Job "${config.id}" started — interval ${config.intervalMs / 1000}s`);
  }
}

/**
 * Stop all running jobs (useful for graceful shutdown).
 */
function stopAll() {
  for (const [id, handle] of activeJobs.entries()) {
    clearInterval(handle);
    activeJobs.delete(id);
    console.log(`[Scheduler] Job "${id}" stopped`);
  }
}

/**
 * Trigger a single job immediately (for admin manual execution).
 * @param {string} jobId – automation id
 * @param {Object} jobImplementations – same map as startAll
 */
async function runJobNow(jobId, jobImplementations = {}) {
  const fn = jobImplementations[jobId];
  if (typeof fn !== 'function') {
    throw new Error(`No implementation found for job "${jobId}"`);
  }
  console.log(`[Scheduler] Running job "${jobId}" manually`);
  await fn();
  console.log(`[Scheduler] Job "${jobId}" completed`);
}

module.exports = { startAll, stopAll, runJobNow };