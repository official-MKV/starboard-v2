export const demoDayUtils = {
  /**
   * Check if submissions are open
   */
  isSubmissionOpen: (config) => {
    if (!config || !config.submissionDeadline) return false
    const deadline = new Date(config.submissionDeadline)
    return new Date() <= deadline || config.allowLateSubmissions
  },

  /**
   * Check if judging is active
   */
  isJudgingActive: (config) => {
    if (!config) return false
    const now = new Date()
    const start = config.judgingStartTime ? new Date(config.judgingStartTime) : null
    const end = config.judgingEndTime ? new Date(config.judgingEndTime) : null
    
    if (start && now < start) return false
    if (end && now > end) return false
    return true
  },

  /**
   * Check if results are public
   */
  areResultsPublic: (config) => {
    if (!config) return false
    if (config.showResultsLive) return true
    if (config.resultsPublicAt) {
      return new Date() >= new Date(config.resultsPublicAt)
    }
    return false
  },

  /**
   * Format score for display
   */
  formatScore: (score, maxScore = 50) => {
    if (score === null || score === undefined) return '—'
    return `${score.toFixed(1)} / ${maxScore}`
  },

  /**
   * Calculate score percentage
   */
  getScorePercentage: (score, maxScore = 50) => {
    if (!score) return 0
    return (score / maxScore) * 100
  },

  /**
   * Get submission status
   */
  getSubmissionStatus: (submission, config) => {
    if (!submission.isSubmitted) return 'draft'
    if (submission.rank) return 'ranked'
    if (submission.scores && submission.scores.length > 0) return 'scored'
    return 'submitted'
  },

  /**
   * Get judge progress for submission
   */
  getJudgingProgress: (submission, totalJudges) => {
    const completedScores = submission.scores?.filter(s => s.isComplete).length || 0
    return {
      completed: completedScores,
      total: totalJudges,
      percentage: totalJudges > 0 ? (completedScores / totalJudges) * 100 : 0
    }
  },

  /**
   * Validate demo day configuration
   */
  validateConfig: (config) => {
    const errors = []
    
    if (!config.submissionDeadline) {
      errors.push('Submission deadline is required')
    }
    
    if (config.judgingStartTime && config.judgingEndTime) {
      if (new Date(config.judgingStartTime) >= new Date(config.judgingEndTime)) {
        errors.push('Judging end time must be after start time')
      }
    }
    
    if (config.maxScore <= 0) {
      errors.push('Maximum score must be greater than 0')
    }
    
    if (config.maxTeamSize <= 0) {
      errors.push('Maximum team size must be greater than 0')
    }
    
    return {
      isValid: errors.length === 0,
      errors
    }
  },

  /**
   * Generate demo day stats
   */
  generateStats: (submissions, judges, config) => {
    const totalSubmissions = submissions.length
    const submittedCount = submissions.filter(s => s.isSubmitted).length
    const scoredSubmissions = submissions.filter(s => s.scores && s.scores.length > 0).length
    const totalPossibleScores = submittedCount * judges.length
    const completedScores = submissions.reduce((sum, s) => 
      sum + (s.scores?.filter(sc => sc.isComplete).length || 0), 0)
    
    return {
      totalSubmissions,
      submittedCount,
      draftCount: totalSubmissions - submittedCount,
      scoredSubmissions,
      totalJudges: judges.length,
      completedScores,
      totalPossibleScores,
      judgingProgress: totalPossibleScores > 0 ? (completedScores / totalPossibleScores) * 100 : 0,
      averageScore: submissions.length > 0 
        ? submissions.reduce((sum, s) => sum + (s.averageScore || 0), 0) / submissions.length 
        : 0
    }
  }
}