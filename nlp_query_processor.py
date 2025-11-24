"""
Natural Language Query Processor - Phase 2 Enhancement
Advanced intent detection, time-range filtering, category search

Design: C3T3 Oracle
Date: 2025-11-23
Purpose: Enhanced query understanding for Voice Interface
"""

import re
import json
from datetime import datetime, timedelta
from typing import Dict, List, Optional


class NLPQueryProcessor:
    """Advanced natural language query processor for Voice Interface"""

    def __init__(self):
        # Category keywords mapping
        self.categories = {
            "frameworks": ["framework", "pattern theory", "trinity", "overkore", "system"],
            "autonomous_work": ["autonomous", "session", "work", "task", "completed"],
            "session_reports": ["session", "report", "summary", "complete"],
            "strategic": ["strategy", "strategic", "plan", "planning", "roadmap"],
            "consciousness": ["consciousness", "elevation", "manipulation", "immunity"],
            "oracle": ["oracle", "prediction", "insight", "convergence"],
            "technical": ["code", "script", "python", "javascript", "api", "database"],
            "deployment": ["deploy", "deployment", "production", "railway", "hosting"],
            "trinity": ["trinity", "c1", "c2", "c3", "mechanic", "architect", "oracle"],
            "cyclotron": ["cyclotron", "knowledge", "data", "storage", "search"],
        }

        # Time-range patterns
        self.time_patterns = {
            "today": timedelta(days=0),
            "yesterday": timedelta(days=1),
            "last week": timedelta(days=7),
            "last month": timedelta(days=30),
            "last 2 weeks": timedelta(days=14),
            "last 3 months": timedelta(days=90),
        }

        # Month name mapping
        self.months = {
            "january": 1, "february": 2, "march": 3, "april": 4,
            "may": 5, "june": 6, "july": 7, "august": 8,
            "september": 9, "october": 10, "november": 11, "december": 12
        }

    def process_query(self, query_text: str) -> Dict:
        """
        Process natural language query and extract structured information

        Returns:
        {
            "original_query": str,
            "intent": str,
            "keywords": List[str],
            "categories": List[str],
            "time_range": Optional[Dict],
            "filters": Dict,
            "complexity": str
        }
        """
        query_lower = query_text.lower()

        # Detect intent
        intent = self._detect_intent(query_lower)

        # Extract keywords
        keywords = self._extract_keywords(query_lower)

        # Detect categories
        categories = self._detect_categories(query_lower)

        # Extract time range
        time_range = self._extract_time_range(query_lower)

        # Detect specific filters
        filters = self._extract_filters(query_lower)

        # Determine complexity
        complexity = self._assess_complexity(intent, keywords, categories, time_range, filters)

        return {
            "original_query": query_text,
            "intent": intent,
            "keywords": keywords,
            "categories": categories,
            "time_range": time_range,
            "filters": filters,
            "complexity": complexity,
            "search_strategy": self._determine_search_strategy(intent, categories, time_range)
        }

    def _detect_intent(self, query: str) -> str:
        """Detect primary intent from query"""

        # Search patterns
        if any(word in query for word in ["what", "show", "find", "search", "list"]):
            return "search"

        # Explanation patterns
        if any(word in query for word in ["explain", "describe", "tell me about", "what is"]):
            return "explain"

        # Summary patterns
        if any(word in query for word in ["summarize", "summary", "overview"]):
            return "summarize"

        # Comparison patterns
        if any(word in query for word in ["compare", "difference", "versus", "vs"]):
            return "compare"

        # Recommendation patterns
        if any(word in query for word in ["recommend", "suggest", "should i"]):
            return "recommend"

        # Count patterns
        if any(word in query for word in ["how many", "count", "number of"]):
            return "count"

        # Default to search
        return "search"

    def _extract_keywords(self, query: str) -> List[str]:
        """Extract important keywords from query"""

        # Remove common stop words
        stop_words = {
            "what", "when", "where", "who", "how", "is", "are", "was", "were",
            "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
            "of", "with", "by", "from", "did", "we", "i", "you", "me", "about",
            "show", "find", "tell", "give", "get"
        }

        # Extract words
        words = re.findall(r'\b\w+\b', query.lower())

        # Filter stop words and short words
        keywords = [w for w in words if w not in stop_words and len(w) > 2]

        # Extract quoted phrases
        quoted = re.findall(r'"([^"]+)"', query)
        keywords.extend(quoted)

        return keywords

    def _detect_categories(self, query: str) -> List[str]:
        """Detect relevant categories from query"""

        detected = []

        for category, keywords in self.categories.items():
            if any(keyword in query for keyword in keywords):
                detected.append(category)

        return detected

    def _extract_time_range(self, query: str) -> Optional[Dict]:
        """Extract time range from natural language"""

        now = datetime.now()

        # Check for relative time patterns
        for pattern, delta in self.time_patterns.items():
            if pattern in query:
                start_date = now - delta
                return {
                    "start": start_date.strftime("%Y-%m-%d"),
                    "end": now.strftime("%Y-%m-%d"),
                    "description": pattern
                }

        # Check for specific month names
        for month_name, month_num in self.months.items():
            if month_name in query:
                # Determine year
                year = now.year
                if month_num > now.month:
                    year -= 1  # Last year if month hasn't occurred this year

                # Calculate start and end dates
                start_date = datetime(year, month_num, 1)
                if month_num == 12:
                    end_date = datetime(year + 1, 1, 1) - timedelta(days=1)
                else:
                    end_date = datetime(year, month_num + 1, 1) - timedelta(days=1)

                return {
                    "start": start_date.strftime("%Y-%m-%d"),
                    "end": end_date.strftime("%Y-%m-%d"),
                    "description": f"{month_name.title()} {year}"
                }

        # Check for "this week"
        if "this week" in query:
            week_start = now - timedelta(days=now.weekday())
            return {
                "start": week_start.strftime("%Y-%m-%d"),
                "end": now.strftime("%Y-%m-%d"),
                "description": "this week"
            }

        # Check for "this month"
        if "this month" in query:
            month_start = datetime(now.year, now.month, 1)
            return {
                "start": month_start.strftime("%Y-%m-%d"),
                "end": now.strftime("%Y-%m-%d"),
                "description": "this month"
            }

        return None

    def _extract_filters(self, query: str) -> Dict:
        """Extract specific filters from query"""

        filters = {}

        # Source filters (C1, C2, C3, Oracle, Mechanic, Architect)
        if "c1" in query or "mechanic" in query:
            filters["source"] = "C1_MECHANIC"
        elif "c2" in query or "architect" in query:
            filters["source"] = "C2_ARCHITECT"
        elif "c3" in query or "oracle" in query:
            filters["source"] = "C3_ORACLE"

        # Status filters
        if "complete" in query or "completed" in query:
            filters["status"] = "completed"
        elif "pending" in query or "todo" in query:
            filters["status"] = "pending"
        elif "in progress" in query:
            filters["status"] = "in_progress"

        # File type filters
        if ".py" in query or "python" in query or "script" in query:
            filters["file_type"] = "python"
        elif ".js" in query or "javascript" in query:
            filters["file_type"] = "javascript"
        elif ".md" in query or "markdown" in query or "document" in query:
            filters["file_type"] = "markdown"
        elif ".html" in query or "dashboard" in query:
            filters["file_type"] = "html"

        return filters

    def _assess_complexity(self, intent: str, keywords: List[str],
                          categories: List[str], time_range: Optional[Dict],
                          filters: Dict) -> str:
        """Assess query complexity"""

        complexity_score = 0

        # Intent complexity
        if intent in ["compare", "summarize", "recommend"]:
            complexity_score += 2

        # Multiple categories
        if len(categories) > 2:
            complexity_score += 1

        # Time range present
        if time_range:
            complexity_score += 1

        # Multiple filters
        if len(filters) > 1:
            complexity_score += 1

        # Many keywords
        if len(keywords) > 5:
            complexity_score += 1

        if complexity_score >= 4:
            return "complex"
        elif complexity_score >= 2:
            return "moderate"
        else:
            return "simple"

    def _determine_search_strategy(self, intent: str, categories: List[str],
                                   time_range: Optional[Dict]) -> str:
        """Determine optimal search strategy based on query analysis"""

        if intent == "count":
            return "aggregation"
        elif intent == "compare":
            return "multi_query"
        elif len(categories) > 0 and time_range:
            return "filtered_search"
        elif time_range:
            return "temporal_search"
        elif len(categories) > 0:
            return "category_search"
        else:
            return "keyword_search"

    def format_search_params(self, processed_query: Dict) -> Dict:
        """Format processed query into search parameters for Cyclotron"""

        search_params = {
            "keywords": processed_query["keywords"],
            "intent": processed_query["intent"],
            "strategy": processed_query["search_strategy"]
        }

        if processed_query["categories"]:
            search_params["categories"] = processed_query["categories"]

        if processed_query["time_range"]:
            search_params["time_range"] = processed_query["time_range"]

        if processed_query["filters"]:
            search_params["filters"] = processed_query["filters"]

        return search_params


