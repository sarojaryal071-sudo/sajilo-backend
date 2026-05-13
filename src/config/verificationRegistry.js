/**
 * Verification Registry
 * Phase 17 — Worker Verification & Professional Onboarding System
 * 
 * Centralized configuration for the entire verification lifecycle.
 * ALL statuses, labels, rules, and thresholds are defined here.
 * 
 * NO hardcoded values anywhere else in the system.
 */

const VERIFICATION_REGISTRY = {
  // ─── VERIFICATION STATUSES ────────────────────────────────────
  statuses: {
    pending: {
      value: 'pending',
      label: 'Pending Submission',
      description: 'Worker has not yet submitted verification documents',
      color: '#6B7280',
      icon: 'clock',
      workerVisible: true,
      allowsResubmit: true,
    },
    submitted: {
      value: 'submitted',
      label: 'Under Review',
      description: 'Documents submitted, awaiting admin review',
      color: '#F59E0B',
      icon: 'hourglass',
      workerVisible: true,
      allowsResubmit: false,
    },
    approved: {
      value: 'approved',
      label: 'Verified',
      description: 'Verification approved by admin',
      color: '#10B981',
      icon: 'shield-check',
      workerVisible: true,
      allowsResubmit: false,
      grantsAccess: true,
      badge: {
        label: 'Verified Professional',
        color: '#10B981',
        icon: 'verified',
        priority: 0, // Highest priority badge
      },
    },
    rejected: {
      value: 'rejected',
      label: 'Rejected',
      description: 'Verification rejected by admin, worker can resubmit',
      color: '#EF4444',
      icon: 'x-circle',
      workerVisible: true,
      allowsResubmit: true,
    },
    expired: {
      value: 'expired',
      label: 'Expired',
      description: 'Previously approved verification has expired',
      color: '#F59E0B',
      icon: 'alert',
      workerVisible: true,
      allowsResubmit: true,
    },
  },

  // ─── DOCUMENT TYPES ───────────────────────────────────────────
  documentTypes: {
    government_id_front: {
      id: 'government_id_front',
      label: 'Government ID (Front)',
      description: 'Front side of citizenship card, national ID, or passport',
      required: true,
      maxSizeMB: 5,
      allowedFormats: ['image/jpeg', 'image/png', 'image/webp'],
      minWidth: 400,
      minHeight: 300,
    },
    government_id_back: {
      id: 'government_id_back',
      label: 'Government ID (Back)',
      description: 'Back side of citizenship card or national ID',
      required: true,
      maxSizeMB: 5,
      allowedFormats: ['image/jpeg', 'image/png', 'image/webp'],
      minWidth: 400,
      minHeight: 300,
    },
    selfie_photo: {
      id: 'selfie_photo',
      label: 'Profile Verification Photo',
      description: 'Clear selfie or profile photo for identity verification',
      required: true,
      maxSizeMB: 3,
      allowedFormats: ['image/jpeg', 'image/png', 'image/webp'],
      minWidth: 200,
      minHeight: 200,
    },
  },

  // ─── ADMIN REJECTION REASONS ──────────────────────────────────
  rejectionReasons: [
    {
      id: 'unclear_document',
      label: 'Document unclear or unreadable',
      description: 'The uploaded document is blurry, dark, or cannot be read clearly',
      requiresResubmit: true,
    },
    {
      id: 'mismatch_identity',
      label: 'Identity mismatch',
      description: 'Name or details on document do not match worker profile',
      requiresResubmit: true,
    },
    {
      id: 'expired_document',
      label: 'Document expired',
      description: 'The submitted government ID is expired',
      requiresResubmit: true,
    },
    {
      id: 'incomplete_submission',
      label: 'Incomplete submission',
      description: 'Not all required documents were submitted',
      requiresResubmit: true,
    },
    {
      id: 'inappropriate_content',
      label: 'Inappropriate content',
      description: 'Uploaded content violates platform guidelines',
      requiresResubmit: true,
      severity: 'high',
    },
    {
      id: 'other',
      label: 'Other',
      description: 'Custom reason provided by admin',
      requiresResubmit: true,
      requiresNote: true,
    },
  ],

  // ─── UPLOAD CONFIGURATION ─────────────────────────────────────
  upload: {
    maxTotalSizeMB: 15,
    maxFilesPerSubmission: 5,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    storageProvider: 'local', // Future: 's3', 'cloudinary'
    uploadPath: 'uploads/verifications',
    tempPath: 'uploads/temp',
    urlExpiryDays: 7, // Temporary upload URLs expire after 7 days
  },

  // ─── ACCESS CONTROL ───────────────────────────────────────────
  access: {
    // Workers must have BOTH to access dashboard
    requireForDashboard: ['status:active', 'verification:approved'],
    // Workers only need active status to submit verification
    requireForSubmission: ['status:active'],
    // Verification expires after this many days (null = never)
    expiryDays: null, // Set to 365 for annual re-verification
  },

  // ─── ACTIVITY & AUDIT LOGGING ─────────────────────────────────
  activity: {
    events: {
      verification_submitted: {
        label: 'Verification submitted',
        category: 'verification',
        severity: 'info',
      },
      verification_approved: {
        label: 'Verification approved',
        category: 'verification',
        severity: 'info',
      },
      verification_rejected: {
        label: 'Verification rejected',
        category: 'verification',
        severity: 'warning',
      },
      document_uploaded: {
        label: 'Verification document uploaded',
        category: 'verification',
        severity: 'info',
      },
      verification_expired: {
        label: 'Verification expired',
        category: 'verification',
        severity: 'warning',
      },
    },
  },

  // ─── NOTIFICATION TEMPLATES ───────────────────────────────────
  notifications: {
    submitted: {
      title: 'Verification Submitted',
      message: 'Your verification documents have been submitted for review. We will notify you once reviewed.',
      type: 'verification_update',
    },
    approved: {
      title: 'Verification Approved ✅',
      message: 'Congratulations! Your profile has been verified. You now have full access to the platform.',
      type: 'verification_update',
    },
    rejected: {
      title: 'Verification Needs Attention',
      message: 'Your verification was not approved. Please review the feedback and resubmit your documents.',
      type: 'verification_update',
    },
    reminder: {
      title: 'Complete Your Verification',
      message: 'Upload your verification documents to unlock full platform access.',
      type: 'verification_reminder',
    },
  },

  // ─── BADGE DISPLAY CONFIGURATION ──────────────────────────────
  badge: {
    verified: {
      id: 'verified_professional',
      label: 'Verified Professional',
      color: '#10B981',
      backgroundColor: '#ECFDF5',
      borderColor: '#10B98140',
      icon: 'shield-check',
      displayOn: ['workerCard', 'workerDetail', 'searchResults', 'chatHeader'],
      priority: 0,
    },
  },

  // ─── FUTURE EXTENSIBILITY ─────────────────────────────────────
  // Reserved for future verification levels without schema changes
  futureLevels: {
    basic: {
      label: 'Basic Verified',
      requirements: ['government_id_front', 'government_id_back', 'selfie_photo'],
    },
    advanced: {
      label: 'Advanced Verified',
      requirements: ['government_id_front', 'government_id_back', 'selfie_photo', 'certificate', 'license'],
      disabled: true, // Not yet available
    },
  },
};

module.exports = VERIFICATION_REGISTRY;