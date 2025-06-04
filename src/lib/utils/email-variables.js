// lib/utils/email-variables.js
import { logger } from '../logger.js'

/**
 * Parse email template content to extract variables
 * Supports: {{variable}} and !{{required_variable}}
 */
export class EmailVariableParser {
  /**
   * Extract all variables from template content
   * @param {string} content - Email template content
   * @returns {Object} - { required: string[], optional: string[] }
   */
  static extractVariables(content) {
    if (!content || typeof content !== 'string') {
      return { required: [], optional: [] }
    }

    const required = []
    const optional = []

    // Match both !{{variable}} and {{variable}} patterns
    const variableRegex = /(!?)\{\{([^}]+)\}\}/g
    let match

    while ((match = variableRegex.exec(content)) !== null) {
      const isRequired = match[1] === '!'
      const variableName = match[2].trim()

      if (variableName) {
        if (isRequired) {
          if (!required.includes(variableName)) {
            required.push(variableName)
          }
        } else {
          if (!optional.includes(variableName)) {
            optional.push(variableName)
          }
        }
      }
    }

    return { required, optional }
  }

  /**
   * Replace variables in template content with actual values
   * @param {string} content - Template content
   * @param {Object} variables - Variable values
   * @param {boolean} strict - Throw error if required variables missing
   * @returns {string} - Processed content
   */
  static replaceVariables(content, variables = {}, strict = false) {
    if (!content || typeof content !== 'string') {
      return content
    }

    let processedContent = content
    const { required, optional } = this.extractVariables(content)

    // Check for missing required variables
    if (strict) {
      const missingRequired = required.filter(varName => !variables[varName])
      if (missingRequired.length > 0) {
        throw new Error(`Missing required variables: ${missingRequired.join(', ')}`)
      }
    }

    // Replace required variables (!{{variable}})
    required.forEach(varName => {
      const regex = new RegExp(`!\\{\\{${this.escapeRegex(varName)}\\}\\}`, 'g')
      const value = variables[varName] || ''
      processedContent = processedContent.replace(regex, value)
    })

    // Replace optional variables ({{variable}})
    optional.forEach(varName => {
      const regex = new RegExp(`\\{\\{${this.escapeRegex(varName)}\\}\\}`, 'g')
      const value = variables[varName] || ''
      processedContent = processedContent.replace(regex, value)
    })

    return processedContent
  }

  /**
   * Validate that all required variables are provided
   * @param {string} content - Template content
   * @param {Object} variables - Variable values
   * @returns {Object} - { valid: boolean, missing: string[] }
   */
  static validateRequiredVariables(content, variables = {}) {
    const { required } = this.extractVariables(content)
    const missing = required.filter(
      varName => !variables[varName] || variables[varName].trim() === ''
    )

    return {
      valid: missing.length === 0,
      missing,
    }
  }

  /**
   * Get variable info with metadata
   * @param {string} content - Template content
   * @returns {Array} - Array of variable objects with metadata
   */
  static getVariableInfo(content) {
    const { required, optional } = this.extractVariables(content)
    const allVariables = []

    required.forEach(varName => {
      allVariables.push({
        name: varName,
        required: true,
        label: this.formatVariableLabel(varName),
        type: this.inferVariableType(varName),
        placeholder: this.generatePlaceholder(varName),
      })
    })

    optional.forEach(varName => {
      allVariables.push({
        name: varName,
        required: false,
        label: this.formatVariableLabel(varName),
        type: this.inferVariableType(varName),
        placeholder: this.generatePlaceholder(varName),
      })
    })

    return allVariables.sort((a, b) => {
      // Required variables first, then alphabetical
      if (a.required && !b.required) return -1
      if (!a.required && b.required) return 1
      return a.name.localeCompare(b.name)
    })
  }

  /**
   * Escape special regex characters
   * @param {string} string - String to escape
   * @returns {string} - Escaped string
   */
  static escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  }

  /**
   * Format variable name into human-readable label
   * @param {string} varName - Variable name
   * @returns {string} - Formatted label
   */
  static formatVariableLabel(varName) {
    return varName
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  /**
   * Infer input type based on variable name
   * @param {string} varName - Variable name
   * @returns {string} - Input type
   */
  static inferVariableType(varName) {
    const lowerName = varName.toLowerCase()

    if (lowerName.includes('email')) return 'email'
    if (lowerName.includes('phone')) return 'tel'
    if (lowerName.includes('url') || lowerName.includes('link')) return 'url'
    if (lowerName.includes('date')) return 'date'
    if (lowerName.includes('number') || lowerName.includes('count')) return 'number'
    if (lowerName.includes('description') || lowerName.includes('bio')) return 'textarea'

    return 'text'
  }

  /**
   * Generate placeholder text for variable
   * @param {string} varName - Variable name
   * @returns {string} - Placeholder text
   */
  static generatePlaceholder(varName) {
    const placeholders = {
      first_name: 'John',
      last_name: 'Doe',
      full_name: 'John Doe',
      email: 'john@example.com',
      phone: '+1 (555) 123-4567',
      company: 'Acme Inc.',
      location: 'San Francisco, CA',
      job_title: 'Software Engineer',
      website: 'https://example.com',
      linkedin: 'https://linkedin.com/in/johndoe',
      bio: 'Brief description about yourself...',
      number: '123',
      amount: '$1,000',
      date: 'December 25, 2024',
      time: '2:00 PM',
    }

    return (
      placeholders[varName.toLowerCase()] ||
      `Enter ${this.formatVariableLabel(varName).toLowerCase()}`
    )
  }
  /**
   * Detect malformed variables in template content
   * @param {string} content - Template content
   * @returns {Array} - Array of error messages
   */
  static detectMalformedVariables(content) {
    const errors = []

    // Find all potential variable patterns (including malformed ones)
    const allBracePatterns = content.match(/\{+[^}]*\}+/g) || []

    allBracePatterns.forEach(pattern => {
      // Check for invalid patterns
      if (!/^(!?)?\{\{[^{}]+\}\}$/.test(pattern)) {
        // Check specific malformed cases
        if (/^\{[^}]*\}$/.test(pattern)) {
          errors.push(`Single brace variable found: ${pattern} (should use double braces)`)
        } else if (/^\{\{\{[^}]*\}\}\}$/.test(pattern)) {
          errors.push(`Triple brace variable found: ${pattern} (should use double braces)`)
        } else if (/^\{\{[^}]*\}$/.test(pattern) || /^\{[^}]*\}\}$/.test(pattern)) {
          errors.push(`Unmatched braces in variable: ${pattern}`)
        } else if (/\{.*\{.*\}.*\}/.test(pattern)) {
          errors.push(`Nested braces in variable: ${pattern}`)
        } else {
          errors.push(`Malformed variable: ${pattern}`)
        }
      }
    })

    return errors
  }

  /**
   * Validate brace balance in template content
   * @param {string} content - Template content
   * @returns {Array} - Array of error messages
   */
  static validateBraceBalance(content) {
    const errors = []
    let openCount = 0
    let consecutiveOpen = 0
    let consecutiveClose = 0

    for (let i = 0; i < content.length; i++) {
      const char = content[i]

      if (char === '{') {
        openCount++
        consecutiveOpen++
        consecutiveClose = 0

        // Check for too many consecutive opening braces
        if (consecutiveOpen > 2) {
          errors.push('Too many consecutive opening braces found')
          break
        }
      } else if (char === '}') {
        openCount--
        consecutiveClose++
        consecutiveOpen = 0

        // Check for too many consecutive closing braces
        if (consecutiveClose > 2) {
          errors.push('Too many consecutive closing braces found')
          break
        }

        // Check for negative count (more closing than opening)
        if (openCount < 0) {
          errors.push('Unmatched closing braces found')
          break
        }
      } else {
        consecutiveOpen = 0
        consecutiveClose = 0
      }
    }
    // Check for unmatched opening braces
    if (openCount > 0) {
      errors.push('Unmatched opening braces found')
    }

    return errors
  }
  /**
   * Validate email template content
   * @param {string} content - Template content
   * @returns {Object} - Validation result
   */
  static validateTemplate(content) {
    const errors = []
    const warnings = []

    if (!content || content.trim() === '') {
      errors.push('Template content cannot be empty')
      return { valid: false, errors, warnings }
    }

    const { required, optional } = this.extractVariables(content)

    // Check for common issues
    if (required.length === 0 && optional.length === 0) {
      warnings.push('Template contains no variables')
    }

    // Improved malformed variable detection
    const issues = this.detectMalformedVariables(content)
    if (issues.length > 0) {
      errors.push(...issues)
    }

    // Check for unclosed variables by counting braces more accurately
    const braceIssues = this.validateBraceBalance(content)
    if (braceIssues.length > 0) {
      errors.push(...braceIssues)
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      variables: { required, optional },
    }
  }
  /**
   * Generate sample data for template preview
   * @param {string} content - Template content
   * @returns {Object} - Sample variable data
   */
  static generateSampleData(content) {
    const { required, optional } = this.extractVariables(content)
    const sampleData = {}

    const allVariables = [...required, ...optional]

    allVariables.forEach(varName => {
      sampleData[varName] = this.generatePlaceholder(varName)
    })

    return sampleData
  }

  /**
   * Convert template to plain text (remove HTML tags)
   * @param {string} htmlContent - HTML template content
   * @returns {string} - Plain text version
   */
  static htmlToPlainText(htmlContent) {
    if (!htmlContent) return ''

    return htmlContent
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim()
  }

  /**
   * Log variable usage for analytics
   * @param {string} templateId - Template ID
   * @param {Object} variables - Variables used
   */
  static logVariableUsage(templateId, variables) {
    logger.info('Email template variables used', {
      templateId,
      requiredVariables: Object.keys(variables).filter(key => variables[key]),
      totalVariables: Object.keys(variables).length,
    })
  }
}

// Export utility functions for convenience
export const {
  extractVariables,
  replaceVariables,
  validateRequiredVariables,
  getVariableInfo,
  validateTemplate,
  generateSampleData,
  htmlToPlainText,
} = EmailVariableParser

export default EmailVariableParser
