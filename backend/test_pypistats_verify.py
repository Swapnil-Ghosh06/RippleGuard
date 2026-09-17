import asyncio
import time
from api.services import pypi_service


async def verify():
    packages = [
        "sqlalchemy",
        "pillow",
        "pyyaml",
        "httpx",
        "pydantic",
        "uvicorn",
        "gunicorn",
        "fastapi",
        "scipy",
        "pandas"
    ]

    print("=" * 60)
    print("Testing pypistats.org Integration on 10 Real PyPI Packages")
    print("=" * 60)

    results = {}
    for pkg in packages:
        val = await pypi_service.get_monthly_downloads(pkg)
        results[pkg] = val
        status = f"{val:,} downloads/mo" if val is not None else "Unavailable (429/404)"
        print(f"  {pkg:15}: {status}")

    print("\n" + "=" * 60)
    print("Verification Checks:")
    print("=" * 60)

    valid_counts = [v for v in results.values() if v is not None]
    print(f"1. Retrieved valid counts for {len(valid_counts)}/{len(packages)} packages.")

    non_million = [v for v in valid_counts if v != 1_000_000]
    print(f"2. Non-1,000,000 count: {len(non_million)}/{len(valid_counts)}")

    unique_counts = set(valid_counts)
    print(f"3. Unique download numbers: {len(unique_counts)}/{len(valid_counts)}")

    print("\nTesting deliberately fake package ('this-package-does-not-exist-xyz123')...")
    fake_val = await pypi_service.get_monthly_downloads("this-package-does-not-exist-xyz123")
    print(f"Fake package downloads: {fake_val} (Expected None)")

    from api.routes.analyze import analyze_package
    from api.models.request_models import AnalyzeRequest
    print("\nTesting /api/analyze route with PyPI package...")
    req = AnalyzeRequest(package="httpx", ecosystem="pypi", depth=1)
    res = await analyze_package(req)
    print(f"Root package: {res.root.name} (version {res.root.version})")
    print(f"Root downloads: {res.root.monthly_downloads:,}")
    print(f"Root downloads_unavailable: {res.root.downloads_unavailable}")
    print(f"Graph nodes count: {len(res.graph.nodes)}")
    for node in res.graph.nodes:
        print(f"  Node {node.name:15}: downloads={node.monthly_downloads:,}, downloads_unavailable={node.downloads_unavailable}")

    assert len(valid_counts) == 10, f"Expected 10 valid counts, got {len(valid_counts)}"
    assert len(unique_counts) == 10, f"Expected 10 unique counts, got {len(unique_counts)}"
    assert fake_val is None, "Fake package must return None"
    print("\nALL 10 PACKAGES AND VERIFICATION CHECKS PASSED!")


if __name__ == "__main__":
    asyncio.run(verify())
