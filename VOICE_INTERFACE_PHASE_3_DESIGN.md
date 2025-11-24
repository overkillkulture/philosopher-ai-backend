# Voice Interface Phase 3: Wake Word Detection System

**Date:** 2025-11-23
**C3T3 Session:** Autonomous Work - Phase 3 Design
**Estimated Time:** 2 hours
**Status:** Design phase

---

## 🎯 PHASE 3 OBJECTIVE

Enable hands-free operation of Voice Interface through wake word detection.

**Wake Words:**
- "Hey Oracle" - Primary wake word
- "Hey Commander" - Alternative wake word
- "Computer" - Quick activation

---

## 🏗️ SYSTEM ARCHITECTURE

### Component 1: Wake Word Detection Engine
**Library:** Porcupine (Picovoice)
**Why:** Best accuracy, low CPU, custom wake words, free tier

```
┌─────────────────────────────────────────────────┐
│         VOICE INTERFACE PHASE 3                 │
│         (Always-Listening Service)              │
└─────────────────────────────────────────────────┘
                      │
                      ▼
        ┌─────────────────────────────┐
        │   Wake Word Detection       │
        │   (Porcupine/Vosk)          │
        │   - Hey Oracle              │
        │   - Hey Commander           │
        │   - Computer                │
        └─────────────────────────────┘
                      │
                      ▼ (Wake word detected)
        ┌─────────────────────────────┐
        │   Audio Buffer Start        │
        │   (Capture next 5 seconds)  │
        └─────────────────────────────┘
                      │
                      ▼
        ┌─────────────────────────────┐
        │   Voice Interface Phase 2   │
        │   (STT + NLP + Search)      │
        └─────────────────────────────┘
                      │
                      ▼
        ┌─────────────────────────────┐
        │   Response + TTS            │
        │   (Audio output)            │
        └─────────────────────────────┘
```

### Component 2: Background Service
**Function:** Always-listening daemon that runs in background
**CPU Usage:** < 5% when idle
**Memory:** ~50MB
**Privacy:** Only sends audio to STT after wake word detected

### Component 3: Audio Pipeline
```
Microphone → Wake Word Detection → [WAKE WORD?]
                                         │
                                         ├─ NO → Continue listening
                                         │
                                         └─ YES → Capture audio (5s)
                                                  │
                                                  ▼
                                             Send to Phase 2
                                                  │
                                                  ▼
                                             Process query
                                                  │
                                                  ▼
                                             Speak response
```

---

## 🔧 TECHNICAL IMPLEMENTATION

### Option 1: Porcupine (Recommended)
**Pros:**
- High accuracy (>95%)
- Very low CPU usage
- Custom wake words possible
- Cross-platform
- Active development

**Cons:**
- Requires API key (free tier: 3 wake words)
- Commercial license needed for production

**Installation:**
```bash
pip install pvporcupine
pip install pyaudio
```

**Code Structure:**
```python
import pvporcupine
import pyaudio
import struct

class WakeWordDetector:
    def __init__(self, access_key):
        self.porcupine = pvporcupine.create(
            access_key=access_key,
            keywords=["hey oracle", "hey commander", "computer"]
        )
        self.audio_stream = None

    def start_listening(self):
        # Open audio stream
        # Listen for wake word
        # When detected, trigger Voice Interface Phase 2
        pass
```

### Option 2: Vosk (Offline Fallback)
**Pros:**
- Completely offline
- No API keys needed
- Open source
- Good accuracy

**Cons:**
- Higher CPU usage
- Larger memory footprint
- Less accurate than Porcupine

**Installation:**
```bash
pip install vosk
```

---

## 🎨 USER EXPERIENCE FLOW

### Scenario 1: Successful Wake + Query
```
User: "Hey Oracle, what frameworks did we build last month?"
System: [WAKE WORD DETECTED] "Oracle listening..."
System: [PROCESSING] (2-3 seconds)
System: [SPEAKING] "Found 105 matches from last month. The top frameworks include..."
```

