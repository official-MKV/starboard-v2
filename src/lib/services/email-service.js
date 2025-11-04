// // lib/services/email-service.js - Updated for Amazon SES
// import nodemailer from 'nodemailer'
// import { logger } from '../logger.js'

// /**
//  * Email Service with Amazon SES support
//  */
// export class EmailService {
//   static transporter = null

//   /**
//    * Initialize email transporter with Amazon SES optimization
//    */
//   static async initTransporter() {
//     if (this.transporter) {
//       return this.transporter
//     }

//     try {
//       // Log configuration for debugging (without sensitive data)
//       console.log('Email Configuration:', {
//         host: process.env.SMTP_HOST,
//         port: process.env.SMTP_PORT,
//         user: process.env.EMAIL_USER,
//         from: process.env.EMAIL_FROM,
//         region: process.env.AWS_REGION,
//       })

//       // Validate required environment variables
//       const requiredVars = ['SMTP_HOST', 'SMTP_PORT', 'EMAIL_USER', 'EMAIL_PASS', 'EMAIL_FROM']
//       const missingVars = requiredVars.filter(varName => !process.env[varName])

//       if (missingVars.length > 0) {
//         throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`)
//       }

//       const port = parseInt(process.env.SMTP_PORT)

//       // Amazon SES optimized configuration
//       if (process.env.SMTP_HOST?.includes('amazonaws.com') || process.env.SMTP_HOST?.includes('ses')) {
//         console.log('Using Amazon SES SMTP configuration...')

//         this.transporter = nodemailer.createTransport({
//           host: process.env.SMTP_HOST, // e.g., email-smtp.us-east-1.amazonaws.com
//           port: 587, // or 465 for SSL
//           secure: false, // true for 465, false for 587
//           auth: {
//             user: process.env.EMAIL_USER, // Your SES SMTP username
//             pass: process.env.EMAIL_PASS, // Your SES SMTP password
//           },
//           tls: {
//             rejectUnauthorized: false,
//           },
//           // SES specific settings
//           connectionTimeout: 60000,
//           greetingTimeout: 30000,
//           socketTimeout: 60000,
//           // SES rate limiting (14 emails per second by default)
//           pool: true,
//           maxConnections: 5,
//           maxMessages: 100,
//         })
//       } else {
//         // Fallback configuration for other providers
//         this.transporter = nodemailer.createTransport({
//           host: process.env.SMTP_HOST,
//           port: port,
//           secure: port === 465,
//           auth: {
//             user: process.env.EMAIL_USER,
//             pass: process.env.EMAIL_PASS,
//           },
//           tls: {
//             rejectUnauthorized: false,
//           },
//           connectionTimeout: 60000,
//           greetingTimeout: 30000,
//           socketTimeout: 60000,
//         })
//       }

//       // Test the connection
//       console.log('Testing SMTP connection...')
//       await this.transporter.verify()

//       logger.info('Email transporter initialized successfully', {
//         host: process.env.SMTP_HOST,
//         port: port,
//         user: process.env.EMAIL_USER,
//         provider: 'Amazon SES',
//       })

//       return this.transporter
//     } catch (error) {
//       console.error('SMTP Connection Error Details:', {
//         message: error.message,
//         code: error.code,
//         response: error.response,
//         responseCode: error.responseCode,
//         command: error.command,
//       })

//       // Provide helpful error messages for SES
//       let helpfulMessage = 'Email service initialization failed: '

//       if (error.code === 'ECONNREFUSED') {
//         helpfulMessage += 'Connection refused. Check if SES SMTP endpoint and port are correct for your region.'
//       } else if (error.code === 'ENOTFOUND') {
//         helpfulMessage += 'SES SMTP host not found. Check your SMTP_HOST setting (should be email-smtp.{region}.amazonaws.com).'
//       } else if (error.responseCode === 535) {
//         helpfulMessage += 'Authentication failed. Check your SES SMTP credentials (username/password).'
//       } else if (error.responseCode === 554) {
//         helpfulMessage += 'Email address not verified in SES. Make sure your FROM email is verified in SES console.'
//       } else if (error.message.includes('rate')) {
//         helpfulMessage += 'SES rate limit exceeded. Check your SES sending limits.'
//       } else {
//         helpfulMessage += error.message
//       }

