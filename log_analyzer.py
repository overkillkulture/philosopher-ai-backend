#!/usr/bin/env python3
"""
======================================================================
LOG ANALYSIS TOOL
======================================================================
Automated log aggregation, analysis, and error detection for OVERKORE.

Capabilities:
- Aggregate logs from multiple sources
- Detect errors, warnings, and anomalies
- Track error frequency and patterns
- Generate log summaries and reports
- Search logs by keyword or pattern
- Export analysis results

Usage:
    python3 log_analyzer.py analyze          # Analyze all logs
    python3 log_analyzer.py errors           # Show errors only
    python3 log_analyzer.py search "keyword" # Search logs
    python3 log_analyzer.py summary          # Quick summary
    python3 log_analyzer.py report           # Generate full report

Author: C1 Mechanic (Autonomous Work Session 4)
Date: 2025-11-24
"""

import os
import sys
import json
import re
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Optional
from collections import Counter

class LogAnalyzer:
    """Log aggregation and analysis system"""

    def __init__(self):
        self.repo_root = Path(__file__).parent.absolute()
        self.logs_dir = self.repo_root / "logs"
        self.log_files = self._discover_logs()

    def _discover_logs(self) -> List[Path]:
        """Discover all log files"""
        if not self.logs_dir.exists():
            return []

        log_files = []

        # Pattern 1: *.log
        log_files.extend(self.logs_dir.glob("*.log"))

        # Pattern 2: *.json (log files)
        for json_file in self.logs_dir.glob("*.json"):
            # Check if it's a log file (has timestamp or log-like content)
            try:
                content = json_file.read_text()
                if 'timestamp' in content.lower() or 'log' in json_file.name.lower():
                    log_files.append(json_file)
            except:
                pass

        return sorted(log_files, key=lambda f: f.stat().st_mtime, reverse=True)

    def analyze_all(self, verbose: bool = False) -> Dict:
        """Analyze all log files"""
        print("=" * 80)
        print("LOG ANALYSIS")
        print("=" * 80)
        print(f"Analyzing: {len(self.log_files)} log files")
        print(f"Location: {self.logs_dir}")
        print()

        analysis = {
            'timestamp': datetime.now().isoformat(),
            'total_files': len(self.log_files),
            'total_size': sum(f.stat().st_size for f in self.log_files),
            'files': [],
            'summary': {
                'total_lines': 0,
                'errors': 0,
                'warnings': 0,
                'info': 0,
                'error_patterns': Counter(),
                'warning_patterns': Counter()
            }
        }

        for log_file in self.log_files:
            file_analysis = self._analyze_file(log_file)
            analysis['files'].append(file_analysis)

            # Update summary
            analysis['summary']['total_lines'] += file_analysis['line_count']
            analysis['summary']['errors'] += file_analysis['errors']
            analysis['summary']['warnings'] += file_analysis['warnings']
            analysis['summary']['info'] += file_analysis['info']

            # Track error patterns
            for error in file_analysis['error_messages']:
                # Extract error type
                error_type = self._extract_error_type(error)
                analysis['summary']['error_patterns'][error_type] += 1

            # Track warning patterns
            for warning in file_analysis['warning_messages']:
                warning_type = self._extract_error_type(warning)
                analysis['summary']['warning_patterns'][warning_type] += 1

        # Print summary
        self._print_summary(analysis)

        return analysis

    def _analyze_file(self, log_file: Path) -> Dict:
        """Analyze a single log file"""
        analysis = {
            'file': log_file.name,
            'path': str(log_file),
            'size': log_file.stat().st_size,
            'modified': datetime.fromtimestamp(log_file.stat().st_mtime).isoformat(),
            'line_count': 0,
            'errors': 0,
            'warnings': 0,
            'info': 0,
            'error_messages': [],
            'warning_messages': []
        }

        try:
            content = log_file.read_text()
            lines = content.split('\n')
            analysis['line_count'] = len(lines)

            for line in lines:
                line_lower = line.lower()

                # Check for errors
                if self._is_error(line):
                    analysis['errors'] += 1
                    if len(analysis['error_messages']) < 10:  # Keep first 10
                        analysis['error_messages'].append(line.strip()[:200])

                # Check for warnings
                elif self._is_warning(line):
                    analysis['warnings'] += 1
                    if len(analysis['warning_messages']) < 10:  # Keep first 10
                        analysis['warning_messages'].append(line.strip()[:200])

                # Info/debug
                elif 'info' in line_lower or 'debug' in line_lower:
                    analysis['info'] += 1

        except Exception as e:
            analysis['error'] = str(e)

        return analysis

    def _is_error(self, line: str) -> bool:
        """Check if line contains an error"""
        line_lower = line.lower()
        error_keywords = ['error', 'exception', 'traceback', 'failed', 'failure', 'critical', 'fatal']
        return any(keyword in line_lower for keyword in error_keywords)

    def _is_warning(self, line: str) -> bool:
        """Check if line contains a warning"""
        line_lower = line.lower()
        return 'warn' in line_lower and not self._is_error(line)

    def _extract_error_type(self, message: str) -> str:
        """Extract error type from message"""
        # Try to extract exception type
        match = re.search(r'(\w+Error|\w+Exception)', message)
        if match:
            return match.group(1)

        # Try to extract error keyword
        for keyword in ['Error', 'Exception', 'Failed', 'Failure', 'Warning']:
            if keyword.lower() in message.lower():
                return keyword

        return 'Unknown'

    def _print_summary(self, analysis: Dict):
        """Print analysis summary"""
        summary = analysis['summary']

        print("=" * 80)
        print("SUMMARY")
        print("=" * 80)
        print(f"Total Files: {analysis['total_files']}")
        print(f"Total Size: {analysis['total_size']:,} bytes")
        print(f"Total Lines: {summary['total_lines']:,}")
        print()

        print(f"❌ Errors: {summary['errors']}")
        print(f"⚠️  Warnings: {summary['warnings']}")
        print(f"ℹ️  Info: {summary['info']}")
        print()

        # Error patterns
        if summary['error_patterns']:
            print("TOP ERROR TYPES:")
            for error_type, count in summary['error_patterns'].most_common(5):
                print(f"  {error_type}: {count}")
            print()

        # Warning patterns
        if summary['warning_patterns']:
            print("TOP WARNING TYPES:")
            for warning_type, count in summary['warning_patterns'].most_common(5):
                print(f"  {warning_type}: {count}")
            print()

        # Files with most errors
        files_with_errors = [(f['file'], f['errors']) for f in analysis['files'] if f['errors'] > 0]
        if files_with_errors:
            print("FILES WITH ERRORS:")
            files_with_errors.sort(key=lambda x: x[1], reverse=True)
            for filename, error_count in files_with_errors[:5]:
                print(f"  {filename}: {error_count} errors")
            print()

        print("=" * 80)

    def show_errors_only(self):
        """Show only errors from all logs"""
        print("=" * 80)
        print("ERRORS FROM ALL LOGS")
        print("=" * 80)
        print()

        total_errors = 0

        for log_file in self.log_files:
            file_analysis = self._analyze_file(log_file)

            if file_analysis['error_messages']:
                print(f"📁 {log_file.name} ({file_analysis['errors']} errors)")
                print(f"   Modified: {file_analysis['modified']}")
                print()

                for i, error in enumerate(file_analysis['error_messages'], 1):
                    print(f"   {i}. {error}")
                print()

                total_errors += file_analysis['errors']

        if total_errors == 0:
            print("✅ No errors found in any log files")
        else:
            print("=" * 80)
            print(f"Total: {total_errors} errors across {len(self.log_files)} files")

        print("=" * 80)

    def search_logs(self, keyword: str, case_sensitive: bool = False):
        """Search logs for keyword"""
        print("=" * 80)
        print(f"SEARCHING LOGS FOR: '{keyword}'")
        print("=" * 80)
        print()

        total_matches = 0

        for log_file in self.log_files:
            try:
                content = log_file.read_text()
                lines = content.split('\n')

                matches = []
                for i, line in enumerate(lines, 1):
                    if case_sensitive:
                        if keyword in line:
                            matches.append((i, line.strip()))
                    else:
                        if keyword.lower() in line.lower():
                            matches.append((i, line.strip()))

                if matches:
                    print(f"📁 {log_file.name} ({len(matches)} matches)")
                    print()

                    for line_num, line in matches[:10]:  # Show first 10
                        print(f"   Line {line_num}: {line[:150]}")

                    if len(matches) > 10:
                        print(f"   ... and {len(matches) - 10} more matches")

                    print()
                    total_matches += len(matches)

            except Exception as e:
                print(f"⚠️  Error reading {log_file.name}: {e}")
                print()

        if total_matches == 0:
            print(f"No matches found for '{keyword}'")
        else:
            print("=" * 80)
            print(f"Total: {total_matches} matches across {len(self.log_files)} files")

        print("=" * 80)

    def quick_summary(self):
        """Print quick summary without full analysis"""
        print("=" * 80)
        print("QUICK LOG SUMMARY")
        print("=" * 80)
        print()

        if not self.log_files:
            print("No log files found")
            print("=" * 80)
            return

        print(f"Log Files: {len(self.log_files)}")
        print(f"Location: {self.logs_dir}")
        print()

        total_size = sum(f.stat().st_size for f in self.log_files)
        print(f"Total Size: {total_size:,} bytes ({total_size/1024:.1f} KB)")
        print()

        print("RECENT FILES:")
        for log_file in self.log_files[:5]:
            modified = datetime.fromtimestamp(log_file.stat().st_mtime)
            size = log_file.stat().st_size
            print(f"  {log_file.name}")
            print(f"     Modified: {modified.strftime('%Y-%m-%d %H:%M:%S')}")
            print(f"     Size: {size:,} bytes")

        if len(self.log_files) > 5:
            print(f"  ... and {len(self.log_files) - 5} more files")

        print()
        print("=" * 80)
        print("Run 'python3 log_analyzer.py analyze' for detailed analysis")
        print("=" * 80)

    def generate_report(self, output_file: str = "log_analysis_report.json"):
        """Generate comprehensive log report"""
        analysis = self.analyze_all()

        # Convert Counter to dict for JSON
        analysis['summary']['error_patterns'] = dict(analysis['summary']['error_patterns'])
        analysis['summary']['warning_patterns'] = dict(analysis['summary']['warning_patterns'])

        output_path = Path(output_file)
        output_path.write_text(json.dumps(analysis, indent=2))

        print()
        print(f"✅ Log analysis report saved to: {output_file}")
        print(f"   Files analyzed: {analysis['total_files']}")
        print(f"   Errors found: {analysis['summary']['errors']}")
        print(f"   Warnings found: {analysis['summary']['warnings']}")

    def clean_old_logs(self, days: int = 30, dry_run: bool = True):
        """Clean logs older than N days"""
        print("=" * 80)
        print(f"CLEANING LOGS OLDER THAN {days} DAYS")
        print("=" * 80)
        if dry_run:
            print("⚠️  DRY RUN MODE - No files will be deleted")
        print()

        cutoff_time = datetime.now().timestamp() - (days * 24 * 3600)
        old_files = []

        for log_file in self.log_files:
            if log_file.stat().st_mtime < cutoff_time:
                old_files.append(log_file)

        if not old_files:
            print(f"✅ No logs older than {days} days")
        else:
            print(f"Found {len(old_files)} old log files:")
            print()

            total_size = 0
            for log_file in old_files:
                size = log_file.stat().st_size
                total_size += size
                modified = datetime.fromtimestamp(log_file.stat().st_mtime)
                print(f"  {log_file.name}")
                print(f"     Modified: {modified.strftime('%Y-%m-%d %H:%M:%S')}")
                print(f"     Size: {size:,} bytes")

                if not dry_run:
                    log_file.unlink()
                    print(f"     ❌ Deleted")

            print()
            print(f"Total size: {total_size:,} bytes ({total_size/1024:.1f} KB)")

            if dry_run:
                print()
                print("⚠️  DRY RUN - No files were deleted")
                print("   Run with --execute to actually delete files")

        print("=" * 80)


