"""
Voice Interface POC - Commander's External Brain
Proof of Concept for voice-activated knowledge base queries

Design: C3T3 Oracle
Date: 2025-11-23
Status: Phase 1 - Proof of Concept

Flow:
1. Record audio (microphone input)
2. Speech-to-Text (OpenAI Whisper API)
3. Query processing (extract keywords)
4. Cyclotron search (knowledge retrieval)
5. Response generation (GPT-4)
6. Text-to-Speech (OpenAI TTS)
"""

import os
import json
import glob
import openai
import pyaudio
import wave
from datetime import datetime
from pathlib import Path

# Configuration
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
if not OPENAI_API_KEY:
    print("[ERROR] OPENAI_API_KEY not found in environment variables")
    print("[INFO] Set it with: set OPENAI_API_KEY=your_key_here")
    exit(1)

openai.api_key = OPENAI_API_KEY

# Audio settings
CHUNK = 1024
FORMAT = pyaudio.paInt16
CHANNELS = 1
RATE = 16000
RECORD_SECONDS = 5  # Max recording time
AUDIO_TEMP_FILE = "temp_query_audio.wav"
RESPONSE_AUDIO_FILE = "temp_response_audio.mp3"

# Cyclotron configuration
CYCLOTRON_STORAGE = r"C:\Users\Darrick\DATA_CYCLOTRON_STORAGE"


