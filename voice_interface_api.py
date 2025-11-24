#!/usr/bin/env python3
"""
Voice Interface V3 - API Wrapper
Simple Flask API for integrating Voice Interface with frontends

Created: 2025-11-24
Purpose: Enable frontend/mobile apps to use Voice Interface via REST API
"""

import os
import json
from pathlib import Path
from typing import Dict

try:
    from flask import Flask, request, jsonify
    from flask_cors import CORS
    from flask_limiter import Limiter
    from flask_limiter.util import get_remote_address
    FLASK_AVAILABLE = True
except ImportError:
    FLASK_AVAILABLE = False
    print("[WARNING] Flask not available - install with: pip install flask flask-cors flask-limiter")

from voice_interface_v3_production import VoiceInterfaceV3, Config
from security_validation import validator, validate_api_input


# Initialize Flask app
app = Flask(__name__)

# Enable CORS for frontend integration
if FLASK_AVAILABLE:
    CORS(app)

# Initialize rate limiting (SECURITY: Prevent brute force/DoS)
limiter = None
if FLASK_AVAILABLE:
    limiter = Limiter(
        app=app,
        key_func=get_remote_address,
        default_limits=["200 per day", "50 per hour"],  # Global limits
        storage_uri="memory://",  # Use Redis in production: redis://localhost:6379
        strategy="fixed-window"  # or "moving-window" for more accurate limiting
    )

# Initialize Voice Interface (singleton)
voice_interface = None


def get_interface() -> VoiceInterfaceV3:
    """Get or create Voice Interface instance"""
    global voice_interface

    if voice_interface is None:
        config = Config()
        voice_interface = VoiceInterfaceV3(config)
        voice_interface.initialize_knowledge_base()

    return voice_interface


# ==================== API ENDPOINTS ====================

@app.route('/api/v1/health', methods=['GET'])
@limiter.limit("100 per minute")  # Lenient for health checks/monitoring
def health_check():
    """Health check endpoint"""
    return jsonify({
        "status": "ok",
        "service": "voice-interface",
        "version": "3.0"
    })


@app.route('/api/v1/stats', methods=['GET'])
@limiter.limit("30 per minute")  # Moderate limit for stats
def get_stats():
    """Get system statistics"""
    try:
        interface = get_interface()
        stats = interface.get_stats()

        return jsonify({
            "success": True,
            "stats": stats
        })

    except Exception as e:
        # Log the actual error for debugging (server-side only)
        app.logger.error(f"Query processing error: {str(e)}", exc_info=True)

        # Return generic error to client (security: don't leak internals)
        return jsonify({
            "success": False,
            "error": "An error occurred processing your query. Please try again."
        }), 500


@app.route('/api/v1/query', methods=['POST'])
@limiter.limit("10 per minute")  # Strict limit for computationally expensive queries
def process_query():
    """
    Process a voice/text query

    Request body:
    {
        "query": "What is Trinity?",
        "max_results": 10  // optional
    }

    Response:
    {
        "success": true,
        "query": "What is Trinity?",
        "results": [...],
        "response": "...",
        "metadata": {...}
    }
    """
    try:
        data = request.get_json()

        # Comprehensive security validation
        is_valid, error, clean_data = validate_api_input(
            data,
            required_fields=['query'],
            field_validators={
                'query': lambda v: validator.validate_string(
                    v, 'query',
                    min_length=1,
                    max_length=1000,
                    check_xss=True,
                    check_sql=True
                ),
                'max_results': lambda v: validator.validate_integer(
                    v, 'max_results',
                    min_value=1,
                    max_value=100
                ) if 'max_results' in data else (True, None)
            }
        )

        if not is_valid:
            return jsonify({
                "success": False,
                "error": error
            }), 400

        # Use sanitized data
        query_text = clean_data['query']
        max_results = clean_data.get('max_results', 10)

        # Process query with sanitized input
        interface = get_interface()
        result = interface.process_query(query_text)

        # Limit results
        if 'results' in result:
            result['results'] = result['results'][:max_results]

        return jsonify(result)

    except Exception as e:
        # Log the actual error for debugging (server-side only)
        app.logger.error(f"Query processing error: {str(e)}", exc_info=True)

        # Return generic error to client (security: don't leak internals)
        return jsonify({
            "success": False,
            "error": "An error occurred processing your query. Please try again."
        }), 500


