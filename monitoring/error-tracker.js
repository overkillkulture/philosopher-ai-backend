/**
 * Error Tracking Middleware
 *
 * Captures and logs all errors for analysis
 * Built during Autonomous Work Session #2 (2025-11-01)
 */

const fs = require('fs').promises;
const path = require('path');

class ErrorTracker {
  constructor(options = {}) {
    this.logDir = options.logDir || path.join(__dirname, 'error-logs');
    this.maxLogSize = options.maxLogSize || 10 * 1024 * 1024; // 10MB
    this.enableConsole = options.enableConsole !== false;
    this.enableFile = options.enableFile !== false;

    this.ensureLogDir();
  }

  /**
   * Ensure log directory exists
   */
  async ensureLogDir() {
    try {
      await fs.mkdir(this.logDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create log directory:', error);
    }
  }

  /**
   * Express middleware for error tracking
   */
  middleware() {
    return (err, req, res, next) => {
      this.logError(err, {
        method: req.method,
        url: req.url,
        ip: req.ip,
        userAgent: req.get('user-agent'),
        body: req.body,
        query: req.query,
        params: req.params
      });

      // Send error response
      const statusCode = err.statusCode || 500;
      res.status(statusCode).json({
        error: process.env.NODE_ENV === 'production'
          ? 'Internal server error'
          : err.message,
        ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
      });
    };
  }

  /**
   * Log error
   */
  async logError(error, context = {}) {
    const errorEntry = {
      timestamp: new Date().toISOString(),
      message: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code,
      context,
      severity: this.getSeverity(error)
    };

    // Console logging
    if (this.enableConsole) {
      this.logToConsole(errorEntry);
    }

    // File logging
    if (this.enableFile) {
      await this.logToFile(errorEntry);
    }

    // Send to external service (Sentry, etc.)
    // await this.sendToExternalService(errorEntry);
  }

  /**
   * Determine error severity
   */
  getSeverity(error) {
    if (error.statusCode >= 500) return 'CRITICAL';
    if (error.statusCode >= 400) return 'WARNING';
    return 'INFO';
  }

  /**
   * Log to console with formatting
   */
  logToConsole(errorEntry) {
    const severityColors = {
      CRITICAL: '\x1b[31m', // Red
      WARNING: '\x1b[33m',  // Yellow
      INFO: '\x1b[36m'      // Cyan
    };
    const reset = '\x1b[0m';
    const color = severityColors[errorEntry.severity] || reset;

    console.error(`
${color}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔴 ERROR ${errorEntry.severity}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${reset}
Time: ${errorEntry.timestamp}
Message: ${errorEntry.message}
${errorEntry.context.method ? `Request: ${errorEntry.context.method} ${errorEntry.context.url}` : ''}
${errorEntry.stack}
${color}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${reset}
    `);
  }

  /**
   * Log to file
   */
  async logToFile(errorEntry) {
    try {
      const date = new Date().toISOString().split('T')[0];
      const logFile = path.join(this.logDir, `errors-${date}.log`);

      const logLine = JSON.stringify(errorEntry) + '\n';
      await fs.appendFile(logFile, logLine);

      // Rotate logs if needed
      await this.rotateLogs(logFile);
    } catch (error) {
      console.error('Failed to write error log:', error);
    }
  }

  /**
   * Rotate logs if they get too large
   */
  async rotateLogs(logFile) {
    try {
      const stats = await fs.stat(logFile);

      if (stats.size > this.maxLogSize) {
        const timestamp = Date.now();
        const rotatedFile = logFile.replace('.log', `.${timestamp}.log`);
        await fs.rename(logFile, rotatedFile);
        console.log(`📦 Rotated log file: ${rotatedFile}`);
      }
    } catch (error) {
      // File might not exist yet
    }
  }

  /**
   * Get error statistics
   */
  async getStats(days = 7) {
    try {
      const errors = [];
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Read all log files from the past N days
      const files = await fs.readdir(this.logDir);

      for (const file of files) {
        if (file.endsWith('.log')) {
          const content = await fs.readFile(path.join(this.logDir, file), 'utf-8');
          const entries = content.trim().split('\n').map(line => {
            try {
              return JSON.parse(line);
            } catch {
              return null;
            }
          }).filter(Boolean);

          errors.push(...entries);
        }
      }

      // Filter by date
      const recentErrors = errors.filter(e => new Date(e.timestamp) >= startDate);

      // Calculate stats
      const total = recentErrors.length;
      const bySeverity = recentErrors.reduce((acc, e) => {
        acc[e.severity] = (acc[e.severity] || 0) + 1;
        return acc;
      }, {});

      const byEndpoint = recentErrors.reduce((acc, e) => {
        const endpoint = e.context?.url || 'Unknown';
        acc[endpoint] = (acc[endpoint] || 0) + 1;
        return acc;
      }, {});

      return {
        totalErrors: total,
        bySeverity,
        byEndpoint,
        dateRange: `${startDate.toISOString().split('T')[0]} to ${new Date().toISOString().split('T')[0]}`
      };
    } catch (error) {
      return { error: 'Failed to calculate stats' };
    }
  }
}

module.exports = ErrorTracker;
