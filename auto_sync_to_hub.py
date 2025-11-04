#!/usr/bin/env python3
"""
AUTO-SYNC TO GITHUB HUB
Automatically syncs all commander summaries to GitHub every 5 minutes
Enables mobile access and cross-computer coordination
"""

import subprocess
import time
from pathlib import Path
from datetime import datetime

class GitHubHubSync:
    """Automatically sync summaries to GitHub"""

    def __init__(self):
        self.workspace = Path.home()

        # Files to auto-sync (commander summaries)
        self.summary_files = [
            "COMMANDER_EXECUTIVE_SUMMARY.md",
            "MULTI_INSTANCE_HEALTH.md",
            "TASK_COORDINATION_REPORT.md",
            "RECURSIVE_ANALYTICS_REPORT.md",
            "AUTONOMOUS_WORK_COMPLETE_DECADES_WORTH.md",
            "MOBILE_COMMAND_CENTER.html"
        ]

        self.sync_interval = 300  # 5 minutes

    def check_git_available(self):
        """Check if git is available"""
        try:
            result = subprocess.run(
                ["git", "--version"],
                capture_output=True,
                text=True
            )
            return result.returncode == 0
        except:
            return False

    def sync_to_github(self):
        """Sync summaries to GitHub"""
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        print("\n" + "=" * 70)
        print(f"GITHUB HUB SYNC - {timestamp}")
        print("=" * 70)

        # Check git available
        if not self.check_git_available():
            print("❌ Git not available. Please install git.")
            return False

        # Check if we're in a git repo
        try:
            result = subprocess.run(
                ["git", "rev-parse", "--git-dir"],
                capture_output=True,
                cwd=self.workspace
            )
            if result.returncode != 0:
                print("❌ Not in a git repository. Run 'git init' first.")
                return False
        except:
            print("❌ Git check failed")
            return False

        # Add summary files
        added_files = []
        for filename in self.summary_files:
            filepath = self.workspace / filename
            if filepath.exists():
                try:
                    subprocess.run(
                        ["git", "add", str(filepath)],
                        cwd=self.workspace,
                        check=True
                    )
                    added_files.append(filename)
                    print(f"✅ Added: {filename}")
                except subprocess.CalledProcessError:
                    print(f"⚠️  Failed to add: {filename}")

        if not added_files:
            print("ℹ️  No files to sync")
            return True

        # Check if there are changes to commit
        try:
            result = subprocess.run(
                ["git", "diff", "--cached", "--quiet"],
                cwd=self.workspace
            )

            if result.returncode == 0:
                print("ℹ️  No changes to commit")
                return True
        except:
            pass  # Proceed with commit

        # Commit changes
        commit_message = f"Auto-sync: Command center update {timestamp}\n\nSynced files:\n" + \
                        "\n".join(f"- {f}" for f in added_files)

        try:
            subprocess.run(
                ["git", "commit", "-m", commit_message],
                cwd=self.workspace,
                check=True,
                capture_output=True
            )
            print(f"✅ Committed {len(added_files)} files")
        except subprocess.CalledProcessError as e:
            print(f"⚠️  Commit failed: {e}")
            return False

        # Push to GitHub
        try:
            print("⬆️  Pushing to GitHub...")
            result = subprocess.run(
                ["git", "push", "origin", "master"],
                cwd=self.workspace,
                check=True,
                capture_output=True,
                text=True
            )
            print("✅ Pushed to GitHub successfully")
            print(f"   Files synced: {len(added_files)}")
            return True

        except subprocess.CalledProcessError as e:
            # Try main instead of master
            try:
                result = subprocess.run(
                    ["git", "push", "origin", "main"],
                    cwd=self.workspace,
                    check=True,
                    capture_output=True
                )
                print("✅ Pushed to GitHub (main branch)")
                return True
            except:
                print(f"❌ Push failed: {e}")
                print("   Check: git remote, branch name, authentication")
                return False

    def run_continuous(self):
        """Run continuous sync every interval"""
        print("=" * 70)
        print("GITHUB HUB SYNC - CONTINUOUS MODE")
        print("=" * 70)
        print(f"Syncing every {self.sync_interval} seconds ({self.sync_interval // 60} minutes)")
        print("Press Ctrl+C to stop")
        print("")

        sync_count = 0

        try:
            while True:
                success = self.sync_to_github()

                if success:
                    sync_count += 1
                    print(f"\n✅ Sync #{sync_count} complete")
                else:
                    print(f"\n⚠️  Sync #{sync_count + 1} had issues")

                # Wait for next interval
                next_sync = datetime.now().timestamp() + self.sync_interval
                next_sync_time = datetime.fromtimestamp(next_sync).strftime("%H:%M:%S")

                print(f"⏰ Next sync at: {next_sync_time}")
                print("=" * 70)

                time.sleep(self.sync_interval)

        except KeyboardInterrupt:
            print("\n\n" + "=" * 70)
            print("SYNC STOPPED BY USER")
            print(f"Total syncs completed: {sync_count}")
            print("=" * 70)

def main():
    """Main entry point"""
    import argparse

    parser = argparse.ArgumentParser(description="Auto-sync summaries to GitHub")
    parser.add_argument('--once', action='store_true', help='Sync once and exit')
    parser.add_argument('--interval', type=int, default=300, help='Sync interval in seconds (default: 300)')

    args = parser.parse_args()

    syncer = GitHubHubSync()

    if args.interval != 300:
        syncer.sync_interval = args.interval

    if args.once:
        syncer.sync_to_github()
    else:
        syncer.run_continuous()

if __name__ == "__main__":
    main()
