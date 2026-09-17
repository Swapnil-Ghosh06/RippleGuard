import asyncio
import time
from api.services import npm_service


async def verify():
    # 10 real npm packages not in the old DEFAULT_DOWNLOAD_FALLBACKS dict
    packages = [
        "dayjs",
        "uuid",
        "zod",
        "nanoid",
        "dotenv",
        "commander",
        "yargs",
        "node-fetch",
        "ws",
        "tslib"
    ]

    print("=" * 60)
    print("Testing npm Live API Integration on 10 Real npm Packages")
    print("=" * 60)

    # 1. Test batch fetch using the bulk endpoint
    print("Calling get_downloads_batch() with bulk endpoint...")
    results = await npm_service.get_downloads_batch(packages)

    for pkg in packages:
        val = results.get(pkg)
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

    # 2. Test deliberately fake package
    print("\nTesting deliberately fake package ('this-package-does-not-exist-xyz123')...")
    fake_val = await npm_service.get_monthly_downloads("this-package-does-not-exist-xyz123")
    print(f"Fake package downloads: {fake_val} (Expected None)")

    # 3. Test scoped package handling in batch
    print("\nTesting scoped package handling in batch ('@types/node')...")
    scoped_res = await npm_service.get_downloads_batch(["@types/node", "dayjs"])
    print(f"Scoped package downloads: {scoped_res.get('@types/node'):,}")
    print(f"Unscoped package in same batch: {scoped_res.get('dayjs'):,}")

    # 4. Test /api/analyze route integration with npm package
    from api.routes.analyze import analyze_package
    from api.models.request_models import AnalyzeRequest
    print("\nTesting /api/analyze route with npm package (express)...")
    req = AnalyzeRequest(package="express", ecosystem="npm", depth=1)
    res = await analyze_package(req)
    print(f"Root package: {res.root.name} (version {res.root.version})")
    print(f"Root downloads: {res.root.monthly_downloads:,}")
    print(f"Root downloads_unavailable: {res.root.downloads_unavailable}")
    print(f"Graph nodes count: {len(res.graph.nodes)}")
    for node in list(res.graph.nodes)[:5]:
        print(f"  Node {node.name:15}: downloads={node.monthly_downloads:,}, downloads_unavailable={node.downloads_unavailable}")

    assert len(valid_counts) == 10, f"Expected 10 valid counts, got {len(valid_counts)}"
    assert len(non_million) == 10, "All counts must be non-1,000,000"
    assert len(unique_counts) == 10, f"Expected 10 unique counts, got {len(unique_counts)}"
    assert fake_val is None, "Fake package must return None"
    assert scoped_res.get("@types/node") is not None and scoped_res.get("@types/node") > 0, "Scoped package must return valid downloads"
    print("\nALL 10 PACKAGES AND VERIFICATION CHECKS PASSED!")


if __name__ == "__main__":
    asyncio.run(verify())