//       logger.error('Failed to initialize email transporter', {
//         error: error.message,
//         code: error.code,
//         helpfulMessage,
//       })

//       throw new Error(helpfulMessage)
//     }
//   }

//   /**
//    * Send email using transporter with SES optimizations
//    * @param {Object} emailData - Email data
//    * @returns {Object} - Send result
//    */
//   static async sendEmail(emailData) {
//     try {
//       const transporter = await this.initTransporter()

//       const mailOptions = {
//         from: process.env.EMAIL_FROM,
//         to: emailData.to,
//         subject: emailData.subject,
//         html: emailData.html,
//         text: emailData.text || this.htmlToText(emailData.html),
//         // SES specific headers
//         headers: {
//           'X-SES-CONFIGURATION-SET': process.env.SES_CONFIGURATION_SET || undefined,
//           'X-SES-MESSAGE-TAG': emailData.tag || 'transactional',
//         },
//         // Remove undefined headers
//         ...Object.fromEntries(
//           Object.entries({
//             'X-SES-CONFIGURATION-SET': process.env.SES_CONFIGURATION_SET,
//           }).filter(([_, v]) => v !== undefined)
//         ),
//       }

//       const result = await transporter.sendMail(mailOptions)

//       logger.info('Email sent successfully', {
//         to: emailData.to,
//         subject: emailData.subject,
//         messageId: result.messageId,
//         provider: 'Amazon SES',
//         configurationSet: process.env.SES_CONFIGURATION_SET,
//       })

//       return {
//         success: true,
//         messageId: result.messageId,
//         provider: 'ses',
//       }
//     } catch (error) {
//       logger.error('Failed to send email', {
//         to: emailData.to,
//         subject: emailData.subject,
//         error: error.message,
//         code: error.code,
//       })
//       throw error
//     }
//   }

//   /**
//    * Enhanced email content formatting with better styling
//    */
//   static formatEmailContent(content, variables = {}) {
//     const htmlContent = content
//       .replace(/\n\n/g, '</p><p>')
//       .replace(/\n/g, '<br>')
//       .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
//       .replace(/\*(.*?)\*/g, '<em>$1</em>')

//     // Extract workspace branding info
//     const workspaceName = variables.workspace_name || 'Starboard'
//     const workspaceLogo = variables.workspace_logo

//     // Create header content with logo or workspace name
//     const headerContent = workspaceLogo
//       ? `<img src="${workspaceLogo}" alt="${workspaceName}" style="max-height: 60px; max-width: 200px; object-fit: contain;" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
//          <h1 style="display: none; margin: 0; color: #1e293b; font-size: 28px; font-weight: 700;">${workspaceName}</h1>`
//       : `<h1 style="margin: 0; color: #1e293b; font-size: 28px; font-weight: 700;">${workspaceName}</h1>`

