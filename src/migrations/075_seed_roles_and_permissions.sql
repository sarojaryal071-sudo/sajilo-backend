-- V075: Seed system roles and permissions

-- ── Roles ──
INSERT INTO roles (name, slug, description, is_system)
VALUES
  ('Super Admin',           'super-admin',           'Full system access',               TRUE),
  ('Communication Officer', 'communication-officer', 'Chat monitor, disputes, notifications', FALSE),
  ('Finance Manager',       'finance-manager',       'Financial reporting and expenses', FALSE),
  ('Verification Officer',  'verification-officer',  'Worker verification queue',        FALSE)
ON CONFLICT (slug) DO NOTHING;

-- ── Permissions ──
INSERT INTO permissions (key, label, section_key, description) VALUES
  ('view_dashboard',         'View Dashboard',          'dashboard',      'Access the admin dashboard'),
  ('view_analytics',         'View Analytics',          'analytics',      'View analytics dashboards'),
  ('view_bookings',          'View Bookings',           'bookings',       'View and search bookings'),
  ('manage_bookings',        'Manage Bookings',         'bookings',       'Modify booking statuses'),
  ('view_liveops',           'View Live Operations',    'liveops',        'Monitor live operations'),
  ('view_activity',          'View Activity Timeline',  'activity',       'View platform activity'),
  ('global_search',          'Global Search',           'search',         'Search across entities'),
  ('view_workers',           'View Workers',            'workers',        'View worker profiles'),
  ('manage_workers',         'Manage Workers',          'workers',        'Edit worker profiles'),
  ('view_customers',         'View Customers',          'customers',      'View customer profiles'),
  ('manage_customers',       'Manage Customers',        'customers',      'Edit customer profiles'),
  ('view_finance',           'View Finance',            'financial',      'View financial dashboard'),
  ('manage_finance',         'Manage Finance',          'financial',      'Export and manage finance'),
  ('view_verifications',     'View Verifications',      'verification',   'View verification queue'),
  ('manage_verifications',   'Manage Verifications',    'verification',   'Approve/reject verifications'),
  ('view_disputes',          'View Disputes',           'disputes',       'View dispute list'),
  ('manage_disputes',        'Manage Disputes',         'disputes',       'Escalate and resolve disputes'),
  ('view_notifications',     'View Notifications',      'notifications',  'Manage notifications'),
  ('view_chat_monitor',      'View Chat Monitor',       'chat',           'Monitor support chats'),
  ('reply_chat_monitor',     'Reply in Chat Monitor',   'chat',           'Send messages in chat monitor'),
  ('manage_service_categories','Manage Service Categories','categories',   'Edit service categories'),
  ('manage_ui_studio',       'Manage UI Studio',        'uistudio',       'Access UI Studio'),
  ('manage_feature_flags',   'Manage Feature Flags',    'featureflags',   'Toggle feature flags'),
  ('manage_deployment',      'Manage Deployment',       'deployment',     'View deployment status'),
  ('manage_simulation',      'Manage Simulation',       'simulate',       'Run simulations'),
  ('manage_policies',        'Manage Policies',         'policies',       'Edit platform policies'),
  ('view_audit_logs',        'View Audit Logs',         'audit',          'View audit logs'),
  ('manage_staff',           'Manage Staff',            'staff',          'Create and manage staff'),
  ('manage_system_settings', 'Manage System Settings',  'settings',       'Edit system settings')
ON CONFLICT (key) DO NOTHING;

-- ── Role‑to‑permission mappings ──
-- Super Admin gets all permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.slug = 'super-admin'
ON CONFLICT DO NOTHING;

-- Communication Officer: chat monitor, disputes, notifications
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.slug = 'communication-officer' AND p.key IN (
  'view_dashboard',
  'view_chat_monitor',
  'reply_chat_monitor',
  'view_disputes',
  'manage_disputes',
  'view_notifications',
  'global_search',
  'view_activity'
)
ON CONFLICT DO NOTHING;

-- Finance Manager
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.slug = 'finance-manager' AND p.key IN (
  'view_dashboard',
  'view_finance',
  'manage_finance',
  'view_bookings',
  'global_search',
  'view_audit_logs'
)
ON CONFLICT DO NOTHING;

-- Verification Officer
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.slug = 'verification-officer' AND p.key IN (
  'view_dashboard',
  'view_verifications',
  'manage_verifications',
  'view_workers',
  'global_search'
)
ON CONFLICT DO NOTHING;