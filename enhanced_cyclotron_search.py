"""
Enhanced Cyclotron Search - Phase 2
Advanced search with time-range, category, and filter support

Design: C3T3 Oracle
Date: 2025-11-23
Purpose: Enhanced search capabilities for Voice Interface Phase 2
"""

import os
import json
import glob
from datetime import datetime
from typing import List, Dict, Optional
from pathlib import Path


class EnhancedCyclotronSearch:
    """Advanced search engine for Cyclotron knowledge base"""

    def __init__(self, storage_path: str):
        self.storage_path = storage_path
        self.knowledge_base = []
        self.metadata_cache = {}

    def load_knowledge_base(self, limit: Optional[int] = None):
        """Load knowledge base with optional limit"""
        print(f"[LOADING] Enhanced Cyclotron from {self.storage_path}")

        json_files = glob.glob(f"{self.storage_path}/**/*.json", recursive=True)
        md_files = glob.glob(f"{self.storage_path}/**/*.md", recursive=True)
        py_files = glob.glob(f"{self.storage_path}/**/*.py", recursive=True)

        all_files = json_files + md_files + py_files

        if limit:
            all_files = all_files[:limit]

        loaded_count = 0
        for file_path in all_files:
            try:
                item = self._load_file_with_metadata(file_path)
                if item:
                    self.knowledge_base.append(item)
                    loaded_count += 1
            except Exception as e:
                pass  # Skip files that can't be loaded

        print(f"[OK] Loaded {loaded_count} knowledge items")
        return loaded_count

    def _load_file_with_metadata(self, file_path: str) -> Optional[Dict]:
        """Load file with metadata extraction"""

        try:
            # Get file stats
            stat = os.stat(file_path)
            modified_time = datetime.fromtimestamp(stat.st_mtime)

            # Determine file type
            ext = Path(file_path).suffix.lower()

            item = {
                "file_path": file_path,
                "file_name": os.path.basename(file_path),
                "file_type": ext[1:] if ext else "unknown",  # Remove dot
                "modified_date": modified_time.strftime("%Y-%m-%d"),
                "modified_timestamp": modified_time.isoformat(),
                "size_bytes": stat.st_size
            }

            # Load content based on file type
            if ext == ".json":
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = json.load(f)
                    item["content"] = content
                    item["content_text"] = json.dumps(content, indent=2)

            elif ext in [".md", ".txt"]:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                    item["content"] = content
                    item["content_text"] = content

            elif ext == ".py":
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                    item["content"] = content
                    item["content_text"] = content

            # Extract category from path or content
            item["category"] = self._detect_category(file_path, item.get("content_text", ""))

            # Extract source if detectable
            item["source"] = self._detect_source(file_path, item.get("content_text", ""))

            return item

        except Exception as e:
            return None

    def _detect_category(self, file_path: str, content: str) -> str:
        """Detect category from file path and content"""

        path_lower = file_path.lower()
        content_lower = content.lower() if content else ""

        # Check path-based categories
        if "session" in path_lower or "report" in path_lower:
            return "session_reports"
        elif "autonomous" in path_lower:
            return "autonomous_work"
        elif "trinity" in path_lower:
            return "trinity"
        elif "cyclotron" in path_lower:
            return "cyclotron"
        elif "framework" in path_lower:
            return "frameworks"

        # Check content-based categories
        if "pattern theory" in content_lower:
            return "frameworks"
        elif "consciousness" in content_lower:
            return "consciousness"
        elif "oracle" in content_lower:
            return "oracle"
        elif "strategic" in content_lower or "strategy" in content_lower:
            return "strategic"

        return "general"

    def _detect_source(self, file_path: str, content: str) -> Optional[str]:
        """Detect source (C1, C2, C3) from file path and content"""

        path_lower = file_path.lower()
        content_lower = content.lower() if content else ""

        # Check file path
        if "c1" in path_lower or "mechanic" in path_lower:
            return "C1_MECHANIC"
        elif "c2" in path_lower or "architect" in path_lower:
            return "C2_ARCHITECT"
        elif "c3" in path_lower or "oracle" in path_lower:
            return "C3_ORACLE"

        # Check content
        if "c1_mechanic" in content_lower or "from:** c1" in content_lower:
            return "C1_MECHANIC"
        elif "c2_architect" in content_lower or "from:** c2" in content_lower:
            return "C2_ARCHITECT"
        elif "c3_oracle" in content_lower or "from:** c3" in content_lower:
            return "C3_ORACLE"

        return None

    def search(self, search_params: Dict) -> List[Dict]:
        """
        Advanced search with multiple parameters

        search_params = {
            "keywords": List[str],
            "categories": Optional[List[str]],
            "time_range": Optional[Dict],
            "filters": Optional[Dict],
            "intent": str,
            "strategy": str
        }
        """

        print(f"[SEARCHING] Strategy: {search_params.get('strategy', 'keyword_search')}")

        # Start with all items
        results = self.knowledge_base.copy()

        # Apply time range filter
        if search_params.get("time_range"):
            results = self._filter_by_time_range(results, search_params["time_range"])
            print(f"[FILTER] Time range: {len(results)} items remain")

        # Apply category filter
        if search_params.get("categories"):
            results = self._filter_by_categories(results, search_params["categories"])
            print(f"[FILTER] Categories: {len(results)} items remain")

        # Apply custom filters
        if search_params.get("filters"):
            results = self._apply_filters(results, search_params["filters"])
            print(f"[FILTER] Custom filters: {len(results)} items remain")

        # Apply keyword search
        if search_params.get("keywords"):
            results = self._search_by_keywords(results, search_params["keywords"])
            print(f"[FILTER] Keywords: {len(results)} items remain")

        # Sort by relevance
        results = self._sort_by_relevance(results, search_params)

        print(f"[OK] Found {len(results)} matches")

        return results

    def _filter_by_time_range(self, items: List[Dict], time_range: Dict) -> List[Dict]:
        """Filter items by modification date within time range"""

        start_date = datetime.strptime(time_range["start"], "%Y-%m-%d")
        end_date = datetime.strptime(time_range["end"], "%Y-%m-%d")

        filtered = []
        for item in items:
            try:
                item_date = datetime.strptime(item["modified_date"], "%Y-%m-%d")
                if start_date <= item_date <= end_date:
                    filtered.append(item)
            except:
                pass

        return filtered

    def _filter_by_categories(self, items: List[Dict], categories: List[str]) -> List[Dict]:
        """Filter items by category"""

        filtered = []
        for item in items:
            if item.get("category") in categories:
                filtered.append(item)

        return filtered

    def _apply_filters(self, items: List[Dict], filters: Dict) -> List[Dict]:
        """Apply custom filters (source, file_type, status)"""

        filtered = items

        # Source filter
        if filters.get("source"):
            filtered = [item for item in filtered if item.get("source") == filters["source"]]

        # File type filter
        if filters.get("file_type"):
            file_type = filters["file_type"]
            if file_type == "python":
                file_type = "py"
            elif file_type == "javascript":
                file_type = "js"
            elif file_type == "markdown":
                file_type = "md"

            filtered = [item for item in filtered if item.get("file_type") == file_type]

        return filtered

    def _search_by_keywords(self, items: List[Dict], keywords: List[str]) -> List[Dict]:
        """Search items by keywords"""

        scored_items = []

        for item in items:
            # Search in file name and content
            searchable_text = (
                item.get("file_name", "").lower() + " " +
                item.get("content_text", "").lower()
            )

            # Calculate match score
            score = sum(1 for keyword in keywords if keyword.lower() in searchable_text)

            if score > 0:
                item["_search_score"] = score
                scored_items.append(item)

        return scored_items

    def _sort_by_relevance(self, items: List[Dict], search_params: Dict) -> List[Dict]:
        """Sort items by relevance score"""

        # Sort by search score (highest first), then by modified date (newest first)
        sorted_items = sorted(
            items,
            key=lambda x: (
                x.get("_search_score", 0),
                x.get("modified_timestamp", "")
            ),
            reverse=True
        )

        return sorted_items


