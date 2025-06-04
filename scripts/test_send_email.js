const nodemailer = require('nodemailer')
const { render } = require('@react-email/render')
const React = require('react')

// Configuration - Replace with your details
const TEST_EMAIL = 'vemmaks84@gmail.com'

// Email configuration - Replace with your actual credentials
const emailConfig = {
  user: 'support@mystarboard.ng',
  pass: '#Starboard2025',
  from: 'support@mystarboard.ng',
  host: 'mail.privateemail.com',
  port: 587,
}

// Public URLs to your hosted images
const LOGO_URL = 'https://mystarboard.ng/nigcomsat-logo.png'
const WATERMARK_URL = 'https://mystarboard.ng/nigcomsat-logo.png'

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
          `Dear Test User and the Test Startup Team,`
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

async function sendTestEmail() {
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

  try {
    const emailHtml = await render(
      React.createElement(EmailTemplate, {
        fullName: 'Test User',
        startupName: 'Test Startup',
      })
    )

    const info = await transporter.sendMail({
      from: `Nigcomsat Accelerator <${emailConfig.from}>`,
      to: TEST_EMAIL,
      subject: 'TEST: Welcome to the Nigcomsat Accelerator Programme',
      html: emailHtml,
      headers: {
        'X-Priority': '1',
        Importance: 'high',
      },
    })

    console.log(`✅ Test email sent to ${TEST_EMAIL}`)
    console.log(`📧 Message ID: ${info.messageId}`)
  } catch (error) {
    console.error('❌ Failed to send test email:')
    console.error(error.message)

    if (error.response) {
      console.error('🔧 SMTP Response:', error.response)
    }
  }
}

sendTestEmail()