def main():
    """Main CLI entry point"""
    command = sys.argv[1] if len(sys.argv) > 1 else "summary"
    args = sys.argv[2:] if len(sys.argv) > 2 else []

    analyzer = LogAnalyzer()

    if command == "analyze":
        verbose = "--verbose" in args or "-v" in args
        analyzer.analyze_all(verbose=verbose)

    elif command == "errors":
        analyzer.show_errors_only()

    elif command == "search":
        if not args:
            print("❌ Search keyword required")
            print("   Usage: python3 log_analyzer.py search 'keyword'")
            sys.exit(1)
        keyword = args[0]
        case_sensitive = "--case-sensitive" in args or "-c" in args
        analyzer.search_logs(keyword, case_sensitive)

    elif command == "summary":
        analyzer.quick_summary()

    elif command == "report":
        output = args[0] if args else "log_analysis_report.json"
        analyzer.generate_report(output)

    elif command == "clean":
        days = int(args[0]) if args else 30
        dry_run = "--execute" not in args
        analyzer.clean_old_logs(days, dry_run)

    elif command == "help" or command == "--help" or command == "-h":
        print(__doc__)

    else:
        print(f"❌ Unknown command: {command}")
        print("   Run 'python3 log_analyzer.py help' for usage")
        sys.exit(1)


if __name__ == "__main__":
    main()
