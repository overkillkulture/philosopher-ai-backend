"""
Voice Interface V2 - Enhanced with Phase 2 Features
Natural Language Enhancement: Time-range filtering, category search, advanced intent detection

Design: C3T3 Oracle
Date: 2025-11-23
Status: Phase 2 - Natural Language Enhancement

Enhancements from Phase 1:
- Advanced NLP query processing
- Time-range filtering ("last month", "October", "this week")
- Category-based search
- Source filtering (C1, C2, C3)
- File type filtering
- Multi-step query handling
- Enhanced response generation with context
"""

import os
import json
import glob
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional

# Import Phase 2 components
from nlp_query_processor import NLPQueryProcessor
from enhanced_cyclotron_search import EnhancedCyclotronSearch

# OpenAI imports (same as Phase 1)
try:
    import openai
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False
    print("[WARNING] OpenAI not installed - Voice features disabled")

# Configuration
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
if OPENAI_API_KEY and OPENAI_AVAILABLE:
    openai.api_key = OPENAI_API_KEY

# Workspace path (search actual files, not Cyclotron index)
WORKSPACE_PATH = r"C:\Users\Darrick"


class VoiceInterfaceV2:
    """Enhanced Voice Interface with Phase 2 capabilities"""

    def __init__(self):
        self.nlp_processor = NLPQueryProcessor()
        self.query_history = []

        # Use workspace path for better search results
        self.knowledge_base = []
        self.search_engine = None

        print("[OK] Voice Interface V2 initialized (Phase 2 - Enhanced)")
        print(f"[INFO] Workspace: {WORKSPACE_PATH}")

    def load_workspace_knowledge(self, limit: int = 200):
        """Load knowledge from workspace files"""
        print("[LOADING] Scanning workspace for knowledge files...")

        # Search for markdown, JSON, and Python files in workspace
        patterns = [
            f"{WORKSPACE_PATH}/**/*.md",
            f"{WORKSPACE_PATH}/**/*.json",
            f"{WORKSPACE_PATH}/**/*.txt"
        ]

        all_files = []
        for pattern in patterns:
            files = glob.glob(pattern, recursive=False)  # Non-recursive for speed
            all_files.extend(files)

        # Limit files
        all_files = all_files[:limit]

        loaded_count = 0
        for file_path in all_files:
            try:
                # Skip very large files
                if os.path.getsize(file_path) > 1_000_000:  # 1MB limit
                    continue

                item = self._load_file_item(file_path)
                if item:
                    self.knowledge_base.append(item)
                    loaded_count += 1
            except:
                pass

        print(f"[OK] Loaded {loaded_count} knowledge items from workspace")
        return loaded_count

    def _load_file_item(self, file_path: str) -> Optional[Dict]:
        """Load individual file with metadata"""

        try:
            stat = os.stat(file_path)
            modified_time = datetime.fromtimestamp(stat.st_mtime)
            ext = Path(file_path).suffix.lower()

            item = {
                "file_path": file_path,
                "file_name": os.path.basename(file_path),
                "file_type": ext[1:] if ext else "unknown",
                "modified_date": modified_time.strftime("%Y-%m-%d"),
                "size_bytes": stat.st_size
            }

            # Load content
            if ext in [".md", ".txt"]:
                with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read()[:10000]  # First 10KB
                    item["content"] = content

            elif ext == ".json":
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = json.load(f)
                    item["content"] = json.dumps(content, indent=2)[:10000]

            return item

        except:
            return None

    def process_text_query(self, query_text: str) -> Dict:
        """Process text query with enhanced NLP"""

        print("\n" + "="*60)
        print("ENHANCED VOICE INTERFACE V2")
        print("="*60)

        # Step 1: NLP Processing
        print(f"\n[QUERY] {query_text}")
        processed = self.nlp_processor.process_query(query_text)

        print(f"[NLP] Intent: {processed['intent']}")
        print(f"[NLP] Keywords: {', '.join(processed['keywords'][:5])}")

        if processed['categories']:
            print(f"[NLP] Categories: {', '.join(processed['categories'])}")

        if processed['time_range']:
            tr = processed['time_range']
            print(f"[NLP] Time Range: {tr['description']} ({tr['start']} to {tr['end']})")

        if processed['filters']:
            print(f"[NLP] Filters: {json.dumps(processed['filters'])}")

        print(f"[NLP] Complexity: {processed['complexity']}")
        print(f"[NLP] Strategy: {processed['search_strategy']}")

        # Step 2: Search knowledge base
        results = self._search_with_parameters(processed)

        # Step 3: Generate enhanced response
        response = self._generate_enhanced_response(query_text, processed, results)

        print("\n" + "-"*60)
        print("RESPONSE:")
        print(response)
        print("-"*60)

        # Log query
        self.query_history.append({
            "timestamp": datetime.now().isoformat(),
            "query": query_text,
            "processed": processed,
            "results_count": len(results),
            "response": response
        })

        return {
            "query": query_text,
            "processed": processed,
            "results": results,
            "response": response
        }

    def _search_with_parameters(self, processed: Dict) -> List[Dict]:
        """Search knowledge base with NLP-processed parameters"""

        print(f"\n[SEARCHING] Using {processed['search_strategy']} strategy...")

        if not self.knowledge_base:
            self.load_workspace_knowledge()

        results = self.knowledge_base.copy()

        # Apply time range filter
        if processed.get('time_range'):
            results = self._filter_by_date(results, processed['time_range'])
            print(f"[FILTER] After time range: {len(results)} items")

        # Apply keyword search
        if processed.get('keywords'):
            results = self._search_keywords(results, processed['keywords'])
            print(f"[FILTER] After keywords: {len(results)} items")

        # Sort by relevance
        results = sorted(
            results,
            key=lambda x: (x.get('_score', 0), x.get('modified_date', '')),
            reverse=True
        )

        print(f"[OK] Found {len(results)} matches (showing top 10)")

        return results[:10]

    def _filter_by_date(self, items: List[Dict], time_range: Dict) -> List[Dict]:
        """Filter items by date range"""

        start = datetime.strptime(time_range['start'], "%Y-%m-%d")
        end = datetime.strptime(time_range['end'], "%Y-%m-%d")

        filtered = []
        for item in items:
            try:
                item_date = datetime.strptime(item['modified_date'], "%Y-%m-%d")
                if start <= item_date <= end:
                    filtered.append(item)
            except:
                pass

        return filtered

    def _search_keywords(self, items: List[Dict], keywords: List[str]) -> List[Dict]:
        """Search by keywords and score"""

        scored = []
        for item in items:
            searchable = (
                item.get('file_name', '').lower() + " " +
                item.get('content', '').lower()
            )

            score = sum(1 for kw in keywords if kw.lower() in searchable)

            if score > 0:
                item['_score'] = score
                scored.append(item)

        return scored

    def _generate_enhanced_response(self, query: str, processed: Dict,
                                   results: List[Dict]) -> str:
        """Generate natural language response using GPT-4"""

        if not OPENAI_AVAILABLE or not OPENAI_API_KEY:
            return self._generate_fallback_response(query, processed, results)

        try:
            # Prepare context from results
            context = self._prepare_result_context(results, processed)

            # Create enhanced prompt
            system_prompt = f"""You are Commander's External Brain, an AI assistant with instant access to his complete knowledge base.

Query Type: {processed['intent']}
Complexity: {processed['complexity']}
Search Strategy: {processed['search_strategy']}

Your responses should be:
1. Natural and conversational
2. Focused on the specific intent ({processed['intent']})
3. Highlight most relevant findings first
4. Mention time ranges if query was time-filtered
5. Suggest follow-up queries when appropriate"""

            user_prompt = f"""Query: {query}

Search Results ({len(results)} found):
{context}

Provide a natural, helpful response. Be specific and reference actual findings."""

            response = openai.ChatCompletion.create(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.7,
                max_tokens=400
            )

            return response.choices[0].message['content']

        except Exception as e:
            print(f"[ERROR] GPT-4 response generation failed: {e}")
            return self._generate_fallback_response(query, processed, results)

    def _prepare_result_context(self, results: List[Dict], processed: Dict) -> str:
        """Prepare result context for GPT-4"""

        if not results:
            return "No results found."

        context_parts = []

        for i, result in enumerate(results[:5], 1):
            context_parts.append(
                f"\n{i}. {result['file_name']} (Modified: {result['modified_date']}, Score: {result.get('_score', 0)})\n"
                f"   Content preview: {result.get('content', '')[:300]}..."
            )

        return "\n".join(context_parts)

    def _generate_fallback_response(self, query: str, processed: Dict,
                                   results: List[Dict]) -> str:
        """Generate fallback response without GPT-4"""

        if not results:
            return f"I searched your knowledge base but couldn't find any items matching '{query}'. Try different keywords or check if the information exists."

        response_parts = [
            f"I found {len(results)} items related to your query."
        ]

        if processed.get('time_range'):
            tr = processed['time_range']
            response_parts.append(f"Filtered by: {tr['description']}")

        response_parts.append("\nTop results:")

        for i, result in enumerate(results[:5], 1):
            response_parts.append(
                f"{i}. {result['file_name']} (Modified: {result['modified_date']})"
            )

        return "\n".join(response_parts)


