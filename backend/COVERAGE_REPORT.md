# RippleGuard — 40-Package Real-World Coverage Report

**Test Execution Time:** 2026-09-17 07:16:31 UTC
**Total Packages Tested:** 40
**Passed:** 39 / 40 (97.5%)
**Failed:** 1
**Blast Score Range:** Min: `0.0`, Median: `60.1`, Max: `90.0`
**Average Latency:** `6.22s`

## 1. Full Package Coverage Matrix

| # | Package | Eco | Version | Category | Status | Nodes | Edges | Blast Score | Latency | Notes |
|---|:---|:---:|:---|:---|:---:|---:|---:|---:|---:|:---|
| 1 | `react` | npm | `19.3.0` | Large Framework | **PASS** | 1 | 0 | 0.0 | 1.93s | Clean run (1 nodes, 0 edges) |
| 2 | `vue` | npm | `3.5.42` | Large Framework | **PASS** | 21 | 38 | 63.0 | 7.05s | Clean run (21 nodes, 38 edges) |
| 3 | `angular` | npm | `1.8.3` | Large Framework | **PASS** | 1 | 0 | 10.0 | 5.92s | Clean run (1 nodes, 0 edges) |
| 4 | `express` | npm | `5.2.1` | Large Framework | **PASS** | 55 | 99 | 68.1 | 5.55s | Clean run (55 nodes, 99 edges) |
| 5 | `django` | pypi | `6.1.1` | Large Framework | **PASS** | 3 | 2 | 0.3 | 11.1s | Clean run (3 nodes, 2 edges) |
| 6 | `flask` | pypi | `3.1.3` | Large Framework | **PASS** | 7 | 8 | 60.9 | 4.72s | Clean run (7 nodes, 8 edges) |
| 7 | `fastapi` | pypi | `0.141.1` | Large Framework | **PASS** | 10 | 14 | 61.4 | 14.55s | Clean run (10 nodes, 14 edges) |
| 8 | `webpack` | npm | `5.111.0` | Build Tooling | **PASS** | 58 | 87 | 68.5 | 8.68s | Clean run (58 nodes, 87 edges) |
| 9 | `vite` | npm | `8.3.0` | Build Tooling | **PASS** | 40 | 40 | 65.8 | 5.81s | Clean run (40 nodes, 40 edges) |
| 10 | `typescript` | npm | `7.0.2` | Build Tooling | **PASS** | 21 | 20 | 3.0 | 7.91s | Clean run (21 nodes, 20 edges) |
| 11 | `eslint` | npm | `10.10.0` | Build Tooling | **PASS** | 67 | 83 | 69.9 | 7.94s | Clean run (67 nodes, 83 edges) |
| 12 | `babel-core` | npm | `6.26.3` | Build Tooling | **PASS** | 48 | 76 | 67.0 | 5.86s | Clean run (48 nodes, 76 edges) |
| 13 | `setuptools` | pypi | `84.0.0` | Build Tooling | **PASS** | 1 | 0 | 0.0 | 7.33s | Clean run (1 nodes, 0 edges) |
| 14 | `chalk` | npm | `6.0.0` | Single-Purpose Util | **PASS** | 1 | 0 | 0.0 | 4.04s | Clean run (1 nodes, 0 edges) |
| 15 | `ms` | npm | `2.1.3` | Single-Purpose Util | **PASS** | 1 | 0 | 0.0 | 4.0s | Clean run (1 nodes, 0 edges) |
| 16 | `is-even` | npm | `1.0.0` | Single-Purpose Util | **PASS** | 4 | 3 | 60.5 | 5.6s | Clean run (4 nodes, 3 edges) |
| 17 | `six` | pypi | `1.17.0` | Single-Purpose Util | **PASS** | 1 | 0 | 0.0 | 5.09s | Clean run (1 nodes, 0 edges) |
| 18 | `attrs` | pypi | `26.1.0` | Single-Purpose Util | **PASS** | 1 | 0 | 0.0 | 5.29s | Clean run (1 nodes, 0 edges) |
| 19 | `left-pad` | npm | `1.3.0` | Single-Purpose Util | **PASS** | 1 | 0 | 0.0 | 5.56s | Clean run (1 nodes, 0 edges) |
| 20 | `@types/node` | npm | `22.20.3` | Scoped npm Package | **PASS** | 2 | 1 | 60.1 | 5.49s | Clean run (2 nodes, 1 edges) |
| 21 | `@babel/core` | npm | `8.0.5` | Scoped npm Package | **PASS** | 36 | 53 | 65.2 | 7.75s | Clean run (36 nodes, 53 edges) |
| 22 | `@vue/cli` | npm | `5.0.9` | Scoped npm Package | **PASS** | 370 | 632 | 90.0 | 18.57s | Clean run (370 nodes, 632 edges) |
| 23 | `@angular/core` | npm | `unknown` | Scoped npm Package | **FAIL** | 0 | 0 | - | 2.45s | POST /analyze returned HTTP 404: {"detail":"Package '@angular/core' not found or has no resolvable dependency tree."} |
| 24 | `@types/react` | npm | `19.3.0` | Scoped npm Package | **PASS** | 2 | 1 | 58.7 | 5.54s | Clean run (2 nodes, 1 edges) |
| 25 | `vue` | npm | `3.5.0-alpha.1` | Pre-Release / Special Tag | **PASS** | 21 | 36 | 63.0 | 2.83s | Clean run (21 nodes, 36 edges) |
| 26 | `next` | npm | `15.0.0-canary.1` | Pre-Release / Special Tag | **PASS** | 49 | 57 | 77.2 | 9.75s | Clean run (49 nodes, 57 edges) |
| 27 | `svelte` | npm | `5.0.0-next.1` | Pre-Release / Special Tag | **PASS** | 16 | 20 | 72.2 | 5.2s | Clean run (16 nodes, 20 edges) |
| 28 | `pydantic` | pypi | `2.0b3` | Pre-Release / Special Tag | **PASS** | 4 | 3 | 60.5 | 3.65s | Clean run (4 nodes, 3 edges) |
| 29 | `urllib3` | pypi | `2.0.0a1` | Pre-Release / Special Tag | **PASS** | 1 | 0 | 10.0 | 4.49s | Clean run (1 nodes, 0 edges) |
| 30 | `django` | pypi | `5.0a1` | Pre-Release / Special Tag | **PASS** | 3 | 2 | 66.2 | 5.24s | Clean run (3 nodes, 2 edges) |
| 31 | `micro-uuid` | npm | `1.0.1` | Obscure / Low-Download | **PASS** | 1 | 0 | 0.0 | 5.23s | Clean run (1 nodes, 0 edges) |
| 32 | `str-reverse` | npm | `1.0.0` | Obscure / Low-Download | **PASS** | 1 | 0 | 0.0 | 5.3s | Clean run (1 nodes, 0 edges) |
| 33 | `tiny-emitter` | npm | `2.1.0` | Obscure / Low-Download | **PASS** | 1 | 0 | 0.0 | 5.32s | Clean run (1 nodes, 0 edges) |
| 34 | `leftpad` | pypi | `0.1.2` | Obscure / Low-Download | **PASS** | 1 | 0 | 0.0 | 6.87s | Clean run (1 nodes, 0 edges) |
| 35 | `simple-math` | pypi | `1.1.0` | Obscure / Low-Download | **PASS** | 1 | 0 | 0.0 | 6.77s | Clean run (1 nodes, 0 edges) |
| 36 | `pyprimes` | pypi | `0.1` | Obscure / Low-Download | **PASS** | 1 | 0 | 0.0 | 5.83s | Clean run (1 nodes, 0 edges) |
| 37 | `lodash` | npm | `4.18.1` | High-Traffic Library | **PASS** | 1 | 0 | 0.0 | 3.92s | Clean run (1 nodes, 0 edges) |
| 38 | `axios` | npm | `1.20.0` | High-Traffic Library | **PASS** | 19 | 23 | 62.7 | 5.59s | Clean run (19 nodes, 23 edges) |
| 39 | `requests` | pypi | `2.34.2` | High-Traffic Library | **PASS** | 5 | 4 | 60.6 | 3.61s | Clean run (5 nodes, 4 edges) |
| 40 | `sqlalchemy` | pypi | `2.0.54` | High-Traffic Library | **PASS** | 3 | 2 | 60.3 | 5.42s | Clean run (3 nodes, 2 edges) |

## 2. Failures and Diagnostics

⚠️ **1 Failure(s) Encountered:**

### Failure 1: `@angular/core` (npm @ `None`)
- **Category:** Scoped npm Package
- **Error:** `POST /analyze returned HTTP 404: {"detail":"Package '@angular/core' not found or has no resolvable dependency tree."}`
```
Traceback (most recent call last):
  File "D:\Coding\Manipal\backend\scripts\test_coverage_matrix.py", line 131, in run_matrix
    raise RuntimeError(f"POST /analyze returned HTTP {res_analyze.status_code}: {res_analyze.text}")
RuntimeError: POST /analyze returned HTTP 404: {"detail":"Package '@angular/core' not found or has no resolvable dependency tree."}
```

