#!/usr/bin/env python3
"""
Fetches latest posts from Slashpage and updates README.md.
"""
import re
import sys
import requests
from datetime import datetime

DOMAIN = "timmy"
BASE_URL = "https://slashpage.com"

INSIGHT_PAGE_ID = "5r398nmnx91nymvwje7y"
INSIGHT_CHANNEL_VIEW_ID = "q3zrvd"

NOTE_PAGE_IDS = [
    "3p4kj92yp4jz5m57q1x8",
    "ywk9j72973yzk2gpqvnd",
    "4w67rj24gj3wrm5yq8ep",
    "943zqpmqxwngq2wnvy87",
    "91kwev268dkg62y46jpg",
    "4z7pvx2ke4wz72ek8653",
]

HEADERS = {
    "Accept": "application/json",
    "User-Agent": "readme-updater/1.0",
}


def fetch_items(page_id: str, channel_view_id: str | None = None) -> list[dict]:
    url = f"{BASE_URL}/api/page/{page_id}/channel/items"
    params = {"channelViewId": channel_view_id} if channel_view_id else {}
    resp = requests.get(url, params=params, headers=HEADERS, timeout=10)
    resp.raise_for_status()
    return resp.json()["data"]["list"]


def post_url(item_id: str) -> str:
    return f"{BASE_URL}/{DOMAIN}/{item_id}"


def fmt_date(iso_str: str) -> str:
    dt = datetime.fromisoformat(iso_str.replace("Z", "+00:00"))
    return dt.strftime("%y.%m.%d")


def replace_section(content: str, marker: str, inner_html: str) -> str:
    pattern = rf"(<!-- {marker}_START -->).*?(<!-- {marker}_END -->)"
    replacement = rf"\1\n{inner_html}\n    \2"
    updated, count = re.subn(pattern, replacement, content, flags=re.DOTALL)
    if count == 0:
        print(f"Warning: marker {marker}_START / {marker}_END not found in README", file=sys.stderr)
    return updated


def build_links(items: list[dict], limit: int) -> str:
    lines = []
    for item in items[:limit]:
        title = item.get("title", "(제목 없음)")
        url = post_url(item["id"])
        date = fmt_date(item["createdAt"])
        lines.append(f'    <a href="{url}">{title}</a> <sub>{date}</sub>')
    return "\n    <br>\n".join(lines)


def main():
    # Insight: latest posts
    insight_items = sorted(
        fetch_items(INSIGHT_PAGE_ID, INSIGHT_CHANNEL_VIEW_ID),
        key=lambda x: x["createdAt"],
        reverse=True,
    )
    insight_html = build_links(insight_items, limit=3)

    # Notes: merge all categories, sort by date, top 5
    all_notes: list[dict] = []
    for page_id in NOTE_PAGE_IDS:
        try:
            all_notes.extend(fetch_items(page_id))
        except Exception as e:
            print(f"Warning: failed to fetch {page_id}: {e}", file=sys.stderr)

    all_notes.sort(key=lambda x: x["createdAt"], reverse=True)
    notes_html = build_links(all_notes, limit=5)

    # Update README (create if not exists)
    try:
        with open("README.md", encoding="utf-8") as f:
            readme = f.read()
        readme = replace_section(readme, "INSIGHT", insight_html)
        readme = replace_section(readme, "NOTES", notes_html)
    except FileNotFoundError:
        readme = f"""<div>
  <samp>
    <br>
    김현우 ﹒ Hyeonwoo Kim
    <br>
    Frontend Engineer at AhnLab.
    <br><br>
    <a href="https://slashpage.com/timmy">Blog</a>
    /
    <a href="https://www.linkedin.com/in/hyeonwoo-klm">LinkedIn</a>
    <br>
  </samp>
</div>

<br><br>
<div>
  <samp>
    <p>Recent Insight</p>
    <!-- INSIGHT_START -->
{insight_html}
    <!-- INSIGHT_END -->
  </samp>
</div>

<br><br>
<div>
  <samp>
    <p>Recent Note</p>
    <!-- NOTES_START -->
{notes_html}
    <!-- NOTES_END -->
  </samp>
</div>
"""

    with open("README.md", "w", encoding="utf-8") as f:
        f.write(readme)

    print(f"README updated — {len(insight_items[:3])} insight, {min(5, len(all_notes))} notes")


if __name__ == "__main__":
    main()