//     return `
//   <!DOCTYPE html>
//   <html lang="en">
//   <head>
//       <meta charset="UTF-8">
//       <meta name="viewport" content="width=device-width, initial-scale=1.0">
//       <title>${workspaceName}</title>
//       <style>
//           body {
//               font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
//               line-height: 1.6;
//               color: #333;
//               max-width: 600px;
//               margin: 0 auto;
//               padding: 0;
//               background-color: #f8fafc;
//           }
//           .email-container {
//               background: white;
//               margin: 20px;
//               padding: 40px;
//               border-radius: 12px;
//               box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
//               border: 1px solid #e2e8f0;
//           }
//           .email-header {
//               text-align: center;
//               border-bottom: 3px solid #3b82f6;
//               padding-bottom: 20px;
//               margin-bottom: 30px;
//           }
//           .email-header img {
//               max-height: 60px;
//               max-width: 200px;
//               object-fit: contain;
//           }
//           .email-header h1 {
//               margin: 0;
//               color: #1e293b;
//               font-size: 28px;
//               font-weight: 700;
//           }
//           .email-content p {
//               margin: 0 0 16px 0;
//               font-size: 16px;
//               line-height: 1.7;
//           }
//           .email-content p:last-child {
//               margin-bottom: 0;
//           }
//           .cta-button {
//               display: inline-block;
//               padding: 14px 28px;
//               background: linear-gradient(135deg, #3b82f6, #1d4ed8);
//               color: white !important;
//               text-decoration: none;
//               border-radius: 8px;
//               font-weight: 600;
//               font-size: 16px;
//               margin: 24px 0;
//               transition: transform 0.2s;
//           }
//           .cta-button:hover {
//               transform: translateY(-1px);
//               box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
//           }
//           .email-footer {
//               margin-top: 40px;
//               padding-top: 20px;
//               border-top: 1px solid #e2e8f0;
//               font-size: 14px;
//               color: #64748b;
//               text-align: center;
//           }
//           .divider {
//               height: 1px;
//               background: linear-gradient(90deg, transparent, #e2e8f0, transparent);
//               margin: 20px 0;
//           }
//           @media only screen and (max-width: 600px) {
//               .email-container {
//                   margin: 10px;
//                   padding: 20px;
//               }
//               .email-header h1 {
//                   font-size: 24px;
//               }
//               .email-header img {
//                   max-height: 50px;
//                   max-width: 180px;
//               }
//           }
//       </style>
//   </head>
//   <body>
//       <div class="email-container">
//           <div class="email-header">
//               ${headerContent}
//           </div>
//           <div class="email-content">
//               <p>${htmlContent}</p>
//           </div>
//           <div class="divider"></div>
//           <div class="email-footer">
//               <p>This email was sent from <strong>${workspaceName}</strong></p>
//               <p>If you have any questions, please contact our support team</p>
//           </div>
//       </div>
//   </body>
//   </html>
//       `.trim()
//   }

//   /**
//    * Convert HTML to plain text
//    */
//   static htmlToText(html) {
//     return html
//       .replace(/<br\s*\/?>/gi, '\n')
//       .replace(/<\/p>/gi, '\n\n')
//       .replace(/<[^>]*>/g, '')
//       .replace(/&nbsp;/g, ' ')
//       .replace(/&lt;/g, '<')
//       .replace(/&gt;/g, '>')
//       .replace(/&amp;/g, '&')
//       .replace(/&quot;/g, '"')
//       .replace(/&#39;/g, "'")
//       .replace(/\n\s*\n/g, '\n\n')
//       .trim()
//   }

//   /**
//    * Enhanced template rendering with better variable handling
//    */
//   static renderTemplate(template, variables) {
//     let rendered = template

//     // Handle required variables (!{{variable}})
//     rendered = rendered.replace(/!{{([^}]+)}}/g, (match, key) => {
//       const variable = variables[key.trim()]
//       return variable !== undefined ? variable : `[${key.trim()}]`
//     })

//     // Handle optional variables ({{variable}})
//     rendered = rendered.replace(/{{([^}]+)}}/g, (match, key) => {
//       const variable = variables[key.trim()]
//       return variable !== undefined ? variable : ''
//     })

//     return rendered
//   }

//   /**
//    * Send templated email with enhanced error handling
//    */
//   static async sendTemplatedEmail(template, variables, toEmail, options = {}) {
//     try {
//       // Validate required variables
//       const missingRequired = (template.requiredVariables || []).filter(
//         variable => !variables[variable] || variables[variable].trim() === ''
//       )

//       if (missingRequired.length > 0) {
//         throw new Error(`Missing required variables: ${missingRequired.join(', ')}`)
//       }

//       // Render subject and content
//       const renderedSubject = this.renderTemplate(template.subject, variables)
//       const renderedContent = this.renderTemplate(template.content, variables)

//       // Format HTML content with variables for branding
//       const htmlContent = this.formatEmailContent(renderedContent, variables)

