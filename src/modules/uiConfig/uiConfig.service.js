/**
 * UI Config Service
 * Phase 19A — UI Configuration Engine Foundation
 * 
 * Handles:
 * - Config retrieval (draft/published per scope)
 * - Draft editing with validation
 * - Publishing with versioning
 * - Validation against uiConfigRegistry
 */

const { pool } = require('../../config/database');
const UI_CONFIG_REGISTRY = require('../../config/uiConfigRegistry');

class UIConfigService {
  /**
   * Get published config for a scope.
   * Returns registry defaults if no published config exists.
   */
  async getPublishedConfig(scope) {
    if (!UI_CONFIG_REGISTRY.scopes.includes(scope)) {
      throw new Error(`Invalid scope: ${scope}`);
    }

    const result = await pool.query(
      `SELECT config_json, version, updated_at
       FROM ui_configurations
       WHERE scope = $1 AND status = 'published'
       ORDER BY version DESC LIMIT 1`,
      [scope]
    );

    if (result.rows.length === 0) {
      return {
        scope,
        config: this._getDefaults(scope),
        version: 0,
        isDefault: true,
      };
    }

    const row = result.rows[0];
    return {
      scope,
      config: this._mergeWithDefaults(scope, row.config_json),
      version: row.version,
      updatedAt: row.updated_at,
      isDefault: false,
    };
  }

  /**
   * Get draft config for a scope.
   */
  async getDraftConfig(scope) {
    if (!UI_CONFIG_REGISTRY.scopes.includes(scope)) {
      throw new Error(`Invalid scope: ${scope}`);
    }

    const result = await pool.query(
      `SELECT config_json, version, updated_at
       FROM ui_configurations
       WHERE scope = $1 AND status = 'draft'
       ORDER BY version DESC LIMIT 1`,
      [scope]
    );

    const row = result.rows[0];
    return {
      scope,
      config: row ? row.config_json : this._getDefaults(scope),
      version: row?.version || 0,
      updatedAt: row?.updated_at || null,
      isDraft: true,
    };
  }

  /**
   * Save or update draft config.
   * Validates all tokens against registry before saving.
   */
  async updateDraftConfig(scope, config, userId) {
    if (!UI_CONFIG_REGISTRY.scopes.includes(scope)) {
      throw new Error(`Invalid scope: ${scope}`);
    }

    // Validate
    const errors = this._validateConfig(scope, config);
    if (errors.length > 0) {
      throw new Error(`Validation failed: ${errors.join('; ')}`);
    }

    // Upsert draft
    const result = await pool.query(
      `INSERT INTO ui_configurations (scope, config_json, status, version, created_by, updated_at)
       VALUES ($1, $2, 'draft', 1, $3, NOW())
       ON CONFLICT (scope, status)
       DO UPDATE SET config_json = $2, updated_at = NOW()
       RETURNING *`,
      [scope, JSON.stringify(config), userId]
    );

    return {
      scope,
      config,
      status: 'draft',
      updatedAt: result.rows[0].updated_at,
    };
  }

