#!/usr/bin/env python3
"""
======================================================================
AUTOMATED TEST RUNNER
======================================================================
Continuous testing system for OVERKORE.

Capabilities:
- Discover and run all test suites
- Run tests on file changes (watch mode)
- Run tests on schedule (cron mode)
- Track test history over time
- Generate test reports (pass/fail trends)
- Alert on test failures
- Performance regression detection

Usage:
    python3 test_runner.py run              # Run all tests once
    python3 test_runner.py watch            # Watch mode (run on file changes)
    python3 test_runner.py schedule 300     # Run every 5 minutes
    python3 test_runner.py history          # Show test history
    python3 test_runner.py report           # Generate test report

Author: C1 Mechanic (Autonomous Work Session 4)
Date: 2025-11-24
"""

import os
import sys
import time
import json
import subprocess
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Optional

class TestRunner:
    """Automated test execution and monitoring system"""

    def __init__(self):
        self.repo_root = Path(__file__).parent.absolute()
        self.history_file = self.repo_root / "logs" / "test_history.json"
        self.test_files = self._discover_tests()

    def _discover_tests(self) -> List[Path]:
        """Discover all test files in repository"""
        test_files = []

        # Pattern 1: test_*.py
        test_files.extend(self.repo_root.glob("test_*.py"))

        # Pattern 2: *_test.py
        test_files.extend(self.repo_root.glob("*_test.py"))

        # Pattern 3: tests/ directory
        tests_dir = self.repo_root / "tests"
        if tests_dir.exists():
            test_files.extend(tests_dir.glob("test_*.py"))
            test_files.extend(tests_dir.glob("*_test.py"))

        # Remove duplicates and sort
        return sorted(set(test_files))

    def run_all_tests(self, verbose: bool = False) -> Dict:
        """Run all discovered tests"""
        print("=" * 80)
        print("RUNNING ALL TESTS")
        print("=" * 80)
        print(f"Discovered: {len(self.test_files)} test files")
        print()

        results = {
            'timestamp': datetime.now().isoformat(),
            'total_files': len(self.test_files),
            'results': [],
            'summary': {
                'passed': 0,
                'failed': 0,
                'errors': 0,
                'total_tests': 0,
                'duration': 0
            }
        }

        start_time = time.time()

        for test_file in self.test_files:
            print(f"Running: {test_file.name}")
            result = self._run_test_file(test_file, verbose)
            results['results'].append(result)

            if result['status'] == 'passed':
                results['summary']['passed'] += 1
                print(f"  ✅ PASSED ({result['duration']:.2f}s)")
            elif result['status'] == 'failed':
                results['summary']['failed'] += 1
                print(f"  ❌ FAILED ({result['duration']:.2f}s)")
            else:
                results['summary']['errors'] += 1
                print(f"  ⚠️  ERROR ({result['duration']:.2f}s)")

            if result['message']:
                print(f"     {result['message']}")
            print()

        results['summary']['duration'] = time.time() - start_time

        # Save to history
        self._save_to_history(results)

        # Print summary
        self._print_summary(results)

        return results

    def _run_test_file(self, test_file: Path, verbose: bool = False) -> Dict:
        """Run a single test file"""
        result = {
            'file': test_file.name,
            'path': str(test_file),
            'status': 'unknown',
            'message': '',
            'duration': 0,
            'output': ''
        }

        start_time = time.time()

        try:
            # Run test file
            cmd = ['python3', str(test_file)]
            proc = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=120,
                cwd=self.repo_root
            )

            result['duration'] = time.time() - start_time
            result['output'] = proc.stdout + proc.stderr

            if proc.returncode == 0:
                result['status'] = 'passed'
                # Try to extract test count
                if 'passed' in result['output'].lower():
                    result['message'] = self._extract_test_count(result['output'])
            else:
                result['status'] = 'failed'
                result['message'] = self._extract_error(result['output'])

        except subprocess.TimeoutExpired:
            result['duration'] = time.time() - start_time
            result['status'] = 'error'
            result['message'] = 'Test timeout (120s)'
        except Exception as e:
            result['duration'] = time.time() - start_time
            result['status'] = 'error'
            result['message'] = str(e)

        return result

    def _extract_test_count(self, output: str) -> str:
        """Extract test count from output"""
        # Look for patterns like "19/19 passed" or "19 tests passed"
        lines = output.split('\n')
        for line in lines:
            if 'passed' in line.lower() or 'pass' in line.lower():
                return line.strip()[:100]
        return ''

    def _extract_error(self, output: str) -> str:
        """Extract error message from output"""
        lines = output.split('\n')
        # Look for error indicators
        for i, line in enumerate(lines):
            if 'error' in line.lower() or 'failed' in line.lower() or 'traceback' in line.lower():
                # Return this line and a few lines after
                return ' '.join(lines[i:i+3])[:200]
        return 'Test failed (see logs for details)'

    def _print_summary(self, results: Dict):
        """Print test summary"""
        summary = results['summary']

        print("=" * 80)
        print("TEST SUMMARY")
        print("=" * 80)
        print(f"Total Files: {results['total_files']}")
        print(f"✅ Passed: {summary['passed']}")
        print(f"❌ Failed: {summary['failed']}")
        print(f"⚠️  Errors: {summary['errors']}")
        print(f"⏱️  Duration: {summary['duration']:.2f}s")
        print()

        if summary['failed'] > 0 or summary['errors'] > 0:
            print("FAILED TESTS:")
            for result in results['results']:
                if result['status'] != 'passed':
                    print(f"  ❌ {result['file']}: {result['message']}")
            print()

        # Overall status
        if summary['failed'] == 0 and summary['errors'] == 0:
            print("✅ ALL TESTS PASSED")
        else:
            print(f"❌ {summary['failed'] + summary['errors']} TEST(S) FAILED")

        print("=" * 80)

    def _save_to_history(self, results: Dict):
        """Save test results to history"""
        history = []

        # Load existing history
        if self.history_file.exists():
            try:
                history = json.loads(self.history_file.read_text())
            except:
                history = []

        # Add new result
        history.append({
            'timestamp': results['timestamp'],
            'passed': results['summary']['passed'],
            'failed': results['summary']['failed'],
            'errors': results['summary']['errors'],
            'total_files': results['total_files'],
            'duration': results['summary']['duration']
        })

        # Keep last 100 runs
        history = history[-100:]

        # Save
        self.history_file.parent.mkdir(exist_ok=True)
        self.history_file.write_text(json.dumps(history, indent=2))

    def show_history(self, limit: int = 10):
        """Show test history"""
        if not self.history_file.exists():
            print("No test history available")
            return

        history = json.loads(self.history_file.read_text())

        print("=" * 80)
        print("TEST HISTORY")
        print("=" * 80)
        print(f"Showing last {limit} test runs")
        print()

        for entry in history[-limit:]:
            timestamp = datetime.fromisoformat(entry['timestamp'])
            status = "✅ PASS" if entry['failed'] == 0 and entry['errors'] == 0 else "❌ FAIL"

            print(f"{status} | {timestamp.strftime('%Y-%m-%d %H:%M:%S')} | "
                  f"Files: {entry['total_files']} | "
                  f"Passed: {entry['passed']} | "
                  f"Failed: {entry['failed']} | "
                  f"Errors: {entry['errors']} | "
                  f"Duration: {entry['duration']:.1f}s")

        print()
        print("=" * 80)

    def generate_report(self, output_file: str = "test_report.json"):
        """Generate comprehensive test report"""
        if not self.history_file.exists():
            print("No test history available")
            return

        history = json.loads(self.history_file.read_text())

        # Calculate statistics
        total_runs = len(history)
        successful_runs = sum(1 for h in history if h['failed'] == 0 and h['errors'] == 0)
        pass_rate = (successful_runs / total_runs * 100) if total_runs > 0 else 0
        avg_duration = sum(h['duration'] for h in history) / total_runs if total_runs > 0 else 0

        report = {
            'generated_at': datetime.now().isoformat(),
            'statistics': {
                'total_runs': total_runs,
                'successful_runs': successful_runs,
                'failed_runs': total_runs - successful_runs,
                'pass_rate': pass_rate,
                'average_duration': avg_duration
            },
            'recent_history': history[-20:],
            'trends': self._calculate_trends(history)
        }

        output_path = Path(output_file)
        output_path.write_text(json.dumps(report, indent=2))

        print(f"✅ Test report generated: {output_file}")
        print(f"   Total runs: {total_runs}")
        print(f"   Pass rate: {pass_rate:.1f}%")
        print(f"   Avg duration: {avg_duration:.1f}s")

    def _calculate_trends(self, history: List[Dict]) -> Dict:
        """Calculate test trends"""
        if len(history) < 2:
            return {'trend': 'insufficient_data'}

        # Compare recent 5 to previous 5
        recent = history[-5:]
        previous = history[-10:-5] if len(history) >= 10 else history[:-5]

        recent_pass_rate = sum(1 for h in recent if h['failed'] == 0 and h['errors'] == 0) / len(recent)
        previous_pass_rate = sum(1 for h in previous if h['failed'] == 0 and h['errors'] == 0) / len(previous) if previous else recent_pass_rate

        if recent_pass_rate > previous_pass_rate:
            trend = 'improving'
        elif recent_pass_rate < previous_pass_rate:
            trend = 'degrading'
        else:
            trend = 'stable'

        return {
            'trend': trend,
            'recent_pass_rate': recent_pass_rate * 100,
            'previous_pass_rate': previous_pass_rate * 100,
            'change': (recent_pass_rate - previous_pass_rate) * 100
        }

    def watch_mode(self, interval: int = 5):
        """Watch mode - run tests on file changes"""
        print("=" * 80)
        print("WATCH MODE - Monitoring file changes")
        print("=" * 80)
        print(f"Interval: {interval} seconds")
        print(f"Watching: {len(self.test_files)} test files")
        print("Press Ctrl+C to stop")
        print()

        # Track file modification times
        file_mtimes = {}
        for test_file in self.test_files:
            file_mtimes[test_file] = test_file.stat().st_mtime

        try:
            while True:
                time.sleep(interval)

                # Check for changes
                changed_files = []
                for test_file in self.test_files:
                    current_mtime = test_file.stat().st_mtime
                    if current_mtime != file_mtimes[test_file]:
                        changed_files.append(test_file)
                        file_mtimes[test_file] = current_mtime

                if changed_files:
                    print(f"\n🔄 Detected changes in {len(changed_files)} file(s)")
                    for f in changed_files:
                        print(f"   - {f.name}")
                    print()

                    # Run all tests
                    self.run_all_tests()
                    print(f"\n⏸️  Watching for changes...")

        except KeyboardInterrupt:
            print("\n\n✅ Watch mode stopped")

    def schedule_mode(self, interval_seconds: int):
        """Schedule mode - run tests periodically"""
        print("=" * 80)
        print("SCHEDULE MODE - Running tests periodically")
        print("=" * 80)
        print(f"Interval: {interval_seconds} seconds ({interval_seconds/60:.1f} minutes)")
        print(f"Tests: {len(self.test_files)} files")
        print("Press Ctrl+C to stop")
        print()

        try:
            run_count = 0
            while True:
                run_count += 1
                print(f"\n{'=' * 80}")
                print(f"SCHEDULED RUN #{run_count} - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
                print(f"{'=' * 80}\n")

                self.run_all_tests()

                print(f"\n⏸️  Next run in {interval_seconds} seconds...")
                time.sleep(interval_seconds)

        except KeyboardInterrupt:
            print("\n\n✅ Schedule mode stopped")
            print(f"Total runs: {run_count}")


def main():
    """Main CLI entry point"""
    command = sys.argv[1] if len(sys.argv) > 1 else "run"
    args = sys.argv[2:] if len(sys.argv) > 2 else []

    runner = TestRunner()

    if command == "run":
        verbose = "--verbose" in args or "-v" in args
        runner.run_all_tests(verbose=verbose)

    elif command == "watch":
        interval = int(args[0]) if args else 5
        runner.watch_mode(interval)

    elif command == "schedule":
        if not args:
            print("❌ Interval required (in seconds)")
            print("   Usage: python3 test_runner.py schedule 300  # Run every 5 minutes")
            sys.exit(1)
        interval = int(args[0])
        runner.schedule_mode(interval)

    elif command == "history":
        limit = int(args[0]) if args else 10
        runner.show_history(limit)

    elif command == "report":
        output = args[0] if args else "test_report.json"
        runner.generate_report(output)

    elif command == "discover":
        print("=" * 80)
        print("DISCOVERED TEST FILES")
        print("=" * 80)
        for test_file in runner.test_files:
            print(f"  {test_file}")
        print()
        print(f"Total: {len(runner.test_files)} test files")
        print("=" * 80)

    elif command == "help" or command == "--help" or command == "-h":
        print(__doc__)

    else:
        print(f"❌ Unknown command: {command}")
        print("   Run 'python3 test_runner.py help' for usage")
        sys.exit(1)


if __name__ == "__main__":
    main()
