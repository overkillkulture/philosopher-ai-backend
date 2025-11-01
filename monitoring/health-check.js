/**
 * Production Health Monitoring System
 *
 * Monitors backend health and sends alerts
 * Built during Autonomous Work Session #2 (2025-11-01)
 */

const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

class HealthMonitor {
  constructor(config = {}) {
    this.apiUrl = config.apiUrl || 'http://localhost:3001';
    this.checkInterval = config.checkInterval || 60000; // 1 minute
    this.logFile = config.logFile || path.join(__dirname, 'health-logs.txt');
    this.isRunning = false;
    this.consecutiveFailures = 0;
    this.maxConsecutiveFailures = 3;
  }

  /**
   * Start monitoring
   */
  start() {
    if (this.isRunning) {
      console.log('⚠️  Health monitor already running');
      return;
    }

    this.isRunning = true;
    console.log(`🔍 Health monitor started (checking every ${this.checkInterval / 1000}s)`);
    this.runChecks();
  }

  /**
   * Stop monitoring
   */
  stop() {
    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
    console.log('✅ Health monitor stopped');
  }

  /**
   * Run health checks
   */
  async runChecks() {
    // Initial check
    await this.checkHealth();

    // Schedule recurring checks
    this.intervalId = setInterval(async () => {
      if (this.isRunning) {
        await this.checkHealth();
      }
    }, this.checkInterval);
  }

  /**
   * Check API health
   */
  async checkHealth() {
    const timestamp = new Date().toISOString();

    try {
      const start = Date.now();
      const response = await axios.get(`${this.apiUrl}/api/health`, {
        timeout: 5000
      });
      const responseTime = Date.now() - start;

      if (response.status === 200 && response.data.status === 'healthy') {
        this.consecutiveFailures = 0;
        await this.logSuccess(timestamp, responseTime, response.data);
        console.log(`✅ [${timestamp}] Health check passed (${responseTime}ms)`);
      } else {
        throw new Error(`Unhealthy response: ${JSON.stringify(response.data)}`);
      }

    } catch (error) {
      this.consecutiveFailures++;
      await this.logFailure(timestamp, error);
      console.error(`❌ [${timestamp}] Health check failed:`, error.message);

      if (this.consecutiveFailures >= this.maxConsecutiveFailures) {
        await this.sendAlert(error);
      }
    }
  }

  /**
   * Log successful check
   */
  async logSuccess(timestamp, responseTime, data) {
    const logEntry = {
      timestamp,
      status: 'SUCCESS',
      responseTime,
      data
    };

    await this.writeLog(logEntry);
  }

  /**
   * Log failed check
   */
  async logFailure(timestamp, error) {
    const logEntry = {
      timestamp,
      status: 'FAILURE',
      error: error.message,
      consecutiveFailures: this.consecutiveFailures
    };

    await this.writeLog(logEntry);
  }

  /**
   * Write to log file
   */
  async writeLog(logEntry) {
    try {
      const logLine = JSON.stringify(logEntry) + '\n';
      await fs.appendFile(this.logFile, logLine);
    } catch (error) {
      console.error('Failed to write log:', error.message);
    }
  }

  /**
   * Send alert (email, Slack, etc.)
   */
  async sendAlert(error) {
    console.error(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚨 CRITICAL ALERT: API HEALTH FAILURE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Consecutive failures: ${this.consecutiveFailures}
API URL: ${this.apiUrl}
Error: ${error.message}
Time: ${new Date().toISOString()}

ACTION REQUIRED: Check backend server immediately!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `);

    // TODO: Integrate with email/Slack/PagerDuty
    // Example: await sendSlackNotification(error);
    // Example: await sendEmailAlert(error);
  }

  /**
   * Get health statistics
   */
  async getStats() {
    try {
      const logs = await fs.readFile(this.logFile, 'utf-8');
      const entries = logs.trim().split('\n').map(line => JSON.parse(line));

      const total = entries.length;
      const successes = entries.filter(e => e.status === 'SUCCESS').length;
      const failures = entries.filter(e => e.status === 'FAILURE').length;
      const successRate = ((successes / total) * 100).toFixed(2);

      const avgResponseTime = entries
        .filter(e => e.responseTime)
        .reduce((sum, e) => sum + e.responseTime, 0) / successes;

      return {
        total,
        successes,
        failures,
        successRate: `${successRate}%`,
        avgResponseTime: `${avgResponseTime.toFixed(2)}ms`,
        uptime: this.isRunning ? 'Running' : 'Stopped'
      };
    } catch (error) {
      return { error: 'No logs available yet' };
    }
  }
}

// CLI Usage
if (require.main === module) {
  const monitor = new HealthMonitor({
    apiUrl: process.env.API_URL || 'http://localhost:3001',
    checkInterval: parseInt(process.env.CHECK_INTERVAL) || 60000
  });

  monitor.start();

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down health monitor...');
    monitor.stop();
    process.exit(0);
  });

  // Display stats every 5 minutes
  setInterval(async () => {
    const stats = await monitor.getStats();
    console.log('\n📊 Health Monitor Stats:', stats);
  }, 300000); // 5 minutes
}

module.exports = HealthMonitor;
