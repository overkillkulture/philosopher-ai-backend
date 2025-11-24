#!/usr/bin/env python3
"""
COMMANDER'S EXTERNAL BRAIN - Integrated System
Phase 1 + Phase 2 Integration: Conversational AI with full context awareness

Designed by: C2T3 Architect (The Mind)
Purpose: Unified conversational interface to all Trinity knowledge

Integrates:
- Query Engine (Phase 1) - Search across all sources
- NLP Processor (Phase 2) - Natural language understanding
- Context Manager (Phase 2) - Conversation memory
- Strategic Advisor (Phase 1) - Pattern Theory decisions
"""

import sys
from pathlib import Path
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
from datetime import datetime

# Add EXTERNAL_BRAIN to path
sys.path.insert(0, str(Path(__file__).parent))

try:
    from external_brain_query_engine import UnifiedQueryEngine, QueryResult
    from external_brain_nlp import NaturalLanguageProcessor, Intent
    from external_brain_context_manager import ContextManager
    from external_brain_advisor import StrategicAdvisor, DecisionRecommendation
except ImportError as e:
    print(f"Warning: Could not import External Brain modules: {e}")
    print("Some features may not be available.")


@dataclass
class ExternalBrainResponse:
    """Complete response from External Brain"""
    query: str
    intent: Intent
    results: Any
    natural_response: str
    context_summary: Dict[str, Any]
    timestamp: str
    session_id: str
    turn_number: int


