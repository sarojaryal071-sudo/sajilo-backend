/**
 * Deep compare old and new settings objects.
 * Returns an array of changed paths with old/new values.
 * Only includes leaf values that differ.
 */
function diffSettings(oldSettings, newSettings, basePath = '') {
  const changes = [];

  // If both are primitive, compare directly
  if (typeof oldSettings !== 'object' || typeof newSettings !== 'object' ||
      oldSettings === null || newSettings === null ||
      Array.isArray(oldSettings) || Array.isArray(newSettings)) {
    if (oldSettings !== newSettings) {
      changes.push({
        path: basePath,
        oldValue: oldSettings,
        newValue: newSettings,
      });
    }
    return changes;
  }

  // Both are objects – compare keys
  const allKeys = new Set([
    ...Object.keys(oldSettings || {}),
    ...Object.keys(newSettings || {}),
  ]);

  for (const key of allKeys) {
    const oldVal = oldSettings?.[key];
    const newVal = newSettings?.[key];
    const newPath = basePath ? `${basePath}.${key}` : key;
    changes.push(...diffSettings(oldVal, newVal, newPath));
  }

  return changes;
}

module.exports = { diffSettings };