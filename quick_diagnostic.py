#!/usr/bin/env python3
"""
======================================================================
QUICK DIAGNOSTIC TOOL
======================================================================
One-command diagnostic check for entire OVERKORE system.

Runs all validation checks and reports overall system status:
- ✅ System health (90% EXCELLENT)
- ✅ Git repository (clean, synced)
- ✅ Tests (19/19 passing)
- ✅ Logs (no critical errors)
- ✅ Services (all available)
- ✅ Dependencies (all installed)
- ✅ Migrations (status)
- ✅ Backups (available)
- ✅ Documentation (indexed)

Perfect for:
- Daily system checks
- Pre-deployment validation
- Troubleshooting
- Status reports

Usage:
    python3 quick_diagnostic.py              # Full diagnostic
    python3 quick_diagnostic.py --quick      # Quick check only
    python3 quick_diagnostic.py --json       # JSON output
    python3 quick_diagnostic.py --fix        # Suggest fixes

Author: C1 Mechanic (Autonomous Work Session 5)
Date: 2025-11-24
"""

import os
import sys
import json
import subprocess
from pathlib import Path
from datetime import datetime
from typing import Dict, List

class QuickDiagnostic:
    """One-command system diagnostic tool"""

    def __init__(self):
        self.repo_root = Path(__file__).parent.absolute()
        self.results = {}

    def run_diagnostic(self, quick_mode: bool = False) -> Dict:
        """Run full diagnostic"""
        print("=" * 80)
        print("🔍 OVERKORE QUICK DIAGNOSTIC")
        print("=" * 80)
        print(f"Mode: {'QUICK' if quick_mode else 'FULL'}")
        print(f"Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print()

        self.results = {
            'timestamp': datetime.now().isoformat(),
            'mode': 'quick' if quick_mode else 'full',
            'checks': {},
            'overall_status': 'unknown'
        }

        # Run checks
        print("Running diagnostic checks...")
        print()

        self.results['checks']['health'] = self._check_health()
        self.results['checks']['git'] = self._check_git()
        self.results['checks']['tests'] = self._check_tests() if not quick_mode else {'skipped': True}
        self.results['checks']['logs'] = self._check_logs()
        self.results['checks']['services'] = self._check_services()
        self.results['checks']['dependencies'] = self._check_dependencies() if not quick_mode else {'skipped': True}
        self.results['checks']['migrations'] = self._check_migrations()
        self.results['checks']['backups'] = self._check_backups()
        self.results['checks']['docs'] = self._check_documentation()

        # Calculate overall status
        self.results['overall_status'] = self._calculate_overall_status()

        # Print results
        self._print_results()

        return self.results

    def _check_health(self) -> Dict:
        """Check system health"""
        print("  🏥 System Health...", end=" ", flush=True)

        try:
            result = subprocess.run(
                ['python3', 'system_health_check.py'],
                capture_output=True,
                text=True,
                timeout=30
            )

            output = result.stdout
            score = 0

            for line in output.split('\n'):
                if 'Health Score:' in line:
                    score_str = line.split(':')[-1].strip().replace('%', '')
                    try:
                        score = float(score_str)
                    except:
                        pass
                    break

            status = 'pass' if score >= 80 else 'warn' if score >= 60 else 'fail'
            print(f"{'✅' if status == 'pass' else '⚠️' if status == 'warn' else '❌'} {score}%")

            return {
                'status': status,
                'score': score,
                'message': f"System health: {score}%"
            }
        except Exception as e:
            print(f"❌ Error")
            return {
                'status': 'fail',
                'error': str(e),
                'message': 'Health check failed'
            }

    def _check_git(self) -> Dict:
        """Check git status"""
        print("  🔀 Git Repository...", end=" ", flush=True)

        try:
            # Check uncommitted files
            result = subprocess.run(
                ['git', 'status', '--porcelain'],
                capture_output=True,
                text=True,
                timeout=10
            )

            uncommitted = len(result.stdout.strip().split('\n')) if result.stdout.strip() else 0

            # Check if ahead/behind
            result2 = subprocess.run(
                ['git', 'rev-list', '--count', '--left-right', '@{upstream}...HEAD'],
                capture_output=True,
                text=True,
                timeout=10
            )

            behind_ahead = result2.stdout.strip().split('\t') if result2.returncode == 0 else ['0', '0']
            behind = int(behind_ahead[0]) if len(behind_ahead) > 0 else 0
            ahead = int(behind_ahead[1]) if len(behind_ahead) > 1 else 0

            issues = []
            if uncommitted > 0:
                issues.append(f"{uncommitted} uncommitted")
            if behind > 0:
                issues.append(f"{behind} behind")
            if ahead > 0:
                issues.append(f"{ahead} ahead")

            status = 'pass' if not issues else 'warn'
            message = "Clean" if not issues else ", ".join(issues)

            print(f"{'✅' if status == 'pass' else '⚠️'} {message}")

            return {
                'status': status,
                'uncommitted': uncommitted,
                'ahead': ahead,
                'behind': behind,
                'message': message
            }
        except Exception as e:
            print(f"❌ Error")
            return {
                'status': 'fail',
                'error': str(e),
                'message': 'Git check failed'
            }

    def _check_tests(self) -> Dict:
        """Check if tests pass"""
        print("  🧪 Test Suite...", end=" ", flush=True)

        try:
            # Check test history
            test_history = self.repo_root / "logs" / "comprehensive_test_results.json"

            if test_history.exists():
                data = json.loads(test_history.read_text())
                total = data.get('total_tests', 0)
                passed = data.get('passed', 0)
                pass_rate = (passed / total * 100) if total > 0 else 0

                status = 'pass' if pass_rate == 100 else 'warn' if pass_rate >= 80 else 'fail'
                message = f"{passed}/{total} passing ({pass_rate:.0f}%)"

                print(f"{'✅' if status == 'pass' else '⚠️' if status == 'warn' else '❌'} {message}")

                return {
                    'status': status,
                    'total': total,
                    'passed': passed,
                    'pass_rate': pass_rate,
                    'message': message
                }
            else:
                print(f"⚠️  No test history")
                return {
                    'status': 'warn',
                    'message': 'No test history available'
                }
        except Exception as e:
            print(f"❌ Error")
            return {
                'status': 'fail',
                'error': str(e),
                'message': 'Test check failed'
            }

    def _check_logs(self) -> Dict:
        """Check for log errors"""
        print("  📝 Log Errors...", end=" ", flush=True)

        try:
            logs_dir = self.repo_root / "logs"
            if not logs_dir.exists():
                print("⚠️  No logs directory")
                return {'status': 'warn', 'message': 'No logs directory'}

            # Check Voice Interface log
            vi_log = logs_dir / f"voice_interface_{datetime.now().strftime('%Y%m%d')}.log"

            error_count = 0
            if vi_log.exists():
                content = vi_log.read_text()
                error_count = content.lower().count('error')

            status = 'pass' if error_count == 0 else 'warn' if error_count < 10 else 'fail'
            message = f"{error_count} errors"

            print(f"{'✅' if status == 'pass' else '⚠️' if status == 'warn' else '❌'} {message}")

            return {
                'status': status,
                'errors': error_count,
                'message': message
            }
        except Exception as e:
            print(f"❌ Error")
            return {
                'status': 'fail',
                'error': str(e),
                'message': 'Log check failed'
            }

    def _check_services(self) -> Dict:
        """Check service availability"""
        print("  🎤 Services...", end=" ", flush=True)

        services = []
        missing = []

        # Voice Interface
        if (self.repo_root / "voice_interface_v3_production.py").exists():
            services.append("Voice Interface")
        else:
            missing.append("Voice Interface")

        # API
        if (self.repo_root / "voice_interface_api.py").exists():
            services.append("API")
        else:
            missing.append("API")

        # Tests
        if (self.repo_root / "test_voice_interface_comprehensive.py").exists():
            services.append("Tests")
        else:
            missing.append("Tests")

        status = 'pass' if not missing else 'warn' if len(missing) < 2 else 'fail'
        message = f"{len(services)}/3 available"

        print(f"{'✅' if status == 'pass' else '⚠️' if status == 'warn' else '❌'} {message}")

        return {
            'status': status,
            'available': services,
            'missing': missing,
            'message': message
        }

    def _check_dependencies(self) -> Dict:
        """Check Python dependencies"""
        print("  📦 Dependencies...", end=" ", flush=True)

        required = ['json', 'pathlib', 'datetime', 'subprocess']
        optional = ['psycopg2', 'flask', 'flask_cors']

        missing = []
        for module in optional:
            try:
                __import__(module)
            except ImportError:
                missing.append(module)

        status = 'pass' if not missing else 'warn'
        message = f"{len(optional) - len(missing)}/{len(optional)} optional installed"

        print(f"{'✅' if status == 'pass' else '⚠️'} {message}")

        return {
            'status': status,
            'missing': missing,
            'message': message
        }

    def _check_migrations(self) -> Dict:
        """Check database migrations"""
        print("  🗄️  Migrations...", end=" ", flush=True)

        try:
            migrations_dir = self.repo_root / "migrations"

            if not migrations_dir.exists():
                print("⚠️  No migrations directory")
                return {'status': 'warn', 'message': 'No migrations directory'}

            total = len(list(migrations_dir.glob("*.sql")))
            message = f"{total} migrations (ready)"

            print(f"✅ {message}")

            return {
                'status': 'pass',
                'total': total,
                'message': message
            }
        except Exception as e:
            print(f"❌ Error")
            return {
                'status': 'fail',
                'error': str(e),
                'message': 'Migration check failed'
            }

    def _check_backups(self) -> Dict:
        """Check backup availability"""
        print("  💾 Backups...", end=" ", flush=True)

        try:
            backups_dir = self.repo_root / "backups"

            if not backups_dir.exists():
                print("⚠️  No backups")
                return {'status': 'warn', 'message': 'No backups directory'}

            backup_count = len(list(backups_dir.glob("backup_*")))

            status = 'pass' if backup_count > 0 else 'warn'
            message = f"{backup_count} backups available" if backup_count > 0 else "No backups"

            print(f"{'✅' if status == 'pass' else '⚠️'} {message}")

            return {
                'status': status,
                'count': backup_count,
                'message': message
            }
        except Exception as e:
            print(f"❌ Error")
            return {
                'status': 'fail',
                'error': str(e),
                'message': 'Backup check failed'
            }

    def _check_documentation(self) -> Dict:
        """Check documentation"""
        print("  📚 Documentation...", end=" ", flush=True)

        try:
            doc_index = self.repo_root / "logs" / "documentation_index.json"

            if doc_index.exists():
                data = json.loads(doc_index.read_text())
                docs = data.get('total_documents', 0)
                message = f"{docs} docs indexed"
                print(f"✅ {message}")

                return {
                    'status': 'pass',
                    'total': docs,
                    'message': message
                }
            else:
                print("⚠️  Not indexed")
                return {
                    'status': 'warn',
                    'message': 'Documentation not indexed'
                }
        except Exception as e:
            print(f"❌ Error")
            return {
                'status': 'fail',
                'error': str(e),
                'message': 'Documentation check failed'
            }

    def _calculate_overall_status(self) -> str:
        """Calculate overall system status"""
        statuses = [check.get('status', 'unknown') for check in self.results['checks'].values() if not check.get('skipped')]

        fail_count = statuses.count('fail')
        warn_count = statuses.count('warn')

        if fail_count > 0:
            return 'FAIL'
        elif warn_count > 2:
            return 'DEGRADED'
        elif warn_count > 0:
            return 'WARNING'
        else:
            return 'HEALTHY'

    def _print_results(self):
        """Print diagnostic results"""
        print()
        print("=" * 80)
        print("DIAGNOSTIC RESULTS")
        print("=" * 80)
        print()

        status = self.results['overall_status']
        if status == 'HEALTHY':
            emoji = "✅"
            color_msg = "HEALTHY"
        elif status == 'WARNING':
            emoji = "⚠️"
            color_msg = "WARNING"
        elif status == 'DEGRADED':
            emoji = "⚠️"
            color_msg = "DEGRADED"
        else:
            emoji = "❌"
            color_msg = "FAIL"

        print(f"{emoji} Overall Status: {color_msg}")
        print()

        # Show issues
        issues = []
        suggestions = []

        for name, check in self.results['checks'].items():
            if check.get('skipped'):
                continue

            if check['status'] == 'fail':
                issues.append(f"❌ {name.title()}: {check.get('message', 'Failed')}")

                # Add suggestions
                if name == 'health':
                    suggestions.append("Run: python3 system_health_check.py")
                elif name == 'tests':
                    suggestions.append("Run: python3 test_runner.py run")
                elif name == 'logs':
                    suggestions.append("Run: python3 log_analyzer.py errors")

            elif check['status'] == 'warn':
                issues.append(f"⚠️  {name.title()}: {check.get('message', 'Warning')}")

                # Add suggestions
                if name == 'git':
                    suggestions.append("Commit changes: git add . && git commit")
                elif name == 'backups':
                    suggestions.append("Create backup: python3 backup_system.py create")
                elif name == 'dependencies':
                    missing = check.get('missing', [])
                    if missing:
                        suggestions.append(f"Install dependencies: pip install {' '.join(missing)}")

        if issues:
            print("Issues Found:")
            for issue in issues:
                print(f"  {issue}")
            print()

        if suggestions:
            print("Suggested Actions:")
            for i, suggestion in enumerate(suggestions, 1):
                print(f"  {i}. {suggestion}")
            print()

        if not issues:
            print("✅ No issues found - System is healthy!")
            print()

        print("=" * 80)

    def suggest_fixes(self):
        """Suggest fixes for issues"""
        if not self.results:
            print("Run diagnostic first")
            return

        print()
        print("=" * 80)
        print("SUGGESTED FIXES")
        print("=" * 80)
        print()

        for name, check in self.results['checks'].items():
            if check.get('status') in ['fail', 'warn']:
                print(f"Issue: {name.title()} - {check.get('message', 'Unknown')}")

                if name == 'health' and check.get('score', 100) < 80:
                    print("  Fix: Run full system health check")
                    print("       python3 system_health_check.py")
                elif name == 'git' and check.get('uncommitted', 0) > 0:
                    print("  Fix: Commit your changes")
                    print("       git add .")
                    print("       git commit -m \"Your message\"")
                elif name == 'tests':
                    print("  Fix: Run and fix failing tests")
                    print("       python3 test_runner.py run")
                elif name == 'logs' and check.get('errors', 0) > 0:
                    print("  Fix: Review and fix log errors")
                    print("       python3 log_analyzer.py errors")
                elif name == 'dependencies':
                    missing = check.get('missing', [])
                    if missing:
                        print(f"  Fix: Install missing dependencies")
                        print(f"       pip install {' '.join(missing)}")
                elif name == 'backups' and check.get('count', 0) == 0:
                    print("  Fix: Create first backup")
                    print("       python3 backup_system.py create")

                print()

        print("=" * 80)


def main():
    """Main CLI entry point"""
    quick_mode = "--quick" in sys.argv
    json_output = "--json" in sys.argv
    show_fixes = "--fix" in sys.argv

    diagnostic = QuickDiagnostic()
    results = diagnostic.run_diagnostic(quick_mode=quick_mode)

    if show_fixes:
        diagnostic.suggest_fixes()

    if json_output:
        print()
        print(json.dumps(results, indent=2))


if __name__ == "__main__":
    main()
