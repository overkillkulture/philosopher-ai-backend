# 🚀 Voice Interface Deployment & Operations Guide
## Complete Installation, Configuration, and Maintenance Manual

**Version:** 3.0
**Date:** 2025-11-24
**Author:** C2 Architect
**Target Audience:** System Administrators, DevOps, End Users

---

## 📋 TABLE OF CONTENTS

1. [Prerequisites](#prerequisites)
2. [Installation](#installation)
3. [Configuration](#configuration)
4. [Deployment Modes](#deployment-modes)
5. [Operations](#operations)
6. [Monitoring](#monitoring)
7. [Troubleshooting](#troubleshooting)
8. [Maintenance](#maintenance)
9. [Multi-Computer Deployment](#multi-computer-deployment)
10. [Security](#security)
11. [Backup & Recovery](#backup-recovery)

---

## 🎯 PREREQUISITES

### System Requirements

**Minimum:**
- OS: Windows 10/11, macOS 10.15+, Linux (Ubuntu 20.04+)
- CPU: Dual-core 2.0 GHz
- RAM: 4GB
- Disk: 500MB free space
- Network: Internet connection for API calls
- Audio: Working microphone and speakers

**Recommended:**
- OS: Windows 11
- CPU: Quad-core 3.0 GHz+
- RAM: 8GB+
- Disk: 1GB free space (for models and logs)
- Network: Broadband (low latency preferred)
- Audio: Quality microphone (noise-cancelling preferred)

### Software Requirements

**Required:**
- Python 3.8 or higher
- pip (Python package manager)
- Git (for repository access)

**Verification:**
```bash
# Check Python version
python --version
# Should show: Python 3.8.x or higher

# Check pip
pip --version

# Check git
git --version
```

### Account Requirements

**OpenAI API Account:**
- Sign up: https://platform.openai.com/signup
- Generate API key: https://platform.openai.com/api-keys
- Add credits (pay-as-you-go or subscription)
- **Cost Estimate:** $0.50-$2.00 per day typical usage
  - STT (Whisper): $0.006 per minute
  - TTS: $0.015 per 1K characters
  - GPT-4: $0.03 per 1K tokens

**Porcupine Account (Optional, for better wake word accuracy):**
- Sign up: https://console.picovoice.ai/
- Get free access key (3 wake words included)
- Upgrade for production if needed

### Audio Device Setup

**Windows:**
1. Open Settings → System → Sound
2. Verify microphone works (test recording)
3. Set default microphone device
4. Adjust input volume (50-75% recommended)

**macOS:**
1. System Preferences → Sound → Input
2. Select microphone
3. Adjust input level
4. Grant microphone permissions

**Linux:**
```bash
# Install audio drivers if needed
sudo apt-get install portaudio19-dev python3-pyaudio

# Test microphone
arecord -l  # List devices
arecord -d 5 test.wav  # Record 5 seconds
aplay test.wav  # Play back
```

---

## 📥 INSTALLATION

### Method 1: Git Clone (Recommended)

**Step 1: Clone Repository**
```bash
cd /home/user
git clone https://github.com/overkor-tek/philosopher-ai-backend.git
cd philosopher-ai-backend
```

**Step 2: Install Python Dependencies**
```bash
# Install all required packages
pip install -r voice_interface_v3_requirements.txt

# Verify installation
pip list | grep -E "openai|pyaudio|vosk"
```

**Step 3: Download Vosk Model (Wake Word Detection)**
```bash
# Option A: Automatic download (if script available)
python download_vosk_model.py

# Option B: Manual download
# 1. Visit: https://alphacephei.com/vosk/models
# 2. Download: vosk-model-small-en-us-0.15.zip (40MB)
# 3. Extract to: /home/user/vosk-model-small-en-us-0.15/
```

**Step 4: Set Environment Variables**
```bash
# Linux/Mac - Add to ~/.bashrc or ~/.zshrc
export OPENAI_API_KEY="sk-your-key-here"
export PORCUPINE_ACCESS_KEY="your-porcupine-key"  # Optional

# Windows PowerShell - Add to profile
$env:OPENAI_API_KEY="sk-your-key-here"
$env:PORCUPINE_ACCESS_KEY="your-porcupine-key"  # Optional

# Verify
echo $OPENAI_API_KEY  # Should show your key
```

**Step 5: Test Installation**
```bash
# Test Phase 1 (POC)
python voice_interface_poc.py
# Press Enter, speak, verify it works, Ctrl+C to exit

# Test Phase 2 (NLP)
python voice_interface_v2_enhanced.py
# Press Enter, ask "What did we work on last month?", verify response

# Test Phase 3 (Wake Word)
python voice_interface_v3_always_listening.py
# Say "Hey Oracle", then ask a question, verify it works
# Ctrl+C to exit
```

---

### Method 2: Standalone Installation (Phase 4)

**Coming in Phase 4:**
- Windows installer (.exe)
- macOS installer (.dmg)
- Linux package (.deb, .rpm)
- One-click installation
- Automatic service setup

---

## ⚙️ CONFIGURATION

### Configuration File: `voice_interface_v3_config.json`

**Location:** Same directory as Python scripts

**Full Configuration:**
```json
{
  "wake_word": {
    "mode": "vosk",
    "keywords": ["oracle", "commander", "computer"],
    "sensitivity": 0.5,
    "model_path": "/home/user/vosk-model-small-en-us-0.15/",
    "porcupine_access_key": ""
  },
  "audio": {
    "sample_rate": 16000,
    "channels": 1,
    "chunk_size": 512,
    "recording_duration": 5,
    "input_device_index": null,
    "output_device_index": null
  },
  "stt": {
    "model": "whisper-1",
    "language": "en",
    "timeout": 30
  },
  "tts": {
    "model": "tts-1",
    "voice": "alloy",
    "speed": 1.0
  },
  "nlp": {
    "enable_date_parsing": true,
    "enable_intent_detection": true,
    "enable_category_extraction": true,
    "max_keywords": 5
  },
  "search": {
    "max_results": 10,
    "enable_time_filter": true,
    "enable_category_filter": true,
    "relevance_threshold": 0.3
  },
  "cyclotron": {
    "path": "/home/user/cyclotron",
    "state_file": "araya_state.json"
  },
  "performance": {
    "enable_caching": true,
    "max_cache_size": 100,
    "audio_buffer_size": 8192
  },
  "privacy": {
    "enable_local_processing": true,
    "clear_audio_buffer": true,
    "disable_telemetry": true
  },
  "logging": {
    "level": "INFO",
    "file": "voice_interface.log",
    "max_size_mb": 10,
    "backup_count": 3
  }
}
```

### Configuration Options Explained

**Wake Word Settings:**
- `mode`: "vosk" (offline) or "porcupine" (cloud, higher accuracy)
- `keywords`: List of wake words to detect
- `sensitivity`: 0.0-1.0 (higher = more sensitive, more false positives)
- `model_path`: Path to Vosk model directory
- `porcupine_access_key`: API key if using Porcupine

**Audio Settings:**
- `sample_rate`: 16000 Hz (required for Whisper)
- `channels`: 1 (mono) or 2 (stereo) - mono recommended
- `chunk_size`: Audio buffer size (512 = low latency)
- `recording_duration`: Seconds to record after wake word (5 recommended)
- `input_device_index`: null = default mic, or specify device number
- `output_device_index`: null = default speakers, or specify device number

**STT/TTS Settings:**
- `model`: OpenAI model name
- `language`: Language code ("en", "es", "fr", etc.)
- `voice`: TTS voice ("alloy", "echo", "fable", "onyx", "nova", "shimmer")
- `speed`: TTS speed (0.25-4.0, 1.0 = normal)

**NLP Settings:**
- Enable/disable NLP features
- Control keyword extraction

**Search Settings:**
- Control result count and filtering
- Relevance threshold (0.0-1.0)

**Performance Settings:**
- Caching for repeated queries
- Buffer sizes

**Privacy Settings:**
- Local processing preferences
- Audio buffer handling

**Logging Settings:**
- Log level (DEBUG, INFO, WARNING, ERROR)
- Log file path
- Rotation settings

---

## 🚀 DEPLOYMENT MODES

### Mode 1: Development / Manual Start

**Use Case:** Testing, development, debugging

**Start:**
```bash
python voice_interface_v3_always_listening.py
```

**Characteristics:**
- Runs in terminal foreground
- Logs to console
- Ctrl+C to stop
- Manual start required each time

**Pros:**
- Easy debugging
- See logs in real-time
- Quick to start/stop

**Cons:**
- Terminal must stay open
- Not automatic on boot
- No GUI controls

---

### Mode 2: Background Process

**Use Case:** Daily use, keep running while working

**Start (Windows):**
```powershell
# Start in background (no window)
pythonw voice_interface_v3_always_listening.py

# Or start minimized
start /min python voice_interface_v3_always_listening.py
```

**Start (Linux/Mac):**
```bash
# Start in background
nohup python voice_interface_v3_always_listening.py > voice.log 2>&1 &

# Save process ID
echo $! > voice_pid.txt
```

**Stop (Windows):**
```powershell
# Find and kill process
tasklist | findstr python
taskkill /F /PID <process_id>
```

**Stop (Linux/Mac):**
```bash
# Kill by saved PID
kill $(cat voice_pid.txt)

# Or find and kill
ps aux | grep voice_interface
kill <process_id>
```

**Pros:**
- Runs in background
- Terminal can close
- Low resource usage

**Cons:**
- No GUI controls
- Must manually start
- Harder to monitor

---

### Mode 3: System Service (Phase 4 - Planned)

**Use Case:** Production deployment, always available

**Features:**
- Auto-start on boot
- Windows service / systemd service
- System tray GUI
- Easy start/stop controls
- Automatic restart on crash

**Installation (Phase 4):**
```bash
# Windows
voice_interface_installer.exe

# Linux
sudo systemctl enable voice-interface.service
sudo systemctl start voice-interface.service
```

**Pros:**
- Fully automatic
- Professional user experience
- Crash recovery
- Easy management

**Cons:**
- Requires Phase 4 development
- More complex setup
- Service permissions needed

---

### Mode 4: Multi-Computer Deployment

**Use Case:** Trinity coordination across PCs

**Architecture:**
```
PC1 (Desktop) - Voice Interface + Cyclotron
PC2 (Laptop) - Voice Interface + Cyclotron (synced)
PC3 (Ops Hub) - Voice Interface + Cyclotron (synced)
    │
    └─> Shared knowledge via Git sync
```

**Setup:**
1. Install Voice Interface on each PC
2. Sync Cyclotron via Git (or shared drive)
3. Configure each to use shared knowledge base
4. Optional: Different wake words per PC

**Sync Script:**
```bash
#!/bin/bash
# cyclotron_sync.sh

# Pull latest knowledge
cd /home/user/philosopher-ai-backend
git pull origin main

# Restart voice interface if config changed
if [[ $(git diff HEAD~1 voice_interface_v3_config.json) ]]; then
    pkill -f voice_interface_v3
    python voice_interface_v3_always_listening.py &
fi
```

**Cron Job (auto-sync every 30 min):**
```bash
*/30 * * * * /home/user/cyclotron_sync.sh
```

---

## 🎛️ OPERATIONS

### Daily Operations

**Starting the Service:**
```bash
# Method 1: Foreground (for monitoring)
python voice_interface_v3_always_listening.py

# Method 2: Background
pythonw voice_interface_v3_always_listening.py  # Windows
nohup python voice_interface_v3_always_listening.py &  # Linux/Mac
```

**Stopping the Service:**
```bash
# Graceful stop (Ctrl+C if foreground)
# Or send SIGTERM if background:
kill -TERM $(pidof python voice_interface_v3_always_listening.py)
```

**Restarting the Service:**
```bash
# Stop then start
pkill -f voice_interface_v3
sleep 2
python voice_interface_v3_always_listening.py &
```

**Checking Status:**
```bash
# Check if running
ps aux | grep voice_interface_v3

# Check resource usage
top -p $(pidof python)

# Check logs
tail -f voice_interface.log
```

### Using the Voice Interface

**Basic Usage:**
1. Ensure service is running
2. Say wake word: "Hey Oracle" (or "Hey Commander", "Computer")
3. Wait for acknowledgment (optional audio beep or visual indicator)
4. Speak your query clearly
5. Wait for response (5-10 seconds)
6. System returns to listening automatically

**Example Queries:**
```
"Hey Oracle, what frameworks did we build last month?"
"Hey Commander, summarize today's work"
"Computer, find all Pattern Theory documents"
"Hey Oracle, what did we work on yesterday?"
"Computer, explain how Trinity coordination works"
"Hey Commander, count how many sessions we had this week"
```

**Best Practices:**
- Speak clearly at normal volume
- Wait for wake word acknowledgment before query
- Keep queries concise (5-15 seconds)
- Use natural language (system understands dates, intents)
- Allow time for response (don't interrupt)

---

## 📊 MONITORING

### Log Files

**Log Location:** `voice_interface.log` (same directory as scripts)

**Log Levels:**
- **DEBUG:** Detailed information (use for troubleshooting)
- **INFO:** General operational messages
- **WARNING:** Issues that don't prevent operation
- **ERROR:** Serious issues that impact functionality

**Reading Logs:**
```bash
# View latest log entries
tail -f voice_interface.log

# Search for errors
grep "ERROR" voice_interface.log

# Count queries processed today
grep "$(date +%Y-%m-%d)" voice_interface.log | grep "Query processed" | wc -l

# Check wake word detection rate
grep "Wake word detected" voice_interface.log | wc -l
```

**Log Rotation:**
- Max size: 10MB per file
- Backup count: 3 files (voice_interface.log.1, .2, .3)
- Automatic rotation when size exceeded

### Performance Metrics

**CPU Monitoring:**
```bash
# Linux/Mac
top -p $(pidof python)

# Windows
tasklist /FI "IMAGENAME eq python.exe" /V
```

**Memory Monitoring:**
```bash
# Check memory usage
ps aux | grep voice_interface | awk '{print $6}'  # RSS in KB

# Expected: 80-150MB
```

**Network Monitoring:**
```bash
# Monitor API calls (Linux/Mac)
sudo tcpdump -i any host api.openai.com

# Count API calls in logs
grep "API call" voice_interface.log | wc -l
```

### Health Checks

**Create Health Check Script:**
```bash
#!/bin/bash
# health_check.sh

# Check if process running
if pgrep -f voice_interface_v3; then
    echo "✅ Voice Interface is running"
else
    echo "❌ Voice Interface is NOT running"
    exit 1
fi

# Check recent activity (last 5 minutes)
if tail -n 100 voice_interface.log | grep -q "$(date +%Y-%m-%d\ %H)"; then
    echo "✅ Recent activity detected"
else
    echo "⚠️ No recent activity (may be idle)"
fi

# Check error rate
ERROR_COUNT=$(tail -n 1000 voice_interface.log | grep ERROR | wc -l)
if [ $ERROR_COUNT -lt 5 ]; then
    echo "✅ Error rate acceptable ($ERROR_COUNT errors in last 1000 logs)"
else
    echo "⚠️ High error rate ($ERROR_COUNT errors in last 1000 logs)"
fi
```

**Run Health Check:**
```bash
chmod +x health_check.sh
./health_check.sh
```

---

## 🔧 TROUBLESHOOTING

### Common Issues

#### Issue 1: Wake Word Not Detected

**Symptoms:**
- Say wake word, nothing happens
- System seems unresponsive

**Solutions:**
```bash
# 1. Check microphone works
arecord -d 3 test.wav && aplay test.wav

# 2. Check Vosk model exists
ls -la /home/user/vosk-model-small-en-us-0.15/

# 3. Increase sensitivity in config
# Edit voice_interface_v3_config.json:
"sensitivity": 0.7  # Try higher (0.5 → 0.7)

# 4. Check logs for wake word detector errors
grep "wake_word" voice_interface.log

# 5. Try alternative wake word mode
"mode": "porcupine"  # Switch from vosk to porcupine
```

#### Issue 2: "OpenAI API Key Not Found"

**Symptoms:**
- Error on startup: "OpenAI API key not set"

**Solutions:**
```bash
# 1. Check environment variable
echo $OPENAI_API_KEY

# 2. Set environment variable (current session)
export OPENAI_API_KEY="sk-your-key-here"

# 3. Set permanently (add to ~/.bashrc or ~/.zshrc)
echo 'export OPENAI_API_KEY="sk-your-key-here"' >> ~/.bashrc
source ~/.bashrc

# 4. Alternative: Create .env file
echo 'OPENAI_API_KEY=sk-your-key-here' > .env
```

#### Issue 3: High CPU Usage

**Symptoms:**
- CPU usage >20% when idle
- System slowdown

**Solutions:**
```bash
# 1. Check if multiple instances running
ps aux | grep voice_interface

# 2. Kill duplicates (keep one)
pkill -f voice_interface

# 3. Reduce audio quality in config
"sample_rate": 8000  # Lower from 16000
"chunk_size": 1024   # Increase from 512

# 4. Switch wake word mode
"mode": "porcupine"  # Lower CPU than vosk

# 5. Restart service
pkill -f voice_interface && python voice_interface_v3_always_listening.py &
```

#### Issue 4: "No Module Named 'openai'"

**Symptoms:**
- ImportError on startup

**Solutions:**
```bash
# 1. Install dependencies
pip install -r voice_interface_v3_requirements.txt

# 2. If specific module missing
pip install openai pyaudio vosk

# 3. Check Python version
python --version  # Must be 3.8+

# 4. Try with pip3 (if multiple Python versions)
pip3 install -r voice_interface_v3_requirements.txt
```

#### Issue 5: Response Time Very Slow (>20 seconds)

**Symptoms:**
- Queries take much longer than 10 seconds

**Solutions:**
```bash
# 1. Check network latency
ping api.openai.com

# 2. Check Cyclotron size
wc -l cyclotron/araya_state.json
# If >500K lines, consider optimizing

# 3. Enable caching in config
"enable_caching": true

# 4. Reduce search results
"max_results": 5  # Lower from 10

# 5. Check OpenAI API status
curl https://status.openai.com/api/v2/status.json
```

#### Issue 6: Voice Quality Poor

**Symptoms:**
- TTS sounds robotic or garbled
- STT misunderstands frequently

**Solutions:**
```bash
# 1. Try different TTS voice
"voice": "nova"  # Try: alloy, echo, fable, onyx, nova, shimmer

# 2. Adjust TTS speed
"speed": 0.9  # Slightly slower (0.25-4.0)

# 3. Check microphone quality
# Upgrade to better microphone if needed

# 4. Reduce background noise
# Use noise-cancelling microphone or quieter environment

# 5. Adjust recording duration
"recording_duration": 7  # Increase from 5 if queries cut off
```

#### Issue 7: Service Crashes Randomly

**Symptoms:**
- Voice Interface stops working unexpectedly
- No obvious error before crash

**Solutions:**
```bash
# 1. Check logs for crash reason
grep -A 10 "ERROR" voice_interface.log | tail -30

# 2. Run in foreground to see crash
python voice_interface_v3_always_listening.py

# 3. Check system resources
free -h  # Memory
df -h    # Disk space

# 4. Update dependencies
pip install --upgrade openai pyaudio vosk

# 5. Add auto-restart script
while true; do
    python voice_interface_v3_always_listening.py
    echo "Service crashed, restarting in 5 seconds..."
    sleep 5
done
```

---

## 🔧 MAINTENANCE

### Regular Maintenance Tasks

**Daily:**
- Check service status (running/stopped)
- Review error count in logs
- Verify wake word detection working

**Weekly:**
- Review log files for patterns
- Check disk space usage
- Test with sample queries
- Check API usage/costs

**Monthly:**
- Update Python dependencies
- Rotate/archive old logs
- Review and optimize config
- Check for Voice Interface updates
- Test backup/recovery procedures

### Updates

**Updating Voice Interface Code:**
```bash
# 1. Stop service
pkill -f voice_interface_v3

# 2. Backup current version
cp voice_interface_v3_always_listening.py voice_interface_v3_backup.py

# 3. Pull latest from git
git pull origin main

# 4. Check for config changes
git diff voice_interface_v3_config.json

# 5. Restart service
python voice_interface_v3_always_listening.py &
```

**Updating Python Dependencies:**
```bash
# 1. Check current versions
pip list | grep -E "openai|pyaudio|vosk"

# 2. Update all dependencies
pip install --upgrade -r voice_interface_v3_requirements.txt

# 3. Test after update
python voice_interface_v3_always_listening.py
# Say wake word, test query, verify works
# Ctrl+C to stop
```

**Updating Vosk Model:**
```bash
# 1. Download new model
wget https://alphacephei.com/vosk/models/vosk-model-small-en-us-0.15.zip

# 2. Extract
unzip vosk-model-small-en-us-0.15.zip

# 3. Update config
# Edit voice_interface_v3_config.json:
"model_path": "/home/user/vosk-model-small-en-us-0.15/"

# 4. Restart service
```

### Log Management

**Manual Log Rotation:**
```bash
# Rotate current log
mv voice_interface.log voice_interface.log.$(date +%Y%m%d)

# Compress old logs
gzip voice_interface.log.20*

# Delete logs older than 30 days
find . -name "voice_interface.log.*.gz" -mtime +30 -delete
```

**Automated Log Rotation (Linux):**
```bash
# Create logrotate config
sudo nano /etc/logrotate.d/voice-interface

# Add content:
/home/user/philosopher-ai-backend/voice_interface.log {
    daily
    missingok
    rotate 7
    compress
    delaycompress
    notifempty
    create 644 user user
    postrotate
        pkill -HUP -f voice_interface_v3
    endscript
}
```

---

## 🔒 SECURITY

### API Key Security

**Best Practices:**
- ✅ Store in environment variables (not in code)
- ✅ Use .env files with .gitignore
- ✅ Rotate keys periodically (every 90 days)
- ✅ Monitor API usage for anomalies
- ❌ Never commit keys to Git
- ❌ Never share keys in logs or screenshots

**Key Rotation:**
```bash
# 1. Generate new OpenAI API key at https://platform.openai.com/api-keys
# 2. Update environment variable
export OPENAI_API_KEY="sk-new-key-here"

# 3. Update .env file
echo 'OPENAI_API_KEY=sk-new-key-here' > .env

# 4. Restart service
pkill -f voice_interface_v3
python voice_interface_v3_always_listening.py &

# 5. Verify new key works (test a query)

# 6. Revoke old key at https://platform.openai.com/api-keys
```

### Network Security

**Firewall Rules:**
```bash
# Linux (iptables)
sudo iptables -A OUTPUT -d api.openai.com -j ACCEPT
sudo iptables -A OUTPUT -d picovoice.ai -j ACCEPT  # If using Porcupine

# Windows Firewall
# Allow Python through firewall (automatic prompt on first run)
```

**HTTPS Verification:**
- All API calls use HTTPS (encrypted)
- Certificate verification enabled by default
- No insecure connections

### Privacy Protection

**Audio Privacy Checklist:**
- [ ] Wake word detection happens locally (verified)
- [ ] Audio only sent after wake word (verified in code)
- [ ] No audio files written to disk (verified in config)
- [ ] Audio buffer cleared after response (verified in code)
- [ ] Microphone indicator shows when active (OS-level)

**Data Retention:**
- Voice Interface does NOT store audio
- Cyclotron stores query results (knowledge atoms), not audio
- OpenAI retains API request data per their policy (30 days)
- Logs may contain query text (not audio) - rotate regularly

---

## 💾 BACKUP & RECOVERY

### Backup Strategy

**What to Backup:**
1. Configuration file (`voice_interface_v3_config.json`)
2. Environment variables (.env file)
3. Custom wake word models (if any)
4. Cyclotron knowledge base
5. Log files (recent)

**Backup Script:**
```bash
#!/bin/bash
# backup_voice_interface.sh

BACKUP_DIR="$HOME/voice_interface_backups/$(date +%Y%m%d)"
mkdir -p "$BACKUP_DIR"

# Backup config
cp voice_interface_v3_config.json "$BACKUP_DIR/"

# Backup .env (be careful - contains secrets!)
cp .env "$BACKUP_DIR/"

# Backup Cyclotron state
cp cyclotron/araya_state.json "$BACKUP_DIR/"

# Backup recent logs
cp voice_interface.log "$BACKUP_DIR/"

# Compress backup
tar -czf "$BACKUP_DIR.tar.gz" "$BACKUP_DIR"
rm -rf "$BACKUP_DIR"

echo "✅ Backup created: $BACKUP_DIR.tar.gz"
```

**Automated Backups:**
```bash
# Add to crontab (daily backups)
0 2 * * * /home/user/backup_voice_interface.sh
```

### Recovery Procedures

**Scenario 1: Configuration Corrupted**
```bash
# 1. Stop service
pkill -f voice_interface_v3

# 2. Restore from backup
cp voice_interface_backups/20251124/voice_interface_v3_config.json .

# 3. Restart service
python voice_interface_v3_always_listening.py &

# 4. Test
# Say wake word, verify works
```

**Scenario 2: Complete System Failure**
```bash
# 1. Reinstall Python dependencies
pip install -r voice_interface_v3_requirements.txt

# 2. Restore configuration
tar -xzf voice_interface_backups/20251124.tar.gz
cp voice_interface_backups/20251124/* .

# 3. Restore Cyclotron
cp voice_interface_backups/20251124/araya_state.json cyclotron/

# 4. Restart service
python voice_interface_v3_always_listening.py &
```

**Scenario 3: API Key Lost**
```bash
# 1. Generate new OpenAI API key
# Visit: https://platform.openai.com/api-keys

# 2. Set new key
export OPENAI_API_KEY="sk-new-key-here"
echo 'OPENAI_API_KEY=sk-new-key-here' > .env

# 3. Test
python -c "import openai; print(openai.api_key)"

# 4. Restart service
```

---

## ✅ DEPLOYMENT CHECKLIST

**Pre-Deployment:**
- [ ] System requirements verified (Python 3.8+, audio devices)
- [ ] OpenAI API key obtained and funded
- [ ] Git repository cloned
- [ ] Python dependencies installed
- [ ] Vosk model downloaded and extracted
- [ ] Environment variables set
- [ ] Microphone tested and working
- [ ] Speakers tested and working

**Deployment:**
- [ ] Configuration file customized
- [ ] Voice Interface started (foreground test)
- [ ] Wake word detection tested (all wake words)
- [ ] Sample queries tested (5+ different query types)
- [ ] Response quality verified
- [ ] Resource usage acceptable (<5% CPU idle)
- [ ] Background mode tested (if using)
- [ ] Service survives restart/crash
- [ ] Logs being written correctly

**Post-Deployment:**
- [ ] Backup created
- [ ] Monitoring configured
- [ ] Health check script set up
- [ ] Auto-start configured (if desired)
- [ ] Documentation reviewed
- [ ] Users trained (if multi-user)
- [ ] Support contacts shared

---

## 📞 SUPPORT

**Documentation:**
- Architecture: `VOICE_INTERFACE_ARCHITECTURE.md`
- User Guide: `VOICE_INTERFACE_PHASE_3_GUIDE.md`
- API Reference: `VOICE_INTERFACE_API.md`
- Diagrams: `VOICE_INTERFACE_DIAGRAMS.md`

**Troubleshooting:**
- Check logs: `tail -f voice_interface.log`
- Health check: `./health_check.sh`
- Test mode: `python voice_interface_v3_always_listening.py`

**Community:**
- GitHub Issues: https://github.com/overkor-tek/philosopher-ai-backend/issues
- Discussions: https://github.com/overkor-tek/philosopher-ai-backend/discussions

---

**Document Status:** ✅ COMPLETE
**Version:** 1.0
**Last Updated:** 2025-11-24

🔺 C1 × C2 × C3 = ∞

*Voice Interface Deployment Guide: From zero to production in minutes*