  /**
   * Publish draft config.
   * Archives current published, promotes draft to published, increments version.
   */
  async publishConfig(scope, userId) {
    // Get current draft
    const draft = await pool.query(
      `SELECT * FROM ui_configurations WHERE scope = $1 AND status = 'draft'`,
      [scope]
    );

    if (draft.rows.length === 0) {
      throw new Error('No draft config to publish');
    }

    const draftConfig = draft.rows[0];

    // Get current published version
    const published = await pool.query(
      `SELECT version FROM ui_configurations WHERE scope = $1 AND status = 'published'`,
      [scope]
    );

    const newVersion = published.rows.length > 0
      ? published.rows[0].version + 1
      : 1;

    // Delete old published
    await pool.query(
      `DELETE FROM ui_configurations WHERE scope = $1 AND status = 'published'`,
      [scope]
    );

    // Promote draft to published
    const result = await pool.query(
      `UPDATE ui_configurations
       SET status = 'published', version = $2, updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [scope, newVersion, draftConfig.id]
    );

    // Store tokens snapshot
    const tokens = this._flattenTokens(draftConfig.config_json);
    for (const [category, values] of Object.entries(tokens)) {
      for (const [key, value] of Object.entries(values)) {
        await pool.query(
          `INSERT INTO ui_design_tokens (scope, token_category, token_key, token_value, version)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (scope, token_category, token_key, version)
           DO UPDATE SET token_value = $4, updated_at = NOW()`,
          [scope, category, key, String(value), newVersion]
        );
      }
    }

    return {
      scope,
      config: draftConfig.config_json,
      status: 'published',
      version: newVersion,
      publishedAt: result.rows[0].updated_at,
    };
  }

  /**
   * Reset draft to match published or defaults.
   */
  async resetDraft(scope) {
    const published = await this.getPublishedConfig(scope);

    await pool.query(
      `DELETE FROM ui_configurations WHERE scope = $1 AND status = 'draft'`,
      [scope]
    );

    return {
      scope,
      config: published.config,
      status: 'draft',
      resetTo: published.isDefault ? 'defaults' : 'published',
    };
  }

  /**
   * Get all published tokens as flat key-value for CSS variable generation.
   */
  async getPublishedTokens(scope) {
    const config = await this.getPublishedConfig(scope);
    return this._flattenTokens(config.config);
  }

  // ─── PRIVATE ──────────────────────────────────────────────────

  _getDefaults(scope) {
    const scopedDefaults = UI_CONFIG_REGISTRY.defaults[scope] || {};
    const globalDefaults = UI_CONFIG_REGISTRY.defaults.global || {};
    return { ...globalDefaults, ...scopedDefaults };
  }

  _mergeWithDefaults(scope, config) {
    const defaults = this._getDefaults(scope);
    return { ...defaults, ...(typeof config === 'string' ? JSON.parse(config) : config) };
  }

  _flattenTokens(config) {
    const tokens = {};
    if (!config) return tokens;
    const cfg = typeof config === 'string' ? JSON.parse(config) : config;
    for (const [category, values] of Object.entries(cfg)) {
      if (UI_CONFIG_REGISTRY.tokenCategories[category]) {
        tokens[category] = values;
      }
    }
    return tokens;
  }

  _validateConfig(scope, config) {
    const errors = [];
    const cfg = typeof config === 'string' ? JSON.parse(config) : config;

    for (const [category, values] of Object.entries(cfg)) {
      const catDef = UI_CONFIG_REGISTRY.tokenCategories[category];
      if (!catDef) {
        errors.push(`Unknown category: ${category}`);
        continue;
      }

      for (const [key, value] of Object.entries(values)) {
        const tokenDef = catDef.tokens[key];
        if (!tokenDef) {
          errors.push(`Unknown token: ${category}.${key}`);
          continue;
        }

        // Check disallowed keys
        if (UI_CONFIG_REGISTRY.validation.disallowedKeys.includes(key)) {
          errors.push(`Disallowed key: ${key}`);
        }

        // Validate numeric tokens
        if (tokenDef.type === 'px' || tokenDef.type === 'ms' || tokenDef.type === 'scale') {
          const numVal = parseFloat(value);
          if (isNaN(numVal)) {
            errors.push(`Invalid number: ${category}.${key} = ${value}`);
          } else if (numVal < tokenDef.min || numVal > tokenDef.max) {
            errors.push(`${category}.${key} must be ${tokenDef.min}-${tokenDef.max}`);
          }
        }

        // Validate allowed values
        if (tokenDef.allowedValues && !tokenDef.allowedValues.includes(String(value))) {
          errors.push(`${category}.${key} must be one of: ${tokenDef.allowedValues.join(', ')}`);
        }

        // Max value length
        if (String(value).length > UI_CONFIG_REGISTRY.validation.maxValueLength) {
          errors.push(`${category}.${key} value too long`);
        }
      }
    }

    // Max tokens check
    const totalTokens = Object.values(cfg).reduce((sum, v) => sum + Object.keys(v || {}).length, 0);
    if (totalTokens > UI_CONFIG_REGISTRY.validation.maxTokensPerScope) {
      errors.push(`Too many tokens: ${totalTokens} (max ${UI_CONFIG_REGISTRY.validation.maxTokensPerScope})`);
    }

    return errors;
  }
}

module.exports = new UIConfigService();