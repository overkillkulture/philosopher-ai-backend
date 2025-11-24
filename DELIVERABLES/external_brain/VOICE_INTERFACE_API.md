# 📚 Voice Interface API Documentation
## Complete API Reference for Voice Interface System

**Version:** 3.0
**Date:** 2025-11-24
**Author:** C2 Architect

---

## 📋 OVERVIEW

This document provides comprehensive API documentation for all Voice Interface components, enabling:
- Third-party integrations
- Custom extensions
- Advanced configurations
- Programmatic control

---

## 🎤 WakeWordDetector Class

**File:** `wake_word_detector.py`

### Class Definition

```python
class WakeWordDetector:
    """
    Continuous wake word detection engine supporting Vosk (offline)
    and Porcupine (cloud) modes.
    """
```

### Constructor

```python
def __init__(
    self,
    mode: str = 'vosk',
    keywords: List[str] = ['oracle', 'commander', 'computer'],
    sensitivity: float = 0.5,
    model_path: str = None,
    access_key: str = None,
    callback: Callable = None
)
```

**Parameters:**
- `mode` (str): Detection mode - 'vosk' or 'porcupine'
- `keywords` (List[str]): Wake words to detect
- `sensitivity` (float): Detection sensitivity (0.0-1.0)
- `model_path` (str): Path to Vosk model directory (vosk mode only)
- `access_key` (str): Porcupine API key (porcupine mode only)
- `callback` (Callable): Function to call when wake word detected

**Returns:** WakeWordDetector instance

**Example:**
```python
def on_wake_word(keyword):
    print(f"Wake word detected: {keyword}")

detector = WakeWordDetector(
    mode='vosk',
    keywords=['oracle', 'commander'],
    sensitivity=0.7,
    model_path='/home/user/vosk-model-small-en-us-0.15/',
    callback=on_wake_word
)
```

### Methods

#### start()

```python
def start(self) -> None:
    """Start listening for wake words."""
```

**Description:** Begin continuous audio monitoring and wake word detection.

**Example:**
```python
detector.start()  # Blocks until stop() called
```

---

#### stop()

```python
def stop(self) -> None:
    """Stop listening and cleanup resources."""
```

**Description:** Gracefully stop detection and release audio resources.

**Example:**
```python
detector.stop()
```

---

#### get_statistics()

```python
def get_statistics(self) -> Dict[str, Any]:
    """
    Get detection statistics.

    Returns:
        dict: Statistics including:
            - total_detections: Total wake word triggers
            - false_positives: Estimated false triggers
            - uptime_seconds: Time detector has been running
            - keywords: List of detected keywords with counts
    """
```

**Example:**
```python
stats = detector.get_statistics()
print(f"Total detections: {stats['total_detections']}")
print(f"Uptime: {stats['uptime_seconds']} seconds")
```

---

## 🎙️ VoiceInterfaceV3 Class

**File:** `voice_interface_v3_always_listening.py`

### Class Definition

```python
class VoiceInterfaceV3:
    """
    Main always-listening voice interface service.
    Integrates wake word detection, STT, NLP, search, and TTS.
    """
```

### Constructor

```python
def __init__(self, config_path: str = 'voice_interface_v3_config.json')
```

**Parameters:**
- `config_path` (str): Path to configuration JSON file

**Returns:** VoiceInterfaceV3 instance

**Example:**
```python
service = VoiceInterfaceV3(config_path='custom_config.json')
```

### Methods

#### start_service()

```python
def start_service(self) -> None:
    """
    Start the voice interface service.
    Blocks until service stopped (Ctrl+C or stop_service()).
    """
```

**Example:**
```python
service = VoiceInterfaceV3()
service.start_service()  # Blocks, listens for wake words
```

---

#### stop_service()

```python
def stop_service(self) -> None:
    """Gracefully stop the service and cleanup resources."""
```

**Example:**
```python
service.stop_service()
```

---

#### process_voice_query()

```python
def process_voice_query(self, audio_data: bytes) -> Dict[str, Any]:
    """
    Process audio query through full pipeline (STT → NLP → Search → Response → TTS).

    Args:
        audio_data: Raw audio bytes (16kHz, mono, PCM)

    Returns:
        dict: Result containing:
            - text_query: Transcribed query text
            - parsed_query: NLP parsed query object
            - search_results: Top N search results
            - response_text: Generated response
            - response_audio: TTS audio bytes
            - latency_ms: Processing time
    """
```