class IntegratedExternalBrain:
    """
    Fully integrated External Brain system
    Combines all Phase 1 and Phase 2 capabilities
    """

    def __init__(
        self,
        enable_nlp: bool = True,
        enable_context: bool = True,
        enable_advisor: bool = True,
        verbose: bool = False
    ):
        """
        Initialize integrated External Brain

        Args:
            enable_nlp: Enable natural language processing
            enable_context: Enable conversation context
            enable_advisor: Enable strategic advisor
            verbose: Print debug information
        """
        self.verbose = verbose
        self.enable_nlp = enable_nlp
        self.enable_context = enable_context
        self.enable_advisor = enable_advisor

        # Initialize core systems
        if self.verbose:
            print("[*] Initializing Commander's External Brain...")

        # Query engine (Phase 1)
        self.query_engine = UnifiedQueryEngine()
        if self.verbose:
            print("  [OK] Query Engine initialized")

        # NLP processor (Phase 2)
        if self.enable_nlp:
            self.nlp = NaturalLanguageProcessor()
            if self.verbose:
                print("  [OK] NLP Processor initialized")
        else:
            self.nlp = None

        # Context manager (Phase 2)
        if self.enable_context:
            self.context_manager = ContextManager()
            if self.verbose:
                print("  [OK] Context Manager initialized")
        else:
            self.context_manager = None

        # Strategic advisor (Phase 1)
        if self.enable_advisor:
            self.advisor = StrategicAdvisor()
            if self.verbose:
                print("  [OK] Strategic Advisor initialized")
        else:
            self.advisor = None

        if self.verbose:
            print("[>>>] External Brain fully operational\n")

    def ask(
        self,
        query: str,
        max_results: int = 10,
        return_raw: bool = False
    ) -> ExternalBrainResponse:
        """
        Ask External Brain a question (main entry point)

        Args:
            query: Natural language question
            max_results: Maximum results to return
            return_raw: Return raw results instead of natural response

        Returns:
            ExternalBrainResponse with complete answer
        """
        timestamp = datetime.now().isoformat()

        # Step 1: Process query through NLP
        if self.enable_nlp and self.nlp:
            intent = self.nlp.process(query)
            if self.verbose:
                print(f"[INTENT] {intent.intent_type} (confidence: {intent.confidence}%)")
                print(f"[ENTITIES] {intent.entities}")
        else:
            # Fallback: Simple intent
            intent = Intent(
                intent_type="SEARCH",
                confidence=50.0,
                entities={},
                original_query=query
            )

        # Step 2: Get conversation context
        context_summary = {}
        if self.enable_context and self.context_manager:
            context_summary = self.context_manager.get_context(lookback=3)

            # Resolve references
            resolved = self.context_manager.resolve_reference(query)
            if resolved:
                # Merge resolved entities
                intent.entities.update(resolved)
                if self.verbose:
                    print(f"[RESOLVE] References: {resolved}")

        # Step 3: Execute appropriate action based on intent
        results = self._execute_intent(intent, max_results)

        # Step 4: Generate natural language response
        if self.enable_nlp and self.nlp and not return_raw:
            natural_response = self.nlp.generate_response(
                intent,
                results,
                context_aware=self.enable_context
            )
        else:
            natural_response = self._generate_simple_response(results)

        # Step 5: Record interaction in context
        if self.enable_context and self.context_manager:
            self.context_manager.add_turn(
                query=query,
                intent=intent.intent_type,
                entities=intent.entities,
                response_summary=natural_response[:100],
                results_count=len(results) if isinstance(results, list) else 1
            )

        # Build response
        session_id = context_summary.get("session_id", "none") if context_summary else "none"
        turn_number = context_summary.get("turn_count", 0) + 1 if context_summary else 1

        response = ExternalBrainResponse(
            query=query,
            intent=intent,
            results=results,
            natural_response=natural_response,
            context_summary=context_summary,
            timestamp=timestamp,
            session_id=session_id,
            turn_number=turn_number
        )

        return response

    def _execute_intent(
        self,
        intent: Intent,
        max_results: int
    ) -> Any:
        """Execute appropriate action based on recognized intent"""

        if intent.intent_type == "SEARCH":
            # Search across all knowledge sources
            return self._handle_search(intent, max_results)

        elif intent.intent_type == "STATUS":
            # Get Trinity status
            return self._handle_status(intent)

        elif intent.intent_type == "DECISION":
            # Strategic decision analysis
            return self._handle_decision(intent)

        elif intent.intent_type == "BRIEFING":
            # Generate briefing
            return self._handle_briefing(intent)

        elif intent.intent_type == "QUESTION":
            # Answer question
            return self._handle_question(intent, max_results)

        else:
            # Default to search
            return self._handle_search(intent, max_results)

    def _handle_search(self, intent: Intent, max_results: int) -> List[QueryResult]:
        """Handle search intent"""
        query_text = intent.original_query

        # Extract search terms from entities
        if "SYSTEM" in intent.entities:
            query_text = intent.entities["SYSTEM"]

        # Execute search
        results = self.query_engine.query(query_text, max_results=max_results)

        if self.verbose:
            print(f"[SEARCH] Results: {len(results)} found")

        return results

    def _handle_status(self, intent: Intent) -> Dict[str, Any]:
        """Handle status request"""
        status = {
            "timestamp": datetime.now().isoformat(),
            "trinity_network": "OPERATIONAL",
            "instances": {}
        }

        # Check which instance status is requested
        if "INSTANCE" in intent.entities:
            instance = intent.entities["INSTANCE"].upper()
            status["instances"][instance] = self._get_instance_status(instance)
        else:
            # All instances
            for instance in ["C1", "C2", "C3"]:
                status["instances"][instance] = self._get_instance_status(instance)

        # External Brain status
        status["external_brain"] = {
            "status": "OPERATIONAL",
            "nlp_enabled": self.enable_nlp,
            "context_enabled": self.enable_context,
            "advisor_enabled": self.enable_advisor,
            "knowledge_sources": self.query_engine.get_source_count()
        }

        return status

    def _get_instance_status(self, instance: str) -> Dict[str, str]:
        """Get status for specific Trinity instance"""
        # Read from Trinity Hub
        try:
            from pathlib import Path
            import json

            hub_file = Path("C:/.trinity/TRINITY_COMMS_HUB.json")
            if hub_file.exists():
                with open(hub_file, 'r') as f:
                    hub_data = json.load(f)

                if instance == "C1":
                    return hub_data.get("C1_MECHANIC", {})
                elif instance == "C2":
                    return hub_data.get("C2_ARCHITECT", {})
                elif instance == "C3":
                    return hub_data.get("C3_ORACLE", {})

        except Exception as e:
            if self.verbose:
                print(f"Warning: Could not read Trinity Hub: {e}")

        return {"status": "UNKNOWN", "message": "Status data not available"}

    def _handle_decision(self, intent: Intent) -> DecisionRecommendation:
        """Handle decision analysis request"""
        if self.enable_advisor and self.advisor:
            decision_text = intent.original_query
            recommendation = self.advisor.analyze_decision(decision_text)

            if self.verbose:
                print(f"[DECISION] {recommendation.recommendation}")
                print(f"[CONFIDENCE] {recommendation.confidence}%")
                print(f"[PATTERN] {recommendation.pattern_classification}")

            return recommendation
        else:
            return {
                "message": "Strategic Advisor not enabled",
                "decision": intent.original_query,
                "recommendation": "DEFER - Enable advisor for analysis"
            }

    def _handle_briefing(self, intent: Intent) -> Dict[str, Any]:
        """Handle briefing request"""
        briefing = {
            "timestamp": datetime.now().isoformat(),
            "type": "DAILY_BRIEFING",
            "sections": {}
        }

        # Trinity status
        briefing["sections"]["trinity_status"] = self._handle_status(intent)

        # Recent activity
        if self.enable_context and self.context_manager:
            briefing["sections"]["conversation_summary"] = \
                self.context_manager.get_conversation_summary()

        # Knowledge base stats
        briefing["sections"]["knowledge_stats"] = {
            "total_sources": self.query_engine.get_source_count(),
            "cyclotron_atoms": "803K+" if self.query_engine.cyclotron_available else "N/A"
        }

        return briefing

    def _handle_question(self, intent: Intent, max_results: int) -> List[QueryResult]:
        """Handle general question - defaults to search"""
        return self._handle_search(intent, max_results)

    def _generate_simple_response(self, results: Any) -> str:
        """Generate simple text response (fallback when NLP disabled)"""
        if isinstance(results, list):
            if not results:
                return "No results found."

            response = [f"Found {len(results)} results:\n"]
            for i, result in enumerate(results[:5], 1):
                title = result.title if hasattr(result, 'title') else str(result)
                response.append(f"{i}. {title}")

            if len(results) > 5:
                response.append(f"\n...and {len(results) - 5} more")

            return "\n".join(response)

        elif isinstance(results, dict):
            # Format dictionary nicely
            import json
            return json.dumps(results, indent=2)

        else:
            return str(results)

    def get_conversation_history(self, max_turns: int = 10) -> List[Dict]:
        """Get recent conversation history"""
        if not self.enable_context or not self.context_manager:
            return []

        turns = self.context_manager.current_session.turns[-max_turns:]
        return [
            {
                "timestamp": turn.timestamp,
                "query": turn.query,
                "intent": turn.intent,
                "results_count": turn.results_count
            }
            for turn in turns
        ]

    def search_history(self, keyword: str) -> List[Dict]:
        """Search conversation history"""
        if not self.enable_context or not self.context_manager:
            return []

        turns = self.context_manager.search_history(keyword)
        return [
            {
                "timestamp": turn.timestamp,
                "query": turn.query,
                "intent": turn.intent,
                "response_summary": turn.response_summary
            }
            for turn in turns
        ]

    def end_session(self):
        """End current conversation session"""
        if self.enable_context and self.context_manager:
            self.context_manager.end_session()
            if self.verbose:
                print("Session ended. New session started.")