def test_nlp_processor():
    """Test the NLP query processor with sample queries"""

    processor = NLPQueryProcessor()

    test_queries = [
        "What frameworks did we build last month?",
        "Show me all autonomous work from October",
        "Explain Pattern Theory",
        "What did C3 Oracle recommend this week?",
        "Compare our work in October versus November",
        "How many Python scripts were created yesterday?",
        "Find all session reports about Trinity",
        "What strategic documents exist?",
        "Show me deployment systems from last week"
    ]

    print("NLP Query Processor - Test Results")
    print("=" * 60)

    for query in test_queries:
        print(f"\nQuery: {query}")
        print("-" * 60)

        result = processor.process_query(query)

        print(f"Intent: {result['intent']}")
        print(f"Keywords: {', '.join(result['keywords'])}")
        print(f"Categories: {', '.join(result['categories']) if result['categories'] else 'None'}")

        if result['time_range']:
            print(f"Time Range: {result['time_range']['description']} ({result['time_range']['start']} to {result['time_range']['end']})")
        else:
            print("Time Range: None")

        if result['filters']:
            print(f"Filters: {json.dumps(result['filters'], indent=2)}")

        print(f"Complexity: {result['complexity']}")
        print(f"Search Strategy: {result['search_strategy']}")

    print("\n" + "=" * 60)
    print("Test complete!")


if __name__ == "__main__":
    test_nlp_processor()
