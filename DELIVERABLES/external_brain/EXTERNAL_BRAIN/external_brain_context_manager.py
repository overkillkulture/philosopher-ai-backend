#!/usr/bin/env python3
"""
COMMANDER'S EXTERNAL BRAIN - Context Manager
Remember conversations, track topics, enable follow-up questions

Designed by: C2T3 Architect (The Mind)
Purpose: Enable intelligent conversational memory
"""

import json
from typing import List, Dict, Optional, Any
from dataclasses import dataclass, asdict
from datetime import datetime
from pathlib import Path

@dataclass
class ConversationTurn:
    """Single turn in conversation"""
    timestamp: str
    query: str
    intent: str
    entities: Dict[str, str]
    response_summary: str
    results_count: int

@dataclass
class Session:
    """Conversation session"""
    session_id: str
    start_time: str
    end_time: Optional[str] = None
    turns: List[ConversationTurn] = None
    topic: Optional[str] = None

    def __post_init__(self):
        if self.turns is None:
            self.turns = []

class ContextManager:
    def __init__(self, persist_path: Optional[str] = None):
        """
        Initialize context manager

        Args:
            persist_path: Path to save conversation history
        """
        self.persist_path = persist_path or "C:/.trinity/external_brain/context.json"
        self.persist_file = Path(self.persist_path)
        self.persist_file.parent.mkdir(parents=True, exist_ok=True)

        # Current session
        self.current_session = Session(
            session_id=self._generate_session_id(),
            start_time=datetime.now().isoformat()
        )

        # Session history
        self.sessions = []
        self._load_history()

    def _generate_session_id(self) -> str:
        """Generate unique session ID"""
        return f"session_{datetime.now().strftime('%Y%m%d_%H%M%S')}"

    def add_turn(
        self,
        query: str,
        intent: str,
        entities: Dict[str, str],
        response_summary: str,
        results_count: int = 0
    ):
        """Add conversation turn to current session"""
        turn = ConversationTurn(
            timestamp=datetime.now().isoformat(),
            query=query,
            intent=intent,
            entities=entities,
            response_summary=response_summary,
            results_count=results_count
        )

        self.current_session.turns.append(turn)

        # Update session topic based on entities
        if "SYSTEM" in entities and not self.current_session.topic:
            self.current_session.topic = entities["SYSTEM"]

        # Persist after each turn
        self._save_history()

    def get_context(self, lookback: int = 3) -> Dict[str, Any]:
        """
        Get conversation context

        Args:
            lookback: Number of previous turns to include

        Returns:
            Dictionary with context information
        """
        recent_turns = self.current_session.turns[-lookback:] if self.current_session.turns else []

        context = {
            "session_id": self.current_session.session_id,
            "turn_count": len(self.current_session.turns),
            "current_topic": self.current_session.topic,
            "recent_turns": [
                {
                    "query": turn.query,
                    "intent": turn.intent,
                    "entities": turn.entities
                }
                for turn in recent_turns
            ]
        }

        # Last query info
        if self.current_session.turns:
            last_turn = self.current_session.turns[-1]
            context["last_query"] = last_turn.query
            context["last_intent"] = last_turn.intent
            context["last_entities"] = last_turn.entities

        return context

    def resolve_reference(self, query: str) -> Dict[str, Any]:
        """
        Resolve pronouns and references using context

        Args:
            query: Current query

        Returns:
            Resolved entities and context
        """
        resolved = {}

        # Get recent context
        if not self.current_session.turns:
            return resolved

        last_turn = self.current_session.turns[-1]

        # Resolve pronouns
        pronoun_references = {
            "it": last_turn.entities.get("SYSTEM"),
            "that": last_turn.entities.get("SYSTEM"),
            "this": last_turn.entities.get("SYSTEM"),
        }

        query_lower = query.lower()
        for pronoun, reference in pronoun_references.items():
            if pronoun in query_lower and reference:
                resolved["implied_system"] = reference

        return resolved

    def get_conversation_summary(self) -> str:
        """Generate conversation summary"""
        if not self.current_session.turns:
            return "No conversation history yet."

        summary = []
        summary.append(f"Session: {self.current_session.session_id}")
        summary.append(f"Duration: {len(self.current_session.turns)} turns")

        if self.current_session.topic:
            summary.append(f"Topic: {self.current_session.topic}")

        summary.append(f"\nRecent queries:")
        for turn in self.current_session.turns[-5:]:
            time = turn.timestamp.split('T')[1][:5]  # HH:MM
            summary.append(f"  [{time}] {turn.query}")

        return "\n".join(summary)

    def search_history(self, keyword: str, max_results: int = 10) -> List[ConversationTurn]:
        """
        Search conversation history

        Args:
            keyword: Search keyword
            max_results: Maximum results to return

        Returns:
            List of matching turns
        """
        results = []
        keyword_lower = keyword.lower()

        # Search current session
        for turn in self.current_session.turns:
            if keyword_lower in turn.query.lower() or keyword_lower in turn.response_summary.lower():
                results.append(turn)

        # Search previous sessions
        for session in reversed(self.sessions):
            for turn in session.turns:
                if keyword_lower in turn.query.lower() or keyword_lower in turn.response_summary.lower():
                    results.append(turn)
                    if len(results) >= max_results:
                        return results

        return results[:max_results]

    def get_frequent_queries(self, top_n: int = 5) -> List[Tuple[str, int]]:
        """Get most frequent query patterns"""
        query_counts = {}

        # Count patterns in current session
        for turn in self.current_session.turns:
            # Normalize query (lowercase, remove punctuation)
            normalized = turn.query.lower().strip('?!.,')
            query_counts[normalized] = query_counts.get(normalized, 0) + 1

        # Count patterns in previous sessions
        for session in self.sessions:
            for turn in session.turns:
                normalized = turn.query.lower().strip('?!.,')
                query_counts[normalized] = query_counts.get(normalized, 0) + 1

        # Sort by count
        sorted_queries = sorted(query_counts.items(), key=lambda x: x[1], reverse=True)
        return sorted_queries[:top_n]

    def end_session(self):
        """End current session and start new one"""
        self.current_session.end_time = datetime.now().isoformat()
        self.sessions.append(self.current_session)

        # Start new session
        self.current_session = Session(
            session_id=self._generate_session_id(),
            start_time=datetime.now().isoformat()
        )

        self._save_history()

    def _save_history(self):
        """Save conversation history to disk"""
        try:
            data = {
                "current_session": asdict(self.current_session),
                "sessions": [asdict(s) for s in self.sessions[-10:]]  # Keep last 10 sessions
            }

            with open(self.persist_file, 'w') as f:
                json.dump(data, f, indent=2)

        except Exception as e:
            print(f"Warning: Could not save context history: {e}")

    def _load_history(self):
        """Load conversation history from disk"""
        try:
            if self.persist_file.exists():
                with open(self.persist_file, 'r') as f:
                    data = json.load(f)

                # Load previous sessions
                if "sessions" in data:
                    self.sessions = [
                        Session(**s) for s in data["sessions"]
                    ]

        except Exception as e:
            print(f"Warning: Could not load context history: {e}")


