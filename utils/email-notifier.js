/**
 * EMAIL NOTIFICATION SYSTEM
 *
 * Centralized email sending with support for multiple providers
 *
 * Supported Services:
 * - SendGrid (recommended for production)
 * - Nodemailer (SMTP fallback)
 * - Console logging (development)
 *
 * Usage:
 *   const emailNotifier = require('./utils/email-notifier');
 *   await emailNotifier.sendWelcome(userEmail, userName);
 *   await emailNotifier.sendPasswordReset(userEmail, resetToken);
 */

const fs = require('fs');
const path = require('path');

class EmailNotifier {
    constructor(config = {}) {
        this.config = {
            environment: process.env.NODE_ENV || 'development',
            provider: process.env.EMAIL_PROVIDER || 'sendgrid', // 'sendgrid' or 'smtp'
            from: process.env.EMAIL_FROM || 'noreply@consciousness.io',
            fromName: process.env.EMAIL_FROM_NAME || 'Consciousness Revolution',
            sendgridApiKey: process.env.SENDGRID_API_KEY || null,
            smtpHost: process.env.SMTP_HOST || null,
            smtpPort: process.env.SMTP_PORT || 587,
            smtpUser: process.env.SMTP_USER || null,
            smtpPass: process.env.SMTP_PASS || null,
            templateDirectory: config.templateDirectory || path.join(__dirname, '..', 'email-templates'),
            ...config
        };

        this.emailsSent = 0;
        this.emailLog = [];

        // Initialize email provider
        this.initializeProvider();
    }

    initializeProvider() {
        if (this.config.environment === 'development') {
            console.log('📧 Email system in DEVELOPMENT mode (console only)');
            return;
        }

        if (this.config.provider === 'sendgrid' && this.config.sendgridApiKey) {
            try {
                const sgMail = require('@sendgrid/mail');
                sgMail.setApiKey(this.config.sendgridApiKey);
                this.sendgrid = sgMail;
                console.log('✅ SendGrid initialized');
            } catch (error) {
                console.warn('⚠️  SendGrid not available:', error.message);
                this.sendgrid = null;
            }
        } else if (this.config.provider === 'smtp') {
            try {
                const nodemailer = require('nodemailer');
                this.transporter = nodemailer.createTransport({
                    host: this.config.smtpHost,
                    port: this.config.smtpPort,
                    secure: this.config.smtpPort === 465,
                    auth: {
                        user: this.config.smtpUser,
                        pass: this.config.smtpPass
                    }
                });
                console.log('✅ SMTP initialized');
            } catch (error) {
                console.warn('⚠️  SMTP not available:', error.message);
                this.transporter = null;
            }
        }
    }

    async send(to, subject, html, text = null) {
        this.emailsSent++;

        const emailData = {
            to,
            from: `${this.config.fromName} <${this.config.from}>`,
            subject,
            html,
            text: text || this.stripHtml(html),
            timestamp: new Date().toISOString(),
            emailNumber: this.emailsSent
        };

        // Log email
        this.emailLog.push({
            to,
            subject,
            timestamp: emailData.timestamp,
            sent: false
        });
        if (this.emailLog.length > 100) {
            this.emailLog.shift();
        }

        // Development mode: log to console
        if (this.config.environment === 'development') {
            this.logToConsole(emailData);
            return { success: true, mode: 'development', logged: true };
        }

        // Send via SendGrid
        if (this.sendgrid) {
            try {
                await this.sendgrid.send(emailData);
                this.emailLog[this.emailLog.length - 1].sent = true;
                console.log(`✅ Email sent via SendGrid to ${to}`);
                return { success: true, provider: 'sendgrid' };
            } catch (error) {
                console.error(`❌ SendGrid error:`, error.message);
                return { success: false, error: error.message, provider: 'sendgrid' };
            }
        }

        // Send via SMTP
        if (this.transporter) {
            try {
                await this.transporter.sendMail(emailData);
                this.emailLog[this.emailLog.length - 1].sent = true;
                console.log(`✅ Email sent via SMTP to ${to}`);
                return { success: true, provider: 'smtp' };
            } catch (error) {
                console.error(`❌ SMTP error:`, error.message);
                return { success: false, error: error.message, provider: 'smtp' };
            }
        }

        // No provider configured
        console.warn('⚠️  No email provider configured, logging only');
        this.logToConsole(emailData);
        return { success: false, error: 'No email provider configured' };
    }

    logToConsole(emailData) {
        console.log('\n' + '='.repeat(60));
        console.log('📧 EMAIL #' + emailData.emailNumber);
        console.log('='.repeat(60));
        console.log('To:', emailData.to);
        console.log('From:', emailData.from);
        console.log('Subject:', emailData.subject);
        console.log('\nHTML Content:');
        console.log(emailData.html);
        console.log('='.repeat(60) + '\n');
    }

    stripHtml(html) {
        return html.replace(/<[^>]*>/g, '').trim();
    }

