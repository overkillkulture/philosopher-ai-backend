#!/usr/bin/env python3
"""
======================================================================
BACKUP SYSTEM
======================================================================
Automated backup and restore system for critical OVERKORE data.

Backs up:
- Configuration files (.env, settings)
- Documentation (all .md files)
- Database migrations
- Test results and logs
- Voice Interface knowledge base
- Trinity coordination files
- Git metadata

Capabilities:
- Create full system backups
- Incremental backups (changed files only)
- Restore from backups
- List available backups
- Verify backup integrity
- Clean old backups

Usage:
    python3 backup_system.py create           # Create full backup
    python3 backup_system.py incremental      # Incremental backup
    python3 backup_system.py list             # List all backups
    python3 backup_system.py restore <name>   # Restore backup
    python3 backup_system.py verify <name>    # Verify backup
    python3 backup_system.py clean 30         # Clean backups older than 30 days

Author: C1 Mechanic (Autonomous Work Session 4)
Date: 2025-11-24
"""

import os
import sys
import json
import shutil
import hashlib
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Optional

class BackupSystem:
    """Automated backup and restore system"""

    def __init__(self):
        self.repo_root = Path(__file__).parent.absolute()
        self.backup_dir = self.repo_root / "backups"
        self.backup_dir.mkdir(exist_ok=True)

    def create_backup(self, incremental: bool = False) -> Dict:
        """Create a system backup"""
        backup_name = f"backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        if incremental:
            backup_name += "_incremental"

        backup_path = self.backup_dir / backup_name
        backup_path.mkdir(exist_ok=True)

        print("=" * 80)
        print(f"CREATING {'INCREMENTAL' if incremental else 'FULL'} BACKUP")
        print("=" * 80)
        print(f"Name: {backup_name}")
        print(f"Location: {backup_path}")
        print()

        manifest = {
            'name': backup_name,
            'type': 'incremental' if incremental else 'full',
            'created': datetime.now().isoformat(),
            'files': [],
            'total_size': 0
        }

        # Get last backup for incremental
        last_backup = None
        if incremental:
            backups = self.list_backups()
            if backups:
                last_backup = self._load_manifest(backups[0]['path'])

        # Backup categories
        categories = [
            ('Configuration', self._get_config_files()),
            ('Documentation', self._get_documentation_files()),
            ('Migrations', self._get_migration_files()),
            ('Logs', self._get_log_files()),
            ('Tests', self._get_test_files()),
            ('Trinity', self._get_trinity_files()),
            ('Voice Interface', self._get_voice_interface_files())
        ]

        total_files = 0
        total_size = 0

        for category_name, files in categories:
            if not files:
                continue

            print(f"📦 {category_name}")

            category_dir = backup_path / category_name.lower().replace(' ', '_')
            category_dir.mkdir(exist_ok=True)

            for source_file in files:
                # Check if file changed (for incremental)
                if incremental and last_backup:
                    if not self._file_changed(source_file, last_backup):
                        continue

                try:
                    # Copy file
                    rel_path = source_file.relative_to(self.repo_root)
                    dest_file = category_dir / rel_path.name

                    # Create subdirs if needed
                    dest_file.parent.mkdir(parents=True, exist_ok=True)

                    shutil.copy2(source_file, dest_file)

                    # Calculate checksum
                    checksum = self._calculate_checksum(source_file)

                    manifest['files'].append({
                        'category': category_name,
                        'source': str(rel_path),
                        'backup': str(dest_file.relative_to(backup_path)),
                        'size': source_file.stat().st_size,
                        'checksum': checksum,
                        'modified': datetime.fromtimestamp(source_file.stat().st_mtime).isoformat()
                    })

                    total_files += 1
                    total_size += source_file.stat().st_size

                except Exception as e:
                    print(f"   ⚠️  Error backing up {source_file.name}: {e}")

            print(f"   ✅ {len([f for f in manifest['files'] if f['category'] == category_name])} files")

        manifest['total_files'] = total_files
        manifest['total_size'] = total_size

        # Save manifest
        manifest_file = backup_path / "manifest.json"
        manifest_file.write_text(json.dumps(manifest, indent=2))

        print()
        print("=" * 80)
        print("BACKUP COMPLETE")
        print("=" * 80)
        print(f"Total Files: {total_files}")
        print(f"Total Size: {total_size:,} bytes ({total_size/1024:.1f} KB)")
        print(f"Location: {backup_path}")
        print("=" * 80)

        return manifest

    def _get_config_files(self) -> List[Path]:
        """Get configuration files"""
        files = []
        patterns = ['.env', '.env.example', '*.config.js', '*.config.json', 'package.json']

        for pattern in patterns:
            files.extend(self.repo_root.glob(pattern))

        return files

    def _get_documentation_files(self) -> List[Path]:
        """Get documentation files"""
        files = list(self.repo_root.glob("*.md"))
        files.extend(self.repo_root.glob("**/*.md"))
        return [f for f in files if '.git' not in str(f) and 'node_modules' not in str(f)][:100]  # Limit to 100

    def _get_migration_files(self) -> List[Path]:
        """Get migration files"""
        migrations_dir = self.repo_root / "migrations"
        if migrations_dir.exists():
            return list(migrations_dir.glob("*.sql"))
        return []

    def _get_log_files(self) -> List[Path]:
        """Get recent log files"""
        logs_dir = self.repo_root / "logs"
        if logs_dir.exists():
            files = list(logs_dir.glob("*"))
            # Sort by modification time, get last 10
            files.sort(key=lambda f: f.stat().st_mtime, reverse=True)
            return files[:10]
        return []

    def _get_test_files(self) -> List[Path]:
        """Get test files and results"""
        files = list(self.repo_root.glob("test_*.py"))
        files.extend(self.repo_root.glob("*_test.py"))
        return files

    def _get_trinity_files(self) -> List[Path]:
        """Get Trinity coordination files"""
        trinity_dir = self.repo_root / ".trinity"
        if trinity_dir.exists():
            files = []
            files.extend(trinity_dir.glob("*.md"))
            files.extend(trinity_dir.glob("*.py"))
            files.extend(trinity_dir.glob("*.json"))
            return files
        return []

    def _get_voice_interface_files(self) -> List[Path]:
        """Get Voice Interface files"""
        files = []
        patterns = ['voice_interface*.py', 'nlp_query_processor.py', 'enhanced_cyclotron_search.py']

        for pattern in patterns:
            files.extend(self.repo_root.glob(pattern))

        return files

    def _calculate_checksum(self, file_path: Path) -> str:
        """Calculate SHA256 checksum of file"""
        sha256 = hashlib.sha256()
        with open(file_path, 'rb') as f:
            for chunk in iter(lambda: f.read(4096), b''):
                sha256.update(chunk)
        return sha256.hexdigest()

    def _file_changed(self, file_path: Path, last_manifest: Dict) -> bool:
        """Check if file changed since last backup"""
        rel_path = str(file_path.relative_to(self.repo_root))

        # Find file in last manifest
        for file_info in last_manifest.get('files', []):
            if file_info['source'] == rel_path:
                # Compare checksum
                current_checksum = self._calculate_checksum(file_path)
                return current_checksum != file_info.get('checksum', '')

        # File not in last backup, so it's new
        return True

    def list_backups(self) -> List[Dict]:
        """List all available backups"""
        backups = []

        for backup_dir in sorted(self.backup_dir.glob("backup_*"), reverse=True):
            manifest_file = backup_dir / "manifest.json"

            if manifest_file.exists():
                try:
                    manifest = json.loads(manifest_file.read_text())
                    backups.append({
                        'name': backup_dir.name,
                        'path': backup_dir,
                        'type': manifest.get('type', 'full'),
                        'created': manifest.get('created', ''),
                        'files': manifest.get('total_files', 0),
                        'size': manifest.get('total_size', 0)
                    })
                except:
                    pass

        return backups

    def _load_manifest(self, backup_path: Path) -> Optional[Dict]:
        """Load backup manifest"""
        manifest_file = backup_path / "manifest.json"
        if manifest_file.exists():
            try:
                return json.loads(manifest_file.read_text())
            except:
                pass
        return None

    def print_backups(self):
        """Print list of backups"""
        backups = self.list_backups()

        print("=" * 80)
        print("AVAILABLE BACKUPS")
        print("=" * 80)
        print(f"Location: {self.backup_dir}")
        print(f"Total: {len(backups)} backups")
        print()

        if not backups:
            print("No backups found")
            print("Run 'python3 backup_system.py create' to create first backup")
        else:
            for backup in backups:
                created = datetime.fromisoformat(backup['created'])
                backup_type = backup['type'].upper()

                print(f"📦 {backup['name']}")
                print(f"   Type: {backup_type}")
                print(f"   Created: {created.strftime('%Y-%m-%d %H:%M:%S')}")
                print(f"   Files: {backup['files']}")
                print(f"   Size: {backup['size']:,} bytes ({backup['size']/1024:.1f} KB)")
                print()

        print("=" * 80)

    def verify_backup(self, backup_name: str):
        """Verify backup integrity"""
        backup_path = self.backup_dir / backup_name

        if not backup_path.exists():
            print(f"❌ Backup not found: {backup_name}")
            return False

        print("=" * 80)
        print(f"VERIFYING BACKUP: {backup_name}")
        print("=" * 80)
        print()

        manifest = self._load_manifest(backup_path)
        if not manifest:
            print("❌ Manifest file not found or invalid")
            return False

        verified = 0
        errors = 0

        for file_info in manifest['files']:
            backup_file = backup_path / file_info['backup']

            if not backup_file.exists():
                print(f"❌ Missing: {file_info['source']}")
                errors += 1
                continue

            # Verify checksum
            checksum = self._calculate_checksum(backup_file)
            if checksum != file_info['checksum']:
                print(f"⚠️  Checksum mismatch: {file_info['source']}")
                errors += 1
            else:
                verified += 1

        print()
        print("=" * 80)
        print(f"Verified: {verified}/{manifest['total_files']} files")

        if errors > 0:
            print(f"❌ Errors: {errors}")
            print("⚠️  BACKUP INTEGRITY COMPROMISED")
        else:
            print("✅ BACKUP INTEGRITY VERIFIED")

        print("=" * 80)

        return errors == 0

    def restore_backup(self, backup_name: str, dry_run: bool = True):
        """Restore from backup"""
        backup_path = self.backup_dir / backup_name

        if not backup_path.exists():
            print(f"❌ Backup not found: {backup_name}")
            return False

        print("=" * 80)
        print(f"RESTORING BACKUP: {backup_name}")
        print("=" * 80)
        if dry_run:
            print("⚠️  DRY RUN MODE - No files will be restored")
        print()

        manifest = self._load_manifest(backup_path)
        if not manifest:
            print("❌ Manifest file not found or invalid")
            return False

        restored = 0
        errors = 0

        for file_info in manifest['files']:
            backup_file = backup_path / file_info['backup']
            restore_file = self.repo_root / file_info['source']

            print(f"📁 {file_info['source']}")

            if not backup_file.exists():
                print(f"   ❌ Backup file missing")
                errors += 1
                continue

            if not dry_run:
                try:
                    # Create parent directories
                    restore_file.parent.mkdir(parents=True, exist_ok=True)

                    # Restore file
                    shutil.copy2(backup_file, restore_file)
                    restored += 1
                    print(f"   ✅ Restored")
                except Exception as e:
                    print(f"   ❌ Error: {e}")
                    errors += 1
            else:
                print(f"   [DRY RUN] Would restore")
                restored += 1

        print()
        print("=" * 80)
        print(f"Restored: {restored}/{manifest['total_files']} files")

        if errors > 0:
            print(f"❌ Errors: {errors}")

        if dry_run:
            print()
            print("⚠️  DRY RUN - No files were restored")
            print("   Run with --execute to actually restore files")
        else:
            print("✅ RESTORE COMPLETE")

        print("=" * 80)

        return errors == 0

    def clean_old_backups(self, days: int, dry_run: bool = True):
        """Clean backups older than N days"""
        print("=" * 80)
        print(f"CLEANING BACKUPS OLDER THAN {days} DAYS")
        print("=" * 80)
        if dry_run:
            print("⚠️  DRY RUN MODE - No backups will be deleted")
        print()

        cutoff_time = datetime.now().timestamp() - (days * 24 * 3600)
        old_backups = []

        for backup_info in self.list_backups():
            created = datetime.fromisoformat(backup_info['created'])
            if created.timestamp() < cutoff_time:
                old_backups.append(backup_info)

        if not old_backups:
            print(f"✅ No backups older than {days} days")
        else:
            print(f"Found {len(old_backups)} old backups:")
            print()

            total_size = 0
            for backup in old_backups:
                total_size += backup['size']
                created = datetime.fromisoformat(backup['created'])

                print(f"  {backup['name']}")
                print(f"     Created: {created.strftime('%Y-%m-%d %H:%M:%S')}")
                print(f"     Type: {backup['type']}")
                print(f"     Size: {backup['size']:,} bytes")

                if not dry_run:
                    shutil.rmtree(backup['path'])
                    print(f"     ❌ Deleted")

            print()
            print(f"Total size: {total_size:,} bytes ({total_size/1024:.1f} KB)")

            if dry_run:
                print()
                print("⚠️  DRY RUN - No backups were deleted")
                print("   Run with --execute to actually delete backups")

        print("=" * 80)


