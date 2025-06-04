// lib/services/email-service.js - Updated with SendGrid
import nodemailer from 'nodemailer'
import { logger } from '../logger.js'

/**
 * Email Service with SendGrid support
 */
export class EmailService {
  static transporter = null

  /**
   * Initialize email transporter with SendGrid optimization
   */
  static async initTransporter() {
    if (this.transporter) {
      return this.transporter
    }

    try {
      // Log configuration for debugging (without sensitive data)
      console.log('Email Configuration:', {
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        user: process.env.EMAIL_USER,
        from: process.env.EMAIL_FROM,
      })

      // Validate required environment variables
      const requiredVars = ['SMTP_HOST', 'SMTP_PORT', 'EMAIL_USER', 'EMAIL_PASS', 'EMAIL_FROM']
      const missingVars = requiredVars.filter(varName => !process.env[varName])

      if (missingVars.length > 0) {
        throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`)
      }

      const port = parseInt(process.env.SMTP_PORT)

      // SendGrid optimized configuration
      if (process.env.SMTP_HOST === 'smtp.sendgrid.net') {
        console.log('Using SendGrid SMTP configuration...')

        this.transporter = nodemailer.createTransport({
          host: 'smtp.sendgrid.net',
          port: 587,
          secure: false, // true for 465, false for other ports
          auth: {
            user: 'apikey', // This is literally the string 'apikey'
            pass: process.env.EMAIL_PASS, // Your SendGrid API key
          },
          tls: {
            rejectUnauthorized: false,
          },
          // SendGrid specific settings
          connectionTimeout: 60000,
          greetingTimeout: 30000,
          socketTimeout: 60000,
        })
      } else {
        // Fallback configuration for other providers
        this.transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: port,
          secure: port === 465,
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
          },
          tls: {
            rejectUnauthorized: false,
          },
          connectionTimeout: 60000,
          greetingTimeout: 30000,
          socketTimeout: 60000,
        })
      }

      // Test the connection
      console.log('Testing SMTP connection...')
      await this.transporter.verify()

      logger.info('Email transporter initialized successfully', {
        host: process.env.SMTP_HOST,
        port: port,
        user: process.env.EMAIL_USER,
      })

      return this.transporter
    } catch (error) {
      console.error('SMTP Connection Error Details:', {
        message: error.message,
        code: error.code,
        response: error.response,
        responseCode: error.responseCode,
        command: error.command,
      })

      // Provide helpful error messages
      let helpfulMessage = 'Email service initialization failed: '

      if (error.code === 'ECONNREFUSED') {
        helpfulMessage += 'Connection refused. Check if SMTP host and port are correct.'
      } else if (error.code === 'ENOTFOUND') {
        helpfulMessage += 'SMTP host not found. Check your SMTP_HOST setting.'
      } else if (error.responseCode === 535) {
        helpfulMessage +=
          'Authentication failed. For SendGrid, make sure EMAIL_USER is "apikey" and EMAIL_PASS is your SendGrid API key.'
      } else if (error.responseCode === 550) {
        helpfulMessage += 'Sender not verified. Make sure your FROM email is verified in SendGrid.'
      } else {
        helpfulMessage += error.message
      }

      logger.error('Failed to initialize email transporter', {
        error: error.message,
        code: error.code,
        helpfulMessage,
      })

      throw new Error(helpfulMessage)
    }
  }

  /**
   * Send email using transporter
   * @param {Object} emailData - Email data
   * @returns {Object} - Send result
   */
  static async sendEmail(emailData) {
    try {
      const transporter = await this.initTransporter()

      const mailOptions = {
        from: process.env.EMAIL_FROM,
        to: emailData.to,
        subject: emailData.subject,
        html: emailData.html,
        text: emailData.text || this.htmlToText(emailData.html),
        // SendGrid specific headers for better tracking
        headers: {
          'X-Priority': '1',
          'X-MSMail-Priority': 'High',
        },
      }

      const result = await transporter.sendMail(mailOptions)

      logger.info('Email sent successfully', {
        to: emailData.to,
        subject: emailData.subject,
        messageId: result.messageId,
        provider: process.env.SMTP_HOST.includes('sendgrid') ? 'SendGrid' : 'Other',
      })

      return {
        success: true,
        messageId: result.messageId,
        provider: 'sendgrid',
      }
    } catch (error) {
      logger.error('Failed to send email', {
        to: emailData.to,
        subject: emailData.subject,
        error: error.message,
        code: error.code,
      })
      throw error
    }
  }

  /**
   * Enhanced email content formatting with better styling
   */
  static formatEmailContent(content, variables = {}) {
    const htmlContent = content
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')

    // Extract workspace branding info
    const workspaceName = variables.workspace_name || 'Starboard'
    const workspaceLogo = variables.workspace_logo

    // Create header content with logo or workspace name
    const headerContent = workspaceLogo
      ? `<img src="${workspaceLogo}" alt="${workspaceName}" style="max-height: 60px; max-width: 200px; object-fit: contain;" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
         <h1 style="display: none; margin: 0; color: #1e293b; font-size: 28px; font-weight: 700;">${workspaceName}</h1>`
      : `<h1 style="margin: 0; color: #1e293b; font-size: 28px; font-weight: 700;">${workspaceName}</h1>`

    return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${workspaceName}</title>
      <style>
          body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 0;
              background-color: #f8fafc;
          }
          .email-container {
              background: white;
              margin: 20px;
              padding: 40px;
              border-radius: 12px;
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
              border: 1px solid #e2e8f0;
          }
          .email-header {
              text-align: center;
              border-bottom: 3px solid #3b82f6;
              padding-bottom: 20px;
              margin-bottom: 30px;
          }
          .email-header img {
              max-height: 60px;
              max-width: 200px;
              object-fit: contain;
          }
          .email-header h1 {
              margin: 0;
              color: #1e293b;
              font-size: 28px;
              font-weight: 700;
          }
          .email-content p {
              margin: 0 0 16px 0;
              font-size: 16px;
              line-height: 1.7;
          }
          .email-content p:last-child {
              margin-bottom: 0;
          }
          .cta-button {
              display: inline-block;
              padding: 14px 28px;
              background: linear-gradient(135deg, #3b82f6, #1d4ed8);
              color: white !important;
              text-decoration: none;
              border-radius: 8px;
              font-weight: 600;
              font-size: 16px;
              margin: 24px 0;
              transition: transform 0.2s;
          }
          .cta-button:hover {
              transform: translateY(-1px);
              box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
          }
          .email-footer {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid #e2e8f0;
              font-size: 14px;
              color: #64748b;
              text-align: center;
          }
          .divider {
              height: 1px;
              background: linear-gradient(90deg, transparent, #e2e8f0, transparent);
              margin: 20px 0;
          }
          @media only screen and (max-width: 600px) {
              .email-container {
                  margin: 10px;
                  padding: 20px;
              }
              .email-header h1 {
                  font-size: 24px;
              }
              .email-header img {
                  max-height: 50px;
                  max-width: 180px;
              }
          }
      </style>
  </head>
  <body>
      <div class="email-container">
          <div class="email-header">
              ${headerContent}
          </div>
          <div class="email-content">
              <p>${htmlContent}</p>
          </div>
          <div class="divider"></div>
          <div class="email-footer">
              <p>This email was sent from <strong>${workspaceName}</strong></p>
              <p>If you have any questions, please contact our support team</p>
          </div>
      </div>
  </body>
  </html>
      `.trim()
  }

  /**
   * Convert HTML to plain text
   */
  static htmlToText(html) {
    return html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\n\s*\n/g, '\n\n')
      .trim()
  }

  /**
   * Enhanced template rendering with better variable handling
   */
  static renderTemplate(template, variables) {
    let rendered = template

    // Handle required variables (!{{variable}})
    rendered = rendered.replace(/!{{([^}]+)}}/g, (match, key) => {
      const variable = variables[key.trim()]
      return variable !== undefined ? variable : `[${key.trim()}]`
    })

    // Handle optional variables ({{variable}})
    rendered = rendered.replace(/{{([^}]+)}}/g, (match, key) => {
      const variable = variables[key.trim()]
      return variable !== undefined ? variable : ''
    })

