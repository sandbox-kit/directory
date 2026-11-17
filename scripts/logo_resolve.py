"""Resolve one working logo URL per provider (build-time; not in the browser)."""

from __future__ import annotations

import re
import urllib.error
import urllib.parse
import urllib.request
from html.parser import HTMLParser

UA = "sandbox-pricing-logo-resolve/1.0"

SITE_LOGO_PATHS = (
    "/logo.svg",
    "/logo.png",
    "/favicon.svg",
    "/favicon.ico",
    "/apple-touch-icon.png",
    "/apple-touch-icon-precomposed.png",
)

_IMAGE_EXT = frozenset({".svg", ".ico", ".png", ".webp", ".jpg", ".jpeg", ".gif"})


class _IconLinkParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.href: str | None = None

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag.lower() != "link" or self.href:
            return
        d = {k.lower(): (v or "") for k, v in attrs}
        rel = d.get("rel", "").lower()
        if "icon" not in rel:
            return
        href = d.get("href", "").strip()
        if href:
            self.href = href


def page_base_url(website: str) -> str:
    parsed = urllib.parse.urlparse(website)
    if not parsed.scheme or not parsed.netloc:
        return ""
    if not parsed.path or parsed.path == "/":
        return f"{parsed.scheme}://{parsed.netloc}/"
    path = parsed.path if parsed.path.endswith("/") else re.sub(r"/[^/]*$", "/", parsed.path)
    return f"{parsed.scheme}://{parsed.netloc}{path}"


def logo_candidate_urls(website: str) -> list[str]:
    out: list[str] = []
    seen: set[str] = set()

    def add(url: str) -> None:
        u = url.strip()
        if u and u not in seen:
            seen.add(u)
            out.append(u)

    try:
        parsed = urllib.parse.urlparse(website)
        origin = f"{parsed.scheme}://{parsed.netloc}"
        for path in SITE_LOGO_PATHS:
            add(origin + path)
        base = page_base_url(website)
        if base and base.rstrip("/") != origin:
            for path in SITE_LOGO_PATHS:
                add(urllib.parse.urljoin(base, path.lstrip("/")))
    except Exception:
        pass

    return out


def _looks_like_image(content_type: str, url: str) -> bool:
    ct = content_type.lower()
    if "image" in ct or "svg" in ct:
        return True
    ext = urllib.parse.urlparse(url).path.rsplit(".", 1)[-1].lower()
    return f".{ext}" in _IMAGE_EXT


def probe_image_url(url: str, timeout: float = 7.0) -> bool:
    for method in ("HEAD", "GET"):
        req = urllib.request.Request(
            url,
            method=method,
            headers={"User-Agent": UA, "Accept": "image/*,*/*"},
        )
        try:
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                if resp.status != 200:
                    continue
                ct = resp.headers.get("Content-Type") or ""
                if _looks_like_image(ct, url):
                    if method == "GET":
                        resp.read(512)
                    return True
        except urllib.error.HTTPError as e:
            if e.code in (403, 405) and method == "HEAD":
                continue
        except Exception:
            if method == "HEAD":
                continue
            return False
    return False


def parse_icon_href(html: bytes, base_url: str) -> str | None:
    parser = _IconLinkParser()
    try:
        parser.feed(html.decode("utf-8", errors="ignore")[:400_000])
    except Exception:
        return None
    if not parser.href:
        return None
    return urllib.parse.urljoin(base_url, parser.href)


def resolve_logo_url(website: str) -> str | None:
    if not website.strip():
        return None

    for url in logo_candidate_urls(website):
        if probe_image_url(url):
            return url

    req = urllib.request.Request(
        website,
        headers={"User-Agent": UA, "Accept": "text/html"},
    )
    try:
        with urllib.request.urlopen(req, timeout=12) as resp:
            final = resp.geturl() or website
            body = resp.read(300_000)
            icon = parse_icon_href(body, final)
            if icon and probe_image_url(icon):
                return icon
    except Exception:
        pass

    dom = urllib.parse.urlparse(website).netloc.lower().removeprefix("www.")
    if dom:
        ddg = f"https://icons.duckduckgo.com/ip3/{dom}.ico"
        if probe_image_url(ddg):
            return ddg

    return None