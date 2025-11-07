// ================================================
// WINSTON LOGGER CONFIGURATION
// ================================================
// Comprehensive logging for production debugging
// C1 Mechanic - Production Enhancement
// ================================================

const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

// Custom format for console output
const consoleFormat = winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
        let msg = `${timestamp} [${level}]: ${message}`;
        if (Object.keys(meta).length > 0) {
            msg += `\n${JSON.stringify(meta, null, 2)}`;
        }
        return msg;
    })
);

// Custom format for file output
const fileFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
);

// Create the logger
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: fileFormat,
    defaultMeta: {
        service: 'philosopher-ai-backend',
        environment: process.env.NODE_ENV || 'development'
    },
    transports: [
        // Error log file - only errors
        new winston.transports.File({
            filename: path.join(logsDir, 'error.log'),
            level: 'error',
            maxsize: 5242880, // 5MB
            maxFiles: 5
        }),

        // Combined log file - all logs
        new winston.transports.File({
            filename: path.join(logsDir, 'combined.log'),
            maxsize: 5242880, // 5MB
            maxFiles: 5
        }),

        // Debug log file - verbose for development
        new winston.transports.File({
            filename: path.join(logsDir, 'debug.log'),
            level: 'debug',
            maxsize: 5242880, // 5MB
            maxFiles: 3
        })
    ],
    // Handle uncaught exceptions
    exceptionHandlers: [
        new winston.transports.File({
            filename: path.join(logsDir, 'exceptions.log')
        })
    ],
    // Handle unhandled promise rejections
    rejectionHandlers: [
        new winston.transports.File({
            filename: path.join(logsDir, 'rejections.log')
        })
    ]
});

// Add console output in development
if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: consoleFormat
    }));
}

// Helper methods for common logging scenarios

logger.logRequest = (req, userId = null) => {
    logger.info('HTTP Request', {
        method: req.method,
        path: req.path,
        ip: req.ip,
        userId: userId,
        userAgent: req.get('user-agent')
    });
};

logger.logResponse = (req, res, duration) => {
    logger.info('HTTP Response', {
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration: `${duration}ms`
    });
};

logger.logAuth = (event, userId, details = {}) => {
    logger.info('Auth Event', {
        event,
        userId,
        ...details
    });
};

logger.logDatabase = (operation, table, duration, error = null) => {
    if (error) {
        logger.error('Database Error', {
            operation,
            table,
            duration: `${duration}ms`,
            error: error.message,
            stack: error.stack
        });
    } else {
        logger.debug('Database Operation', {
            operation,
            table,
            duration: `${duration}ms`
        });
    }
};

logger.logAPI = (service, operation, duration, error = null) => {
    if (error) {
        logger.error('External API Error', {
            service,
            operation,
            duration: `${duration}ms`,
            error: error.message
        });
    } else {
        logger.info('External API Call', {
            service,
            operation,
            duration: `${duration}ms`
        });
    }
};

logger.logSecurity = (event, details = {}) => {
    logger.warn('Security Event', {
        event,
        ...details
    });
};

logger.logPerformance = (operation, duration, threshold = 1000) => {
    if (duration > threshold) {
        logger.warn('Slow Operation', {
            operation,
            duration: `${duration}ms`,
            threshold: `${threshold}ms`
        });
    } else {
        logger.debug('Performance', {
            operation,
            duration: `${duration}ms`
        });
    }
};

module.exports = logger;