    return rendered
  }

  /**
   * Send templated email with enhanced error handling
   */
  static async sendTemplatedEmail(template, variables, toEmail) {
    try {
      // Validate required variables
      const missingRequired = (template.requiredVariables || []).filter(
        variable => !variables[variable] || variables[variable].trim() === ''
      )

      if (missingRequired.length > 0) {
        throw new Error(`Missing required variables: ${missingRequired.join(', ')}`)
      }

      // Render subject and content
      const renderedSubject = this.renderTemplate(template.subject, variables)
      const renderedContent = this.renderTemplate(template.content, variables)

      // Format HTML content with variables for branding
      const htmlContent = this.formatEmailContent(renderedContent, variables)

      const result = await this.sendEmail({
        to: toEmail,
        subject: renderedSubject,
        html: htmlContent,
      })

      logger.info('Templated email sent successfully', {
        templateId: template.id || 'system',
        templateType: template.type || 'unknown',
        to: toEmail,
        subject: renderedSubject,
        workspaceName: variables.workspace_name,
        hasLogo: !!variables.workspace_logo,
        provider: 'sendgrid',
      })

      return result
    } catch (error) {
      logger.error('Failed to send templated email', {
        templateId: template.id || 'system',
        to: toEmail,
        error: error.message,
      })
      throw error
    }
  }

  /**
   * Test SendGrid connection
   */
  static async testSendGridConnection() {
    try {
      const testTemplate = {
        subject: '✅ SendGrid Test - Starboard Email Service',
        content: `Hello!

**Great news!** Your SendGrid integration is working perfectly! 🎉

This test email confirms that:
- ✅ SMTP connection is successful
- ✅ Authentication is working
- ✅ Your domain is properly configured
- ✅ Emails will be delivered reliably

**Next Steps:**
Your application can now send:
- User invitation emails
- Password reset emails
- Notification emails
- Any other transactional emails

**Configuration Details:**
- Provider: SendGrid
- From: ${process.env.EMAIL_FROM}
- Domain: ${process.env.EMAIL_FROM?.split('@')[1]}

Welcome to reliable email delivery!

Best regards,
The Starboard Team`,
        requiredVariables: [],
        optionalVariables: [],
      }

      return await this.sendTemplatedEmail(testTemplate, {}, process.env.EMAIL_FROM)
    } catch (error) {
      logger.error('SendGrid test failed', {
        error: error.message,
      })
      throw error
    }
  }
}

export default EmailService
