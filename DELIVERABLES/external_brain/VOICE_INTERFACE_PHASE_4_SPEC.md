# 🚀 Voice Interface Phase 4: Production Service Specification
## Complete Technical Requirements for Windows Service Deployment

**Version:** 4.0-DRAFT
**Date:** 2025-11-24
**Author:** C2 Architect
**Status:** Specification Phase (Awaiting Commander Approval)

---

## 🎯 OBJECTIVES

Transform Voice Interface from background script into production-grade Windows service with:
- ✅ Auto-start on boot
- ✅ System tray GUI controls
- ✅ Visual configuration interface
- ✅ Auto-update mechanism
- ✅ Professional user experience

---

## 📋 REQUIREMENTS

### Functional Requirements

**FR-1: Windows Service**
- Service runs as Windows background service
- Auto-starts on system boot (configurable)
- Restarts automatically on failure
- Graceful shutdown on system shutdown
- Service control via Services app

**FR-2: System Tray Application**
- System tray icon (visible when service running)
- Right-click menu with controls
- Visual status indicator (listening/processing/error)
- Double-click to open configuration
- Minimizes to tray (doesn't close)

**FR-3: Configuration GUI**
- Visual editor for all settings
- Wake word selection (dropdown)
- Audio device selection (list detected devices)
- API key management (secure entry)
- Test mode (test wake word, STT, TTS)
- Real-time validation

**FR-4: Auto-Update System**
- Check for updates on startup (optional)
- Download from GitHub Releases
- Notify user of available update
- One-click update (stop service → install → restart)
- Rollback on failure

**FR-5: Installer**
- One-click installation (.exe)
- Dependency bundling (Python, libraries)
- Service registration
- Vosk model download (optional during install)
- Desktop shortcut
- Start menu entry
- Uninstaller

### Non-Functional Requirements

**NFR-1: Performance**
- Service startup time: <5 seconds
- GUI launch time: <2 seconds
- Resource usage: Same as Phase 3 (<5% CPU idle)
- Memory footprint: <150MB (service + GUI)

**NFR-2: Reliability**
- Service uptime: 99.9% (24/7 operation)
- Crash recovery: Automatic restart within 5 seconds
- Error handling: All errors logged, no crashes

**NFR-3: Security**
- API keys stored encrypted (Windows Credential Manager)
- Service runs as user (not SYSTEM)
- No elevation required for normal operation
- Secure update downloads (HTTPS + signature verification)

**NFR-4: Usability**
- Installation: <5 minutes (including Vosk download)
- Configuration: <2 minutes (for basic setup)
- Update: <1 minute (automatic)
- Uninstallation: Complete removal, no leftovers

---

## 🏗️ ARCHITECTURE

### Component Overview

```
┌──────────────────────────────────────────────────┐
│            PHASE 4 ARCHITECTURE                  │
└──────────────────────────────────────────────────┘
            │
    ┌───────┴───────┐
    │               │
┌───▼────────┐  ┌──▼──────────┐
│  SERVICE   │  │  TRAY APP   │
│   CORE     │  │   (GUI)     │
│            │  │             │
│ • Phase 3  │  │ • Controls  │
│ • Auto-run │◄─┤ • Status    │
│ • Recovery │  │ • Config    │
└────────────┘  └─────────────┘
     │               │
     └───────┬───────┘
             │
      ┌──────▼──────┐
      │ IPC CHANNEL │
      │ (Named Pipe)│
      └─────────────┘
```

### Components

**1. Service Core (`voice_service_core.py`)**
- Windows service wrapper (pywin32)
- Embeds Phase 3 Voice Interface
- Lifecycle management (start/stop/restart)
- IPC server (receives commands from GUI)

**2. Service Manager (`voice_service_manager.py`)**
- Service installation/uninstallation
- Service registration with Windows
- Auto-start configuration
- Service control (start/stop/restart)

**3. System Tray App (`voice_tray_app.py`)**
- GUI application (tkinter or PyQt)
- System tray icon (pystray)
- Context menu (start/stop/config/exit)
- Status updates (listening/processing/error)
- Launches on user login

**4. Configuration GUI (`voice_config_gui.py`)**
- Settings editor (tkinter or PyQt)
- Tab-based interface:
  - General (wake words, audio devices)
  - API Keys (OpenAI, Porcupine)
  - Advanced (performance, logging)
  - About (version, update)
- Real-time validation
- Test controls

**5. IPC Mechanism (`voice_ipc.py`)**
- Named pipe (Windows) or TCP socket
- Command protocol:
  - `START` - Start listening
  - `STOP` - Stop listening
  - `STATUS` - Get current status
  - `CONFIG` - Get/set configuration
  - `SHUTDOWN` - Graceful shutdown
- Status updates (service → GUI)

**6. Update Manager (`voice_updater.py`)**
- GitHub API integration
- Version checking (semantic versioning)
- Download new installer
- Verify signature (checksum)
- Launch installer (update mode)
- Cleanup old versions

**7. Installer (`setup_installer.nsi` - NSIS script)**
- Wizard-based installation
- Dependency installation
- Service registration
- Shortcuts creation
- Vosk model download (optional)
- Uninstaller generation

---

## 🔧 TECHNICAL IMPLEMENTATION

### Service Core Implementation

```python
# voice_service_core.py
import win32serviceutil
import win32service
import win32event
import servicemanager

class VoiceInterfaceService(win32serviceutil.ServiceFramework):
    _svc_name_ = "VoiceInterface"
    _svc_display_name_ = "Voice Interface Service"
    _svc_description_ = "Always-listening voice control for External Brain"

    def __init__(self, args):
        win32serviceutil.ServiceFramework.__init__(self, args)
        self.stop_event = win32event.CreateEvent(None, 0, 0, None)
        self.voice_interface = None

    def SvcStop(self):
        self.ReportServiceStatus(win32service.SERVICE_STOP_PENDING)
        win32event.SetEvent(self.stop_event)
        if self.voice_interface:
            self.voice_interface.stop_service()

    def SvcDoRun(self):
        servicemanager.LogMsg(
            servicemanager.EVENTLOG_INFORMATION_TYPE,
            servicemanager.PYS_SERVICE_STARTED,
            (self._svc_name_, '')
        )
        self.main()

    def main(self):
        # Import and start Phase 3 Voice Interface
        from voice_interface_v3_always_listening import VoiceInterfaceV3

        self.voice_interface = VoiceInterfaceV3()
        self.voice_interface.start_service()

        # Wait for stop signal
        win32event.WaitForSingleObject(self.stop_event, win32event.INFINITE)

if __name__ == '__main__':
    win32serviceutil.HandleCommandLine(VoiceInterfaceService)
```

### System Tray App Implementation

```python
# voice_tray_app.py
import pystray
from PIL import Image
from voice_ipc import IPCClient

class VoiceTrayApp:
    def __init__(self):
        self.ipc = IPCClient()
        self.icon = self.create_icon()
        self.menu = self.create_menu()

    def create_icon(self):
        # Load icon image
        image = Image.open("voice_icon.png")
        return pystray.Icon("voice_interface", image, menu=self.menu)

    def create_menu(self):
        return pystray.Menu(
            pystray.MenuItem("Status: Listening", lambda: None, enabled=False),
            pystray.MenuItem("Start", self.start_service),
            pystray.MenuItem("Stop", self.stop_service),
            pystray.MenuItem("Configuration", self.open_config),
            pystray.MenuItem("Check for Updates", self.check_updates),
            pystray.MenuItem("Exit", self.exit_app)
        )

    def start_service(self):
        self.ipc.send_command("START")

    def stop_service(self):
        self.ipc.send_command("STOP")

    def open_config(self):
        import subprocess
        subprocess.Popen(["python", "voice_config_gui.py"])

    def run(self):
        self.icon.run()

if __name__ == "__main__":
    app = VoiceTrayApp()
    app.run()
```

### Configuration GUI Implementation

```python
# voice_config_gui.py (tkinter version)
import tkinter as tk
from tkinter import ttk

class ConfigGUI:
    def __init__(self):
        self.root = tk.Tk()
        self.root.title("Voice Interface Configuration")
        self.root.geometry("600x500")
        self.create_widgets()

    def create_widgets(self):
        # Notebook (tabs)
        notebook = ttk.Notebook(self.root)
        notebook.pack(fill='both', expand=True)

        # General tab
        general_frame = ttk.Frame(notebook)
        notebook.add(general_frame, text="General")
        self.create_general_tab(general_frame)

        # API Keys tab
        api_frame = ttk.Frame(notebook)
        notebook.add(api_frame, text="API Keys")
        self.create_api_tab(api_frame)

        # Advanced tab
        advanced_frame = ttk.Frame(notebook)
        notebook.add(advanced_frame, text="Advanced")
        self.create_advanced_tab(advanced_frame)

        # Buttons
        button_frame = ttk.Frame(self.root)
        button_frame.pack(pady=10)
        ttk.Button(button_frame, text="Save", command=self.save_config).pack(side='left', padx=5)
        ttk.Button(button_frame, text="Test", command=self.test_config).pack(side='left', padx=5)
        ttk.Button(button_frame, text="Cancel", command=self.root.quit).pack(side='left', padx=5)

    def create_general_tab(self, parent):
        # Wake word selection
        ttk.Label(parent, text="Wake Words:").grid(row=0, column=0, sticky='w', padx=10, pady=5)
        self.wake_words_var = tk.StringVar(value="oracle,commander,computer")
        ttk.Entry(parent, textvariable=self.wake_words_var, width=40).grid(row=0, column=1, padx=10, pady=5)

        # Audio device selection
        ttk.Label(parent, text="Input Device:").grid(row=1, column=0, sticky='w', padx=10, pady=5)
        self.input_device_var = tk.StringVar()
        devices = self.get_audio_devices()
        ttk.Combobox(parent, textvariable=self.input_device_var, values=devices).grid(row=1, column=1, padx=10, pady=5)

    def save_config(self):
        # Save to voice_interface_v3_config.json
        pass

    def test_config(self):
        # Test wake word detection
        pass

    def run(self):
        self.root.mainloop()
```

---

## 🧪 TESTING PLAN

### Unit Tests

```python
# tests/test_service_core.py
def test_service_start():
    service = VoiceInterfaceService()
    service.SvcDoRun()
    assert service.voice_interface is not None

def test_service_stop():
    service = VoiceInterfaceService()
    service.SvcStop()
    assert service.voice_interface.is_running == False
```

### Integration Tests

**Test 1: Service Installation**
- Run installer
- Verify service registered
- Verify service starts automatically
- Verify tray app launches on login

**Test 2: Service Lifecycle**
- Start service via tray app
- Verify wake word detection works
- Stop service via tray app
- Verify service stopped cleanly

**Test 3: Configuration Changes**
- Change wake word via GUI
- Save configuration
- Restart service
- Verify new wake word works

**Test 4: Auto-Update**
- Mock new version available
- Click "Update" in tray app
- Verify download and installation
- Verify service restarted with new version

**Test 5: Crash Recovery**
- Kill service process (simulate crash)
- Verify service restarts within 5 seconds
- Verify no data loss
- Verify continues working

---

## 📦 DEPENDENCIES

### New Dependencies (Phase 4)

```txt
# Service
pywin32>=305  # Windows service support

# GUI
pystray>=0.19.4  # System tray
Pillow>=10.0.0  # Icon images

# Option 1: tkinter (built-in)
# No additional dependency

# Option 2: PyQt5 (better GUI)
PyQt5>=5.15.9

# Installer
pyinstaller>=5.10.0  # Bundle into .exe
NSIS (external)  # Installer creation
```

---

## ⏱️ DEVELOPMENT ESTIMATE

### Time Breakdown

| Component | Estimated Time |
|-----------|---------------|
| Service Core | 4 hours |
| Service Manager | 2 hours |
| System Tray App | 3 hours |
| Configuration GUI | 4 hours |
| IPC Mechanism | 2 hours |
| Update Manager | 3 hours |
| Installer Script | 3 hours |
| Testing | 4 hours |
| **Total** | **25 hours** |

### Phased Approach

**Week 1 (8 hours):**
- Day 1-2: Service Core + Service Manager (6 hours)
- Day 3: System Tray App basic (2 hours)

**Week 2 (8 hours):**
- Day 1-2: Configuration GUI (4 hours)
- Day 3: IPC Mechanism (2 hours)
- Day 4: Integration testing (2 hours)

**Week 3 (9 hours):**
- Day 1-2: Update Manager (3 hours)
- Day 3-4: Installer (3 hours)
- Day 5: Final testing and refinement (3 hours)

---

## 🚀 DEPLOYMENT PLAN

### Rollout Strategy

**Phase 1: Alpha (Internal)**
- Commander only
- Manual installation
- Gather feedback

**Phase 2: Beta (Limited)**
- Core team (if applicable)
- Installer available
- Monitor for issues

**Phase 3: Production**
- Public release
- Auto-update enabled
- Full documentation

### Rollback Procedure

If Phase 4 has issues:
1. Uninstall service
2. Revert to Phase 3 (background script)
3. Backup Phase 4 logs for debugging
4. Fix issues
5. Re-release

---

## ✅ SUCCESS CRITERIA

Phase 4 is complete when:
- [ ] Service installs via one-click installer
- [ ] Service auto-starts on boot
- [ ] Tray app provides start/stop/config controls
- [ ] Configuration GUI allows all settings changes
- [ ] Auto-update downloads and installs new versions
- [ ] Crash recovery works (service restarts automatically)
- [ ] Resource usage same as Phase 3 (<5% CPU idle)
- [ ] 24-hour stability test passes
- [ ] Commander testing successful
- [ ] Documentation complete

---

## 🔮 PHASE 5 PREVIEW

After Phase 4, Phase 5 could add:
- Multi-user support (user profiles)
- Voice recognition (identify speaker)
- Remote access (Tailscale + mobile app)
- Advanced audio (noise cancellation, echo reduction)
- System integrations (calendar, email, tasks)
- Proactive intelligence ("You haven't checked X today")

---

**Document Status:** ✅ COMPLETE (Specification)
**Next Step:** Await Commander approval to begin Phase 4 development
**Estimated Effort:** 25 hours over 3 weeks
**ROI:** Professional user experience, always-available voice control

🔺 C1 × C2 × C3 = ∞

*Phase 4: Transform Voice Interface from script to production service*