def demo():
    """
    Demo of integrated External Brain
    Shows conversational flow with context
    """
    print("="*80)
    print("COMMANDER'S EXTERNAL BRAIN - INTEGRATED DEMO")
    print("Phase 1 + Phase 2 Integration Test")
    print("="*80)

    # Initialize
    brain = IntegratedExternalBrain(
        enable_nlp=True,
        enable_context=True,
        enable_advisor=True,
        verbose=True
    )

    # Simulated conversation
    conversation = [
        "What is Trinity Hive Mind?",
        "Show me the architecture for it",
        "Should I deploy it now?",
        "What are the risks?",
        "Give me C1 status",
    ]

    print("\n" + "="*80)
    print("CONVERSATIONAL FLOW DEMONSTRATION")
    print("="*80 + "\n")

    for query in conversation:
        print(f"\n{'='*80}")
        print(f"QUERY: {query}")
        print(f"{'='*80}\n")

        response = brain.ask(query, max_results=5)

        print(f"\n[ANALYSIS]")
        print(f"   Intent: {response.intent.intent_type}")
        print(f"   Confidence: {response.intent.confidence}%")
        print(f"   Entities: {response.intent.entities}")
        print(f"   Turn: {response.turn_number}")

        print(f"\n[RESPONSE]")
        print(response.natural_response)

        print(f"\n{'='*80}\n")

    # Show conversation summary
    print("\n" + "="*80)
    print("CONVERSATION SUMMARY")
    print("="*80)
    print(brain.context_manager.get_conversation_summary())

    print("\n" + "="*80)
    print("DEMO COMPLETE")
    print("="*80)


