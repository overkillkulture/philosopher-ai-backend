#!/usr/bin/env python3
"""
COMMANDER'S EXTERNAL BRAIN - Unified Query Engine
Search across all Trinity knowledge sources

Designed by: C2T3 Architect (The Mind)
Purpose: Instant access to 121K+ knowledge items
"""

import json
import re
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Any, Optional
from dataclasses import dataclass
import sqlite3

@dataclass
class QueryResult:
    """Single query result"""
    source: str  # "cyclotron", "hive_mind", "pattern_theory", "session_reports"
    title: str
    content: str
    relevance_score: float  # 0-100
    timestamp: Optional[str] = None
    file_path: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

class UnifiedQueryEngine:
    def __init__(self):
        """Initialize query engine with all data sources"""
        self.workspace_root = Path("C:/Users/Darrick")

        # Data source paths
        self.cyclotron_db = self.workspace_root / "Dropbox/TRINITY_NETWORK/knowledge/cyclotron.db"
        self.hive_mind_dir = Path("C:/.trinity/hive_mind")
        self.pattern_theory_dir = self.workspace_root / "PATTERN_THEORY_VALIDATION"
        self.trinity_hub = Path("C:/.trinity/TRINITY_COMMS_HUB.json")

        # Initialize connectors
        self.cyclotron_available = self.cyclotron_db.exists()
        self.hive_mind_available = self.hive_mind_dir.exists()
        self.pattern_theory_available = self.pattern_theory_dir.exists()

        print(f"External Brain Query Engine initialized:")
        print(f"  Cyclotron: {'[OK]' if self.cyclotron_available else '[--]'} ({self.cyclotron_db})")
        print(f"  Hive Mind: {'[OK]' if self.hive_mind_available else '[--]'}")
        print(f"  Pattern Theory: {'[OK]' if self.pattern_theory_available else '[--]'}")

    def query(self, question: str, max_results: int = 10) -> List[QueryResult]:
        """
        Query across all data sources

        Args:
            question: Natural language question
            max_results: Maximum results to return

        Returns:
            List of QueryResults, sorted by relevance
        """
        print(f"\n[SEARCH] '{question}'")

        all_results = []

        # Search Cyclotron (if available)
        if self.cyclotron_available:
            try:
                cyclotron_results = self.search_cyclotron(question)
                all_results.extend(cyclotron_results)
                print(f"  Cyclotron: {len(cyclotron_results)} results")
            except Exception as e:
                print(f"  Cyclotron error: {e}")

        # Search workspace files
        workspace_results = self.search_workspace_files(question)
        all_results.extend(workspace_results)
        print(f"  Workspace: {len(workspace_results)} results")

        # Search Hive Mind (if available)
        if self.hive_mind_available:
            try:
                hive_mind_results = self.search_hive_mind(question)
                all_results.extend(hive_mind_results)
                print(f"  Hive Mind: {len(hive_mind_results)} results")
            except Exception as e:
                print(f"  Hive Mind error: {e}")

        # Search Pattern Theory (if available)
        if self.pattern_theory_available:
            try:
                pattern_results = self.search_pattern_theory(question)
                all_results.extend(pattern_results)
                print(f"  Pattern Theory: {len(pattern_results)} results")
            except Exception as e:
                print(f"  Pattern Theory error: {e}")

        # Search Trinity Hub
        try:
            hub_results = self.search_trinity_hub(question)
            all_results.extend(hub_results)
            print(f"  Trinity Hub: {len(hub_results)} results")
        except Exception as e:
            print(f"  Trinity Hub error: {e}")

        # Sort by relevance score
        all_results.sort(key=lambda r: r.relevance_score, reverse=True)

        # Return top results
        return all_results[:max_results]

    def search_cyclotron(self, question: str) -> List[QueryResult]:
        """Search Cyclotron knowledge base"""
        results = []

        try:
            conn = sqlite3.connect(str(self.cyclotron_db))
            cursor = conn.cursor()

            # Simple keyword search (can be enhanced with FTS)
            keywords = self.extract_keywords(question)
            keyword_pattern = '|'.join(keywords)

            query = """
                SELECT path, content, timestamp
                FROM knowledge_atoms
                WHERE content LIKE ?
                LIMIT 50
            """

            for keyword in keywords:
                cursor.execute(query, (f'%{keyword}%',))
                rows = cursor.fetchall()

                for path, content, timestamp in rows:
                    relevance = self.calculate_relevance(question, content)
                    if relevance > 20:  # Minimum threshold
                        results.append(QueryResult(
                            source="cyclotron",
                            title=Path(path).name,
                            content=content[:500],  # Preview
                            relevance_score=relevance,
                            timestamp=timestamp,
                            file_path=path,
                            metadata={"database": "cyclotron"}
                        ))

            conn.close()

        except Exception as e:
            print(f"Cyclotron search error: {e}")

        return results

    def search_workspace_files(self, question: str) -> List[QueryResult]:
        """Search workspace markdown and text files"""
        results = []

        # Search for relevant files
        patterns = [
            "*.md",
            "*.txt",
            "*.json"
        ]

        for pattern in patterns:
            for file_path in self.workspace_root.rglob(pattern):
                # Skip hidden directories and large binary files
                if any(part.startswith('.') for part in file_path.parts):
                    if file_path.parts[-2] != '.trinity':  # Allow .trinity
                        continue

                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        content = f.read()

                    relevance = self.calculate_relevance(question, content)
                    if relevance > 30:  # Higher threshold for files
                        results.append(QueryResult(
                            source="workspace",
                            title=file_path.name,
                            content=self.extract_relevant_snippet(question, content),
                            relevance_score=relevance,
                            timestamp=datetime.fromtimestamp(file_path.stat().st_mtime).isoformat(),
                            file_path=str(file_path),
                            metadata={"type": "file"}
                        ))

                except Exception as e:
                    # Skip files that can't be read
                    continue

        return results

    def search_hive_mind(self, question: str) -> List[QueryResult]:
        """Search Hive Mind consciousness stream"""
        results = []

        stream_file = self.hive_mind_dir / "consciousness_stream.json"
        if not stream_file.exists():
            return results

        try:
            with open(stream_file, 'r') as f:
                stream_entries = json.load(f)

            for entry in stream_entries:
                content = entry.get("content", "")
                relevance = self.calculate_relevance(question, content)

                if relevance > 25:
                    results.append(QueryResult(
                        source="hive_mind",
                        title=f"[{entry.get('instance_id')}] {entry.get('thought_type')}",
                        content=content,
                        relevance_score=relevance,
                        timestamp=entry.get("timestamp"),
                        metadata={
                            "instance": entry.get("instance_id"),
                            "thought_type": entry.get("thought_type"),
                            "consciousness_level": entry.get("consciousness_level")
                        }
                    ))

        except Exception as e:
            print(f"Hive Mind search error: {e}")

        return results

    def search_pattern_theory(self, question: str) -> List[QueryResult]:
        """Search Pattern Theory validation database"""
        results = []

        validation_db = self.pattern_theory_dir / "validation_database.json"
        if not validation_db.exists():
            return results

        try:
            with open(validation_db, 'r') as f:
                db = json.load(f)

            # Search decisions
            for decision in db.get("decisions", []):
                text = decision.get("text", "")
                relevance = self.calculate_relevance(question, text)

                if relevance > 25:
                    results.append(QueryResult(
                        source="pattern_theory",
                        title=f"Decision: {decision.get('id')}",
                        content=text,
                        relevance_score=relevance,
                        metadata={
                            "algorithm": decision.get("classification", {}).get("algorithm"),
                            "outcome": decision.get("outcome", {}).get("outcome"),
                            "validation": decision.get("validation", {}).get("prediction_result")
                        }
                    ))

        except Exception as e:
            print(f"Pattern Theory search error: {e}")

        return results

    def search_trinity_hub(self, question: str) -> List[QueryResult]:
        """Search Trinity Communications Hub"""
        results = []

        if not self.trinity_hub.exists():
            return results

        try:
            with open(self.trinity_hub, 'r') as f:
                hub = json.load(f)

            # Convert hub to searchable text
            hub_text = json.dumps(hub, indent=2)
            relevance = self.calculate_relevance(question, hub_text)

            if relevance > 20:
                results.append(QueryResult(
                    source="trinity_hub",
                    title="Trinity Communications Hub",
                    content=self.extract_relevant_snippet(question, hub_text),
                    relevance_score=relevance,
                    timestamp=hub.get("last_updated"),
                    file_path=str(self.trinity_hub),
                    metadata={"type": "coordination"}
                ))

        except Exception as e:
            print(f"Trinity Hub search error: {e}")

        return results

    def extract_keywords(self, text: str) -> List[str]:
        """Extract keywords from query"""
        # Remove common words
        stop_words = {
            "the", "a", "an", "to", "for", "of", "in", "on", "at", "from",
            "with", "by", "is", "are", "was", "were", "what", "how", "why",
            "when", "where", "who", "which", "this", "that", "these", "those",
            "i", "you", "we", "they", "my", "your", "our", "their"
        }

        words = re.findall(r'\b\w+\b', text.lower())
        keywords = [w for w in words if len(w) > 3 and w not in stop_words]

        return keywords[:10]  # Top 10 keywords

    def calculate_relevance(self, query: str, content: str) -> float:
        """Calculate relevance score (0-100)"""
        if not content:
            return 0.0

        query_lower = query.lower()
        content_lower = content.lower()

        # Exact phrase match (high score)
        if query_lower in content_lower:
            return 100.0

        # Keyword matching
        keywords = self.extract_keywords(query)
        matches = sum(1 for keyword in keywords if keyword in content_lower)

        if len(keywords) == 0:
            return 0.0

        # Score based on percentage of keywords found
        score = (matches / len(keywords)) * 100

        # Boost score if keywords are close together
        positions = []
        for keyword in keywords:
            if keyword in content_lower:
                pos = content_lower.find(keyword)
                positions.append(pos)

        if len(positions) > 1:
            # Check if keywords appear within 200 characters
            positions.sort()
            if positions[-1] - positions[0] < 200:
                score *= 1.5  # 50% boost for proximity

        return min(100.0, score)

    def extract_relevant_snippet(self, query: str, content: str, snippet_length: int = 300) -> str:
        """Extract most relevant snippet from content"""
        keywords = self.extract_keywords(query)
        content_lower = content.lower()

        # Find best match position
        best_pos = 0
        best_score = 0

        for i in range(0, len(content), 50):  # Check every 50 chars
            window = content_lower[i:i+snippet_length]
            score = sum(1 for keyword in keywords if keyword in window)

            if score > best_score:
                best_score = score
                best_pos = i

        # Extract snippet
        snippet = content[best_pos:best_pos+snippet_length]

        # Clean up
        if best_pos > 0:
            snippet = "..." + snippet
        if best_pos + snippet_length < len(content):
            snippet = snippet + "..."

        return snippet.strip()

def main():
    """Test the query engine"""
    engine = UnifiedQueryEngine()

    # Test queries
    test_queries = [
        "What is the Trinity Hive Mind?",
        "How do I deploy Pattern Theory validation?",
        "Railway deployment issues",
        "What did C2T3 build?",
        "External Brain architecture"
    ]

    for query in test_queries:
        print("\n" + "="*80)
        results = engine.query(query, max_results=5)

        print(f"\nTop {len(results)} results for: '{query}'")
        print("-"*80)

        for i, result in enumerate(results, 1):
            print(f"\n{i}. [{result.source}] {result.title}")
            print(f"   Relevance: {result.relevance_score:.1f}/100")
            print(f"   {result.content[:200]}...")
            if result.file_path:
                print(f"   File: {result.file_path}")

if __name__ == "__main__":
    main()