//       const result = await this.sendEmail({
//         to: toEmail,
//         subject: renderedSubject,
//         html: htmlContent,
//         tag: options.tag || template.type || 'transactional',
//       })

//       logger.info('Templated email sent successfully', {
//         templateId: template.id || 'system',
//         templateType: template.type || 'unknown',
//         to: toEmail,
//         subject: renderedSubject,
//         workspaceName: variables.workspace_name,
//         hasLogo: !!variables.workspace_logo,
//         provider: 'Amazon SES',
//       })

//       return result
//     } catch (error) {
//       logger.error('Failed to send templated email', {
//         templateId: template.id || 'system',
//         to: toEmail,
//         error: error.message,
//       })
//       throw error
//     }
//   }

//   /**
//    * Test Amazon SES connection
//    */
//   static async testSESConnection() {
//     try {
//       const testTemplate = {
//         subject: '✅ Amazon SES Test - Starboard Email Service',
//         content: `Hello!

// **Great news!** Your Amazon SES integration is working perfectly! 🎉

// This test email confirms that:
// - ✅ SMTP connection is successful
// - ✅ Authentication is working
// - ✅ Your domain is properly verified
// - ✅ Emails will be delivered reliably

// **Next Steps:**
// Your application can now send:
// - User invitation emails
// - Password reset emails
// - Notification emails
// - Any other transactional emails

// **Configuration Details:**
// - Provider: Amazon SES
// - Region: ${process.env.AWS_REGION || 'us-east-1'}
// - From: ${process.env.EMAIL_FROM}
// - Domain: ${process.env.EMAIL_FROM?.split('@')[1]}
// - Configuration Set: ${process.env.SES_CONFIGURATION_SET || 'Default'}

// Welcome to reliable email delivery with AWS!

// Best regards,
// The Starboard Team`,
//         requiredVariables: [],
//         optionalVariables: [],
//         type: 'test',
//       }

//       return await this.sendTemplatedEmail(testTemplate, {}, process.env.EMAIL_FROM, {
//         tag: 'test-connection'
//       })
//     } catch (error) {
//       logger.error('SES test failed', {
//         error: error.message,
//       })
//       throw error
//     }
//   }

//   /**
//    * Get SES sending statistics (requires AWS SDK)
//    */
//   static async getSESStats() {
//     // This would require AWS SDK integration
//     // For now, return basic info
//     return {
//       provider: 'Amazon SES',
//       region: process.env.AWS_REGION || 'us-east-1',
//       endpoint: process.env.SMTP_HOST,
//       configurationSet: process.env.SES_CONFIGURATION_SET,
//     }
//   }
// }

// export default EmailService
// lib/services/email-service.js - Updated for Resend
import nodemailer from 'nodemailer'
import { logger } from '../logger.js'

/**
 * Email Service with Resend support
 */
export class EmailService {
  static transporter = null