**Example:**
```python
with open('test_audio.wav', 'rb') as f:
    audio_data = f.read()

result = service.process_voice_query(audio_data)
print(f"Query: {result['text_query']}")
print(f"Response: {result['response_text']}")
```

---

## 🧠 NLPQueryProcessor Class

**File:** `nlp_query_processor.py`

### Class Definition

```python
class NLPQueryProcessor:
    """Natural language processing for voice queries."""
```

### Methods

#### process_query()

```python
def process_query(self, query: str) -> Dict[str, Any]:
    """
    Parse natural language query.

    Args:
        query: User query text

    Returns:
        dict: Parsed query containing:
            - text: Original query text
            - date_range: Tuple (start_date, end_date) or None
            - intent: Intent type (search/summarize/explain/etc.)
            - categories: List of detected categories
            - keywords: List of extracted keywords
    """
```

**Example:**
```python
nlp = NLPQueryProcessor()
parsed = nlp.process_query("What frameworks did we build last month?")

print(f"Date range: {parsed['date_range']}")  # (2025-10-24, 2025-11-23)
print(f"Intent: {parsed['intent']}")  # "search"
print(f"Categories: {parsed['categories']}")  # ["frameworks"]
print(f"Keywords: {parsed['keywords']}")  # ["build", "frameworks"]
```

---

#### parse_dates()

```python
def parse_dates(self, query: str) -> Optional[Tuple[datetime, datetime]]:
    """
    Extract date range from query.

    Args:
        query: Query text

    Returns:
        Tuple of (start_date, end_date) or None if no dates found

    Supported formats:
        - "last month", "this month", "next month"
        - "yesterday", "today", "tomorrow"
        - "last week", "this week", "next week"
        - "October", "November", etc. (month names)
        - "October 2024", "Nov 23", etc. (absolute dates)
    """
```

**Example:**
```python
dates = nlp.parse_dates("last month")
print(dates)  # (datetime(2025, 10, 24), datetime(2025, 11, 23))
```

---

## 🔍 EnhancedCyclotronSearch Class

**File:** `enhanced_cyclotron_search.py`

### Class Definition

```python
class EnhancedCyclotronSearch:
    """
    Intelligent search engine for Cyclotron knowledge base.
    Supports multiple search strategies and result ranking.
    """
```

### Constructor

```python
def __init__(
    self,
    cyclotron_path: str,
    state_file: str = 'araya_state.json'
)
```

**Parameters:**
- `cyclotron_path` (str): Path to Cyclotron directory
- `state_file` (str): Name of state JSON file

**Example:**
```python
search = EnhancedCyclotronSearch(
    cyclotron_path='/home/user/cyclotron',
    state_file='araya_state.json'
)
```

### Methods

#### search()

```python
def search(
    self,
    query: str,
    date_range: Optional[Tuple[datetime, datetime]] = None,
    categories: Optional[List[str]] = None,
    keywords: Optional[List[str]] = None,
    intent: str = 'search',
    max_results: int = 10
) -> List[Dict[str, Any]]:
    """
    Execute intelligent search.

    Args:
        query: Original query text
        date_range: Optional date filter (start, end)
        categories: Optional category filters
        keywords: Optional keyword filters
        intent: Intent type (affects strategy selection)
        max_results: Maximum results to return

    Returns:
        List of knowledge atoms ranked by relevance
    """
```

**Example:**
```python
from datetime import datetime

results = search.search(
    query="frameworks built last month",
    date_range=(datetime(2025, 10, 24), datetime(2025, 11, 23)),
    categories=["frameworks"],
    max_results=10
)

for result in results:
    print(f"- {result['title']}: {result['relevance_score']:.2f}")
```

---

## ⚙️ Configuration API

**File:** `voice_interface_v3_config.json`

### Configuration Schema

