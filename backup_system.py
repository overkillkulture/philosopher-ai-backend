#!/usr/bin/env python3
"""
AUTONOMOUS BACKUP SYSTEM
Backs up critical files to thumb drive (D:) and prepares GitHub sync
"""

import os
import shutil
from datetime import datetime
import json

# Backup configuration
SOURCE_DIR = r"C:\Users\Darrick"
DEST_DIR = r"D:\BACKUP_" + datetime.now().strftime("%Y%m%d_%H%M%S")

# Critical files to backup
CRITICAL_FILES = [
    # Social Media Integration (NEW - Today's work)
    "TWITTER_API_INTEGRATION.js",
    "INSTAGRAM_API_INTEGRATION.js",
    "AI_CONTENT_GENERATOR_SOCIAL_MEDIA.js",
    "AUTOMATED_POSTING_SCHEDULER.js",
    "COMPLETE_SOCIAL_MEDIA_SYSTEM.js",

    # Marketplace (NEW - Started today)
    "MARKETPLACE_DATABASE_SCHEMA.sql",

    # Core Frameworks
    "AI_INTEGRATION_FRAMEWORK.js",
    "AUTHENTICATION_SYSTEM_COMPLETE.js",
    "CACHING_SYSTEM_COMPLETE.js",
    "SECURITY_AUDIT_SYSTEM.js",
    "CODE_GENERATOR.js",
    "DOCUMENTATION_GENERATOR.js",
    "PATTERN_RECOGNITION_ENGINE.js",
    "AUTONOMOUS_WORK_ENGINE.js",
    "SOCIAL_MEDIA_ORCHESTRATOR.js",

    # Reports & Documentation
    "AUTONOMOUS_WORK_PHASE_1_COMPLETE.md",
    "AUTONOMOUS_WORK_PHASES_2_3_4_COMPLETE.md",
    "BRAIN_UNLOAD_FRAMEWORK_CONSOLIDATION.md",
    "ONE_YEAR_BOOT_COMPLETE_NOV_4.md",
    "AUTO_EXTRACTED_OPPORTUNITIES.md",

    # Configuration
    "package.json",

    # Security audit results
    "security-audit-report.json",
]

def create_backup():
    """Execute comprehensive backup"""

    print("=" * 60)
    print("AUTONOMOUS BACKUP SYSTEM")
    print("=" * 60)
    print()

    # Create backup directory
    try:
        os.makedirs(DEST_DIR, exist_ok=True)
        print(f"[OK] Created backup directory: {DEST_DIR}")
    except Exception as e:
        print(f"[ERROR] Failed to create backup directory: {e}")
        return False

    # Backup files
    backed_up = []
    failed = []

    print()
    print("Backing up files...")
    print()

    for filename in CRITICAL_FILES:
        source = os.path.join(SOURCE_DIR, filename)
        dest = os.path.join(DEST_DIR, filename)

        if os.path.exists(source):
            try:
                shutil.copy2(source, dest)
                file_size = os.path.getsize(source)
                backed_up.append({
                    "file": filename,
                    "size": file_size,
                    "size_kb": round(file_size / 1024, 2)
                })
                print(f"  [OK] {filename} ({round(file_size/1024, 2)} KB)")
            except Exception as e:
                failed.append({"file": filename, "error": str(e)})
                print(f"  [FAIL] {filename} - ERROR: {e}")
        else:
            failed.append({"file": filename, "error": "File not found"})
            print(f"  [SKIP] {filename} - NOT FOUND")

    # Create backup manifest
    manifest = {
        "backup_date": datetime.now().isoformat(),
        "backup_location": DEST_DIR,
        "total_files": len(backed_up),
        "failed_files": len(failed),
        "total_size_kb": sum(f["size_kb"] for f in backed_up),
        "files": backed_up,
        "failed": failed
    }

    manifest_file = os.path.join(DEST_DIR, "BACKUP_MANIFEST.json")
    with open(manifest_file, 'w') as f:
        json.dump(manifest, f, indent=2)

    # Create human-readable summary
    summary_file = os.path.join(DEST_DIR, "BACKUP_SUMMARY.txt")
    with open(summary_file, 'w') as f:
        f.write("=" * 60 + "\n")
        f.write("BACKUP SUMMARY\n")
        f.write("=" * 60 + "\n\n")
        f.write(f"Date: {manifest['backup_date']}\n")
        f.write(f"Location: {manifest['backup_location']}\n")
        f.write(f"Total Files: {manifest['total_files']}\n")
        f.write(f"Total Size: {manifest['total_size_kb']} KB\n")
        f.write(f"Failed: {manifest['failed_files']}\n\n")
        f.write("Files Backed Up:\n")
        for file in backed_up:
            f.write(f"  - {file['file']} ({file['size_kb']} KB)\n")

        if failed:
            f.write("\nFailed Files:\n")
            for file in failed:
                f.write(f"  - {file['file']}: {file['error']}\n")

    # Summary
    print()
    print("=" * 60)
    print("BACKUP COMPLETE")
    print("=" * 60)
    print()
    print(f"[OK] Files backed up: {len(backed_up)}")
    print(f"[WARN] Files failed: {len(failed)}")
    print(f"[INFO] Total size: {manifest['total_size_kb']} KB ({round(manifest['total_size_kb']/1024, 2)} MB)")
    print()
    print(f"[INFO] Backup location: {DEST_DIR}")
    print()

    return True

if __name__ == "__main__":
    success = create_backup()

    if success:
        print("Next step: Push to GitHub for cloud backup")
        print()
        exit(0)
    else:
        print("Backup failed!")
        exit(1)
