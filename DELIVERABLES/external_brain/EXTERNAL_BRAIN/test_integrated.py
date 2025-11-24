#!/usr/bin/env python3
"""Quick test of integrated External Brain"""

from external_brain_integrated import IntegratedExternalBrain

print("="*80)
print("TESTING INTEGRATED EXTERNAL BRAIN")
print("="*80)

try:
    print("\n[1] Initializing...")
    brain = IntegratedExternalBrain(
        enable_nlp=True,
        enable_context=True,
        enable_advisor=True,
        verbose=False
    )
    print("[OK] Integrated External Brain initialized successfully")

    print("\n[2] Testing simple query...")
    response = brain.ask("What is Trinity Hive Mind?", max_results=5)
    print(f"[OK] Query processed: {response.intent.intent_type}")
    print(f"[OK] Results found: {len(response.results) if isinstance(response.results, list) else 1}")

    print("\n[3] Testing context tracking...")
    response2 = brain.ask("Show me the architecture for it", max_results=5)
    print(f"[OK] Follow-up query processed: {response2.intent.intent_type}")
    if response2.intent.entities:
        print(f"[OK] Context resolved: {response2.intent.entities}")

    print("\n[4] Getting conversation summary...")
    if brain.context_manager:
        summary = brain.context_manager.get_conversation_summary()
        print(f"[OK] Conversation tracked: {len(brain.context_manager.current_session.turns)} turns")

    print("\n" + "="*80)
    print("ALL TESTS PASSED")
    print("="*80)
    print("\nIntegrated External Brain is fully operational!")

except Exception as e:
    print(f"\n[ERROR] Test failed: {e}")
    import traceback
    traceback.print_exc()
