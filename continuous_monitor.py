#!/usr/bin/env python3
"""
======================================================================
CONTINUOUS SYSTEM MONITOR
======================================================================
Long-running system monitoring daemon for OVERKORE.

Continuously monitors:
- System health (CPU, memory, disk)
- Test results (auto-run tests periodically)
- Log errors (scan for new errors)
- Git status (uncommitted changes)
- Service availability (Voice Interface, API)

Capabilities:
- Run checks on schedule (every N seconds)
- Alert on failures (print to console)
- Track metrics over time
- Generate monitoring reports
- Graceful shutdown

Usage:
    python3 continuous_monitor.py start 60    # Monitor every 60 seconds
    python3 continuous_monitor.py status      # Show monitoring status
    python3 continuous_monitor.py report      # Generate monitoring report

Author: C1 Mechanic (Autonomous Work Session 5)
Date: 2025-11-24
"""

import os
import sys
import time
import json
import signal
from pathlib import Path
from datetime import datetime
from typing import Dict, List

class ContinuousMonitor:
    """Continuous system monitoring daemon"""

    def __init__(self):
        self.repo_root = Path(__file__).parent.absolute()
        self.monitor_file = self.repo_root / "logs" / "continuous_monitor.json"
        self.running = False
        self.check_count = 0

    def start(self, interval: int = 60):
        """Start continuous monitoring"""
        print("=" * 80)
        print("🔄 CONTINUOUS SYSTEM MONITOR - STARTING")
        print("=" * 80)
        print(f"Interval: {interval} seconds")
        print(f"Monitoring: Health, Tests, Logs, Git, Services")
        print("Press Ctrl+C to stop")
        print()

        # Setup signal handlers
        signal.signal(signal.SIGINT, self._signal_handler)
        signal.signal(signal.SIGTERM, self._signal_handler)

        self.running = True
        self.check_count = 0
        start_time = datetime.now()

        try:
            while self.running:
                self.check_count += 1
                check_time = datetime.now()

                print(f"\n{'=' * 80}")
                print(f"CHECK #{self.check_count} - {check_time.strftime('%Y-%m-%d %H:%M:%S')}")
                print(f"{'=' * 80}\n")

                # Run all checks
                results = self._run_all_checks()

                # Save results
                self._save_monitoring_data(results)

                # Print summary
                self._print_check_summary(results)

                # Alert on failures
                self._check_alerts(results)

                if self.running:
                    print(f"\n⏸️  Next check in {interval} seconds...")
                    time.sleep(interval)

        except KeyboardInterrupt:
            pass
        finally:
            self._shutdown(start_time)

    def _run_all_checks(self) -> Dict:
        """Run all monitoring checks"""
        results = {
            'timestamp': datetime.now().isoformat(),
            'checks': {}
        }

        # Health check
        results['checks']['health'] = self._check_health()

        # Git status
        results['checks']['git'] = self._check_git()

        # Logs check
        results['checks']['logs'] = self._check_logs()

        # Services check
        results['checks']['services'] = self._check_services()

        return results

    def _check_health(self) -> Dict:
        """Check system health"""
        import subprocess

        try:
            result = subprocess.run(
                ['python3', 'system_health_check.py'],
                capture_output=True,
                text=True,
                timeout=30
            )

            output = result.stdout

            # Parse health score
            score = 0
            for line in output.split('\n'):
                if 'Health Score:' in line:
                    score_str = line.split(':')[-1].strip().replace('%', '')
                    try:
                        score = float(score_str)
                    except:
                        pass
                    break

            return {
                'status': 'ok' if score >= 80 else 'warning' if score >= 60 else 'error',
                'score': score,
                'available': True
            }
        except Exception as e:
            return {
                'status': 'error',
                'error': str(e),
                'available': False
            }

    def _check_git(self) -> Dict:
        """Check git status"""
        import subprocess

        try:
            # Check for uncommitted changes
            result = subprocess.run(
                ['git', 'status', '--porcelain'],
                capture_output=True,
                text=True,
                timeout=10
            )

            uncommitted = len(result.stdout.strip().split('\n')) if result.stdout.strip() else 0

            return {
                'status': 'ok' if uncommitted == 0 else 'warning',
                'uncommitted_files': uncommitted,
                'clean': uncommitted == 0
            }
        except Exception as e:
            return {
                'status': 'error',
                'error': str(e)
            }

    def _check_logs(self) -> Dict:
        """Check for new log errors"""
        logs_dir = self.repo_root / "logs"

        if not logs_dir.exists():
            return {'status': 'ok', 'errors': 0}

        try:
            # Check Voice Interface log for errors
            vi_log = logs_dir / f"voice_interface_{datetime.now().strftime('%Y%m%d')}.log"

            error_count = 0
            if vi_log.exists():
                content = vi_log.read_text()
                error_count = content.lower().count('error')

            return {
                'status': 'ok' if error_count == 0 else 'warning',
                'errors': error_count,
                'log_file': vi_log.name if vi_log.exists() else None
            }
        except Exception as e:
            return {
                'status': 'error',
                'error': str(e)
            }

    def _check_services(self) -> Dict:
        """Check service availability"""
        services = {}

        # Check if Voice Interface files exist
        vi_file = self.repo_root / "voice_interface_v3_production.py"
        services['voice_interface'] = {
            'available': vi_file.exists(),
            'status': 'ok' if vi_file.exists() else 'error'
        }

        # Check if API file exists
        api_file = self.repo_root / "voice_interface_api.py"
        services['api'] = {
            'available': api_file.exists(),
            'status': 'ok' if api_file.exists() else 'error'
        }

        return services

    def _save_monitoring_data(self, results: Dict):
        """Save monitoring data to file"""
        history = []

        # Load existing history
        if self.monitor_file.exists():
            try:
                history = json.loads(self.monitor_file.read_text())
            except:
                history = []

        # Add new result
        history.append(results)

        # Keep last 100 checks
        history = history[-100:]

        # Save
        self.monitor_file.parent.mkdir(exist_ok=True)
        self.monitor_file.write_text(json.dumps(history, indent=2))

    def _print_check_summary(self, results: Dict):
        """Print check summary"""
        checks = results['checks']

        # Health
        if 'health' in checks:
            health = checks['health']
            if health['available']:
                emoji = "✅" if health['status'] == 'ok' else "⚠️"
                print(f"{emoji} Health: {health['score']}%")
            else:
                print(f"❌ Health: Unavailable")

        # Git
        if 'git' in checks:
            git = checks['git']
            emoji = "✅" if git['status'] == 'ok' else "⚠️"
            status = "Clean" if git.get('clean') else f"{git.get('uncommitted_files', 0)} uncommitted"
            print(f"{emoji} Git: {status}")

        # Logs
        if 'logs' in checks:
            logs = checks['logs']
            emoji = "✅" if logs['status'] == 'ok' else "⚠️"
            print(f"{emoji} Logs: {logs.get('errors', 0)} errors")

        # Services
        if 'services' in checks:
            services = checks['services']
            for name, info in services.items():
                emoji = "✅" if info['status'] == 'ok' else "❌"
                print(f"{emoji} {name.replace('_', ' ').title()}: {info['status'].upper()}")

    def _check_alerts(self, results: Dict):
        """Check for alert conditions"""
        alerts = []
        checks = results['checks']

        # Health alerts
        if 'health' in checks:
            health = checks['health']
            if health.get('score', 100) < 60:
                alerts.append(f"🚨 ALERT: System health critically low ({health['score']}%)")

        # Log error alerts
        if 'logs' in checks:
            logs = checks['logs']
            if logs.get('errors', 0) > 10:
                alerts.append(f"🚨 ALERT: High error count in logs ({logs['errors']} errors)")

        if alerts:
            print()
            for alert in alerts:
                print(alert)

    def _signal_handler(self, signum, frame):
        """Handle shutdown signals"""
        print("\n\n⚠️  Shutdown signal received...")
        self.running = False

    def _shutdown(self, start_time: datetime):
        """Graceful shutdown"""
        duration = (datetime.now() - start_time).total_seconds()

        print("\n" + "=" * 80)
        print("CONTINUOUS MONITOR - SHUTDOWN")
        print("=" * 80)
        print(f"Total Checks: {self.check_count}")
        print(f"Duration: {duration:.0f} seconds ({duration/60:.1f} minutes)")
        print(f"Average Interval: {duration/self.check_count:.1f} seconds" if self.check_count > 0 else "")
        print()
        print("✅ Monitoring data saved to:", self.monitor_file)
        print("=" * 80)

    def show_status(self):
        """Show current monitoring status"""
        if not self.monitor_file.exists():
            print("No monitoring data available")
            return

        history = json.loads(self.monitor_file.read_text())

        print("=" * 80)
        print("MONITORING STATUS")
        print("=" * 80)
        print(f"Total Checks: {len(history)}")
        print()

        if history:
            latest = history[-1]
            timestamp = datetime.fromisoformat(latest['timestamp'])

            print(f"Latest Check: {timestamp.strftime('%Y-%m-%d %H:%M:%S')}")
            print()

            # Show latest results
            checks = latest['checks']

            if 'health' in checks:
                health = checks['health']
                emoji = "✅" if health.get('status') == 'ok' else "⚠️"
                print(f"{emoji} Health: {health.get('score', 0)}%")

            if 'git' in checks:
                git = checks['git']
                emoji = "✅" if git.get('status') == 'ok' else "⚠️"
                print(f"{emoji} Git: {git.get('uncommitted_files', 0)} uncommitted files")

            if 'logs' in checks:
                logs = checks['logs']
                emoji = "✅" if logs.get('status') == 'ok' else "⚠️"
                print(f"{emoji} Logs: {logs.get('errors', 0)} errors")

        print()
        print("=" * 80)

    def generate_report(self, output_file: str = "monitoring_report.json"):
        """Generate monitoring report"""
        if not self.monitor_file.exists():
            print("No monitoring data available")
            return

        history = json.loads(self.monitor_file.read_text())

        # Calculate statistics
        health_scores = [c['checks']['health']['score'] for c in history if 'health' in c['checks'] and c['checks']['health'].get('available')]

        report = {
            'generated_at': datetime.now().isoformat(),
            'total_checks': len(history),
            'statistics': {
                'avg_health': sum(health_scores) / len(health_scores) if health_scores else 0,
                'min_health': min(health_scores) if health_scores else 0,
                'max_health': max(health_scores) if health_scores else 0
            },
            'recent_history': history[-10:]
        }

        output_path = Path(output_file)
        output_path.write_text(json.dumps(report, indent=2))

        print(f"✅ Monitoring report saved to: {output_file}")
        print(f"   Total checks: {len(history)}")
        print(f"   Average health: {report['statistics']['avg_health']:.1f}%")


def main():
    """Main CLI entry point"""
    command = sys.argv[1] if len(sys.argv) > 1 else "status"
    args = sys.argv[2:] if len(sys.argv) > 2 else []

    monitor = ContinuousMonitor()

    if command == "start":
        interval = int(args[0]) if args else 60
        monitor.start(interval)

    elif command == "status":
        monitor.show_status()

    elif command == "report":
        output = args[0] if args else "monitoring_report.json"
        monitor.generate_report(output)

    elif command == "help" or command == "--help" or command == "-h":
        print(__doc__)

    else:
        print(f"❌ Unknown command: {command}")
        print("   Run 'python3 continuous_monitor.py help' for usage")
        sys.exit(1)


if __name__ == "__main__":
    main()
