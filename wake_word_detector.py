"""
Voice Interface Phase 3: Wake Word Detection Engine
Supports both Porcupine (cloud) and Vosk (offline) detection methods

Author: C3T3 Oracle
Date: 2025-11-23
"""

import os
import sys
import json
import time
import threading
import queue
import pyaudio
import wave
from typing import Callable, Optional, List
from datetime import datetime


class WakeWordDetector:
    """
    Dual-mode wake word detection system.
    Supports Porcupine (high accuracy) and Vosk (offline fallback)
    """

    def __init__(self,
                 mode: str = "vosk",  # "porcupine" or "vosk"
                 wake_words: List[str] = None,
                 sensitivity: float = 0.5,
                 callback: Optional[Callable] = None,
                 porcupine_access_key: Optional[str] = None):
        """
        Initialize wake word detector

        Args:
            mode: Detection mode ("porcupine" or "vosk")
            wake_words: List of wake words to detect (default: ["oracle", "commander"])
            sensitivity: Detection sensitivity 0.0-1.0
            callback: Function to call when wake word detected
            porcupine_access_key: API key for Porcupine (required if mode="porcupine")
        """
        self.mode = mode
        self.wake_words = wake_words or ["oracle", "commander", "computer"]
        self.sensitivity = sensitivity
        self.callback = callback
        self.porcupine_access_key = porcupine_access_key

        # Audio configuration
        self.sample_rate = 16000
        self.chunk_size = 512
        self.channels = 1
        self.format = pyaudio.paInt16

        # State management
        self.is_listening = False
        self.audio_queue = queue.Queue()
        self.pyaudio_instance = None
        self.stream = None

        # Detection engine
        self.detector = None

        # Statistics
        self.stats = {
            "detections": 0,
            "false_positives": 0,
            "start_time": None,
            "uptime_seconds": 0
        }

        print(f"[WakeWordDetector] Initializing in {mode} mode")
        print(f"[WakeWordDetector] Wake words: {', '.join(self.wake_words)}")

        # Initialize detector based on mode
        self._initialize_detector()

    def _initialize_detector(self):
        """Initialize the appropriate detection engine"""
        if self.mode == "porcupine":
            self._initialize_porcupine()
        elif self.mode == "vosk":
            self._initialize_vosk()
        else:
            raise ValueError(f"Invalid mode: {self.mode}. Use 'porcupine' or 'vosk'")

    def _initialize_porcupine(self):
        """Initialize Porcupine wake word detection"""
        try:
            import pvporcupine

            if not self.porcupine_access_key:
                raise ValueError("Porcupine access key required for porcupine mode")

            # Create Porcupine instance
            self.detector = pvporcupine.create(
                access_key=self.porcupine_access_key,
                keywords=self.wake_words,
                sensitivities=[self.sensitivity] * len(self.wake_words)
            )

            # Update audio config to match Porcupine requirements
            self.sample_rate = self.detector.sample_rate
            self.chunk_size = self.detector.frame_length

            print(f"[Porcupine] Initialized successfully")
            print(f"[Porcupine] Sample rate: {self.sample_rate}Hz")
            print(f"[Porcupine] Frame length: {self.chunk_size}")

        except ImportError:
            print("[ERROR] Porcupine not installed. Install with: pip install pvporcupine")
            sys.exit(1)
        except Exception as e:
            print(f"[ERROR] Failed to initialize Porcupine: {e}")
            sys.exit(1)

    def _initialize_vosk(self):
        """Initialize Vosk wake word detection"""
        try:
            from vosk import Model, KaldiRecognizer

            # Download model if not exists
            model_path = "vosk-model-small-en-us-0.15"
            if not os.path.exists(model_path):
                print(f"[Vosk] Downloading model to {model_path}...")
                print("[Vosk] This may take a few minutes on first run...")
                # User needs to download manually from https://alphacephei.com/vosk/models
                print("[Vosk] Please download vosk-model-small-en-us-0.15 from:")
                print("[Vosk] https://alphacephei.com/vosk/models")
                print(f"[Vosk] Extract to: {os.path.abspath(model_path)}")
                raise FileNotFoundError(f"Vosk model not found: {model_path}")

            # Initialize Vosk model
            self.detector = {
                "model": Model(model_path),
                "recognizer": None  # Created when stream starts
            }

            print(f"[Vosk] Initialized successfully")
            print(f"[Vosk] Model: {model_path}")
            print(f"[Vosk] Sample rate: {self.sample_rate}Hz")

        except ImportError:
            print("[ERROR] Vosk not installed. Install with: pip install vosk")
            sys.exit(1)
        except Exception as e:
            print(f"[ERROR] Failed to initialize Vosk: {e}")
            sys.exit(1)

    def start(self):
        """Start listening for wake words"""
        if self.is_listening:
            print("[WakeWordDetector] Already listening")
            return

        print("[WakeWordDetector] Starting wake word detection...")
        self.is_listening = True
        self.stats["start_time"] = time.time()

        # Start audio stream
        self._start_audio_stream()

        # Start detection thread
        detection_thread = threading.Thread(target=self._detection_loop, daemon=True)
        detection_thread.start()

        print("[WakeWordDetector] ✅ Listening for wake words...")
        print(f"[WakeWordDetector] Say: 'Hey {self.wake_words[0].title()}' to activate")

    def stop(self):
        """Stop listening for wake words"""
        if not self.is_listening:
            print("[WakeWordDetector] Not currently listening")
            return

        print("[WakeWordDetector] Stopping wake word detection...")
        self.is_listening = False

        # Stop audio stream
        self._stop_audio_stream()

        # Cleanup detector
        if self.mode == "porcupine" and self.detector:
            self.detector.delete()

        # Update stats
        if self.stats["start_time"]:
            self.stats["uptime_seconds"] = time.time() - self.stats["start_time"]

        print("[WakeWordDetector] ✅ Stopped")
        self._print_stats()

    def _start_audio_stream(self):
        """Start PyAudio stream"""
        self.pyaudio_instance = pyaudio.PyAudio()

        try:
            self.stream = self.pyaudio_instance.open(
                rate=self.sample_rate,
                channels=self.channels,
                format=self.format,
                input=True,
                frames_per_buffer=self.chunk_size,
                stream_callback=self._audio_callback
            )
            self.stream.start_stream()
            print("[Audio] Stream started")
        except Exception as e:
            print(f"[ERROR] Failed to start audio stream: {e}")
            raise

    def _stop_audio_stream(self):
        """Stop PyAudio stream"""
        if self.stream:
            self.stream.stop_stream()
            self.stream.close()
        if self.pyaudio_instance:
            self.pyaudio_instance.terminate()
        print("[Audio] Stream stopped")

    def _audio_callback(self, in_data, frame_count, time_info, status):
        """PyAudio callback - receives audio data"""
        if self.is_listening:
            self.audio_queue.put(in_data)
        return (in_data, pyaudio.paContinue)

    def _detection_loop(self):
        """Main detection loop - processes audio and detects wake words"""

        if self.mode == "vosk":
            # Initialize Vosk recognizer
            from vosk import KaldiRecognizer
            self.detector["recognizer"] = KaldiRecognizer(
                self.detector["model"],
                self.sample_rate
            )

        print("[Detection] Loop started")

        while self.is_listening:
            try:
                # Get audio data from queue
                audio_data = self.audio_queue.get(timeout=0.1)

                # Process based on mode
                if self.mode == "porcupine":
                    result = self._process_porcupine(audio_data)
                elif self.mode == "vosk":
                    result = self._process_vosk(audio_data)

                # Handle wake word detection
                if result:
                    wake_word = result
                    self.stats["detections"] += 1
                    print(f"\n🎤 WAKE WORD DETECTED: '{wake_word}' at {datetime.now().strftime('%H:%M:%S')}")

                    # Call callback if provided
                    if self.callback:
                        self.callback(wake_word)

            except queue.Empty:
                continue
            except Exception as e:
                print(f"[ERROR] Detection loop error: {e}")
                continue

        print("[Detection] Loop stopped")

    def _process_porcupine(self, audio_data) -> Optional[str]:
        """Process audio with Porcupine"""
        import struct

        # Convert audio data to PCM
        pcm = struct.unpack_from("h" * self.chunk_size, audio_data)

        # Process frame
        keyword_index = self.detector.process(pcm)

        if keyword_index >= 0:
            return self.wake_words[keyword_index]

        return None

    def _process_vosk(self, audio_data) -> Optional[str]:
        """Process audio with Vosk"""
        recognizer = self.detector["recognizer"]

        if recognizer.AcceptWaveform(audio_data):
            result = json.loads(recognizer.Result())
            text = result.get("text", "").lower()

            # Check if any wake word is in the recognized text
            for wake_word in self.wake_words:
                if wake_word.lower() in text:
                    return wake_word

        return None

    def _print_stats(self):
        """Print detection statistics"""
        print("\n" + "="*50)
        print("WAKE WORD DETECTION STATISTICS")
        print("="*50)
        print(f"Mode: {self.mode.upper()}")
        print(f"Wake words: {', '.join(self.wake_words)}")
        print(f"Total detections: {self.stats['detections']}")
        print(f"Uptime: {self.stats['uptime_seconds']:.1f} seconds")
        if self.stats['uptime_seconds'] > 0:
            rate = self.stats['detections'] / (self.stats['uptime_seconds'] / 60)
            print(f"Detection rate: {rate:.2f} per minute")
        print("="*50 + "\n")


