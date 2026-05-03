// Worker Categories — centralized config for professions, codes, and onboarding fields
// Admin-configurable: add/remove/enable/disable categories without code changes

const workerCategories = [
  { code: 'PL', role: 'plumber', label: 'Plumber', enabled: true },
  { code: 'EL', role: 'electrician', label: 'Electrician', enabled: true },
  { code: 'CL', role: 'cleaner', label: 'Cleaner', enabled: true },
  { code: 'PT', role: 'painter', label: 'Painter', enabled: true },
  { code: 'CP', role: 'carpenter', label: 'Carpenter', enabled: true },
]

function getProfessionCode(profession) {
  const category = workerCategories.find(
    c => c.role === profession && c.enabled
  )
  if (!category) return 'WK'
  return category.code
}

function getEnabledProfessions() {
  return workerCategories.filter(c => c.enabled)
}

module.exports = { workerCategories, getProfessionCode, getEnabledProfessions }