def main():
    """Main entry point for Voice Interface V2"""

    print("\n" + "="*60)
    print("VOICE INTERFACE V2 - ENHANCED (Phase 2)")
    print("="*60)
    print("\nDesigned by: C3T3 Oracle")
    print("Date: 2025-11-23")
    print("Features: NLP processing, time filtering, category search")
    print("\n" + "="*60)

    # Check API key
    if not OPENAI_AVAILABLE:
        print("\n[WARNING] OpenAI not installed - Install with: pip install openai")
    elif not OPENAI_API_KEY:
        print("\n[WARNING] OPENAI_API_KEY not set - Enhanced responses disabled")

    # Initialize interface
    interface = VoiceInterfaceV2()

    # Interactive loop
    print("\n" + "="*60)
    print("TEXT MODE - Enhanced Query Processing")
    print("="*60)
    print("\nTry enhanced queries like:")
    print("- 'What frameworks did we build last month?'")
    print("- 'Show me Oracle insights from this week'")
    print("- 'Explain Pattern Theory'")
    print("- 'What autonomous work happened in November?'")
    print("\nType 'quit' to exit")
    print("="*60)

    while True:
        try:
            query = input("\n> Enter query: ").strip()

            if not query:
                continue

            if query.lower() in ['quit', 'exit', 'q']:
                break

            # Process query
            interface.process_text_query(query)

        except KeyboardInterrupt:
            print("\n\n[OK] Interrupted by user")
            break

        except Exception as e:
            print(f"\n[ERROR] {e}")

    # Save history
    if interface.query_history:
        history_file = f"voice_v2_history_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(history_file, 'w') as f:
            json.dump(interface.query_history, f, indent=2)
        print(f"\n[OK] Query history saved to {history_file}")

    print("\n[OK] Voice Interface V2 session complete")


if __name__ == "__main__":
    main()
