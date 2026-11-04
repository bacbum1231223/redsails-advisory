#!/usr/bin/env python3
"""RedSails open-source radar: reviewed catalog + optional GitHub metadata/discovery.

Standard library only. Run manually. Tokens are read from the environment and
never written to reports. Repository metadata is not a source/security audit.
"""
from __future__ import annotations
import argparse
import datetime as dt
import html
import json
import math
import os
from pathlib import Path
import re
import time
import urllib.error
import urllib.parse
import urllib.request

ROOT = Path(__file__).resolve().parent
SEARCHES = {"Data Room": '"data room"', "Deal CRM": 'dealflow', "Due Diligence": '"due diligence"', "Investor Matching": '"fundraising crm"', "Cap Table": '"cap table"', "Document AI": '"document parsing"', "Automation": '"workflow automation"', "E-Signature": '"electronic signature"', "Permission": '"fine grained authorization"'}

def request_json(endpoint: str, token: str, errors: list) -> dict | None:
    headers = {"Accept": "application/vnd.github+json", "User-Agent": "RedSails-OSS-Radar/2", "X-GitHub-Api-Version": "2022-11-28"}
    if token:
        headers["Authorization"] = "Bearer " + token
    try:
        with urllib.request.urlopen(urllib.request.Request("https://api.github.com/" + endpoint, headers=headers), timeout=18) as response:
            return json.load(response)
    except (urllib.error.URLError, TimeoutError, OSError, ValueError) as exc:
        errors.append({"endpoint": endpoint.split("?")[0], "error": type(exc).__name__, "status": getattr(exc, "code", None)})
        return None

def enrich(row: dict, info: dict) -> None:
    row.update({"github_license_id": (info.get("license") or {}).get("spdx_id", "Unknown"), "archived": bool(info.get("archived")), "stars": info.get("stargazers_count"), "forks": info.get("forks_count"), "pushed_at": info.get("pushed_at"), "language": info.get("language"), "description": info.get("description") or "", "metadata_source": "GitHub REST API"})

def screening_score(row: dict, now: dt.datetime) -> int:
    license_text = (row.get("license_checked") or row.get("github_license_id") or "").lower()
    decision = row.get("decision", "").lower()
    points = 2 if "discrepancy" in decision else 10 if "custom terms" in license_text else 8 if "agpl" in license_text else 20 if any(x in license_text for x in ("mit", "apache", "bsd")) else 7 if "gpl" in license_text else 0
    score = min(5, max(0, int(row.get("fit", 2)))) * 9 + points
    try:
        age = (now - dt.datetime.fromisoformat(row["pushed_at"].replace("Z", "+00:00"))).days
        score += 15 if age <= 90 else 10 if age <= 180 else 5 if age <= 365 else 0
    except (KeyError, TypeError, ValueError):
        score += 7
    for key, factor in (("stars", 2.5), ("forks", 3.2)):
        value = row.get(key)
        score += min(10, max(0, round(factor * math.log10(1 + max(0, value))))) if isinstance(value, int) else 5
    score -= {"high": 16, "medium": 5}.get(row.get("risk"), 0)
    if "prototype" in decision or "tham khảo" in decision:
        score -= 8
    if "poc" in decision:
        score -= 3
    if row.get("archived") or "loại:" in decision:
        score = min(score, 10)
    return max(0, min(100, score))

