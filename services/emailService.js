// ================================================================
// EMAIL SERVICE - SendGrid Integration with HTML Templates
// ================================================================
// Handles: Welcome, password reset, payments, subscriptions
// Author: C1 (Mechanic) - Autonomous Work
// Date: 2025-11-24
// ================================================================

const sgMail = require('@sendgrid/mail');
const fs = require('fs').promises;
const path = require('path');

// ================================================================
// CONFIGURATION
// ================================================================

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@consciousnessrevolution.io';
const FROM_NAME = process.env.FROM_NAME || 'OVERKORE';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// Initialize SendGrid if API key is available
if (SENDGRID_API_KEY) {
    sgMail.setApiKey(SENDGRID_API_KEY);
    console.log('✅ SendGrid email service initialized');
} else {
    console.warn('⚠️  SENDGRID_API_KEY not set - emails will be logged only');
}

// ================================================================
// TEMPLATE ENGINE (Simple Mustache-like replacement)
// ================================================================

/**
 * Render template with variables
 * @param {string} template - HTML template string
 * @param {Object} variables - Variables to replace
 * @returns {string} - Rendered HTML
 */
function renderTemplate(template, variables) {
    let rendered = template;

    // Simple variable replacement {{variableName}}
    for (const [key, value] of Object.entries(variables)) {
        const regex = new RegExp(`{{${key}}}`, 'g');
        rendered = rendered.replace(regex, value || '');
    }

    // Handle missing variables (remove unrendered tags)
    rendered = rendered.replace(/{{[^}]+}}/g, '');

    return rendered;
}

/**
 * Load HTML template from file
 * @param {string} templateName - Template filename (without extension)
 * @returns {Promise<string>} - Template content
 */
async function loadTemplate(templateName) {
    try {
        const templatePath = path.join(__dirname, '..', 'templates', 'email', `${templateName}.html`);
        const template = await fs.readFile(templatePath, 'utf8');
        return template;
    } catch (error) {
        console.error(`❌ Failed to load template ${templateName}:`, error.message);
        throw new Error(`Template ${templateName} not found`);
    }
}

// ================================================================
// CORE EMAIL FUNCTION
// ================================================================

/**
 * Send email via SendGrid
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.html - HTML content
 * @param {string} options.text - Plain text content (fallback)
 */
async function sendEmail({ to, subject, html, text }) {
    try {
        // If SendGrid is not configured, log the email instead
        if (!SENDGRID_API_KEY) {
            console.log('📧 EMAIL (not sent - no API key):', {
                to,
                subject,
                preview: text ? text.substring(0, 100) + '...' : 'See HTML content'
            });
            return { success: true, mode: 'logged' };
        }

        const msg = {
            to,
            from: {
                email: FROM_EMAIL,
                name: FROM_NAME
            },
            subject,
            html,
            text: text || html.replace(/<[^>]*>/g, '') // Strip HTML for text version
        };

        await sgMail.send(msg);
        console.log(`✅ Email sent to ${to}: ${subject}`);
        return { success: true, mode: 'sent' };

    } catch (error) {
        console.error('❌ Email send failed:', error.message);
        if (error.response) {
            console.error('SendGrid error:', error.response.body);
        }
        return { success: false, error: error.message };
    }
}

// ================================================================
// WELCOME EMAIL
// ================================================================

/**
 * Send welcome email after successful registration
 * @param {string} email - User email
 * @param {string} userName - User's name
 */
async function sendWelcomeEmail(email, userName = 'there') {
    try {
        const template = await loadTemplate('welcome');

        const html = renderTemplate(template, {
            userName: userName,
            dashboardUrl: `${FRONTEND_URL}/dashboard`,
            pricingUrl: `${FRONTEND_URL}/pricing`,
            helpUrl: `${FRONTEND_URL}/help`,
            unsubscribeUrl: `${FRONTEND_URL}/unsubscribe`
        });

        return sendEmail({
            to: email,
            subject: '🔺 Welcome to OVERKORE - The Consciousness Revolution',
            html
        });
    } catch (error) {
        console.error('Failed to send welcome email:', error);
        return { success: false, error: error.message };
    }
}

// ================================================================
// PASSWORD RESET EMAIL
// ================================================================

/**
 * Send password reset email
 * @param {string} email - User email
 * @param {string} resetToken - Password reset token
 * @param {string} userName - User's name (optional)
 */
async function sendPasswordResetEmail(email, resetToken, userName = 'there') {
    try {
        const template = await loadTemplate('password-reset');

        const resetUrl = `${FRONTEND_URL}/reset-password?token=${resetToken}`;

        const html = renderTemplate(template, {
            userName: userName,
            resetUrl: resetUrl,
            dashboardUrl: `${FRONTEND_URL}/dashboard`,
            helpUrl: `${FRONTEND_URL}/help`,
            supportUrl: `${FRONTEND_URL}/support`
        });

        return sendEmail({
            to: email,
            subject: '🔑 Reset Your Password - OVERKORE',
            html
        });
    } catch (error) {
        console.error('Failed to send password reset email:', error);
        return { success: false, error: error.message };
    }
}

// ================================================================
// PAYMENT CONFIRMATION EMAIL
// ================================================================

/**
 * Send payment confirmation email
 * @param {string} email - User email
 * @param {string} userName - User's name
 * @param {Object} paymentInfo - Payment details
 * @param {string} paymentInfo.planName - Plan name (Pro, Enterprise)
 * @param {number} paymentInfo.amount - Amount paid
 * @param {string} paymentInfo.last4 - Last 4 digits of card
 * @param {string} paymentInfo.nextBillingDate - Next billing date
 * @param {string} paymentInfo.invoiceId - Invoice ID
 * @param {string} paymentInfo.paymentDate - Payment date
 * @param {Array<string>} paymentInfo.features - List of features
 */
