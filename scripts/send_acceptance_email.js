const XLSX = require('xlsx')
const nodemailer = require('nodemailer')
const fs = require('fs')
const { render } = require('@react-email/render')
const React = require('react')

// Configuration
const INPUT_EXCEL = 'resources/final_decision_yes.xlsx' // Path to your "Yes" decisions Excel file
const LOG_FILE = 'email_log.txt'
const LOGO_URL = 'https://mystarboard.ng/nigcomsat-logo.png'

const WATERMARK_URL = 'https://mystarboard.ng/nigcomsat-logo.png'

// Email configuration - Replace with your actual credentials
 

// Create log file with timestamp
fs.writeFileSync(LOG_FILE, `Email Sending Log - ${new Date().toISOString()}\n\n`)

// Email Template Component
const EmailTemplate = ({ fullName, startupName }) =>
  React.createElement(
    'html',
    null,
    React.createElement('head', null),
    React.createElement(
      'body',
      {
        style: {
          fontFamily: 'Arial, sans-serif',
          backgroundColor: '#f5f8fa',
          margin: 0,
          padding: 0,
          position: 'relative',
        },
      },
      // Watermark
      React.createElement('div', {
        style: {
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: `url(${WATERMARK_URL})`,
          backgroundRepeat: 'repeat',
          opacity: 0.05,
          zIndex: 0,
        },
      }),

      // Main Container
      React.createElement(
        'div',
        {
          style: {
            maxWidth: '600px',
            margin: '20px auto',
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            position: 'relative',
            zIndex: 1,
            padding: '20px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
          },
        },
        // Header with Logo
        React.createElement(
          'div',
          {
            style: {
              textAlign: 'right',
              marginBottom: '20px',
              borderBottom: '1px solid #eee',
              paddingBottom: '20px',
            },
          },
          React.createElement('img', {
            src: LOGO_URL,
            alt: 'Nigcomsat Logo',
            width: '150',
            style: { float: 'right' },
          })
        ),

        // Email Content
        React.createElement('p', { style: { color: '#666', fontSize: '14px' } }, '27th May 2025'),
        React.createElement(
          'h1',
          { style: { color: '#1a2980', marginTop: '0' } },
          'Welcome to the Nigcomsat Accelerator Programme'
        ),

        React.createElement(
          'p',
          { style: { lineHeight: '1.6' } },
          `Dear ${fullName} and the ${startupName} Team,`
        ),

        React.createElement(
          'p',
          { style: { lineHeight: '1.6' } },
          "Congratulations! We're excited to let you know that your startup has been selected to join ",
          React.createElement('strong', null, 'Cohort 2 of the Nigcomsat Accelerator Programme'),
          '. After a competitive selection process and an impressive interview, your team stood out for its innovation, clarity of purpose, and bold vision.'
        ),

        React.createElement(
          'p',
          { style: { lineHeight: '1.6' } },
          "You're now part of a community of founders building the future with satellite technology. ",
          'The accelerator officially launches on 18th June 2025, and over the coming weeks, ',
          "you'll gain access to:"
        ),

        React.createElement(
          'ul',
          { style: { paddingLeft: '20px', lineHeight: '1.6' } },
          React.createElement('li', null, 'Mentorship from industry leaders'),
          React.createElement('li', null, 'Technical and business development support'),
          React.createElement('li', null, 'Opportunities to pitch to partners and investors'),
          React.createElement(
            'li',
            null,
            'A network of fellow entrepreneurs solving real-world problems'
          )
        ),

        React.createElement(
          'p',
          { style: { lineHeight: '1.6' } },
          "Further instructions will be sent to you shortly. We're looking forward to building with you. Welcome aboard!"
        ),

        // Footer
        React.createElement(
          'div',
          {
            style: {
              marginTop: '30px',
              paddingTop: '20px',
              borderTop: '1px solid #eee',
              color: '#666',
            },
          },
          React.createElement('p', null, 'Warm regards,'),
          React.createElement(
            'p',
            { style: { fontWeight: 'bold', color: '#1a2980' } },
            'Maureen Nzekwe',
            React.createElement('br', null),
            'Programme Manager',
            React.createElement('br', null),
            'Nigcomsat Accelerator Programme'
          )
        )
      )
    )
  )

// Sleep function for delays
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Read Excel Data
function readExcelData() {
  try {
    const workbook = XLSX.readFile(INPUT_EXCEL)
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    return XLSX.utils.sheet_to_json(worksheet)
  } catch (error) {
    logMessage(`Error reading Excel file: ${error.message}`, 'ERROR')
    process.exit(1)
  }
}

// Log messages to file and console
function logMessage(message, type = 'INFO') {
  const timestamp = new Date().toISOString()
  const logEntry = `[${timestamp}] [${type}] ${message}\n`

  console.log(logEntry.trim())
  fs.appendFileSync(LOG_FILE, logEntry)
}

// Send Emails
async function sendEmails() {
  // Set up transporter
  const transporter = nodemailer.createTransport({
    host: emailConfig.host,
    port: emailConfig.port,
    secure: false,
    auth: {
      user: emailConfig.user,
      pass: emailConfig.pass,
    },
    tls: {
      rejectUnauthorized: false,
    },
  })

  // Verify connection
  try {
    await transporter.verify()
    logMessage('SMTP connection verified')
  } catch (error) {
    logMessage(`SMTP connection failed: ${error.message}`, 'ERROR')
    return
  }

  // Get recipients from Excel
  const recipients = readExcelData()
  logMessage(`Found ${recipients.length} recipients to email`)

  // Send to each recipient
  let successCount = 0
  let failureCount = 0

  for (let i = 0; i < recipients.length; i++) {
    const recipient = recipients[i]
    const email = recipient.EMAIL
    const fullName = recipient.NAME
    const startupName = recipient['Startup Name']

    try {
      // Generate HTML email
      const emailHtml = await render(React.createElement(EmailTemplate, { fullName, startupName }))
      // Send email
      const info = await transporter.sendMail({
        from: `Nigcomsat Accelerator <${emailConfig.from}>`,
        to: email,
        subject: 'Welcome to the Nigcomsat Accelerator Programme',
        html: emailHtml,
        headers: {
          'X-Priority': '1',
          Importance: 'high',
        },
      })

      logMessage(`Sent to ${email} - Message ID: ${info.messageId}`)
      successCount++

      // Add 30-second delay unless it's the last email
      if (i < recipients.length - 1) {
        logMessage('Pausing for 30 seconds before next email...')
        await sleep(30000)
      }
    } catch (error) {
      logMessage(`Failed to send to ${email}: ${error.message}`, 'ERROR')
      failureCount++

      // For SMTP errors, pause longer before retrying
      if (error.responseCode && error.responseCode >= 400) {
        logMessage('Extended pause (60 seconds) due to SMTP error')
        await sleep(60000)
      }
    }
  }

  logMessage(`Email sending completed: ${successCount} successful, ${failureCount} failed`)
}

// Run the script
sendEmails().catch(error => {
  logMessage(`Unhandled error: ${error.message}`, 'CRITICAL')
})
