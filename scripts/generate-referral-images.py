#!/usr/bin/env python3
"""Generate ShopSenegal referral program flyer (single PNG, logo-matched background)."""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "assets" / "parrainage"
LOGO_PATH = ROOT / "assets" / "shopsenegal-logo.png"
QR_PATH = ROOT / "assets" / "shop-senegal-qrcode-hd.png"
OUTPUT = OUT_DIR / "parrainage-flyer.png"

SITE_URL = "https://www.shop-senegal.com"
SITE_DISPLAY = "www.shop-senegal.com"
WHATSAPP_DISPLAY = "+221 76 622 66 01"

# Couleurs extraites du logo ShopSenegal
BG = (241, 241, 238)
GREEN = (17, 87, 51)
GREEN_DARK = (12, 72, 42)
GOLD = (177, 151, 83)
CARD = (252, 251, 248)
WHITE = (255, 255, 255)
TEXT = (30, 41, 59)
MUTED = (100, 116, 139)
BORDER = (218, 216, 210)
ACCENT_BG = (232, 242, 235)

FONT_BOLD = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"
FONT_REG = "/System/Library/Fonts/Supplemental/Arial.ttf"


def load_font(path: str, size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    try:
        return ImageFont.truetype(path, size)
    except OSError:
        return ImageFont.load_default()


def rounded_rect(
    draw: ImageDraw.ImageDraw,
    xy: tuple[int, int, int, int],
    radius: int,
    fill: tuple[int, int, int],
    outline: tuple[int, int, int] | None = None,
    width: int = 0,
) -> None:
    draw.rounded_rectangle(xy, radius=radius, fill=fill, outline=outline, width=width)


def wrap_text(text: str, font: ImageFont.FreeTypeFont, max_width: int) -> list[str]:
    words = text.split()
    lines: list[str] = []
    current = ""
    for word in words:
        trial = f"{current} {word}".strip()
        if font.getlength(trial) <= max_width:
            current = trial
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines or [""]


def draw_wrapped(
    draw: ImageDraw.ImageDraw,
    text: str,
    xy: tuple[int, int],
    font: ImageFont.FreeTypeFont,
    fill: tuple[int, int, int],
    max_width: int,
    line_gap: int = 5,
) -> int:
    x, y = xy
    for line in wrap_text(text, font, max_width):
        draw.text((x, y), line, font=font, fill=fill)
        y += font.size + line_gap
    return y


def draw_centered(
    draw: ImageDraw.ImageDraw,
    text: str,
    y: int,
    font: ImageFont.FreeTypeFont,
    fill: tuple[int, int, int],
    canvas_w: int,
) -> int:
    tw = font.getlength(text)
    draw.text(((canvas_w - tw) / 2, y), text, font=font, fill=fill)
    return y + font.size


def draw_header(img: Image.Image, draw: ImageDraw.ImageDraw, w: int) -> int:
    margin = 72
    y = 56

    if LOGO_PATH.exists():
        logo = Image.open(LOGO_PATH).convert("RGBA")
        logo.thumbnail((200, 120), Image.Resampling.LANCZOS)
        lx = (w - logo.width) // 2
        img.paste(logo, (lx, y), logo)
        y += logo.height + 28

    # Thin accent line
    line_w = 120
    draw.rectangle(((w - line_w) // 2, y, (w + line_w) // 2, y + 4), fill=GOLD)
    y += 24

    title_font = load_font(FONT_BOLD, 44)
    y = draw_centered(draw, "Programme de parrainage", y, title_font, GREEN_DARK, w) + 12

    sub_font = load_font(FONT_REG, 24)
    y = draw_centered(
        draw,
        "Parrainez vos proches · Gagnez des crédits",
        y,
        sub_font,
        MUTED,
        w,
    ) + 36

    # Subtle divider
    draw.line((margin, y, w - margin, y), fill=BORDER, width=1)
    return y + 40


def draw_step_card(
    draw: ImageDraw.ImageDraw,
    y: int,
    number: str,
    title: str,
    body: str,
    x: int,
    card_w: int,
) -> int:
    card_h = 148
    rounded_rect(draw, (x, y, x + card_w, y + card_h), 14, CARD, outline=BORDER, width=1)

    # Left accent bar
    draw.rounded_rectangle((x, y, x + 6, y + card_h), radius=3, fill=GREEN)

    # Step number circle
    cx, cy = x + 44, y + card_h // 2
    r = 26
    draw.ellipse((cx - r, cy - r, cx + r, cy + r), fill=ACCENT_BG, outline=GREEN, width=2)
    nf = load_font(FONT_BOLD, 24)
    nw = nf.getlength(number)
    draw.text((cx - nw / 2, cy - 14), number, font=nf, fill=GREEN_DARK)

    tx = x + 82
    title_font = load_font(FONT_BOLD, 24)
    body_font = load_font(FONT_REG, 19)
    draw.text((tx, y + 22), title, font=title_font, fill=TEXT)
    draw_wrapped(draw, body, (tx, y + 56), body_font, MUTED, card_w - 98, 4)

    return y + card_h + 18


def draw_contact_block(img: Image.Image, draw: ImageDraw.ImageDraw, y: int, margin: int, w: int) -> int:
    block_h = 196
    rounded_rect(draw, (margin, y, w - margin, y + block_h), 16, CARD, outline=BORDER, width=1)

    qr_size = 148
    qr_x = margin + 28
    qr_y = y + (block_h - qr_size) // 2

    if QR_PATH.exists():
        qr = Image.open(QR_PATH).convert("RGBA")
        qr = qr.resize((qr_size, qr_size), Image.Resampling.LANCZOS)
        rounded_rect(draw, (qr_x - 4, qr_y - 4, qr_x + qr_size + 4, qr_y + qr_size + 4), 8, CARD, outline=BORDER, width=1)
        img.paste(qr, (qr_x, qr_y), qr)

    tx = qr_x + qr_size + 36
    label_font = load_font(FONT_BOLD, 16)
    value_font = load_font(FONT_REG, 20)
    url_font = load_font(FONT_BOLD, 22)

    ty = y + 36
    draw.text((tx, ty), "SITE WEB", font=label_font, fill=GREEN)
    ty += 22
    draw.text((tx, ty), SITE_DISPLAY, font=url_font, fill=TEXT)
    ty += 36
    draw.text((tx, ty), "WHATSAPP", font=label_font, fill=GREEN)
    ty += 22
    draw.text((tx, ty), WHATSAPP_DISPLAY, font=value_font, fill=TEXT)
    ty += 34
    draw.text((tx, ty), "Scannez le QR code pour commander", font=load_font(FONT_REG, 17), fill=MUTED)

    return y + block_h + 24


def create_flyer() -> Image.Image:
    w, h = 1080, 1920
    img = Image.new("RGB", (w, h), BG)
    draw = ImageDraw.Draw(img)

    margin = 72
    content_w = w - margin * 2
    y = draw_header(img, draw, w)

    section_font = load_font(FONT_BOLD, 26)
    draw.text((margin, y), "Comment ça marche", font=section_font, fill=GREEN_DARK)
    y += 44

    steps = [
        (
            "1",
            "Inscription",
            "Créez votre compte gratuit avec votre numéro de téléphone sur ShopSenegal.",
        ),
        (
            "2",
            "Votre code parrain",
            "Un code personnel unique est généré automatiquement. Retrouvez-le dans « Mon compte parrainage ».",
        ),
        (
            "3",
            "Achat avec le code",
            "Votre filleul commande et entre votre code au checkout. Il est vérifié avant validation.",
        ),
        (
            "4",
            "Bénéfices",
            "Commande payée + code valide : récompenses activées. Crédit déduit sur vos prochaines commandes.",
        ),
    ]

    for num, title, body in steps:
        y = draw_step_card(draw, y, num, title, body, margin, content_w)

    y += 16
    rounded_rect(draw, (margin, y, w - margin, y + 220), 16, ACCENT_BG, outline=GREEN, width=1)

    badge_font = load_font(FONT_BOLD, 14)
    badge_text = "RÉCOMPENSES"
    badge_w = badge_font.getlength(badge_text) + 24
    badge_x = margin + 28
    badge_y = y + 24
    rounded_rect(draw, (badge_x, badge_y, badge_x + badge_w, badge_y + 28), 6, GREEN)
    draw.text((badge_x + 12, badge_y + 6), badge_text, font=badge_font, fill=WHITE)

    rewards_title = load_font(FONT_BOLD, 26)
    draw.text((margin + 28, y + 64), "Vos avantages", font=rewards_title, fill=GREEN_DARK)

    rewards = [
        ("5 500 FCFA", "+300 FCFA pour le parrain et le filleul"),
        ("20 000 FCFA", "−50 % sur la livraison pour le filleul"),
        ("Commande payée", "Crédit déduit automatiquement"),
    ]

    rx = margin + 28
    ry = y + 108
    label_font = load_font(FONT_BOLD, 18)
    value_font = load_font(FONT_REG, 18)
    col_w = (content_w - 56) // 3
    for i, (label, value) in enumerate(rewards):
        cx = rx + i * (col_w + 14)
        rounded_rect(draw, (cx, ry, cx + col_w, ry + 88), 10, CARD, outline=BORDER, width=1)
        draw.text((cx + 14, ry + 14), f"≥ {label}", font=label_font, fill=GREEN)
        draw_wrapped(draw, value, (cx + 14, ry + 42), value_font, TEXT, col_w - 28, 3)

    y += 248

    # CTA
    cta_h = 60
    rounded_rect(draw, (margin + 40, y, w - margin - 40, y + cta_h), 30, GREEN)
    cta_font = load_font(FONT_BOLD, 24)
    cta = "Inscrivez-vous sur ShopSenegal"
    draw.text(((w - cta_font.getlength(cta)) / 2, y + 16), cta, font=cta_font, fill=WHITE)

    y += cta_h + 24
    y = draw_contact_block(img, draw, y, margin, w)

    hint_font = load_font(FONT_REG, 17)
    draw_centered(draw, "Partagez ce flyer · Invitez vos proches", y, hint_font, MUTED, w)
    y += 28

    # Footer
    draw.line((margin, h - 72, w - margin, h - 72), fill=BORDER, width=1)
    footer_font = load_font(FONT_REG, 17)
    draw_centered(draw, "ShopSenegal · Experience Teranga", h - 48, footer_font, MUTED, w)

    return img


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    flyer = create_flyer()
    flyer.save(OUTPUT, "PNG", optimize=True)
    print(f"Created {OUTPUT} ({OUTPUT.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
