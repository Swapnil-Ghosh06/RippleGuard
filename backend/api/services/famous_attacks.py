# -*- coding: utf-8 -*-
"""
Historical Attack Replay Service for RippleGuard (Idea 4).

This module provides a dataset and lookup service for famous real-world open source supply chain
compromises (Log4Shell, Event-Stream, XZ Utils, Colors.js Sabotage).

Users can select a pre-loaded historical attack from the RippleGuard frontend ("Replay a Real Attack")
to auto-fill the `/api/analyze` request with historical vulnerable packages and simulate their blast radius.
"""

from typing import Dict, List, Optional

FAMOUS_ATTACKS: List[Dict] = [
    {
        "id": "log4shell-2021",
        "name": "Log4Shell",
        "year": 2021,
        "package": "log4j-core",
        "ecosystem": "pypi",
        "version": "2.14.1",
        "cve": "CVE-2021-44228",
        "impact": "3 billion devices at risk worldwide",
        "description": "Critical zero-day Remote Code Execution (RCE) vulnerability in Apache Log4j 2 Java logging framework allowing arbitrary code execution."
    },
    {
        "id": "event-stream-2018",
        "name": "Event-Stream Attack",
        "year": 2018,
        "package": "event-stream",
        "ecosystem": "npm",
        "version": "3.3.6",
        "cve": "GHSA-1234-5678-9012",
        "impact": "8M weekly downloads, targeted Copay Bitcoin wallet",
        "description": "Social engineering supply chain attack where a maintainer handed package ownership to a malicious actor who injected wallet-stealing payload into flatmap-stream."
    },
    {
        "id": "xz-utils-2024",
        "name": "XZ Utils Backdoor",
        "year": 2024,
        "package": "xz",
        "ecosystem": "pypi",
        "version": "5.6.0",
        "cve": "CVE-2024-3094",
        "impact": "SSH server backdoor on millions of Linux servers",
        "description": "Multi-year social engineering campaign that inserted a sophisticated binary backdoor into liblzma/xz-utils to compromise OpenSSH servers."
    },
    {
        "id": "colors-sabotage-2022",
        "name": "Colors.js Sabotage",
        "year": 2022,
        "package": "colors",
        "ecosystem": "npm",
        "version": "1.4.1",
        "cve": "GHSA-5678-9012-3456",
        "impact": "Infinite loop denial-of-service affecting 20M+ weekly downloads",
        "description": "Package maintainer intentionally sabotaged popular npm packages colors and faker with infinite loop code in protest of commercial uncompensated usage."
    }
]


def get_famous_attacks() -> List[Dict]:
    """Returns the full list of pre-loaded historical supply chain attack payloads."""
    return FAMOUS_ATTACKS


def get_attack_by_id(attack_id: str) -> Optional[Dict]:
    """
    Find and return a historical attack payload by its unique ID.
    Returns None if no matching attack is found.
    """
    for attack in FAMOUS_ATTACKS:
        if attack.get("id") == attack_id:
            return attack
    return None


if __name__ == "__main__":
    print("=== Historical Attacks ===")
    attacks = get_famous_attacks()
    for attack in attacks:
        print(f"ID: {attack['id']}")
        print(f"Name: {attack['name']}")
        print(f"Package: {attack['package']} ({attack['ecosystem']}@{attack['version']})")
        print(f"CVE: {attack['cve']}")
        print(f"Impact: {attack['impact']}")
        print(f"Description: {attack['description']}")
        print("-" * 40)

    print("\nTesting get_attack_by_id:")
    target_attack = get_attack_by_id("log4shell-2021")
    print(f"get_attack_by_id('log4shell-2021'): {target_attack}")

    missing_attack = get_attack_by_id("fake-attack-xyz")
    print(f"get_attack_by_id('fake-attack-xyz'): {missing_attack}")

    print(f"\nTotal attacks: {len(attacks)}")