```json
{
  "wake_word": {
    "mode": "vosk | porcupine",
    "keywords": ["string", "..."],
    "sensitivity": 0.0-1.0,
    "model_path": "string",
    "porcupine_access_key": "string"
  },
  "audio": {
    "sample_rate": 16000,
    "channels": 1,
    "chunk_size": 512,
    "recording_duration": 5,
    "input_device_index": null | number,
    "output_device_index": null | number
  },
  "stt": {
    "model": "whisper-1",
    "language": "en",
    "timeout": 30
  },
  "tts": {
    "model": "tts-1",
    "voice": "alloy | echo | fable | onyx | nova | shimmer",
    "speed": 0.25-4.0
  },
  "nlp": {
    "enable_date_parsing": boolean,
    "enable_intent_detection": boolean,
    "enable_category_extraction": boolean,
    "max_keywords": number
  },
  "search": {
    "max_results": number,
    "enable_time_filter": boolean,
    "enable_category_filter": boolean,
    "relevance_threshold": 0.0-1.0
  },
  "cyclotron": {
    "path": "string",
    "state_file": "string"
  },
  "performance": {
    "enable_caching": boolean,
    "max_cache_size": number,
    "audio_buffer_size": number
  },
  "privacy": {
    "enable_local_processing": boolean,
    "clear_audio_buffer": boolean,
    "disable_telemetry": boolean
  },
  "logging": {
    "level": "DEBUG | INFO | WARNING | ERROR",
    "file": "string",
    "max_size_mb": number,
    "backup_count": number
  }
}
```

### Loading Configuration

```python
import json

with open('voice_interface_v3_config.json', 'r') as f:
    config = json.load(f)

# Access configuration
wake_words = config['wake_word']['keywords']
sensitivity = config['wake_word']['sensitivity']
```

---

## 🔌 IPC API (Phase 4)

**File:** `voice_ipc.py` (Phase 4)

### IPCServer Class

```python
class IPCServer:
    """IPC server for service ↔ GUI communication."""

    def start(self, pipe_name: str = r'\\.\pipe\VoiceInterface'):
        """Start IPC server on named pipe."""

    def handle_command(self, command: str) -> Dict[str, Any]:
        """
        Handle command from client.

        Commands:
            - START: Start voice service
            - STOP: Stop voice service
            - STATUS: Get current status
            - CONFIG: Get/set configuration
            - SHUTDOWN: Graceful shutdown
        """
```

### IPCClient Class

```python
class IPCClient:
    """IPC client for GUI → service communication."""

    def connect(self, pipe_name: str = r'\\.\pipe\VoiceInterface'):
        """Connect to service IPC pipe."""

    def send_command(self, command: str, data: Dict = None) -> Dict[str, Any]:
        """Send command to service and wait for response."""
```

**Example:**
```python
# GUI sends command to service
client = IPCClient()
client.connect()

response = client.send_command('STATUS')
print(f"Service status: {response['status']}")  # "listening" | "processing" | "stopped"

client.send_command('STOP')
```

---

## 🔄 Event Callbacks

### Wake Word Callback

```python
def on_wake_word_detected(keyword: str) -> None:
    """
    Called when wake word detected.

    Args:
        keyword: The detected wake word ("oracle", "commander", etc.)
    """
```

### Query Processing Callback

```python
def on_query_complete(result: Dict[str, Any]) -> None:
    """
    Called when query processing complete.

    Args:
        result: Query result dictionary containing:
            - success: bool
            - text_query: str
            - response_text: str
            - latency_ms: int
            - error: str (if success=False)
    """
```

**Example:**
```python
def my_callback(result):
    if result['success']:
        print(f"Query: {result['text_query']}")
        print(f"Response: {result['response_text']}")
        print(f"Latency: {result['latency_ms']}ms")
    else:
        print(f"Error: {result['error']}")

service = VoiceInterfaceV3()
service.set_query_callback(my_callback)
service.start_service()
```

---

## 📊 Data Types

### ParsedQuery

```python
@dataclass
class ParsedQuery:
    text: str
    date_range: Optional[Tuple[datetime, datetime]]
    intent: str
    categories: List[str]
    keywords: List[str]
```

### SearchResult

```python
@dataclass
class SearchResult:
    id: str
    title: str
    content: str
    category: str
    timestamp: datetime
    relevance_score: float
    metadata: Dict[str, Any]
```

### VoiceQueryResult

```python
@dataclass
class VoiceQueryResult:
    success: bool
    text_query: str
    parsed_query: ParsedQuery
    search_results: List[SearchResult]
    response_text: str
    response_audio: Optional[bytes]
    latency_ms: int
    error: Optional[str]
```