@app.route('/api/v1/search', methods=['POST'])
@limiter.limit("15 per minute")  # Strict limit for search operations
def search_knowledge():
    """
    Search knowledge base with advanced parameters

    Request body:
    {
        "keywords": ["trinity", "framework"],
        "categories": ["frameworks"],  // optional
        "time_range": {  // optional
            "start": "2025-11-01",
            "end": "2025-11-24"
        },
        "filters": {  // optional
            "source": "C1_MECHANIC",
            "file_type": "markdown"
        },
        "max_results": 20  // optional
    }
    """
    try:
        data = request.get_json()

        # Comprehensive security validation
        is_valid, error, clean_data = validate_api_input(
            data,
            required_fields=['keywords'],
            field_validators={
                'keywords': lambda v: validator.validate_list(
                    v, 'keywords',
                    min_items=1,
                    max_items=20,
                    item_type=str
                ),
                'categories': lambda v: validator.validate_list(
                    v, 'categories',
                    min_items=0,
                    max_items=10,
                    item_type=str
                ) if 'categories' in data else (True, None),
                'max_results': lambda v: validator.validate_integer(
                    v, 'max_results',
                    min_value=1,
                    max_value=100
                ) if 'max_results' in data else (True, None)
            }
        )

        if not is_valid:
            return jsonify({
                "success": False,
                "error": error
            }), 400

        interface = get_interface()

        # Build search parameters with sanitized data
        search_params = {
            "keywords": clean_data.get('keywords', []),
            "categories": clean_data.get('categories', []),
            "time_range": clean_data.get('time_range'),
            "filters": clean_data.get('filters', {}),
            "intent": "search",
            "strategy": clean_data.get('strategy', 'keyword_search')
        }

        # Execute search
        if interface.search_engine:
            results = interface.search_engine.search(search_params)
        else:
            return jsonify({
                "success": False,
                "error": "Search engine not available"
            }), 503

        # Limit results
        max_results = clean_data.get('max_results', 20)
        results = results[:max_results]

        return jsonify({
            "success": True,
            "results": results,
            "count": len(results),
            "search_params": search_params
        })

    except Exception as e:
        # Log the actual error for debugging (server-side only)
        app.logger.error(f"Query processing error: {str(e)}", exc_info=True)

        # Return generic error to client (security: don't leak internals)
        return jsonify({
            "success": False,
            "error": "An error occurred processing your query. Please try again."
        }), 500


@app.route('/api/v1/history', methods=['GET'])
def get_query_history():
    """Get query history"""
    try:
        interface = get_interface()

        # Get last N queries
        limit = request.args.get('limit', default=50, type=int)
        history = interface.query_history[-limit:]

        return jsonify({
            "success": True,
            "history": history,
            "total": len(interface.query_history)
        })

    except Exception as e:
        # Log the actual error for debugging (server-side only)
        app.logger.error(f"Query processing error: {str(e)}", exc_info=True)

        # Return generic error to client (security: don't leak internals)
        return jsonify({
            "success": False,
            "error": "An error occurred processing your query. Please try again."
        }), 500


@app.route('/api/v1/categories', methods=['GET'])
def get_categories():
    """Get available knowledge categories"""
    categories = [
        "frameworks",
        "autonomous_work",
        "session_reports",
        "strategic",
        "consciousness",
        "oracle",
        "technical",
        "deployment",
        "trinity",
        "cyclotron"
    ]

    return jsonify({
        "success": True,
        "categories": categories
    })


@app.route('/api/v1/intents', methods=['GET'])
def get_intents():
    """Get available query intents"""
    intents = [
        "search",
        "explain",
        "summarize",
        "compare",
        "recommend",
        "count"
    ]

    return jsonify({
        "success": True,
        "intents": intents
    })


# ==================== MAIN ====================

def main():
    """Run the API server"""
    if not FLASK_AVAILABLE:
        print("[ERROR] Flask not available")
        print("Install with: pip install flask flask-cors")
        return

    print("\n" + "="*70)
    print("VOICE INTERFACE V3 - API SERVER")
    print("="*70)

    # Initialize interface
    print("\n[INIT] Initializing Voice Interface...")
    interface = get_interface()
    print(f"[OK] Knowledge base loaded: {interface.knowledge_base_size} items")

    # Print available endpoints
    print("\n" + "="*70)
    print("AVAILABLE ENDPOINTS")
    print("="*70)
    print("\nGET  /api/v1/health       - Health check")
    print("GET  /api/v1/stats        - System statistics")
    print("POST /api/v1/query        - Process natural language query")
    print("POST /api/v1/search       - Advanced knowledge search")
    print("GET  /api/v1/history      - Query history")
    print("GET  /api/v1/categories   - Available categories")
    print("GET  /api/v1/intents      - Available intents")

    # Example usage
    print("\n" + "="*70)
    print("EXAMPLE USAGE")
    print("="*70)
    print("""
# Query endpoint
curl -X POST http://localhost:5000/api/v1/query \\
  -H "Content-Type: application/json" \\
  -d '{"query": "What is Trinity?"}'

# Search endpoint
curl -X POST http://localhost:5000/api/v1/search \\
  -H "Content-Type: application/json" \\
  -d '{"keywords": ["trinity", "framework"], "max_results": 5}'

# Stats endpoint
curl http://localhost:5000/api/v1/stats
    """)

    # Start server
    print("\n" + "="*70)
    print("STARTING SERVER")
    print("="*70)

    port = int(os.getenv('PORT', 5000))
    host = os.getenv('HOST', '0.0.0.0')

    print(f"\nServer starting on http://{host}:{port}")
    print("Press Ctrl+C to stop\n")

    app.run(
        host=host,
        port=port,
        debug=False,  # Set to True for development
        threaded=True  # Handle multiple requests
    )


if __name__ == "__main__":
    main()
