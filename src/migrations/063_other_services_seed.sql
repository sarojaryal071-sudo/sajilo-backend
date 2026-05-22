INSERT INTO professions (slug, name, icon, sort_order, is_active)
VALUES ('other-services', 'Other Services', '🔧', 99, true)
ON CONFLICT (slug) DO NOTHING;