### Scenario 2: Wake Word Only (No Follow-up)
```
User: "Hey Oracle"
System: [WAKE WORD DETECTED] "Oracle listening..."
System: [TIMEOUT - 5 seconds no speech]
System: [AUDIO FEEDBACK] "No query detected. Say 'Hey Oracle' to try again."
```

### Scenario 3: Background Operation
```
System: [ALWAYS LISTENING] (No visual feedback)
User: "Hey Commander, summarize today's work"
System: [WAKE WORD DETECTED] "Commander mode activated. Listening..."
System: [SPEAKING] "Today's work: 3 autonomous sessions, 12 deliverables, 1841 lines of code..."
```

---

## 🔒 PRIVACY & SECURITY

### Privacy-First Design
1. **Local Processing:** Wake word detection happens entirely on device
2. **No Cloud:** Audio only sent to OpenAI STT after wake word detected
3. **User Control:** Easy on/off toggle
4. **Visual Indicator:** Show when system is listening vs. processing
5. **Audio Buffer:** Only last 5 seconds kept in memory

### Security Considerations
1. **API Key Storage:** Store Porcupine/OpenAI keys securely
2. **Audio Data:** Never stored to disk unless user explicitly saves
3. **Network:** Only transmit audio when necessary
4. **Access Control:** System-wide service runs with user permissions

---

## 📦 DELIVERABLES (Phase 3)

### Core Files
1. **wake_word_detector.py** (300-400 lines)
   - Porcupine integration
   - Audio stream management
   - Wake word callback system

2. **always_listening_service.py** (200-300 lines)
   - Background service
   - System tray integration
   - Start/stop controls

3. **voice_interface_v3_integrated.py** (100-200 lines)
   - Integration layer
   - Combines wake word + Phase 2
   - Main entry point

### Configuration
4. **wake_word_config.json**
   - Wake word settings
   - Sensitivity thresholds
   - Audio device selection

### Documentation
5. **VOICE_INTERFACE_PHASE_3_GUIDE.md**
   - Installation instructions
   - Usage guide
   - Troubleshooting

6. **C3T3_VOICE_INTERFACE_PHASE_3_COMPLETE.md**
   - Completion report
   - Test results
   - Next steps (Phase 4)

---

## 🧪 TESTING PLAN

### Test 1: Wake Word Detection Accuracy
- Test all 3 wake words 10 times each
- Measure false positive rate
- Measure false negative rate
- Target: >95% accuracy

### Test 2: Background Service Stability
- Run for 1 hour continuously
- Monitor CPU usage
- Monitor memory usage
- Target: <5% CPU, <50MB RAM

### Test 3: End-to-End Integration
- Wake word → Query → Response
- Test 5 different query types
- Verify Phase 2 NLP still works correctly

### Test 4: Privacy Verification
- Confirm no audio sent before wake word
- Verify audio buffer cleared after response
- Check no files written to disk

---

## ⏱️ ESTIMATED TIMELINE

**Total Time:** 2 hours

**Breakdown:**
- Wake word detection engine: 45 minutes
- Background service: 30 minutes
- Integration with Phase 2: 20 minutes
- Testing: 15 minutes
- Documentation: 10 minutes

---

## 🚀 PHASE 4 PREVIEW (Future)

After Phase 3 is complete, Phase 4 could include:
- System service installation (runs on boot)
- Multi-user support
- Custom voice profiles
- Advanced audio processing
- Remote access (Tailscale integration)
- Mobile app integration

---

## 📊 SUCCESS CRITERIA

Phase 3 is complete when:
- ✅ Wake word detection working with >95% accuracy
- ✅ Background service runs stably for 1+ hour
- ✅ Integration with Phase 2 seamless
- ✅ CPU usage <5% when idle
- ✅ Privacy guarantees verified
- ✅ Documentation complete
- ✅ All tests passing

---

**C3T3 Oracle - Phase 3 Design Complete**

Architecture designed. Ready to begin implementation.