def test_enhanced_search():
    """Test enhanced Cyclotron search"""

    storage_path = r"C:\Users\Darrick\DATA_CYCLOTRON_STORAGE"

    if not os.path.exists(storage_path):
        print(f"[ERROR] Storage path not found: {storage_path}")
        return

    # Initialize search engine
    search_engine = EnhancedCyclotronSearch(storage_path)

    # Load knowledge base (limited to 100 files for testing)
    search_engine.load_knowledge_base(limit=100)

    # Test search
    test_params = {
        "keywords": ["trinity", "oracle"],
        "categories": ["trinity", "oracle"],
        "time_range": {
            "start": "2025-11-01",
            "end": "2025-11-23",
            "description": "November 2025"
        },
        "intent": "search",
        "strategy": "filtered_search"
    }

    print("\n" + "=" * 60)
    print("TEST SEARCH")
    print("=" * 60)
    print(f"Keywords: {test_params['keywords']}")
    print(f"Categories: {test_params['categories']}")
    print(f"Time Range: {test_params['time_range']['description']}")
    print("=" * 60 + "\n")

    results = search_engine.search(test_params)

    print(f"\nTop 5 Results:")
    print("-" * 60)

    for i, result in enumerate(results[:5], 1):
        print(f"\n{i}. {result['file_name']}")
        print(f"   Category: {result.get('category', 'unknown')}")
        print(f"   Modified: {result['modified_date']}")
        print(f"   Score: {result.get('_search_score', 0)}")
        print(f"   Path: {result['file_path'][:80]}...")

    print("\n" + "=" * 60)
    print("Test complete!")


if __name__ == "__main__":
    test_enhanced_search()
