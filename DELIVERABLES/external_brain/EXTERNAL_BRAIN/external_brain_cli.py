#!/usr/bin/env python3
"""
COMMANDER'S EXTERNAL BRAIN - Command Line Interface
Simple text-based interface for testing

Designed by: C2T3 Architect (The Mind)
Purpose: Interactive knowledge access via terminal
"""

from external_brain_query_engine import UnifiedQueryEngine, QueryResult
from typing import List
import sys

class Colors:
    """ANSI color codes"""
    HEADER = '\033[95m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    END = '\033[0m'
    BOLD = '\033[1m'

class ExternalBrainCLI:
    def __init__(self):
        """Initialize CLI"""
        self.engine = UnifiedQueryEngine()
        self.history = []

    def print_banner(self):
        """Print welcome banner"""
        print(f"{Colors.BOLD}{Colors.CYAN}")
        print("╔═══════════════════════════════════════════════════════════════════╗")
        print("║        COMMANDER'S EXTERNAL BRAIN - COMMAND LINE INTERFACE        ║")
        print("╚═══════════════════════════════════════════════════════════════════╝")
        print(f"{Colors.END}")
        print(f"{Colors.YELLOW}Your AI-powered second brain with access to 121K+ knowledge items{Colors.END}")
        print()
        print("Commands:")
        print(f"  {Colors.GREEN}search <query>{Colors.END}  - Search all knowledge sources")
        print(f"  {Colors.GREEN}status{Colors.END}          - Show Trinity network status")
        print(f"  {Colors.GREEN}brief{Colors.END}           - Morning briefing")
        print(f"  {Colors.GREEN}history{Colors.END}         - Show query history")
        print(f"  {Colors.GREEN}help{Colors.END}            - Show this help")
        print(f"  {Colors.GREEN}exit{Colors.END}            - Exit External Brain")
        print()

    def search(self, query: str):
        """Execute search query"""
        if not query:
            print(f"{Colors.RED}Please provide a search query{Colors.END}")
            return

        # Add to history
        self.history.append(query)

        # Execute search
        results = self.engine.query(query, max_results=10)

        if not results:
            print(f"{Colors.YELLOW}No results found for '{query}'{Colors.END}")
            return

        # Display results
        print(f"\n{Colors.BOLD}Found {len(results)} results for: '{query}'{Colors.END}")
        print(f"{Colors.CYAN}{'─' * 70}{Colors.END}\n")

        for i, result in enumerate(results, 1):
            # Color code by source
            source_colors = {
                'cyclotron': Colors.BLUE,
                'workspace': Colors.GREEN,
                'hive_mind': Colors.CYAN,
                'pattern_theory': Colors.YELLOW,
                'trinity_hub': Colors.BOLD
            }
            color = source_colors.get(result.source, Colors.END)

            print(f"{Colors.BOLD}{i}. {color}[{result.source.upper()}]{Colors.END} {result.title}")
            print(f"   Relevance: {Colors.GREEN}{result.relevance_score:.1f}/100{Colors.END}")

            # Show snippet
            snippet = result.content[:300]
            if len(result.content) > 300:
                snippet += "..."
            print(f"   {snippet}")

            # Show metadata
            if result.file_path:
                print(f"   {Colors.CYAN}📁 {result.file_path}{Colors.END}")

            if result.metadata:
                meta_str = ", ".join([f"{k}={v}" for k, v in result.metadata.items() if v])
                if meta_str:
                    print(f"   {Colors.YELLOW}ℹ️  {meta_str}{Colors.END}")

            print()

    def show_status(self):
        """Show Trinity network status"""
        print(f"\n{Colors.BOLD}Trinity Network Status:{Colors.END}")
        print(f"{Colors.CYAN}{'─' * 70}{Colors.END}\n")

        # Query Trinity Hub for status
        results = self.engine.search_trinity_hub("status")

        if results:
            print(results[0].content)
        else:
            print(f"{Colors.YELLOW}Trinity Hub status unavailable{Colors.END}")

    def morning_briefing(self):
        """Generate morning briefing"""
        print(f"\n{Colors.BOLD}{Colors.CYAN}═══ MORNING BRIEFING ═══{Colors.END}\n")

        # Recent work
        print(f"{Colors.BOLD}Recent Work (Last 24 hours):{Colors.END}")
        recent_work = self.engine.query("C2T3 session complete", max_results=3)
        if recent_work:
            for result in recent_work:
                print(f"  • {result.title}")
                print(f"    {result.content[:150]}...")
        else:
            print(f"  {Colors.YELLOW}No recent sessions found{Colors.END}")

        print()

        # Oracle priorities
        print(f"{Colors.BOLD}Oracle Priorities:{Colors.END}")
        oracle = self.engine.query("Oracle emergence", max_results=3)
        if oracle:
            for result in oracle:
                print(f"  • {result.title[:60]}")
        else:
            print(f"  {Colors.YELLOW}No Oracle data found{Colors.END}")

        print()

        # Trinity status
        print(f"{Colors.BOLD}Trinity Status:{Colors.END}")
        status = self.engine.search_trinity_hub("active_instances")
        if status:
            print(f"  ✅ Trinity Hub accessible")
        else:
            print(f"  ⚠️  Trinity Hub not found")

        print()

    def show_history(self):
        """Show query history"""
        if not self.history:
            print(f"{Colors.YELLOW}No query history yet{Colors.END}")
            return

        print(f"\n{Colors.BOLD}Query History:{Colors.END}")
        for i, query in enumerate(reversed(self.history[-10:]), 1):
            print(f"  {i}. {query}")
        print()

    def show_help(self):
        """Show help"""
        self.print_banner()

    def run(self):
        """Run interactive CLI"""
        self.print_banner()

        while True:
            try:
                # Prompt
                prompt = f"{Colors.BOLD}{Colors.GREEN}Commander » {Colors.END}"
                user_input = input(prompt).strip()

                if not user_input:
                    continue

                # Parse command
                parts = user_input.split(maxsplit=1)
                command = parts[0].lower()
                args = parts[1] if len(parts) > 1 else ""

                # Execute command
                if command in ['exit', 'quit', 'q']:
                    print(f"{Colors.CYAN}External Brain shutting down. Goodbye, Commander.{Colors.END}")
                    break

                elif command in ['search', 's', 'find']:
                    self.search(args)

                elif command == 'status':
                    self.show_status()

                elif command in ['brief', 'briefing']:
                    self.morning_briefing()

                elif command in ['history', 'h']:
                    self.show_history()

                elif command in ['help', '?']:
                    self.show_help()

                else:
                    # Default to search
                    self.search(user_input)

            except KeyboardInterrupt:
                print(f"\n{Colors.CYAN}Use 'exit' to quit{Colors.END}")
            except EOFError:
                break
            except Exception as e:
                print(f"{Colors.RED}Error: {e}{Colors.END}")

def main():
    """Main entry point"""
    cli = ExternalBrainCLI()
    cli.run()

if __name__ == "__main__":
    main()