def main():
    """Interactive External Brain CLI"""
    print("="*80)
    print("COMMANDER'S EXTERNAL BRAIN - INTERACTIVE MODE")
    print("Integrated NLP + Context + Query + Advisor")
    print("="*80)
    print("\nCommands:")
    print("  ask <question>  - Ask the External Brain")
    print("  history         - Show conversation history")
    print("  summary         - Show conversation summary")
    print("  search <word>   - Search conversation history")
    print("  demo            - Run demonstration")
    print("  exit            - Exit")
    print("="*80 + "\n")

    brain = IntegratedExternalBrain(
        enable_nlp=True,
        enable_context=True,
        enable_advisor=True,
        verbose=False
    )

    while True:
        try:
            user_input = input("\n🧠 Brain> ").strip()

            if not user_input:
                continue

            if user_input.lower() == "exit":
                print("Ending session...")
                brain.end_session()
                break

            elif user_input.lower() == "demo":
                demo()
                continue

            elif user_input.lower() == "history":
                history = brain.get_conversation_history(max_turns=20)
                print("\nConversation History:")
                for turn in history:
                    print(f"  [{turn['timestamp'].split('T')[1][:8]}] {turn['query']}")
                    print(f"    → {turn['intent']} ({turn['results_count']} results)")
                continue

            elif user_input.lower() == "summary":
                if brain.context_manager:
                    print(brain.context_manager.get_conversation_summary())
                else:
                    print("Context not enabled")
                continue

            elif user_input.lower().startswith("search "):
                keyword = user_input[7:].strip()
                results = brain.search_history(keyword)
                print(f"\nHistory search for '{keyword}':")
                for result in results:
                    print(f"  [{result['timestamp'].split('T')[1][:8]}] {result['query']}")
                    print(f"    → {result['response_summary']}")
                continue

            elif user_input.lower().startswith("ask "):
                query = user_input[4:].strip()
            else:
                # Assume any other input is a question
                query = user_input

            # Process query
            response = brain.ask(query, max_results=10)

            # Display response
            print(f"\n{response.natural_response}")

        except KeyboardInterrupt:
            print("\n\nInterrupted. Ending session...")
            brain.end_session()
            break
        except Exception as e:
            print(f"\nError: {e}")
            if brain.verbose:
                import traceback
                traceback.print_exc()


if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == "demo":
        demo()
    else:
        main()