def test_wake_word_detector():
    """Test the wake word detector"""
    print("\n" + "="*60)
    print("VOICE INTERFACE PHASE 3: WAKE WORD DETECTOR TEST")
    print("="*60)

    def on_wake_word_detected(wake_word: str):
        """Callback when wake word is detected"""
        print(f"\n✅ SUCCESS! Wake word detected: '{wake_word}'")
        print("Voice Interface Phase 2 would activate here...")

    # Create detector (defaults to Vosk offline mode)
    detector = WakeWordDetector(
        mode="vosk",
        wake_words=["oracle", "commander", "computer"],
        sensitivity=0.5,
        callback=on_wake_word_detected
    )

    try:
        # Start listening
        detector.start()

        print("\n" + "="*60)
        print("🎤 LISTENING FOR WAKE WORDS")
        print("="*60)
        print("Try saying:")
        print("  - 'Hey Oracle'")
        print("  - 'Hey Commander'")
        print("  - 'Computer'")
        print("\nPress Ctrl+C to stop")
        print("="*60 + "\n")

        # Keep running
        while True:
            time.sleep(0.1)

    except KeyboardInterrupt:
        print("\n\n[Test] Stopping...")
        detector.stop()
        print("[Test] Test complete")


if __name__ == "__main__":
    test_wake_word_detector()