    loadTemplate(templateName, variables = {}) {
        try {
            const templatePath = path.join(this.config.templateDirectory, `${templateName}.html`);
            let template = fs.readFileSync(templatePath, 'utf8');

            // Replace variables
            Object.keys(variables).forEach(key => {
                const regex = new RegExp(`{{${key}}}`, 'g');
                template = template.replace(regex, variables[key]);
            });

            return template;
        } catch (error) {
            console.error(`Failed to load template ${templateName}:`, error.message);
            return null;
        }
    }

    // Pre-built email templates

    async sendWelcome(to, name) {
        const subject = 'Welcome to Consciousness Revolution! 🌟';
        const html = `
            <h1>Welcome, ${name}!</h1>
            <p>We're thrilled to have you join the Consciousness Revolution.</p>
            <p>Your journey to elevated awareness begins now.</p>
            <p><a href="${process.env.FRONTEND_URL}/dashboard" style="background:#007bff;color:#fff;padding:10px 20px;text-decoration:none;border-radius:5px;">Get Started</a></p>
            <p>Questions? Reply to this email anytime.</p>
            <p>With consciousness,<br>The CR Team</p>
        `;

        return await this.send(to, subject, html);
    }

    async sendPasswordReset(to, resetToken) {
        const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
        const subject = 'Reset Your Password';
        const html = `
            <h1>Password Reset Request</h1>
            <p>We received a request to reset your password.</p>
            <p>Click the link below to reset your password (valid for 1 hour):</p>
            <p><a href="${resetUrl}" style="background:#007bff;color:#fff;padding:10px 20px;text-decoration:none;border-radius:5px;">Reset Password</a></p>
            <p>If you didn't request this, please ignore this email.</p>
            <p>Best regards,<br>The CR Team</p>
        `;

        return await this.send(to, subject, html);
    }

    async sendEmailVerification(to, verificationToken) {
        const verifyUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;
        const subject = 'Verify Your Email Address';
        const html = `
            <h1>Verify Your Email</h1>
            <p>Please verify your email address to activate your account.</p>
            <p><a href="${verifyUrl}" style="background:#28a745;color:#fff;padding:10px 20px;text-decoration:none;border-radius:5px;">Verify Email</a></p>
            <p>This link will expire in 24 hours.</p>
            <p>Best regards,<br>The CR Team</p>
        `;

        return await this.send(to, subject, html);
    }

    async sendBetaInvite(to, inviteCode) {
        const inviteUrl = `${process.env.FRONTEND_URL}/beta?code=${inviteCode}`;
        const subject = 'You\'re Invited to the Beta! 🎉';
        const html = `
            <h1>Beta Access Granted!</h1>
            <p>You've been selected for exclusive early access to Consciousness Revolution.</p>
            <p>Use your personal invite code to get started:</p>
            <p style="background:#f8f9fa;padding:20px;text-align:center;font-size:24px;font-weight:bold;letter-spacing:2px;">${inviteCode}</p>
            <p><a href="${inviteUrl}" style="background:#007bff;color:#fff;padding:10px 20px;text-decoration:none;border-radius:5px;">Join Beta Now</a></p>
            <p>We can't wait to hear your feedback!</p>
            <p>With excitement,<br>The CR Team</p>
        `;

        return await this.send(to, subject, html);
    }

    async sendNotification(to, title, message, actionUrl = null, actionText = 'View Details') {
        const subject = title;
        const html = `
            <h1>${title}</h1>
            <p>${message}</p>
            ${actionUrl ? `<p><a href="${actionUrl}" style="background:#007bff;color:#fff;padding:10px 20px;text-decoration:none;border-radius:5px;">${actionText}</a></p>` : ''}
            <p>Best regards,<br>The CR Team</p>
        `;

        return await this.send(to, subject, html);
    }

    async sendErrorAlert(to, errorType, errorMessage, errorDetails = {}) {
        const subject = `🚨 System Alert: ${errorType}`;
        const html = `
            <h1 style="color:#dc3545;">System Error Alert</h1>
            <p><strong>Error Type:</strong> ${errorType}</p>
            <p><strong>Message:</strong> ${errorMessage}</p>
            <p><strong>Time:</strong> ${new Date().toISOString()}</p>
            <p><strong>Environment:</strong> ${this.config.environment}</p>
            ${Object.keys(errorDetails).length > 0 ? `<pre>${JSON.stringify(errorDetails, null, 2)}</pre>` : ''}
            <p>Please investigate immediately.</p>
        `;

        return await this.send(to, subject, html);
    }

    // Get email statistics
    getStats() {
        const last24h = this.emailLog.filter(email => {
            const emailTime = new Date(email.timestamp);
            const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
            return emailTime > dayAgo;
        });

        const sentLast24h = last24h.filter(e => e.sent).length;

        return {
            totalEmails: this.emailsSent,
            emailsLast24h: last24h.length,
            sentLast24h,
            failedLast24h: last24h.length - sentLast24h,
            recentEmails: this.emailLog.slice(-5),
            environment: this.config.environment,
            provider: this.config.provider
        };
    }

    // Get recent emails
    getRecentEmails(limit = 10) {
        return this.emailLog.slice(-limit);
    }
}

// Create singleton instance
const emailNotifier = new EmailNotifier();

// Export both the instance and the class
module.exports = emailNotifier;
module.exports.EmailNotifier = EmailNotifier;
