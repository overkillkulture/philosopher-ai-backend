// ================================================
// LOGGING MIDDLEWARE
// ================================================
// Request/response logging for production debugging
// C1 Mechanic - Production Enhancement
// ================================================

const logger = require('../utils/logger');

// Request logging middleware
const requestLogger = (req, res, next) => {
    const startTime = Date.now();

    // Log incoming request
    logger.logRequest(req, req.user?.id);

    // Capture response
    const originalSend = res.send;
    res.send = function (data) {
        const duration = Date.now() - startTime;
        logger.logResponse(req, res, duration);

        // Log slow requests
        if (duration > 1000) {
            logger.logPerformance(`${req.method} ${req.path}`, duration);
        }

        originalSend.call(this, data);
    };

    next();
};

// Error logging middleware (should be last)
const errorLogger = (err, req, res, next) => {
    logger.error('Request Error', {
        method: req.method,
        path: req.path,
        error: err.message,
        stack: err.stack,
        userId: req.user?.id,
        ip: req.ip
    });

    // Don't expose internal errors in production
    if (process.env.NODE_ENV === 'production') {
        res.status(500).json({
            error: 'Internal server error',
            requestId: req.id // If you're using request IDs
        });
    } else {
        res.status(500).json({
            error: err.message,
            stack: err.stack
        });
    }
};

// Security event logger
const securityLogger = (event) => (req, res, next) => {
    logger.logSecurity(event, {
        ip: req.ip,
        path: req.path,
        userAgent: req.get('user-agent'),
        userId: req.user?.id
    });
    next();
};

module.exports = {
    requestLogger,
    errorLogger,
    securityLogger
};
