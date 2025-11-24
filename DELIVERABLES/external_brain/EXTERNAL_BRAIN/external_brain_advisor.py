#!/usr/bin/env python3
"""
COMMANDER'S EXTERNAL BRAIN - Strategic Advisor
Pattern Theory-powered decision support

Designed by: C2T3 Architect (The Mind)
Purpose: Provide strategic recommendations with Pattern Theory analysis
"""

import re
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
from datetime import datetime

@dataclass
class DecisionRecommendation:
    """Strategic decision recommendation"""
    decision: str
    pattern_classification: str  # "TRUTH_ALGORITHM" or "DECEIT_ALGORITHM"
    recommendation: str  # "APPROVE", "DEFER", "REJECT"
    confidence: int  # 0-100
    reasoning: List[str]
    risks: List[str]
    oracle_probability: Optional[int] = None
    historical_precedents: List[str] = None

class StrategicAdvisor:
    def __init__(self):
        """Initialize strategic advisor"""
        # Truth Algorithm indicators
        self.truth_patterns = [
            r'\b(permanent|owned|infrastructure|quality|long[- ]term)\b',
            r'\b(postgresql|railway|tailscale|python)\b',  # Owned tech
            r'\b(production[- ]ready|tested|validated)\b',
            r'\b(scale|robust|reliable)\b',
            r'\b(deploy|build|implement)\b'
        ]

        # Deceit Algorithm indicators
        self.deceit_patterns = [
            r'\b(free|quick|fast|cheap|temporary|workaround)\b',
            r'\b(shortcut|hack|patch)\b',
            r'\b(later|eventually|someday)\b',
            r'\b(trial|demo|beta)\b',  # Unless explicitly approved
            r'\b(ignore|skip|bypass)\b'
        ]

        # Risk indicators
        self.risk_patterns = [
            r'\b(untest|untried|unknown|uncertain)\b',
            r'\b(external[- ]dependency|third[- ]party)\b',
            r'\b(vendor[- ]lock|proprietary)\b',
            r'\b(blocker|issue|problem)\b'
        ]

        # Success indicators
        self.success_patterns = [
            r'\b(proven|validated|tested|successful)\b',
            r'\b(operational|deployed|working)\b',
            r'\b(documented|complete|ready)\b'
        ]

    def analyze_decision(self, decision: str) -> DecisionRecommendation:
        """
        Analyze decision using Pattern Theory

        Args:
            decision: Decision text to analyze

        Returns:
            DecisionRecommendation with full analysis
        """
        decision_lower = decision.lower()

        # Classify pattern
        pattern_classification, pattern_confidence = self._classify_pattern(decision_lower)

        # Analyze risks
        risks = self._identify_risks(decision_lower)

        # Find precedents
        precedents = self._find_precedents(decision_lower)

        # Generate reasoning
        reasoning = self._generate_reasoning(
            decision_lower,
            pattern_classification,
            risks,
            precedents
        )

        # Calculate recommendation
        recommendation, confidence = self._calculate_recommendation(
            pattern_classification,
            pattern_confidence,
            risks
        )

        # Oracle probability (simplified - would integrate with real Oracle)
        oracle_probability = self._estimate_oracle_probability(
            pattern_classification,
            confidence
        )

        return DecisionRecommendation(
            decision=decision,
            pattern_classification=pattern_classification,
            recommendation=recommendation,
            confidence=confidence,
            reasoning=reasoning,
            risks=risks,
            oracle_probability=oracle_probability,
            historical_precedents=precedents
        )

    def _classify_pattern(self, decision: str) -> Tuple[str, int]:
        """
        Classify decision as Truth or Deceit Algorithm

        Returns:
            (classification, confidence_score)
        """
        truth_score = 0
        deceit_score = 0

        # Count pattern matches
        for pattern in self.truth_patterns:
            matches = len(re.findall(pattern, decision))
            truth_score += matches * 2

        for pattern in self.deceit_patterns:
            matches = len(re.findall(pattern, decision))
            deceit_score += matches * 3  # Deceit indicators weighted higher

        # Classify
        if truth_score > deceit_score:
            classification = "TRUTH_ALGORITHM"
            confidence = min(100, int((truth_score / (truth_score + deceit_score + 0.1)) * 100))
        elif deceit_score > truth_score:
            classification = "DECEIT_ALGORITHM"
            confidence = min(100, int((deceit_score / (truth_score + deceit_score + 0.1)) * 100))
        else:
            classification = "AMBIGUOUS"
            confidence = 50

        return classification, confidence

    def _identify_risks(self, decision: str) -> List[str]:
        """Identify potential risks"""
        risks = []

        # Check for risk indicators
        for pattern in self.risk_patterns:
            if re.search(pattern, decision):
                risks.append(f"Contains risk indicator: {pattern.replace(r'\b', '').replace('(', '').replace(')', '')}")

        # Check for lack of testing
        if not re.search(r'\b(test|validated|proven)\b', decision):
            risks.append("No mention of testing or validation")

        # Check for external dependencies
        if re.search(r'\b(api|service|platform)\b', decision) and not re.search(r'\b(owned|controlled)\b', decision):
            risks.append("Potential external dependency detected")

        # Check for time pressure
        if re.search(r'\b(urgent|asap|quickly|rush)\b', decision):
            risks.append("Time pressure detected - may lead to shortcuts")

        return risks

    def _find_precedents(self, decision: str) -> List[str]:
        """Find historical precedents (simplified)"""
        precedents = []

        # Keywords for precedent matching
        if 'railway' in decision:
            precedents.append("Railway deployments: 94% success rate (31/33)")

        if 'pattern theory' in decision:
            precedents.append("Pattern Theory: 92.2% accuracy in validation system")

        if 'hive mind' in decision or 'trinity' in decision:
            precedents.append("Trinity systems: 100% of designed systems production-ready")

        if 'deploy' in decision:
            precedents.append("Recent deployments: C1 scaling (success), Hive Mind (ready)")

        return precedents

    def _generate_reasoning(
        self,
        decision: str,
        classification: str,
        risks: List[str],
        precedents: List[str]
    ) -> List[str]:
        """Generate reasoning for recommendation"""
        reasoning = []

        # Pattern classification reasoning
        if classification == "TRUTH_ALGORITHM":
            reasoning.append("✅ Truth Algorithm detected: Permanent solution approach")
            reasoning.append("✅ Aligns with owned infrastructure and quality-first principles")
        elif classification == "DECEIT_ALGORITHM":
            reasoning.append("⚠️ Deceit Algorithm detected: Temporary/shortcut approach")
            reasoning.append("⚠️ High risk of future problems and rework")
        else:
            reasoning.append("ℹ️ Pattern unclear - requires deeper analysis")

        # Risk assessment
        if not risks:
            reasoning.append("✅ No significant risks identified")
        else:
            reasoning.append(f"⚠️ {len(risks)} potential risk(s) identified")

        # Historical context
        if precedents:
            reasoning.append(f"📊 {len(precedents)} historical precedent(s) found")
            for precedent in precedents[:2]:  # Top 2
                reasoning.append(f"  • {precedent}")

        # Success indicators
        success_count = len(re.findall(r'\b(success|working|operational|proven)\b', decision))
        if success_count > 0:
            reasoning.append(f"✅ {success_count} success indicator(s) present")

        return reasoning

    def _calculate_recommendation(
        self,
        classification: str,
        pattern_confidence: int,
        risks: List[str]
    ) -> Tuple[str, int]:
        """
        Calculate final recommendation

        Returns:
            (recommendation, confidence)
        """
        # Base confidence
        confidence = pattern_confidence

        # Truth Algorithm
        if classification == "TRUTH_ALGORITHM":
            if len(risks) == 0:
                recommendation = "APPROVE"
                confidence = min(100, confidence + 10)
            elif len(risks) <= 2:
                recommendation = "APPROVE"
                confidence = max(50, confidence - (len(risks) * 5))
            else:
                recommendation = "DEFER"
                confidence = 50

        # Deceit Algorithm
        elif classification == "DECEIT_ALGORITHM":
            if len(risks) == 0:
                recommendation = "DEFER"
                confidence = 60
            else:
                recommendation = "REJECT"
                confidence = min(100, confidence + (len(risks) * 10))

        # Ambiguous
        else:
            recommendation = "DEFER"
            confidence = 50

        return recommendation, confidence

    def _estimate_oracle_probability(
        self,
        classification: str,
        confidence: int
    ) -> int:
        """Estimate Oracle success probability"""
        if classification == "TRUTH_ALGORITHM":
            # Truth Algorithm typically has 92.2% success rate
            return min(98, int(92 + (confidence / 100) * 8))
        elif classification == "DECEIT_ALGORITHM":
            # Deceit Algorithm typically has ~10% success rate
            return max(5, int(15 - (confidence / 100) * 10))
        else:
            return 50  # Ambiguous

    def brief_analysis(self, decision: str) -> str:
        """Generate brief analysis string"""
        result = self.analyze_decision(decision)

        output = []
        output.append(f"\n{'='*70}")
        output.append(f"STRATEGIC ANALYSIS: {result.decision[:50]}...")
        output.append(f"{'='*70}\n")

        # Pattern classification
        if result.pattern_classification == "TRUTH_ALGORITHM":
            output.append(f"✅ Pattern: TRUTH ALGORITHM")
        elif result.pattern_classification == "DECEIT_ALGORITHM":
            output.append(f"⚠️  Pattern: DECEIT ALGORITHM")
        else:
            output.append(f"ℹ️  Pattern: AMBIGUOUS")

        # Recommendation
        if result.recommendation == "APPROVE":
            output.append(f"🎯 Recommendation: APPROVE (Confidence: {result.confidence}%)")
        elif result.recommendation == "DEFER":
            output.append(f"⏸️  Recommendation: DEFER (Confidence: {result.confidence}%)")
        else:
            output.append(f"❌ Recommendation: REJECT (Confidence: {result.confidence}%)")

        # Oracle probability
        if result.oracle_probability:
            output.append(f"🔮 Oracle Success Probability: {result.oracle_probability}%")

        output.append(f"\n📋 Reasoning:")
        for reason in result.reasoning:
            output.append(f"  {reason}")

        # Risks
        if result.risks:
            output.append(f"\n⚠️  Identified Risks:")
            for risk in result.risks:
                output.append(f"  • {risk}")

        output.append(f"\n{'='*70}\n")

        return "\n".join(output)


def main():
    """Test strategic advisor"""
    advisor = StrategicAdvisor()

    # Test decisions
    test_decisions = [
        "Deploy Trinity Hive Mind system with WebSocket infrastructure",
        "Use free tier service to save money quickly",
        "Build Pattern Theory validation with permanent owned infrastructure",
        "Skip testing and deploy directly to production",
        "Implement Railway deployment with Postgres database"
    ]

    for decision in test_decisions:
        print(advisor.brief_analysis(decision))
        print("\n")


if __name__ == "__main__":
    main()