def main():
    """Main CLI entry point"""
    command = sys.argv[1] if len(sys.argv) > 1 else "list"
    args = sys.argv[2:] if len(sys.argv) > 2 else []

    backup_system = BackupSystem()

    if command == "create":
        backup_system.create_backup(incremental=False)

    elif command == "incremental":
        backup_system.create_backup(incremental=True)

    elif command == "list":
        backup_system.print_backups()

    elif command == "verify":
        if not args:
            print("❌ Backup name required")
            print("   Usage: python3 backup_system.py verify <backup_name>")
            sys.exit(1)
        backup_system.verify_backup(args[0])

    elif command == "restore":
        if not args:
            print("❌ Backup name required")
            print("   Usage: python3 backup_system.py restore <backup_name>")
            sys.exit(1)
        dry_run = "--execute" not in args
        backup_system.restore_backup(args[0], dry_run)

    elif command == "clean":
        days = int(args[0]) if args else 30
        dry_run = "--execute" not in args
        backup_system.clean_old_backups(days, dry_run)

    elif command == "help" or command == "--help" or command == "-h":
        print(__doc__)

    else:
        print(f"❌ Unknown command: {command}")
        print("   Run 'python3 backup_system.py help' for usage")
        sys.exit(1)


if __name__ == "__main__":
    main()