def dashboard(payload: dict) -> str:
    blob = json.dumps(payload, ensure_ascii=False).replace("<", "\\u003c").replace(">", "\\u003e").replace("&", "\\u0026")
    return '''<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>RedSails · Open Source Radar</title><style>
    *{box-sizing:border-box}body{margin:0;background:#100d17;color:#f1e3ee;font:14px/1.8 "Segoe UI",Arial,sans-serif}main{max-width:1180px;margin:auto;padding:40px 24px}h1{font-size:40px;line-height:1.2;letter-spacing:-1.3px}h2{font-size:18px;margin:8px 0}a{color:#e6a6c4}p{color:#c2a9c7}input,select,button{font:inherit;background:#25172d;color:#f1e3ee;border:1px solid #81536e;border-radius:5px;min-height:44px;padding:9px 12px}.filters{display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:10px;margin:25px 0}.grid{display:grid;grid-template-columns:1fr 1fr;gap:15px}.card{padding:22px;border:1px solid #79536d66;border-radius:9px;background:#25192c}.tags{display:flex;gap:8px;flex-wrap:wrap}.tag{font-size:11px;border:1px solid #8d618055;padding:3px 8px;border-radius:4px}.score{font-size:23px;color:#bce2d4}.notice{border-left:3px solid #80b8a7;padding:14px 18px;background:#25443a33}small{font-size:12px;color:#bca2c3}@media(max-width:700px){.filters{grid-template-columns:1fr 1fr}.grid{grid-template-columns:1fr}h1{font-size:32px}}@media(max-width:390px){.filters{grid-template-columns:1fr}}
    </style></head><body><main><p>REDSAILS / OPEN SOURCE RADAR</p><h1>18 nguồn mở.<br>Một kiến trúc phối hợp.</h1><p><a href="index.html?platform=radar#workbench">Mở bộ công cụ trên website ↗</a></p><p id="snapshot"></p><div class="notice">Điểm là heuristic sàng lọc. Ghi chú giấy phép gốc và metadata API được giữ riêng; không thay cho kiểm tra source code, quyền sử dụng hoặc bảo mật.</div><div class="filters"><input id="q" aria-label="Tìm nguồn" placeholder="Tên, chức năng, use case…"><select id="module" aria-label="Nhóm chức năng"><option value="">Mọi nhóm</option></select><select id="phase" aria-label="Giai đoạn"><option value="">Mọi giai đoạn</option><option>P1</option><option>P2</option><option>Screen</option></select><select id="risk" aria-label="Mức rà soát"><option value="">Mọi mức</option><option>low</option><option>medium</option><option>high</option></select></div><p id="count"></p><div id="grid" class="grid"></div><p><small>Trọng số: khớp 45 + giấy phép 20 + cập nhật 15 + sao 10 + cộng đồng 10, có điều chỉnh mức rà soát. Không tự suy ra độ an toàn từ số sao.</small></p></main><script>
    const data=__DATA__, $=id=>document.getElementById(id), esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    $('snapshot').textContent='Ngày báo cáo: '+data.generated_at+' · '+data.scan_mode+' · '+data.repositories.length+' repos';
    [...new Set(data.repositories.map(r=>r.module))].sort().forEach(m=>{const o=document.createElement('option');o.value=m;o.textContent=m;$('module').append(o)});
    function render(){const q=$('q').value.trim().toLowerCase(),rows=data.repositories.filter(r=>(!q||[r.repo,r.module,r.purpose,r.integration,r.license_checked].join(' ').toLowerCase().includes(q))&&(!$('module').value||r.module===$('module').value)&&(!$('phase').value||r.phase===$('phase').value)&&(!$('risk').value||r.risk===$('risk').value));$('count').textContent=rows.length+' / '+data.repositories.length+' dự án';$('grid').innerHTML=rows.map(r=>`<article class="card"><div class="tags"><span class="tag">${esc(r.module)}</span><span class="tag">${esc(r.phase)}</span><span class="tag">${esc(r.risk)}</span>${r.archived?'<span class="tag">Archived</span>':''}</div><h2><a href="https://github.com/${esc(r.repo)}" target="_blank" rel="noopener noreferrer">${esc(r.repo)}</a></h2><span class="score">${Number(r.score)||0}/100</span><p>${esc(r.purpose)}</p><p>${esc(r.integration)}</p><p><b>Quyết định gốc:</b> ${esc(r.decision)}</p><p><b>Ghi chú giấy phép:</b> ${esc(r.license_checked)}</p><p><b>GitHub SPDX:</b> ${esc(r.github_license_id||'Chưa xác định')}</p><small>${Number.isInteger(r.stars)?r.stars.toLocaleString()+' stars · '+(r.forks||0).toLocaleString()+' forks':'Chưa có thống kê API'}<br>${esc(r.metadata_source)}</small></article>`).join('')||'<p>Không có kết quả phù hợp.</p>'}['q','module','phase','risk'].forEach(id=>$(id).addEventListener('input',render));render();
    </script></body></html>'''.replace("18 nguồn mở.", str(len(payload["repositories"])) + " nguồn mở.").replace("__DATA__", blob)

