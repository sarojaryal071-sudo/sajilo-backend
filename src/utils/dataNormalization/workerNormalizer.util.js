/**
 * Worker Normalizer Utility
 * Phase 15 — Unified Data Truth Layer
 * 
 * Pure functions that normalize worker data inconsistencies in OUTPUT only.
 * Does NOT modify database. Does NOT query anything.
 * 
 * Fixes:
 * - Duplicate professions
 * - Empty services arrays  
 * - Null pricing fields
 * - Inconsistent boolean flags
 * - Missing nested objects
 */

/**
 * Normalize a single worker object to the standard contract shape.
 * @param {Object} worker - Raw worker data from any source
 * @returns {Object} Normalized worker matching unified contract
 */
function normalizeWorker(worker) {
  if (!worker) return null;

  return {
    identity: normalizeIdentity(worker),
    onboarding: normalizeOnboarding(worker),
    professions: normalizeProfessions(worker),
    services: normalizeServices(worker),
    pricing: normalizePricing(worker),
    stats: normalizeStats(worker),
    verification: normalizeVerification(worker),
    performance: normalizePerformance(worker),
  };
}

/**
 * Normalize multiple workers
 * @param {Object[]} workers
 * @returns {Object[]}
 */
function normalizeWorkerList(workers) {
  if (!Array.isArray(workers)) return [];
  return workers.map(normalizeWorker).filter(Boolean);
}

// ─── Section Normalizers ───

function normalizeIdentity(worker) {
  return {
    id: worker.id || worker.user_id || null,
    clientId: worker.client_id || null,
    name: worker.name || 'Unknown Worker',
    email: worker.email || null,
    phone: worker.phone || null,
    avatar: worker.photo_url || worker.avatar || null,
    role: worker.role || 'worker',
    bio: worker.bio || null,
    primarySkill: worker.primary_skill || worker.skills?.[0] || null,
    secondaryRoles: Array.isArray(worker.secondary_roles) 
      ? worker.secondary_roles.filter(Boolean) 
      : [],
    serviceArea: worker.service_area || null,
  };
}

function normalizeOnboarding(worker) {
  return {
    status: worker.status || worker.moderation_status || 'pending',
    isOnline: Boolean(worker.is_online),
    applicationStatus: worker.verification_status || 'pending',
    welcomed: Boolean(worker.welcomed),
    createdAt: worker.created_at || null,
  };
}

function normalizeProfessions(worker) {
  // Collect professions from multiple possible sources, deduplicate
  const raw = [];

  if (Array.isArray(worker.professions)) {
    raw.push(...worker.professions);
  }
  if (worker.primary_skill && typeof worker.primary_skill === 'string') {
    raw.push({ name: worker.primary_skill, isPrimary: true });
  }

  // Deduplicate by name (case-insensitive)
  const seen = new Set();
  const deduped = [];

  for (const prof of raw) {
    const key = (prof.name || prof.label || '').toLowerCase().trim();
    if (key && !seen.has(key)) {
      seen.add(key);
      deduped.push({
        id: prof.id || prof.profession_id || null,
        name: prof.name || prof.label || 'Unknown',
        icon: prof.icon || null,
        isPrimary: Boolean(prof.isPrimary),
      });
    }
  }

  return deduped;
}

function normalizeServices(worker) {
  let services = [];

  if (Array.isArray(worker.services)) {
    services = worker.services;
  } else if (Array.isArray(worker.worker_services)) {
    services = worker.worker_services;
  }

  // Deduplicate by service_id or label, ensure non-null prices
  const seen = new Set();
  const normalized = [];

  for (const svc of services) {
    const key = svc.service_id || svc.label || svc.custom_label || '';
    if (key && !seen.has(key)) {
      seen.add(key);
      normalized.push({
        id: svc.service_id || svc.id || null,
        label: svc.label || svc.custom_label || 'Service',
        labelNp: svc.label_np || svc.custom_label_np || null,
        price: parseFloat(svc.worker_price || svc.price || 0),
        professionId: svc.profession_id || svc.profession?.id || null,
        professionName: svc.profession?.name || svc.profession_label || null,
        isActive: svc.is_active !== false, // default true unless explicitly false
        isCustom: Boolean(svc.is_custom || svc.custom_label),
      });
    }
  }

  return normalized;
}

function normalizePricing(worker) {
  return {
    mode: worker.pricing_mode || (worker.hourly_rate ? 'custom' : 'default'),
    hourlyRate: parseFloat(worker.hourly_rate || 0),
    currency: 'NPR',
    smallMaxPrice: parseFloat(worker.small_max_price || 1000),
    mediumMaxPrice: parseFloat(worker.medium_max_price || 3000),
  };
}

function normalizeStats(worker) {
  return {
    completedJobs: parseInt(worker.completed_jobs || 0),
    totalEarnings: parseFloat(worker.total_earnings || 0),
    averageRating: parseFloat(worker.average_rating || 0).toFixed(1),
    reviewCount: parseInt(worker.review_count || 0),
    cancellationRate: parseFloat(worker.cancellation_rate || 0),
    completionRate: parseFloat(worker.completion_rate || 0),
    isOnline: Boolean(worker.is_online),
  };
}

function normalizeVerification(worker) {
  return {
    isVerified: worker.verification_status === 'verified' || worker.moderation_status === 'approved',
    level: worker.verification_level || (worker.verification_status === 'verified' ? 'basic' : 'none'),
    status: worker.verification_status || 'pending',
    documentSubmitted: Boolean(worker.document_url),
  };
}

function normalizePerformance(worker) {
  return {
    trustScore: parseInt(worker.trust_score || worker.trustScore || 0),
    reliabilityLabel: worker.reliability_label || worker.trustTier?.label || null,
    badges: Array.isArray(worker.badges) ? worker.badges : [],
  };
}

module.exports = {
  normalizeWorker,
  normalizeWorkerList,
};