  /**
   * Initialize email transporter with Resend optimization
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
        provider: 'Resend',
      })

      // Validate required environment variables
      const requiredVars = ['SMTP_HOST', 'SMTP_PORT', 'EMAIL_USER', 'EMAIL_PASS', 'EMAIL_FROM']
      const missingVars = requiredVars.filter(varName => !process.env[varName])

      if (missingVars.length > 0) {
        throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`)
      }

      const port = parseInt(process.env.SMTP_PORT)

      // Resend SMTP configuration
      if (process.env.SMTP_HOST?.includes('resend.com') || process.env.SMTP_HOST === 'smtp.resend.com') {
        console.log('Using Resend SMTP configuration...')

        this.transporter = nodemailer.createTransport({
          host: 'smtp.resend.com',
          port: 587,
          secure: false, // true for 465, false for 587
          auth: {
            user: 'resend', // This is literally the string 'resend'
            pass: process.env.EMAIL_PASS, // Your Resend API key
          },
          tls: {
            rejectUnauthorized: false,
          },
          // Resend specific settings
          connectionTimeout: 60000,
          greetingTimeout: 30000,
          socketTimeout: 60000,
          pool: true,
          maxConnections: 5,
          maxMessages: 100,
          // Resend rate limiting (much more generous than SES sandbox)
          rateLimit: 10, // 10 emails per second
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
        provider: 'Resend',
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

      // Provide helpful error messages for Resend
      let helpfulMessage = 'Email service initialization failed: '

      if (error.code === 'ECONNREFUSED') {
        helpfulMessage += 'Connection refused. Check if Resend SMTP endpoint and port are correct.'
      } else if (error.code === 'ENOTFOUND') {
        helpfulMessage += 'Resend SMTP host not found. Should be smtp.resend.com.'
      } else if (error.responseCode === 535) {
        helpfulMessage += 'Authentication failed. Check your Resend API key. Make sure EMAIL_USER is "resend" and EMAIL_PASS is your API key.'
      } else if (error.responseCode === 550) {
        helpfulMessage += 'Domain not verified in Resend. Add and verify your domain in Resend dashboard.'
      } else if (error.message.includes('rate')) {
        helpfulMessage += 'Resend rate limit exceeded.'
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
   * Send email using transporter with Resend optimizations
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
        // Resend specific headers
        headers: {
          'X-Entity-Ref-ID': emailData.entityId || undefined,
        },
        // Add any custom tags for tracking
        ...(emailData.tags && { 
          'X-Resend-Tags': Array.isArray(emailData.tags) ? emailData.tags.join(',') : emailData.tags 
        }),
      }

      const result = await transporter.sendMail(mailOptions)

      logger.info('Email sent successfully', {
        to: emailData.to,
        subject: emailData.subject,
        messageId: result.messageId,
        provider: 'Resend',
        tags: emailData.tags,
      })

      return {
        success: true,
        messageId: result.messageId,
        provider: 'resend',
      }
    } catch (error) {
      // Enhanced error handling for Resend-specific issues
      let enhancedError = error

      if (error.responseCode === 550) {
        enhancedError = new Error(
          `Resend domain verification required: "${process.env.EMAIL_FROM?.split('@')[1]}". ` +
          `Add and verify your domain in Resend dashboard.`
        )
        enhancedError.code = 'RESEND_DOMAIN_NOT_VERIFIED'
        enhancedError.originalError = error
      } else if (error.responseCode === 535) {
        enhancedError = new Error(
          `Resend authentication failed. Check your API key in EMAIL_PASS environment variable.`
        )
        enhancedError.code = 'RESEND_AUTH_FAILED'
        enhancedError.originalError = error
      }

      logger.error('Failed to send email', {
        to: emailData.to,
        subject: emailData.subject,
        error: enhancedError.message,
        code: enhancedError.code,
        provider: 'Resend',
      })
      throw enhancedError
    }
  }

  /**
   * Enhanced email content formatting with clean, minimal styling
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
      ? `<img src="${workspaceLogo}" alt="${workspaceName}" style="max-height: 50px; max-width: 180px; object-fit: contain; margin-bottom: 16px;" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
         <h1 style="display: none; margin: 0; color: #111827; font-size: 24px; font-weight: 700;">${workspaceName}</h1>`
      : `<h1 style="margin: 0; color: #111827; font-size: 24px; font-weight: 700;">${workspaceName}</h1>`

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
              color: #374151;
              max-width: 600px;
              margin: 0 auto;
              padding: 0;
              background-color: #ffffff;
          }
          .email-container {
              background: white;
              margin: 0;
              padding: 0;
          }
          .email-header {
              text-align: center;
              border: 3px solid #3e3eff;
              padding: 32px 24px;
              margin: 0;
              background: white;
          }
          .email-header img {
              max-height: 50px;
              max-width: 180px;
              object-fit: contain;
              margin-bottom: 16px;
          }
          .email-header h1 {
              margin: 0;
              color: #111827;
              font-size: 24px;
              font-weight: 700;
          }
          .email-content {
              padding: 40px 24px;
              background: white;
          }
          .email-content p {
              margin: 0 0 16px 0;
              font-size: 16px;
              line-height: 1.7;
              color: #374151;
          }
          .email-content p:last-child {
              margin-bottom: 0;
          }
          .email-content strong {
              color: #111827;
              font-weight: 600;
          }
          .cta-button {
              display: inline-block;
              padding: 12px 32px;
              background: #3e3eff;
              color: white !important;
              text-decoration: none;
              border-radius: 0;
              font-weight: 600;
              font-size: 16px;
              margin: 24px 0;
              border: none;
          }
          .cta-button:hover {
              background: #2929d6;
          }
          .info-box {
              background: #f9fafb;
              border: 1px solid #e5e7eb;
              padding: 20px;
              margin: 24px 0;
          }
          .info-row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 12px;
              padding-bottom: 12px;
              border-bottom: 1px solid #e5e7eb;
          }
          .info-row:last-child {
              margin-bottom: 0;
              padding-bottom: 0;
              border-bottom: none;
          }
          .info-label {
              color: #6b7280;
              font-size: 14px;
          }
          .info-value {
              color: #111827;
              font-weight: 600;
              font-size: 14px;
          }
          .email-footer {
              margin-top: 0;
              padding: 24px;
              border-top: 1px solid #e5e7eb;
              font-size: 14px;
              color: #6b7280;
              text-align: center;
              background: #f9fafb;
          }
          .email-footer p {
              margin: 4px 0;
          }
          @media only screen and (max-width: 600px) {
              .email-header {
                  padding: 24px 16px;
              }
              .email-content {
                  padding: 32px 16px;
              }
              .email-header h1 {
                  font-size: 20px;
              }
              .email-header img {
                  max-height: 40px;
                  max-width: 150px;
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
              ${htmlContent}
          </div>
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
  static async sendTemplatedEmail(template, variables, toEmail, options = {}) {
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
        tags: options.tags || [template.type || 'transactional'],
        entityId: options.entityId,
      })

      logger.info('Templated email sent successfully', {
        templateId: template.id || 'system',
        templateType: template.type || 'unknown',
        to: toEmail,
        subject: renderedSubject,
        workspaceName: variables.workspace_name,
        hasLogo: !!variables.workspace_logo,
        provider: 'Resend',
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
   * Test Resend connection
   */
  static async testResendConnection() {
    try {
      const testTemplate = {
        subject: '✅ Resend Test - Starboard Email Service',
        content: `Hello!

**Excellent news!** Your Resend integration is working perfectly! 🎉

This test email confirms that:
- ✅ SMTP connection to Resend is successful
- ✅ Authentication with your API key is working
- ✅ Your domain is properly configured
- ✅ Emails will be delivered reliably worldwide

**Why Resend is Great:**
- **No sandbox mode** - Send to any email immediately
- **Excellent deliverability** - High inbox placement rates
- **Developer-friendly** - Built for modern applications
- **Real-time analytics** - Track opens, clicks, bounces
- **Fast setup** - No waiting for approval

**Next Steps:**
Your application can now send:
- User invitation emails ✅
- Password reset emails ✅
- Notification emails ✅
- Any other transactional emails ✅

**Configuration Details:**
- Provider: Resend
- From: ${process.env.EMAIL_FROM}
- Domain: ${process.env.EMAIL_FROM?.split('@')[1]}
- Rate Limit: 10 emails/second

Welcome to reliable email delivery with Resend!

Best regards,
The Starboard Team`,
        requiredVariables: [],
        optionalVariables: [],
        type: 'test',
      }

      return await this.sendTemplatedEmail(testTemplate, {}, process.env.EMAIL_FROM, {
        tags: ['test-connection', 'resend-setup']
      })
    } catch (error) {
      logger.error('Resend test failed', {
        error: error.message,
      })
      throw error
    }
  }

  /**
   * Get Resend sending statistics
   */
  static async getResendStats() {
    return {
      provider: 'Resend',
      endpoint: 'smtp.resend.com',
      rateLimit: '10 emails/second',
      features: [
        'No sandbox restrictions',
        'Worldwide delivery', 
        'Real-time analytics',
        'Webhook support',
        'Template management'
      ],
    }
  }
}

export default EmailService