def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--offline", action="store_true", help="Use the catalog and saved metadata without network access")
    parser.add_argument("--discover", action="store_true", help="Add public search candidates marked Screen; manual review required")
    parser.add_argument("--per-query", type=int, default=3)
    parser.add_argument("--max-extra", type=int, default=24)
    parser.add_argument("--out", default=str(ROOT / "reports"))
    args = parser.parse_args()
    if not 1 <= args.per_query <= 20 or not 0 <= args.max_extra <= 100:
        parser.error("per-query must be 1–20 and max-extra 0–100")
    seed = json.loads((ROOT / "assets/open-source-baseline.json").read_text(encoding="utf-8"))
    rows = [dict(r) for r in seed["repositories"]]
    if any(not re.fullmatch(r"[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+", r["repo"]) for r in rows):
        parser.error("Invalid repository name in the seed catalog")
    errors, token = [], os.getenv("GITHUB_TOKEN") or os.getenv("GH_TOKEN") or ""
    cache_path = ROOT / "assets/open-source-metadata.json"
    cache = json.loads(cache_path.read_text(encoding="utf-8")) if cache_path.exists() else {"repositories": []}
    for row in rows:
        if args.offline:
            item = next((x for x in cache["repositories"] if x["repo"].lower() == row["repo"].lower() and x.get("status") == 200), None)
            if item:
                row.update({"github_license_id": (item.get("license") or {}).get("spdx_id", "Unknown"), **{key: item.get(key) for key in ("archived", "stars", "forks", "pushed_at", "language")}, "metadata_source": "Saved GitHub metadata snapshot"})
        else:
            info = request_json("repos/" + row["repo"], token, errors)
            if info:
                enrich(row, info)
    if args.discover and not args.offline:
        known, added = {r["repo"].lower() for r in rows}, 0
        for module, query in SEARCHES.items():
            if added >= args.max_extra:
                break
            page = request_json("search/repositories?" + urllib.parse.urlencode({"q": query + " in:name,description archived:false", "sort": "stars", "order": "desc", "per_page": args.per_query}), token, errors)
            for item in (page or {}).get("items", []):
                repo = item.get("full_name", "")
                if repo.lower() in known or item.get("fork") or not re.fullmatch(r"[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+", repo) or added >= args.max_extra:
                    continue
                known.add(repo.lower()); added += 1
                row = {"repo": repo, "module": module, "phase": "Screen", "fit": 2, "risk": "high", "license_checked": "Chưa rà soát LICENSE thủ công", "integration": "Ứng viên tìm kiếm; chưa được chọn để tích hợp.", "purpose": item.get("description") or "GitHub search candidate", "decision": "Cần thẩm định", "discovery": True, "url": "https://github.com/" + repo}
                enrich(row, item); rows.append(row)
            if not token:
                time.sleep(6.5)
    now = dt.datetime.now(dt.timezone.utc)
    for row in rows:
        row["baseline_score"] = row.get("score")
        row["score"] = screening_score(row, now)
    rows.sort(key=lambda r: (-r["score"], r["repo"].lower()))
    payload = {"generated_at": now.astimezone(dt.timezone(dt.timedelta(hours=7))).strftime("%Y-%m-%d"), "scan_mode": "cached_snapshot" if args.offline else "api", "scan_coverage": "curated_and_search_api" if args.discover and not args.offline else "curated_baseline", "metadata_checked_at": cache.get("checked_at") if args.offline else now.isoformat(), "repositories": rows, "api_errors": errors, "methodology": "Directional screening. Metadata only; no code/security audit or legal permission determination."}
    out = Path(args.out); out.mkdir(parents=True, exist_ok=True)
    (out / "latest.json").write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    (out / "latest.html").write_text(dashboard(payload), encoding="utf-8")
    print(json.dumps({"repositories": len(rows), "errors": len(errors), "output": str(out)}, ensure_ascii=False))
    return 0 if not errors else 1

if __name__ == "__main__":
    raise SystemExit(main())