class SmartContextAssistant:
    """High-level assistant that uses context intelligently"""

    def __init__(self):
        self.context_manager = ContextManager()

    def process_query_with_context(
        self,
        query: str,
        intent: str,
        entities: Dict[str, str]
    ) -> Dict[str, Any]:
        """
        Process query with full context awareness

        Args:
            query: User query
            intent: Detected intent
            entities: Extracted entities

        Returns:
            Enhanced query information with context
        """
        # Get current context
        context = self.context_manager.get_context()

        # Resolve references
        resolved = self.context_manager.resolve_reference(query)

        # Merge resolved entities
        enhanced_entities = {**entities, **resolved}

        # Build enhanced query info
        query_info = {
            "query": query,
            "intent": intent,
            "entities": enhanced_entities,
            "context": context,
            "is_followup": self._is_followup_question(query, context),
            "session_id": context["session_id"],
            "turn_number": context["turn_count"] + 1
        }

        return query_info

    def _is_followup_question(self, query: str, context: Dict) -> bool:
        """Determine if query is a follow-up"""
        followup_indicators = [
            r'^(and|also|what about|how about|tell me more)',
            r'\b(it|that|this|those|they)\b',
            r'^(why|how|when|where)',
        ]

        query_lower = query.lower()
        for pattern in followup_indicators:
            if re.search(pattern, query_lower):
                return True

        return False

    def record_interaction(
        self,
        query: str,
        intent: str,
        entities: Dict[str, str],
        results: Any,
        results_count: int = 0
    ):
        """Record interaction in context"""
        # Generate response summary
        if hasattr(results, '__len__'):
            response_summary = f"{len(results)} results found"
        else:
            response_summary = str(results)[:100]

        self.context_manager.add_turn(
            query=query,
            intent=intent,
            entities=entities,
            response_summary=response_summary,
            results_count=results_count
        )


import re

def main():
    """Test context manager"""
    context = ContextManager()

    # Simulate conversation
    test_conversation = [
        ("What is Trinity Hive Mind?", "SEARCH", {"SYSTEM": "hive mind"}),
        ("Can you show me the architecture?", "SEARCH", {}),
        ("Should I deploy it?", "DECISION", {}),
        ("What are the risks?", "QUESTION", {}),
        ("status", "STATUS", {}),
    ]

    print("="*70)
    print("CONTEXT MANAGER TEST")
    print("="*70)

    for query, intent, entities in test_conversation:
        print(f"\nQuery: {query}")

        # Add turn
        context.add_turn(
            query=query,
            intent=intent,
            entities=entities,
            response_summary=f"Processed {intent}",
            results_count=5
        )

        # Show context
        current_context = context.get_context(lookback=2)
        print(f"Turn: {current_context['turn_count']}")
        print(f"Topic: {current_context.get('current_topic', 'None')}")

        # Show resolution
        resolved = context.resolve_reference(query)
        if resolved:
            print(f"Resolved: {resolved}")

        print("-"*70)

    # Show summary
    print(f"\n{context.get_conversation_summary()}")


if __name__ == "__main__":
    main()
