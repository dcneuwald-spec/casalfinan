"""
MÓDULO 6 – Automação de Publicação nas Redes Sociais
Publica via TikTok Content Posting API e Meta Graph API.

IMPORTANTE:
- TikTok exige que o vídeo já esteja renderizado; aqui enviamos
  a URL pública do vídeo (o usuário deve hospedar o arquivo).
- Instagram Graph API publica Reels via URL de vídeo hospedado.
"""

import requests
from utils import log
from config import (
    TIKTOK_ACCESS_TOKEN,
    INSTAGRAM_ACCESS_TOKEN,
    INSTAGRAM_PAGE_ID,
)

TIKTOK_API   = "https://open.tiktokapis.com/v2"
INSTAGRAM_API = "https://graph.facebook.com/v19.0"


# ── TikTok ────────────────────────────────────────────────────────────────────

def publicar_tiktok(item: dict) -> bool:
    """
    Publica um vídeo no TikTok usando a Content Posting API.
    O campo 'video_url' no item deve apontar pra um vídeo MP4 público.
    """
    video_url = item.get("video_url", "")
    if not video_url:
        log.warning("TikTok: sem video_url em '%s' – pulando.", item["produto_nome"][:40])
        return False

    # 1. Inicializa o upload
    try:
        resp = requests.post(
            f"{TIKTOK_API}/post/publish/video/init/",
            headers={
                "Authorization": f"Bearer {TIKTOK_ACCESS_TOKEN}",
                "Content-Type": "application/json; charset=UTF-8",
            },
            json={
                "post_info": {
                    "title":        item["legenda_tiktok"][:150],
                    "privacy_level": "SELF_ONLY",   # mude para PUBLIC_TO_EVERYONE em produção
                    "disable_duet":   False,
                    "disable_stitch": False,
                    "disable_comment": False,
                    "video_cover_timestamp_ms": 1000,
                },
                "source_info": {
                    "source":    "PULL_FROM_URL",
                    "video_url": video_url,
                },
            },
            timeout=20,
        )
        data = resp.json()
        if resp.status_code not in (200, 201) or data.get("error", {}).get("code") != "ok":
            log.error("TikTok init falhou: %s", data)
            return False

        publish_id = data.get("data", {}).get("publish_id", "")
        log.info("TikTok publicado (publish_id=%s): %s", publish_id, item["produto_nome"][:40])
        return True

    except Exception as exc:
        log.error("Erro ao publicar no TikTok: %s", exc)
        return False


# ── Instagram ─────────────────────────────────────────────────────────────────

def publicar_instagram(item: dict) -> bool:
    """
    Publica um Reel no Instagram via Meta Graph API (2 passos: create container → publish).
    O campo 'video_url' no item deve apontar pra um vídeo MP4 público.
    """
    video_url = item.get("video_url", "")
    if not video_url:
        log.warning("Instagram: sem video_url em '%s' – pulando.", item["produto_nome"][:40])
        return False

    params_base = {"access_token": INSTAGRAM_ACCESS_TOKEN}

    try:
        # 1. Cria container de mídia
        resp = requests.post(
            f"{INSTAGRAM_API}/{INSTAGRAM_PAGE_ID}/media",
            params={
                **params_base,
                "media_type":  "REELS",
                "video_url":   video_url,
                "caption":     item["legenda_instagram"],
                "share_to_feed": True,
            },
            timeout=20,
        )
        resp.raise_for_status()
        container_id = resp.json().get("id")
        if not container_id:
            log.error("Instagram: container_id não retornado – %s", resp.text[:200])
            return False

        # 2. Publica o container
        resp2 = requests.post(
            f"{INSTAGRAM_API}/{INSTAGRAM_PAGE_ID}/media_publish",
            params={**params_base, "creation_id": container_id},
            timeout=20,
        )
        resp2.raise_for_status()
        media_id = resp2.json().get("id", "")
        log.info("Instagram publicado (media_id=%s): %s", media_id, item["produto_nome"][:40])
        return True

    except Exception as exc:
        log.error("Erro ao publicar no Instagram: %s", exc)
        return False
