/**
 * ERROR TRACKING & LOGGING SYSTEM
 *
 * Centralized error tracking with support for multiple services
 *
 * Supported Services:
 * - Sentry (production error tracking)
 * - Local file logging
 * - Console logging (development)
 *
 * Usage:
 *   const errorTracker = require('./utils/error-tracker');
 *   errorTracker.captureError(error, { user: userId, context: 'login' });
 */

const fs = require('fs');
const path = require('path');

class ErrorTracker {
    constructor(config = {}) {
        this.config = {
            environment: process.env.NODE_ENV || 'development',
            logDirectory: config.logDirectory || path.join(__dirname, '..', 'logs'),
            enableSentry: config.enableSentry !== false,
            enableFileLogging: config.enableFileLogging !== false,
            enableConsoleLogging: config.enableConsoleLogging !== false,
            sentryDSN: process.env.SENTRY_DSN || null,
            ...config
        };

        this.errorCount = 0;
        this.errorLog = [];

        // Initialize Sentry if configured
        if (this.config.enableSentry && this.config.sentryDSN) {
            this.initializeSentry();
        }

        // Ensure log directory exists
        if (this.config.enableFileLogging) {
            this.ensureLogDirectory();
        }

        // Set up global error handlers
        this.setupGlobalHandlers();
    }

    initializeSentry() {
        try {
            const Sentry = require('@sentry/node');
            Sentry.init({
                dsn: this.config.sentryDSN,
                environment: this.config.environment,
                tracesSampleRate: this.config.environment === 'production' ? 0.1 : 1.0,
            });
            this.sentry = Sentry;
            console.log('✅ Sentry initialized');
        } catch (error) {
            console.warn('⚠️  Sentry not available:', error.message);
            this.sentry = null;
        }
    }

    ensureLogDirectory() {
        if (!fs.existsSync(this.config.logDirectory)) {
            fs.mkdirSync(this.config.logDirectory, { recursive: true });
        }
    }

    setupGlobalHandlers() {
        // Catch unhandled promise rejections
        process.on('unhandledRejection', (reason, promise) => {
            this.captureError(reason, {
                type: 'UnhandledRejection',
                promise: promise.toString()
            });
        });

        // Catch uncaught exceptions
        process.on('uncaughtException', (error) => {
            this.captureError(error, {
                type: 'UncaughtException',
                fatal: true
            });

            // Give time to log before crashing
            setTimeout(() => {
                process.exit(1);
            }, 1000);
        });
    }

    captureError(error, context = {}) {
        this.errorCount++;

        const errorData = {
            timestamp: new Date().toISOString(),
            message: error.message || error,
            stack: error.stack || '',
            type: error.name || 'Error',
            context: context,
            environment: this.config.environment,
            errorNumber: this.errorCount
        };

        // Store in memory (limited to last 100)
        this.errorLog.push(errorData);
        if (this.errorLog.length > 100) {
            this.errorLog.shift();
        }

        // Log to console
        if (this.config.enableConsoleLogging) {
            this.logToConsole(errorData);
        }

        // Log to file
        if (this.config.enableFileLogging) {
            this.logToFile(errorData);
        }

        // Send to Sentry
        if (this.sentry && this.config.enableSentry) {
            this.sendToSentry(error, context);
        }

        return errorData;
    }

    logToConsole(errorData) {
        console.error('\n' + '='.repeat(60));
        console.error('🔴 ERROR #' + errorData.errorNumber);
        console.error('='.repeat(60));
        console.error('Time:', errorData.timestamp);
        console.error('Type:', errorData.type);
        console.error('Message:', errorData.message);
        if (Object.keys(errorData.context).length > 0) {
            console.error('Context:', JSON.stringify(errorData.context, null, 2));
        }
        if (errorData.stack) {
            console.error('\nStack Trace:');
            console.error(errorData.stack);
        }
        console.error('='.repeat(60) + '\n');
    }

    logToFile(errorData) {
        try {
            const date = new Date().toISOString().split('T')[0];
            const logFile = path.join(this.config.logDirectory, `errors-${date}.log`);

            const logEntry = JSON.stringify(errorData) + '\n';
            fs.appendFileSync(logFile, logEntry);
        } catch (error) {
            console.error('Failed to write error log to file:', error.message);
        }
    }

    sendToSentry(error, context) {
        try {
            this.sentry.captureException(error, {
                contexts: { custom: context },
                level: context.fatal ? 'fatal' : 'error'
            });
        } catch (error) {
            console.error('Failed to send error to Sentry:', error.message);
        }
    }

    // Express middleware for error handling
    middleware() {
        return (err, req, res, next) => {
            this.captureError(err, {
                url: req.url,
                method: req.method,
                user: req.user?.id,
                ip: req.ip,
                userAgent: req.get('user-agent')
            });

            // Send error response
            const statusCode = err.statusCode || 500;
            res.status(statusCode).json({
                success: false,
                error: this.config.environment === 'production'
                    ? 'An error occurred'
                    : err.message,
                errorId: this.errorCount
            });
        };
    }

    // Get recent errors
    getRecentErrors(limit = 10) {
        return this.errorLog.slice(-limit);
    }

    // Get error statistics
    getStats() {
        const last24h = this.errorLog.filter(err => {
            const errorTime = new Date(err.timestamp);
            const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
            return errorTime > dayAgo;
        });

        return {
            totalErrors: this.errorCount,
            errorsLast24h: last24h.length,
            recentErrors: this.errorLog.slice(-5),
            environment: this.config.environment
        };
    }

    // Clear old error logs (call periodically)
    cleanupOldLogs(daysToKeep = 30) {
        try {
            const files = fs.readdirSync(this.config.logDirectory);
            const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);

            files.forEach(file => {
                if (file.startsWith('errors-') && file.endsWith('.log')) {
                    const filePath = path.join(this.config.logDirectory, file);
                    const stats = fs.statSync(filePath);

                    if (stats.mtime < cutoffDate) {
                        fs.unlinkSync(filePath);
                        console.log(`Deleted old log file: ${file}`);
                    }
                }
            });
        } catch (error) {
            console.error('Failed to cleanup old logs:', error.message);
        }
    }
}

// Create singleton instance
const errorTracker = new ErrorTracker();

// Export both the instance and the class
module.exports = errorTracker;
module.exports.ErrorTracker = ErrorTracker;
