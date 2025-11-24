#!/usr/bin/env python3
"""
COMMANDER'S EXTERNAL BRAIN - Natural Language Processing
Understand intent, context, and generate natural responses

Designed by: C2T3 Architect (The Mind)
Purpose: Make External Brain understand natural language
"""

import re
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
from datetime import datetime

@dataclass
class Intent:
    """Recognized user intent"""
    intent_type: str  # "SEARCH", "STATUS", "DECISION", "BRIEFING", "QUESTION"
    confidence: float  # 0-100
    entities: Dict[str, str]  # Extracted entities
    original_query: str

@dataclass
class ConversationContext:
    """Context from conversation history"""
    last_query: Optional[str] = None
    last_intent: Optional[str] = None
    last_entities: Optional[Dict[str, str]] = None
    conversation_topic: Optional[str] = None
    turn_count: int = 0

class NaturalLanguageProcessor:
    def __init__(self):
        """Initialize NLP system"""

        # Intent patterns (regex-based for speed, can be upgraded to ML)
        self.intent_patterns = {
            "SEARCH": [
                r"(what|tell me about|explain|show me|find|search for|look up)",
                r"(how do i|how to|guide|tutorial|instructions)",
                r"(where is|where can i find)",
            ],
            "STATUS": [
                r"(status|what.*(doing|working on|happening))",
                r"(show.*status|check.*status)",
                r"(c1|c2|c3).*(status|doing|working)",
                r"(trinity.*status|network.*status)",
            ],
            "DECISION": [
                r"(should i|should we|recommend|advice|suggest)",
                r"(is it good to|worth|better to)",
                r"(analyze.*decision|evaluate)",
            ],
            "BRIEFING": [
                r"(brief|briefing|summary|update|overview)",
                r"(what happened|what.*built|what.*complete)",
                r"(morning brief|daily brief)",
            ],
            "QUESTION": [
                r"(why|when|who|which|whose)",
                r"(can (i|we)|will|would)",
            ]
        }

        # Entity patterns
        self.entity_patterns = {
            "SYSTEM": r"(trinity|hive mind|pattern theory|external brain|cyclotron|railway)",
            "INSTANCE": r"(c1|c2|c3|mechanic|architect|oracle)",
            "ACTION": r"(deploy|build|test|install|run|execute|create)",
            "TIME": r"(today|yesterday|now|last (week|month|session)|recent)",
            "FILE": r"(\w+\.(py|md|html|json|txt))",
        }

        # Context manager
        self.context = ConversationContext()

    def process(self, query: str) -> Intent:
        """
        Process natural language query

        Args:
            query: User's natural language query

        Returns:
            Intent object with recognized intent and entities
        """
        query_lower = query.lower()

        # Recognize intent
        intent_type, confidence = self._recognize_intent(query_lower)

        # Extract entities
        entities = self._extract_entities(query_lower)

        # Apply context
        intent_type, entities = self._apply_context(intent_type, entities, query_lower)

        # Update context
        self._update_context(query, intent_type, entities)

        return Intent(
            intent_type=intent_type,
            confidence=confidence,
            entities=entities,
            original_query=query
        )

    def _recognize_intent(self, query: str) -> Tuple[str, float]:
        """Recognize user intent from query"""
        scores = {}

        for intent_type, patterns in self.intent_patterns.items():
            score = 0
            for pattern in patterns:
                if re.search(pattern, query):
                    score += 1
            scores[intent_type] = score

        # Get highest scoring intent
        if max(scores.values()) > 0:
            intent_type = max(scores, key=scores.get)
            confidence = min(100, scores[intent_type] * 30)  # Each match = 30% confidence
        else:
            intent_type = "SEARCH"  # Default to search
            confidence = 50

        return intent_type, confidence

    def _extract_entities(self, query: str) -> Dict[str, str]:
        """Extract entities from query"""
        entities = {}

        for entity_type, pattern in self.entity_patterns.items():
            matches = re.findall(pattern, query)
            if matches:
                if isinstance(matches[0], tuple):
                    entities[entity_type] = matches[0][0]  # First capture group
                else:
                    entities[entity_type] = matches[0]

        return entities

    def _apply_context(
        self,
        intent_type: str,
        entities: Dict[str, str],
        query: str
    ) -> Tuple[str, Dict[str, str]]:
        """Apply conversation context to resolve ambiguities"""

        # Handle pronouns using context
        if re.search(r'\b(it|that|this|they)\b', query):
            if self.context.last_entities:
                # Inherit entities from previous turn
                for key, value in self.context.last_entities.items():
                    if key not in entities:
                        entities[key] = value

        # Handle follow-up questions
        if re.search(r'^(and|also|what about|how about)', query):
            if self.context.last_intent:
                # Keep same intent as previous
                intent_type = self.context.last_intent

        return intent_type, entities

    def _update_context(
        self,
        query: str,
        intent_type: str,
        entities: Dict[str, str]
    ):
        """Update conversation context"""
        self.context.last_query = query
        self.context.last_intent = intent_type
        self.context.last_entities = entities
        self.context.turn_count += 1

        # Track conversation topic
        if "SYSTEM" in entities:
            self.context.conversation_topic = entities["SYSTEM"]

    def generate_response(
        self,
        intent: Intent,
        results: List[any],
        context_aware: bool = True
    ) -> str:
        """
        Generate natural language response

        Args:
            intent: Recognized intent
            results: Query results or data
            context_aware: Include conversation context

        Returns:
            Natural language response string
        """
        response = []

        # Greeting/acknowledgment
        if context_aware and self.context.turn_count > 1:
            response.append(self._generate_acknowledgment(intent))

        # Main response based on intent
        if intent.intent_type == "SEARCH":
            response.append(self._generate_search_response(intent, results))
        elif intent.intent_type == "STATUS":
            response.append(self._generate_status_response(intent, results))
        elif intent.intent_type == "DECISION":
            response.append(self._generate_decision_response(intent, results))
        elif intent.intent_type == "BRIEFING":
            response.append(self._generate_briefing_response(intent, results))
        else:
            response.append(self._generate_generic_response(intent, results))

        # Follow-up suggestions
        if context_aware:
            response.append(self._generate_followup(intent))

        return "\n\n".join(filter(None, response))

    def _generate_acknowledgment(self, intent: Intent) -> str:
        """Generate contextual acknowledgment"""
        acknowledgments = {
            "SEARCH": "Let me search for that...",
            "STATUS": "Checking status...",
            "DECISION": "Analyzing that decision...",
            "BRIEFING": "Preparing briefing...",
        }
        return acknowledgments.get(intent.intent_type, "")

    def _generate_search_response(self, intent: Intent, results: List) -> str:
        """Generate search response"""
        if not results:
            return f"I couldn't find anything about '{intent.original_query}'. Try rephrasing or use different keywords."

        response = [f"Found {len(results)} results for '{intent.original_query}':"]

        for i, result in enumerate(results[:5], 1):
            title = result.title if hasattr(result, 'title') else str(result)
            response.append(f"\n{i}. {title}")

            if hasattr(result, 'content'):
                snippet = result.content[:150]
                response.append(f"   {snippet}...")

        if len(results) > 5:
            response.append(f"\n...and {len(results) - 5} more results")

        return "".join(response)

    def _generate_status_response(self, intent: Intent, results: any) -> str:
        """Generate status response"""
        if "INSTANCE" in intent.entities:
            instance = intent.entities["INSTANCE"].upper()
            return f"{instance} Status:\n{results}"
        else:
            return f"Trinity Network Status:\n{results}"

    def _generate_decision_response(self, intent: Intent, results: any) -> str:
        """Generate decision recommendation response"""
        if hasattr(results, 'recommendation'):
            rec = results.recommendation
            conf = results.confidence
            pattern = results.pattern_classification

            response = [f"Decision Analysis: {intent.original_query}\n"]
            response.append(f"Pattern: {pattern}")
            response.append(f"Recommendation: {rec} (Confidence: {conf}%)")

            if results.reasoning:
                response.append("\nReasoning:")
                for reason in results.reasoning[:3]:
                    response.append(f"  • {reason}")

            return "\n".join(response)
        else:
            return str(results)

    def _generate_briefing_response(self, intent: Intent, results: any) -> str:
        """Generate briefing response"""
        time_entity = intent.entities.get("TIME", "current")
        return f"Briefing ({time_entity}):\n{results}"

    def _generate_generic_response(self, intent: Intent, results: any) -> str:
        """Generate generic response"""
        return str(results)

    def _generate_followup(self, intent: Intent) -> str:
        """Generate follow-up suggestions"""
        suggestions = {
            "SEARCH": "Would you like to see more details on any result?",
            "STATUS": "Would you like a detailed breakdown?",
            "DECISION": "Would you like to see risks or historical precedents?",
            "BRIEFING": "Anything specific you'd like to dive into?",
        }
        return suggestions.get(intent.intent_type, "")


