/*
 * Worker Validators — input validation rules for worker endpoints
 */
function validateWorkerSearch(filters) {
  const errors = []
  
  if (filters.minRating && (filters.minRating < 0 || filters.minRating > 5)) {
    errors.push('minRating must be between 0 and 5')
  }
  
  return {
    valid: errors.length === 0,
    errors,
  }
}

module.exports = { validateWorkerSearch }