async function sendPaymentConfirmationEmail(email, userName, paymentInfo) {
    try {
        const template = await loadTemplate('payment-confirmation');

        const html = renderTemplate(template, {
            userName: userName,
            planName: paymentInfo.planName,
            amount: paymentInfo.amount,
            last4: paymentInfo.last4 || '****',
            nextBillingDate: paymentInfo.nextBillingDate,
            invoiceId: paymentInfo.invoiceId,
            paymentDate: paymentInfo.paymentDate,
            dashboardUrl: `${FRONTEND_URL}/dashboard`,
            billingPortalUrl: `${FRONTEND_URL}/billing`,
            supportUrl: `${FRONTEND_URL}/support`
        });

        return sendEmail({
            to: email,
            subject: '💳 Payment Confirmed - OVERKORE',
            html
        });
    } catch (error) {
        console.error('Failed to send payment confirmation email:', error);
        return { success: false, error: error.message };
    }
}

// ================================================================
// SUBSCRIPTION UPGRADED EMAIL
// ================================================================

/**
 * Send subscription upgraded email
 * @param {string} email - User email
 * @param {string} userName - User's name
 * @param {Object} subscriptionInfo - Subscription details
 * @param {string} subscriptionInfo.planName - New plan name
 * @param {number} subscriptionInfo.newAmount - New monthly amount
 * @param {string} subscriptionInfo.nextBillingDate - Next billing date
 */
async function sendSubscriptionUpgradedEmail(email, userName, subscriptionInfo) {
    try {
        const template = await loadTemplate('subscription-upgraded');

        const html = renderTemplate(template, {
            userName: userName,
            planName: subscriptionInfo.planName,
            newAmount: subscriptionInfo.newAmount,
            nextBillingDate: subscriptionInfo.nextBillingDate,
            dashboardUrl: `${FRONTEND_URL}/dashboard`,
            billingPortalUrl: `${FRONTEND_URL}/billing`,
            supportUrl: `${FRONTEND_URL}/support`
        });

        return sendEmail({
            to: email,
            subject: '🎊 Subscription Upgraded - OVERKORE',
            html
        });
    } catch (error) {
        console.error('Failed to send subscription upgraded email:', error);
        return { success: false, error: error.message };
    }
}

// ================================================================
// SUBSCRIPTION CANCELED EMAIL
// ================================================================

/**
 * Send subscription canceled email
 * @param {string} email - User email
 * @param {string} userName - User's name
 * @param {Object} cancellationInfo - Cancellation details
 * @param {string} cancellationInfo.planName - Canceled plan name
 * @param {string} cancellationInfo.expirationDate - When subscription expires
 */
async function sendSubscriptionCanceledEmail(email, userName, cancellationInfo) {
    try {
        const template = await loadTemplate('subscription-canceled');

        const html = renderTemplate(template, {
            userName: userName,
            planName: cancellationInfo.planName,
            expirationDate: cancellationInfo.expirationDate,
            dashboardUrl: `${FRONTEND_URL}/dashboard`,
            supportUrl: `${FRONTEND_URL}/support`,
            pricingUrl: `${FRONTEND_URL}/pricing`,
            feedbackUrl: `${FRONTEND_URL}/feedback`,
            reactivateUrl: `${FRONTEND_URL}/pricing`
        });

        return sendEmail({
            to: email,
            subject: 'Subscription Canceled - OVERKORE',
            html
        });
    } catch (error) {
        console.error('Failed to send subscription canceled email:', error);
        return { success: false, error: error.message };
    }
}

// ================================================================
// EMAIL VERIFICATION (Legacy - keeping for backwards compatibility)
// ================================================================

/**
 * Send email verification email
 * @param {string} email - User email
 * @param {string} verificationToken - Email verification token
 * @param {string} userName - User's name (optional)
 */
async function sendEmailVerification(email, verificationToken, userName = 'there') {
    const verifyUrl = `${FRONTEND_URL}/verify-email?token=${verificationToken}`;

    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verify Your Email</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <tr>
                        <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 28px;">Verify Your Email</h1>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 40px 30px;">
                            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                                Hi ${userName},
                            </p>
                            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                                Thanks for signing up for OVERKORE! Please verify your email address to activate your account:
                            </p>
                            <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                                <tr>
                                    <td align="center">
                                        <a href="${verifyUrl}" style="display: inline-block; padding: 14px 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: bold;">
                                            Verify Email Address
                                        </a>
                                    </td>
                                </tr>
                            </table>
                            <p style="color: #666666; font-size: 14px; line-height: 1.6; margin: 20px 0 0 0;">
                                This link will expire in 24 hours.
                            </p>
                        </td>
                    </tr>
                    <tr>
                        <td style="background-color: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #e9ecef;">
                            <p style="color: #999999; font-size: 12px; margin: 0;">
                                © ${new Date().getFullYear()} OVERKORE. All rights reserved.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    `;

    return sendEmail({
        to: email,
        subject: 'Verify Your Email - OVERKORE',
        html
    });
}

// ================================================================
// EXPORTS
// ================================================================

module.exports = {
    // Core
    sendEmail,
    loadTemplate,
    renderTemplate,

    // User onboarding
    sendWelcomeEmail,
    sendEmailVerification,
    sendPasswordResetEmail,

    // Payments & Subscriptions
    sendPaymentConfirmationEmail,
    sendSubscriptionUpgradedEmail,
    sendSubscriptionCanceledEmail
};
