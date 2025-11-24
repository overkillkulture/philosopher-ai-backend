#!/usr/bin/env python3
"""
COMMANDER'S EXTERNAL BRAIN - Conversational Interface
Simple, natural command: "python brain.py"

Usage:
    python brain.py              - Start conversational mode
    python brain.py demo         - Run demonstration
    python brain.py "question"   - Ask single question
"""

import sys
from pathlib import Path

# Add EXTERNAL_BRAIN to path
sys.path.insert(0, str(Path(__file__).parent))

from external_brain_integrated import IntegratedExternalBrain
from datetime import datetime


class ConversationalBrain:
    """Enhanced conversational interface for External Brain"""

    def __init__(self):
        self.brain = IntegratedExternalBrain(
            enable_nlp=True,
            enable_context=True,
            enable_advisor=True,
            verbose=False
        )
        self.running = True

    def welcome(self):
        """Display welcome message"""
        print()
        print("="*80)
        print()
        print("  COMMANDER'S EXTERNAL BRAIN - Conversational AI".center(80))
        print("  Phase 2: Natural Language Processing ACTIVE".center(80))
        print()
        print("="*80)
        print()
        print("I'm your second brain. Just talk to me naturally.")
        print()
        print("Try these:")
        print("  - What is Trinity Hive Mind?")
        print("  - Show me C1 status")
        print("  - Should I deploy Pattern Theory validation?")
        print("  - Give me a morning briefing")
        print("  - What did we build yesterday?")
        print()
        print("Commands: 'help', 'history', 'summary', 'exit'")
        print("="*80)
        print()

    def help_message(self):
        """Show help"""
        print()
        print("="*80)
        print("  EXTERNAL BRAIN HELP".center(80))
        print("="*80)
        print()
        print("[NATURAL CONVERSATION]")
        print("   Just ask questions naturally. The Brain understands:")
        print("   - What is [topic]?")
        print("   - Show me [system]")
        print("   - Should I [action]?")
        print("   - Give me [briefing type]")
        print("   - What about [topic]?  (follow-up questions)")
        print()
        print("[SEARCH EXAMPLES]")
        print("   - What is Trinity Hive Mind?")
        print("   - Find Railway deployment docs")
        print("   - Show Pattern Theory validation")
        print("   - Tell me about External Brain architecture")
        print()
        print("[STRATEGIC DECISIONS]")
        print("   - Should I deploy [system] now?")
        print("   - Is it worth doing [action]?")
        print("   - Recommend approach for [problem]")
        print()
        print("[STATUS & BRIEFINGS]")
        print("   - C1 status / C2 status / C3 status")
        print("   - Give me a morning briefing")
        print("   - What is Trinity doing?")
        print()
        print("[COMMANDS]")
        print("   help     - Show this help")
        print("   history  - Show conversation history")
        print("   summary  - Show conversation summary")
        print("   clear    - Clear screen")
        print("   exit     - Exit")
        print()

    def show_history(self):
        """Show conversation history"""
        history = self.brain.get_conversation_history(max_turns=20)

        if not history:
            print("\nNo conversation history yet.")
            return

        print()
        print("="*80)
        print("  CONVERSATION HISTORY".center(80))
        print("="*80)
        print()

        for i, turn in enumerate(history, 1):
            time_str = turn['timestamp'].split('T')[1][:8]
            print(f"{i:2d}. [{time_str}] {turn['query']}")
            print(f"    -> {turn['intent']} - {turn['results_count']} results")
        print()

    def show_summary(self):
        """Show conversation summary"""
        if self.brain.context_manager:
            print()
            print("="*80)
            print("  CONVERSATION SUMMARY".center(80))
            print("="*80)
            print()
            print(self.brain.context_manager.get_conversation_summary())
            print()
        else:
            print("\nContext tracking not enabled.")

    def process_command(self, user_input: str) -> bool:
        """
        Process special commands
        Returns True if command was processed, False if it's a query
        """
        cmd = user_input.lower().strip()

        if cmd in ["exit", "quit", "q"]:
            print("\n[*] Ending session. Your conversation is saved.")
            self.brain.end_session()
            self.running = False
            return True

        elif cmd in ["help", "h", "?"]:
            self.help_message()
            return True

        elif cmd in ["history", "hist"]:
            self.show_history()
            return True

        elif cmd in ["summary", "sum"]:
            self.show_summary()
            return True

        elif cmd in ["clear", "cls"]:
            import os
            os.system('cls' if os.name == 'nt' else 'clear')
            self.welcome()
            return True

        return False

    def ask_question(self, query: str):
        """Ask the brain a question and display response"""
        # Show thinking indicator
        print()
        print("[*] Thinking...", end="", flush=True)

        # Get response
        response = self.brain.ask(query, max_results=10)

        # Clear thinking indicator
        print("\r" + " "*80 + "\r", end="")

        # Show intent if verbose mode
        if response.intent.confidence < 70:
            print(f"   (Interpreted as: {response.intent.intent_type})\n")

        # Show response
        print(response.natural_response)
        print()

    def run(self):
        """Run interactive loop"""
        self.welcome()

        while self.running:
            try:
                # Get input
                user_input = input("[>>] You: ").strip()

                if not user_input:
                    continue

                # Check if it's a command
                if self.process_command(user_input):
                    continue

                # Otherwise, treat as question
                self.ask_question(user_input)

            except KeyboardInterrupt:
                print("\n\n[*] Session interrupted. Your conversation is saved.")
                self.brain.end_session()
                break

            except Exception as e:
                print(f"\n[ERROR] {e}")
                print("Try rephrasing your question or type 'help' for guidance.\n")

    def demo(self):
        """Run demonstration"""
        print()
        print("="*80)
        print()
        print("  EXTERNAL BRAIN DEMONSTRATION".center(80))
        print("  Showing conversational flow with context awareness".center(80))
        print()
        print("="*80)
        print()

        demo_conversation = [
            ("What is Trinity Hive Mind?", "Knowledge search"),
            ("Show me the architecture for it", "Follow-up with pronoun resolution"),
            ("Should I deploy it now?", "Strategic decision analysis"),
            ("What are the risks?", "Follow-up question"),
            ("Give me C1 status", "Status check"),
            ("Morning briefing please", "Comprehensive briefing"),
        ]

        for query, description in demo_conversation:
            print()
            print("-" * 80)
            print(f"[QUERY] {query}")
            print(f"   ({description})")
            print("-" * 80)

            response = self.brain.ask(query, max_results=5)

            print()
            print(f"[ANALYSIS]")
            print(f"   Intent: {response.intent.intent_type}")
            print(f"   Confidence: {response.intent.confidence}%")
            if response.intent.entities:
                print(f"   Entities: {response.intent.entities}")
            print(f"   Turn: {response.turn_number}")

            print()
            print(f"[RESPONSE]")
            print()
            print(response.natural_response)
            print()

            input("   [Press Enter for next question]")

        print()
        print("="*80)
        print("  DEMONSTRATION COMPLETE".center(80))
        print("="*80)
        print()

        # Show conversation summary
        print("Conversation Summary:")
        print(self.brain.context_manager.get_conversation_summary())
        print()

    def single_query(self, query: str):
        """Process a single query and exit"""
        print()
        print("[*] External Brain - Single Query Mode")
        print("="*80)
        print()

        response = self.brain.ask(query, max_results=10)
        print(response.natural_response)
        print()


def main():
    """Main entry point"""
    brain = ConversationalBrain()

    if len(sys.argv) > 1:
        if sys.argv[1].lower() == "demo":
            brain.demo()
        else:
            # Treat as single query
            query = " ".join(sys.argv[1:])
            brain.single_query(query)
    else:
        brain.run()


if __name__ == "__main__":
    main()