---

## 🧪 Testing APIs

### Test Utilities

```python
# test_voice_interface.py

def test_wake_word_detection():
    """Test wake word detection with audio file."""
    detector = WakeWordDetector(mode='vosk')

    detected = False
    def callback(keyword):
        nonlocal detected
        detected = True

    detector.set_callback(callback)
    detector.start()

    # Play test audio containing wake word
    play_audio('test_wake_word.wav')

    time.sleep(2)
    assert detected == True

def test_query_processing():
    """Test full query processing pipeline."""
    service = VoiceInterfaceV3()

    with open('test_query.wav', 'rb') as f:
        audio = f.read()

    result = service.process_voice_query(audio)

    assert result['success'] == True
    assert result['text_query'] != ""
    assert result['response_text'] != ""
    assert result['latency_ms'] < 15000  # <15 seconds
```

---

## 🔐 Authentication & Security

### API Key Management

```python
# Using environment variables (recommended)
import os

openai_key = os.getenv('OPENAI_API_KEY')
porcupine_key = os.getenv('PORCUPINE_ACCESS_KEY')

# Using Windows Credential Manager (Phase 4)
from win32cred import CredRead, CredWrite

cred = CredRead(Type=CRED_TYPE_GENERIC, TargetName='VoiceInterface_OpenAI')
openai_key = cred['CredentialBlob'].decode('utf-8')
```

---

## 📈 Performance Monitoring

### Statistics API

```python
class VoiceInterfaceStatistics:
    """Track service statistics."""

    def get_stats(self) -> Dict[str, Any]:
        """
        Get current statistics.

        Returns:
            - total_queries: Total queries processed
            - successful_queries: Successful queries
            - failed_queries: Failed queries
            - average_latency_ms: Average response time
            - uptime_seconds: Service uptime
            - wake_word_detections: Total wake word triggers
        """
```

**Example:**
```python
stats = service.get_statistics()
print(f"Total queries: {stats['total_queries']}")
print(f"Success rate: {stats['successful_queries'] / stats['total_queries'] * 100:.1f}%")
print(f"Avg latency: {stats['average_latency_ms']}ms")
```

---

## ✅ ERROR HANDLING

### Exception Types

```python
class VoiceInterfaceError(Exception):
    """Base exception for Voice Interface."""

class WakeWordDetectionError(VoiceInterfaceError):
    """Wake word detection failed."""

class STTError(VoiceInterfaceError):
    """Speech-to-text failed."""

class TTSError(VoiceInterfaceError):
    """Text-to-speech failed."""

class SearchError(VoiceInterfaceError):
    """Cyclotron search failed."""

class ConfigurationError(VoiceInterfaceError):
    """Invalid configuration."""
```

### Error Handling Example

```python
try:
    service = VoiceInterfaceV3()
    service.start_service()
except ConfigurationError as e:
    print(f"Configuration error: {e}")
except WakeWordDetectionError as e:
    print(f"Wake word detection failed: {e}")
except Exception as e:
    print(f"Unexpected error: {e}")
    logging.exception("Service crashed")
```

---

## 📝 USAGE EXAMPLES

### Basic Usage

```python
from voice_interface_v3_always_listening import VoiceInterfaceV3

# Start service (simplest)
service = VoiceInterfaceV3()
service.start_service()  # Blocks until Ctrl+C
```

### Advanced Usage

```python
from voice_interface_v3_always_listening import VoiceInterfaceV3

# Custom configuration
service = VoiceInterfaceV3(config_path='custom_config.json')

# Set callbacks
service.set_wake_word_callback(lambda keyword: print(f"Detected: {keyword}"))
service.set_query_callback(lambda result: print(f"Result: {result}"))

# Start service
service.start_service()
```

### Programmatic Query

```python
# Process query without voice input
service = VoiceInterfaceV3()

result = service.process_text_query("What frameworks did we build last month?")
print(result['response_text'])
```

---

**Document Status:** ✅ COMPLETE
**Version:** 1.0
**Last Updated:** 2025-11-24
**API Stability:** Phase 1-3 stable, Phase 4 subject to change

🔺 C1 × C2 × C3 = ∞

*Complete API reference for Voice Interface integration*