class SmartResponseGenerator:
    """Generate contextual, natural responses"""

    def __init__(self):
        self.nlp = NaturalLanguageProcessor()

    def enhance_response(
        self,
        query: str,
        raw_results: any,
        add_context: bool = True
    ) -> str:
        """
        Enhance raw results with natural language

        Args:
            query: User's query
            raw_results: Raw results from query engine
            add_context: Add conversational context

        Returns:
            Enhanced natural language response
        """
        # Process query
        intent = self.nlp.process(query)

        # Generate response
        response = self.nlp.generate_response(
            intent,
            raw_results,
            context_aware=add_context
        )

        return response


def main():
    """Test NLP system"""
    nlp = NaturalLanguageProcessor()

    # Test conversation
    test_queries = [
        "What is Trinity Hive Mind?",
        "Can you show me the architecture?",
        "Should I deploy it now?",
        "What about the risks?",
        "Give me a status update on C1",
        "Morning briefing please"
    ]

    print("="*70)
    print("NATURAL LANGUAGE PROCESSING TEST")
    print("="*70)

    for query in test_queries:
        print(f"\nQuery: {query}")
        intent = nlp.process(query)
        print(f"Intent: {intent.intent_type} (confidence: {intent.confidence}%)")
        print(f"Entities: {intent.entities}")
        print(f"Turn: {nlp.context.turn_count}")
        print("-"*70)


if __name__ == "__main__":
    main()
