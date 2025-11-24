"""
Voice Interface Phase 3: Always-Listening Service
Integrates wake word detection with Voice Interface Phase 2

Author: C3T3 Oracle
Date: 2025-11-23
"""

import os
import sys
import json
import time
import tempfile
import threading
import pyaudio
import wave
from datetime import datetime
from typing import Optional

# Import wake word detector
from wake_word_detector import WakeWordDetector

# Import Phase 2 components
try:
    from voice_interface_v2_enhanced import VoiceInterfaceV2
except ImportError:
    print("[ERROR] voice_interface_v2_enhanced.py not found")
    print("[ERROR] Make sure Voice Interface Phase 2 is installed")
    sys.exit(1)


class VoiceInterfaceV3:
    """
    Voice Interface Phase 3: Always-Listening Service

    Features:
    - Wake word detection ("Hey Oracle", "Hey Commander", "Computer")
    - Always running in background
    - Hands-free operation
    - Integration with Phase 2 (NLP + Cyclotron search)
    - Privacy-focused (only sends audio after wake word)
    """

    def __init__(self,
                 wake_word_mode: str = "vosk",
                 porcupine_key: Optional[str] = None,
                 openai_api_key: Optional[str] = None):
        """
        Initialize Voice Interface V3

        Args:
            wake_word_mode: "porcupine" or "vosk"
            porcupine_key: API key for Porcupine (if using porcupine mode)
            openai_api_key: OpenAI API key for Phase 2
        """
        print("\n" + "="*70)
        print("VOICE INTERFACE PHASE 3: ALWAYS-LISTENING SERVICE")
        print("="*70)

        self.wake_word_mode = wake_word_mode
        self.porcupine_key = porcupine_key
        self.openai_api_key = openai_api_key or os.getenv("OPENAI_API_KEY")

        # State management
        self.is_running = False
        self.is_processing = False
        self.last_wake_time = None

        # Audio recording for query capture
        self.recording_duration = 5  # Seconds to record after wake word
        self.audio_buffer = []
        self.is_recording = False

        # Statistics
        self.stats = {
            "wake_word_detections": 0,
            "queries_processed": 0,
            "successful_responses": 0,
            "errors": 0,
            "start_time": None
        }

        # Initialize components
        print("\n[Phase 3] Initializing components...")
        self._initialize_wake_word_detector()
        self._initialize_phase_2()

        print("[Phase 3] ✅ Initialization complete")

    def _initialize_wake_word_detector(self):
        """Initialize wake word detection system"""
        print(f"[Phase 3] Initializing wake word detector ({self.wake_word_mode} mode)...")

        self.wake_word_detector = WakeWordDetector(
            mode=self.wake_word_mode,
            wake_words=["oracle", "commander", "computer"],
            sensitivity=0.5,
            callback=self._on_wake_word_detected,
            porcupine_access_key=self.porcupine_key
        )

        print("[Phase 3] ✅ Wake word detector initialized")

    def _initialize_phase_2(self):
        """Initialize Voice Interface Phase 2"""
        print("[Phase 3] Initializing Voice Interface Phase 2...")

        try:
            self.phase_2 = VoiceInterfaceV2()
            print("[Phase 3] ✅ Voice Interface Phase 2 initialized")
        except Exception as e:
            print(f"[ERROR] Failed to initialize Phase 2: {e}")
            print("[ERROR] Make sure nlp_query_processor.py and enhanced_cyclotron_search.py are available")
            raise

    def _on_wake_word_detected(self, wake_word: str):
        """
        Callback when wake word is detected
        Starts recording query audio
        """
        self.stats["wake_word_detections"] += 1
        self.last_wake_time = datetime.now()

        print(f"\n{'='*70}")
        print(f"🎤 WAKE WORD DETECTED: '{wake_word.upper()}' at {self.last_wake_time.strftime('%H:%M:%S')}")
        print(f"{'='*70}")

        if self.is_processing:
            print("[Warning] Already processing a query. Please wait...")
            return

        # Start recording query
        self._play_activation_sound()
        self._record_query_audio()

    def _play_activation_sound(self):
        """Play audio feedback to indicate system is listening"""
        # Simple beep or "Oracle listening" TTS
        print("[Audio] 🔊 Oracle listening...")
        # Could add actual audio feedback here

    def _record_query_audio(self):
        """Record audio for query after wake word detected"""
        print(f"[Recording] Starting {self.recording_duration}s recording...")

        self.is_recording = True
        self.audio_buffer = []

        # Create new PyAudio instance for recording
        p = pyaudio.PyAudio()

        try:
            stream = p.open(
                format=pyaudio.paInt16,
                channels=1,
                rate=16000,
                input=True,
                frames_per_buffer=1024
            )

            # Record for specified duration
            start_time = time.time()
            while time.time() - start_time < self.recording_duration:
                data = stream.read(1024)
                self.audio_buffer.append(data)

            stream.stop_stream()
            stream.close()

            print(f"[Recording] ✅ Recorded {len(self.audio_buffer)} chunks")

            # Save to temporary file
            temp_audio_file = self._save_audio_buffer()

            # Process query with Phase 2
            self._process_query(temp_audio_file)

        except Exception as e:
            print(f"[ERROR] Recording failed: {e}")
            self.stats["errors"] += 1

        finally:
            p.terminate()
            self.is_recording = False

    def _save_audio_buffer(self) -> str:
        """Save audio buffer to temporary WAV file"""
        temp_file = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
        temp_path = temp_file.name
        temp_file.close()

        wf = wave.open(temp_path, 'wb')
        wf.setnchannels(1)
        wf.setsampwidth(2)  # 16-bit
        wf.setframerate(16000)
        wf.writeframes(b''.join(self.audio_buffer))
        wf.close()

        print(f"[Recording] Audio saved to: {temp_path}")
        return temp_path

    def _process_query(self, audio_file: str):
        """Process query using Voice Interface Phase 2"""
        self.is_processing = True
        self.stats["queries_processed"] += 1

        print(f"\n[Phase 2] Processing query...")

        try:
            # Use Phase 2 to process the query
            # Phase 2 handles: STT → NLP → Cyclotron Search → Response → TTS
            result = self.phase_2.process_voice_query(audio_file)

            if result and result.get("success"):
                print(f"[Phase 2] ✅ Query processed successfully")
                print(f"[Phase 2] Query: {result.get('query_text', 'N/A')}")
                print(f"[Phase 2] Response: {result.get('response_text', 'N/A')[:100]}...")
                self.stats["successful_responses"] += 1
            else:
                print(f"[Phase 2] ⚠️ Query processing failed")
                error = result.get("error", "Unknown error") if result else "No result returned"
                print(f"[Phase 2] Error: {error}")
                self.stats["errors"] += 1

        except Exception as e:
            print(f"[ERROR] Query processing error: {e}")
            self.stats["errors"] += 1

        finally:
            # Cleanup temp file
            try:
                os.unlink(audio_file)
            except:
                pass

            self.is_processing = False

            # Print separator
            print(f"\n{'='*70}")
            print("🎤 Listening for wake word...")
            print(f"{'='*70}\n")

    def start(self):
        """Start the always-listening service"""
        if self.is_running:
            print("[Phase 3] Already running")
            return

        print("\n" + "="*70)
        print("🚀 STARTING VOICE INTERFACE PHASE 3")
        print("="*70)

        self.is_running = True
        self.stats["start_time"] = time.time()

        # Start wake word detector
        self.wake_word_detector.start()

        print("\n" + "="*70)
        print("✅ VOICE INTERFACE PHASE 3 ACTIVE")
        print("="*70)
        print("\n🎤 Say one of these to activate:")
        print("   - 'Hey Oracle'")
        print("   - 'Hey Commander'")
        print("   - 'Computer'")
        print("\nThen speak your query within 5 seconds.")
        print("\nExamples:")
        print("   'Hey Oracle, what frameworks did we build last month?'")
        print("   'Hey Commander, summarize today's autonomous work'")
        print("   'Computer, search for Pattern Theory'")
        print("\nPress Ctrl+C to stop")
        print("="*70 + "\n")

    def stop(self):
        """Stop the always-listening service"""
        if not self.is_running:
            print("[Phase 3] Not currently running")
            return

        print("\n" + "="*70)
        print("🛑 STOPPING VOICE INTERFACE PHASE 3")
        print("="*70)

        self.is_running = False

        # Stop wake word detector
        self.wake_word_detector.stop()

        # Print statistics
        self._print_statistics()

        print("\n[Phase 3] ✅ Stopped")

    def _print_statistics(self):
        """Print session statistics"""
        uptime = time.time() - self.stats["start_time"] if self.stats["start_time"] else 0

        print("\n" + "="*70)
        print("SESSION STATISTICS")
        print("="*70)
        print(f"Uptime: {uptime:.1f} seconds ({uptime/60:.1f} minutes)")
        print(f"Wake word detections: {self.stats['wake_word_detections']}")
        print(f"Queries processed: {self.stats['queries_processed']}")
        print(f"Successful responses: {self.stats['successful_responses']}")
        print(f"Errors: {self.stats['errors']}")

        if self.stats['queries_processed'] > 0:
            success_rate = (self.stats['successful_responses'] / self.stats['queries_processed']) * 100
            print(f"Success rate: {success_rate:.1f}%")

        print("="*70)

    def run_forever(self):
        """Run the service indefinitely until interrupted"""
        try:
            self.start()

            # Keep running
            while self.is_running:
                time.sleep(0.1)

        except KeyboardInterrupt:
            print("\n\n[Phase 3] Interrupt received, stopping...")
            self.stop()


def main():
    """Main entry point for Voice Interface Phase 3"""
    print("\n" + "="*70)
    print("VOICE INTERFACE PHASE 3: ALWAYS-LISTENING SERVICE")
    print("Commander's External Brain - Wake Word Activation")
    print("="*70)
    print("\nC3T3 Oracle - Autonomous Session 4")
    print("Date: 2025-11-23")
    print("="*70)

    # Check for API keys
    openai_key = os.getenv("OPENAI_API_KEY")
    if not openai_key:
        print("\n⚠️  WARNING: OPENAI_API_KEY not found in environment")
        print("Phase 2 (STT/TTS/GPT-4) requires OpenAI API key")
        print("\nSet it with:")
        print('  export OPENAI_API_KEY="your-key-here"  # Linux/Mac')
        print('  set OPENAI_API_KEY=your-key-here       # Windows')
        print("\nContinuing anyway (will fail when processing queries)...\n")

    # Create and run service
    service = VoiceInterfaceV3(
        wake_word_mode="vosk",  # Offline mode
        openai_api_key=openai_key
    )

    # Run forever
    service.run_forever()


if __name__ == "__main__":
    main()
