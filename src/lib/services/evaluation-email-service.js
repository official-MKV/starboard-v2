import nodemailer from 'nodemailer';

/**
 * Simple email service for evaluation notifications
 * TODO: Replace with full email service when uncommented
 */
export class EvaluationEmailService {
  static transporter = null;

  static async getTransporter() {
    if (this.transporter) {
      return this.transporter;
    }

    try {
      // Create transporter (using environment variables)
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: false,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        },
        tls: {
          rejectUnauthorized: false
        }
      });

      return this.transporter;
    } catch (error) {
      console.error('Email transporter error:', error);
      // Return null if email not configured
      return null;
    }
  }

  /**
   * Send email when candidate is advanced to Step 2
   */
  static async sendStepAdvancementEmail(submission, stepName) {
    try {
      const transporter = await this.getTransporter();
      if (!transporter) {
        console.log('Email not configured, skipping advancement email');
        return;
      }

      const applicantEmail = submission.applicantEmail;
      const applicantName = `${submission.applicantFirstName} ${submission.applicantLastName}`;
      const companyName = submission.companyName || '';

      const subject = `Congratulations! You've Advanced to ${stepName}`;
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Congratulations!</h2>
          <p>Dear ${applicantName},</p>
          <p>We're pleased to inform you that your application${companyName ? ` for <strong>${companyName}</strong>` : ''} has successfully advanced to the next stage:</p>
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #1f2937;">${stepName}</h3>
          </p>
          <p>Next steps will be communicated to you shortly.</p>
          <p>Thank you for your patience and continued interest!</p>
          <br>
          <p>Best regards,<br>The Starboard Team</p>
        </div>
      `;

      await transporter.sendMail({
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        to: applicantEmail,
        subject,
        html
      });

      console.log(`Advancement email sent to ${applicantEmail}`);
    } catch (error) {
      console.error('Error sending advancement email:', error);
      // Don't throw - emails are not critical
    }
  }

  /**
   * Send email when interview slot is booked
   */
  static async sendInterviewBookingEmail(submission, slot) {
    try {
      const transporter = await this.getTransporter();
      if (!transporter) {
        console.log('Email not configured, skipping booking email');
        return;
      }

      const applicantEmail = submission.applicantEmail;
      const applicantName = `${submission.applicantFirstName} ${submission.applicantLastName}`;
      const date = new Date(slot.date).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      const subject = 'Interview Scheduled - Confirmation';
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Interview Scheduled</h2>
          <p>Dear ${applicantName},</p>
          <p>Your interview has been successfully scheduled!</p>

          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #1f2937;">Interview Details</h3>
            <p><strong>Date:</strong> ${date}</p>
            <p><strong>Time:</strong> ${slot.startTime} - ${slot.endTime}</p>
            ${slot.zoomLink ? `
              <p><strong>Zoom Link:</strong><br>
              <a href="${slot.zoomLink}" style="color: #2563eb; text-decoration: none;">${slot.zoomLink}</a></p>
            ` : ''}
          </div>

          <p><strong>Important Reminders:</strong></p>
          <ul>
            <li>Please join the meeting 5 minutes early</li>
            <li>Ensure you have a stable internet connection</li>
            <li>Test your audio and video before the interview</li>
          </ul>

          <p>We look forward to speaking with you!</p>
          <br>
          <p>Best regards,<br>The Starboard Team</p>
        </div>
      `;

      await transporter.sendMail({
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        to: applicantEmail,
        subject,
        html
      });

      console.log(`Interview booking email sent to ${applicantEmail}`);
    } catch (error) {
      console.error('Error sending booking email:', error);
    }
  }

  /**
   * Send acceptance email
   */
  static async sendAcceptanceEmail(submission) {
    try {
      const transporter = await this.getTransporter();
      if (!transporter) {
        console.log('Email not configured, skipping acceptance email');
        return;
      }

      const applicantEmail = submission.applicantEmail;
      const applicantName = `${submission.applicantFirstName} ${submission.applicantLastName}`;
      const companyName = submission.companyName || '';

      const subject = 'Congratulations! You\'ve Been Accepted';
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #10b981;">🎉 Congratulations!</h2>
          <p>Dear ${applicantName},</p>
          <p>We are thrilled to inform you that your application${companyName ? ` for <strong>${companyName}</strong>` : ''} has been <strong>accepted</strong>!</p>

          <div style="background: #f0fdf4; border-left: 4px solid #10b981; padding: 20px; margin: 20px 0;">
            <p style="margin: 0;">You will receive a separate email with onboarding instructions and next steps shortly.</p>
          </div>

          <p>We're excited to have you join our program!</p>
          <br>
          <p>Best regards,<br>The Starboard Team</p>
        </div>
      `;

      await transporter.sendMail({
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        to: applicantEmail,
        subject,
        html
      });

      console.log(`Acceptance email sent to ${applicantEmail}`);
    } catch (error) {
      console.error('Error sending acceptance email:', error);
    }
  }

  /**
   * Send rejection email
   */
  static async sendRejectionEmail(submission) {
    try {
      const transporter = await this.getTransporter();
      if (!transporter) {
        console.log('Email not configured, skipping rejection email');
        return;
      }

      const applicantEmail = submission.applicantEmail;
      const applicantName = `${submission.applicantFirstName} ${submission.applicantLastName}`;

      const subject = 'Application Status Update';
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1f2937;">Application Status Update</h2>
          <p>Dear ${applicantName},</p>
          <p>Thank you for taking the time to apply to our program.</p>
          <p>After careful consideration, we regret to inform you that we are unable to move forward with your application at this time.</p>
          <p>We received an overwhelming number of high-quality applications, making the selection process extremely competitive.</p>
          <p>We encourage you to apply to future programs and wish you the best in your endeavors.</p>
          <br>
          <p>Best regards,<br>The Starboard Team</p>
        </div>
      `;

      await transporter.sendMail({
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        to: applicantEmail,
        subject,
        html
      });

      console.log(`Rejection email sent to ${applicantEmail}`);
    } catch (error) {
      console.error('Error sending rejection email:', error);
    }
  }
}

export default EvaluationEmailService;