class VoiceInterface:
    """Commander's External Brain - Voice Interface"""

    def __init__(self):
        self.knowledge_base = []
        self.query_history = []
        print("[OK] Voice Interface initialized")
        print(f"[INFO] Cyclotron: {CYCLOTRON_STORAGE}")

    def record_audio(self):
        """Record audio from microphone"""
        print("\n[RECORDING] Speak your query now...")
        print(f"[INFO] Recording for up to {RECORD_SECONDS} seconds")
        print("[INFO] Press Ctrl+C to stop early")

        audio = pyaudio.PyAudio()

        try:
            stream = audio.open(
                format=FORMAT,
                channels=CHANNELS,
                rate=RATE,
                input=True,
                frames_per_buffer=CHUNK
            )

            frames = []

            for i in range(0, int(RATE / CHUNK * RECORD_SECONDS)):
                try:
                    data = stream.read(CHUNK)
                    frames.append(data)
                except KeyboardInterrupt:
                    print("\n[OK] Recording stopped early")
                    break

            stream.stop_stream()
            stream.close()

            # Save to file
            wf = wave.open(AUDIO_TEMP_FILE, 'wb')
            wf.setnchannels(CHANNELS)
            wf.setsampwidth(audio.get_sample_size(FORMAT))
            wf.setframerate(RATE)
            wf.writeframes(b''.join(frames))
            wf.close()

            print(f"[OK] Audio saved to {AUDIO_TEMP_FILE}")
            return AUDIO_TEMP_FILE

        finally:
            audio.terminate()

    def speech_to_text(self, audio_file):
        """Convert speech to text using OpenAI Whisper"""
        print("[PROCESSING] Converting speech to text...")

        try:
            with open(audio_file, "rb") as f:
                transcript = openai.Audio.transcribe("whisper-1", f)

            query_text = transcript['text']
            print(f"[OK] Heard: \"{query_text}\"")
            return query_text

        except Exception as e:
            print(f"[ERROR] Speech-to-text failed: {e}")
            return None

    def process_query(self, query_text):
        """Extract keywords and intent from natural language query"""
        print("[PROCESSING] Analyzing query...")

        try:
            response = openai.ChatCompletion.create(
                model="gpt-4",
                messages=[
                    {
                        "role": "system",
                        "content": "Extract search keywords from user queries about a knowledge base. Return JSON with 'keywords' (list) and 'intent' (string)."
                    },
                    {
                        "role": "user",
                        "content": f"Query: {query_text}\n\nExtract keywords for searching."
                    }
                ],
                temperature=0.3,
                max_tokens=200
            )

            result = json.loads(response.choices[0].message['content'])
            print(f"[OK] Keywords: {result.get('keywords', [])}")
            return result

        except Exception as e:
            print(f"[ERROR] Query processing failed: {e}")
            # Fallback: simple keyword extraction
            keywords = query_text.lower().split()
            return {"keywords": keywords, "intent": "search"}

    def search_cyclotron(self, keywords):
        """Search Cyclotron knowledge base for matching items"""
        print("[SEARCHING] Querying Cyclotron...")

        # Load knowledge base if not already loaded
        if not self.knowledge_base:
            self.load_knowledge_base()

        # Search for matches
        results = []
        search_terms = [k.lower() for k in keywords]

        for item in self.knowledge_base:
            # Check if any keyword matches in item content
            item_text = json.dumps(item).lower()
            score = sum(1 for term in search_terms if term in item_text)

            if score > 0:
                results.append({
                    "item": item,
                    "score": score
                })

        # Sort by relevance
        results.sort(key=lambda x: x['score'], reverse=True)

        print(f"[OK] Found {len(results)} matches")
        return results[:10]  # Top 10 results

    def load_knowledge_base(self):
        """Load Cyclotron knowledge base into memory"""
        print("[LOADING] Loading Cyclotron knowledge base...")

        json_files = glob.glob(f"{CYCLOTRON_STORAGE}/*.json")

        count = 0
        for json_file in json_files[:100]:  # Limit to first 100 files for POC
            try:
                with open(json_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    if isinstance(data, list):
                        self.knowledge_base.extend(data)
                    else:
                        self.knowledge_base.append(data)
                    count += 1
            except:
                pass

        print(f"[OK] Loaded {len(self.knowledge_base)} knowledge items from {count} files")

    def generate_response(self, query_text, search_results):
        """Generate natural language response from search results"""
        print("[GENERATING] Creating response...")

        try:
            # Prepare context from search results
            context = ""
            for i, result in enumerate(search_results[:5], 1):
                item = result['item']
                context += f"\nResult {i}: {json.dumps(item, indent=2)[:500]}...\n"

            if not context:
                context = "No relevant information found in knowledge base."

            response = openai.ChatCompletion.create(
                model="gpt-4",
                messages=[
                    {
                        "role": "system",
                        "content": "You are Commander's External Brain. Answer queries based on the knowledge base search results. Be concise and natural."
                    },
                    {
                        "role": "user",
                        "content": f"Query: {query_text}\n\nSearch Results:\n{context}\n\nProvide a natural, spoken response."
                    }
                ],
                temperature=0.7,
                max_tokens=300
            )

            response_text = response.choices[0].message['content']
            print(f"[OK] Response: \"{response_text[:100]}...\"")
            return response_text

        except Exception as e:
            print(f"[ERROR] Response generation failed: {e}")
            return "I encountered an error processing your query."

    def text_to_speech(self, text):
        """Convert text to speech using OpenAI TTS"""
        print("[SPEAKING] Converting response to speech...")

        try:
            response = openai.Audio.create(
                model="tts-1",
                voice="alloy",
                input=text
            )

            # Save audio
            with open(RESPONSE_AUDIO_FILE, 'wb') as f:
                f.write(response['audio'])

            print(f"[OK] Audio response saved to {RESPONSE_AUDIO_FILE}")

            # Play audio (Windows)
            os.system(f'start "" "{RESPONSE_AUDIO_FILE}"')

            return RESPONSE_AUDIO_FILE

        except Exception as e:
            print(f"[ERROR] Text-to-speech failed: {e}")
            print(f"[FALLBACK] Response text: {text}")
            return None

    def process_voice_query(self):
        """Complete voice query flow"""
        print("\n" + "="*60)
        print("VOICE INTERFACE - Commander's External Brain")
        print("="*60)

        # Step 1: Record audio
        audio_file = self.record_audio()
        if not audio_file:
            return False

        # Step 2: Speech to text
        query_text = self.speech_to_text(audio_file)
        if not query_text:
            return False

        # Step 3: Process query
        query_data = self.process_query(query_text)
        keywords = query_data.get('keywords', [])

        # Step 4: Search knowledge base
        results = self.search_cyclotron(keywords)

        # Step 5: Generate response
        response_text = self.generate_response(query_text, results)

        # Step 6: Text to speech
        self.text_to_speech(response_text)

        # Log query
        self.query_history.append({
            "timestamp": datetime.now().isoformat(),
            "query": query_text,
            "keywords": keywords,
            "results_count": len(results),
            "response": response_text
        })

        print("\n[OK] Query complete!")
        return True

    def text_query_mode(self):
        """Text-only mode for testing without microphone"""
        print("\n" + "="*60)
        print("TEXT QUERY MODE - No microphone required")
        print("="*60)

        query_text = input("\nEnter your query: ").strip()

        if not query_text:
            print("[ERROR] No query provided")
            return False

        print(f"\n[OK] Query: \"{query_text}\"")

        # Process query
        query_data = self.process_query(query_text)
        keywords = query_data.get('keywords', [])

        # Search
        results = self.search_cyclotron(keywords)

        # Generate response
        response_text = self.generate_response(query_text, results)

        print("\n" + "-"*60)
        print("RESPONSE:")
        print(response_text)
        print("-"*60)

        # Optional: Text to speech
        tts = input("\nSpeak response? (y/n): ").strip().lower()
        if tts == 'y':
            self.text_to_speech(response_text)

        return True


def main():
    """Main entry point"""
    print("\n" + "="*60)
    print("VOICE INTERFACE POC - Commander's External Brain")
    print("="*60)
    print("\nDesigned by: C3T3 Oracle")
    print("Date: 2025-11-23")
    print("Status: Phase 1 - Proof of Concept")

    # Check API key
    if not OPENAI_API_KEY:
        print("\n[ERROR] OpenAI API key not configured")
        return

    # Initialize interface
    interface = VoiceInterface()

    # Mode selection
    print("\n" + "="*60)
    print("SELECT MODE:")
    print("1. Voice Mode (requires microphone)")
    print("2. Text Mode (no microphone required)")
    print("="*60)

    mode = input("\nEnter mode (1 or 2): ").strip()

    if mode == "1":
        # Voice mode
        try:
            interface.process_voice_query()
        except KeyboardInterrupt:
            print("\n\n[OK] Interrupted by user")

    elif mode == "2":
        # Text mode
        while True:
            try:
                interface.text_query_mode()

                again = input("\nAnother query? (y/n): ").strip().lower()
                if again != 'y':
                    break
            except KeyboardInterrupt:
                print("\n\n[OK] Interrupted by user")
                break

    else:
        print("[ERROR] Invalid mode selected")

    # Save query history
    if interface.query_history:
        history_file = f"voice_interface_history_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(history_file, 'w') as f:
            json.dump(interface.query_history, f, indent=2)
        print(f"\n[OK] Query history saved to {history_file}")

    print("\n[OK] Voice Interface POC session complete")


if __name__ == "__main__":
    main()
