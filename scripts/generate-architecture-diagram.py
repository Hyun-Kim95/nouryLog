"""Generate nouryLog service architecture diagram (high-quality PNG)."""

from __future__ import annotations

import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "nourylog-service-architecture.png"
SCALE = 2
W, H = 1600 * SCALE, 1000 * SCALE

# Palette
BG_TOP = (248, 250, 252)
BG_BOT = (238, 242, 255)
INK = (15, 23, 42)
MUTED = (100, 116, 139)
LINE = (148, 163, 184)
WHITE = (255, 255, 255)
BRAND = (5, 150, 105)
BRAND2 = (13, 148, 136)
BLUE = (59, 130, 246)
VIOLET = (139, 92, 246)
GREEN = (22, 163, 74)
ORANGE = (234, 88, 12)


def s(v: float) -> int:
    return int(v * SCALE)


def load_font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    """Korean-first: Malgun Gothic supports Hangul + Latin."""
    size = s(size)
    for name in (
        ("C:/Windows/Fonts/malgunbd.ttf" if bold else "C:/Windows/Fonts/malgun.ttf"),
        ("C:/Windows/Fonts/segoeuib.ttf" if bold else "C:/Windows/Fonts/segoeui.ttf"),
    ):
        p = Path(name)
        if p.exists():
            return ImageFont.truetype(str(p), size)
    return ImageFont.load_default()


def mono(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    size = s(size)
    for name in ("C:/Windows/Fonts/consolab.ttf" if bold else "C:/Windows/Fonts/consola.ttf",):
        p = Path(name)
        if p.exists():
            return ImageFont.truetype(str(p), size)
    return load_font(size, bold)


def mixed_font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    """Paths and English labels."""
    return mono(size, bold) if bold else load_font(size, bold)


def lerp(a: int, b: int, t: float) -> int:
    return int(a + (b - a) * t)


def vertical_gradient(size: tuple[int, int], top: tuple[int, int, int], bottom: tuple[int, int, int]) -> Image.Image:
    w, h = size
    img = Image.new("RGB", (w, h))
    px = img.load()
    for y in range(h):
        t = y / max(h - 1, 1)
        color = tuple(lerp(top[i], bottom[i], t) for i in range(3))
        for x in range(w):
            px[x, y] = color
    return img


def bg_canvas() -> Image.Image:
    base = vertical_gradient((W, H), BG_TOP, BG_BOT)
    overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(overlay)
    step = s(24)
    for y in range(0, H, step):
        for x in range(0, W, step):
            d.ellipse((x, y, x + s(2.4), y + s(2.4)), fill=(203, 213, 225, 70))
    return Image.alpha_composite(base.convert("RGBA"), overlay).convert("RGB")


def shadow_layer(w: int, h: int, radius: int, blur: int = 18, offset: int = 8, alpha: int = 28) -> Image.Image:
    sh = Image.new("RGBA", (w + blur * 4, h + blur * 4), (0, 0, 0, 0))
    sd = ImageDraw.Draw(sh)
    pad = blur * 2
    sd.rounded_rectangle((pad, pad + offset, pad + w, pad + h + offset), radius=radius, fill=(15, 23, 42, alpha))
    return sh.filter(ImageFilter.GaussianBlur(blur))


def paste_card(base: Image.Image, x: int, y: int, w: int, h: int, radius: int, fill: tuple[int, int, int] = WHITE) -> None:
    sh = shadow_layer(w, h, radius)
    base.paste(sh, (x - sh.width // 2 + w // 2 + s(8), y - s(6)), sh)
    card = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    ImageDraw.Draw(card).rounded_rectangle((0, 0, w, h), radius=radius, fill=fill + (255,))
    base.paste(card, (x, y), card)


def rounded_rect_fill(
    base: Image.Image,
    xy: tuple[int, int, int, int],
    radius: int,
    fill: tuple[int, int, int],
) -> None:
    x0, y0, x1, y1 = xy
    w, h = x1 - x0, y1 - y0
    layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    ImageDraw.Draw(layer).rounded_rectangle((0, 0, w, h), radius=radius, fill=fill + (255,))
    base.paste(layer, (x0, y0), layer)


def text_center(
    draw: ImageDraw.ImageDraw,
    box: tuple[int, int, int, int],
    lines: list[tuple[str, ImageFont.ImageFont, tuple[int, int, int]]],
    gap: int = 8,
) -> None:
    x0, y0, x1, y1 = box
    gap = s(gap)
    metrics = []
    for text, font, _ in lines:
        bb = draw.textbbox((0, 0), text, font=font)
        metrics.append((bb[2] - bb[0], bb[3] - bb[1]))
    total_h = sum(m[1] for m in metrics) + gap * (len(lines) - 1)
    y = y0 + (y1 - y0 - total_h) // 2
    for (text, font, color), (tw, th) in zip(lines, metrics):
        x = x0 + (x1 - x0 - tw) // 2
        draw.text((x, y), text, fill=color, font=font)
        y += th + gap


def text_left(
    draw: ImageDraw.ImageDraw,
    x: int,
    y: int,
    text: str,
    font: ImageFont.ImageFont,
    fill: tuple[int, int, int],
) -> int:
    draw.text((x, y), text, fill=fill, font=font)
    bb = draw.textbbox((x, y), text, font=font)
    return bb[3]


def pill(
    draw: ImageDraw.ImageDraw,
    x: int,
    y: int,
    label: str,
    bg: tuple[int, int, int],
    fg: tuple[int, int, int] = (51, 65, 85),
) -> tuple[int, int, int, int]:
    font = load_font(13)
    bb = draw.textbbox((0, 0), label, font=font)
    tw, th = bb[2] - bb[0], bb[3] - bb[1]
    pad_x, pad_y = s(14), s(7)
    w, h = tw + pad_x * 2, th + pad_y * 2
    draw.rounded_rectangle((x, y, x + w, y + h), radius=h // 2, fill=bg)
    draw.text((x + pad_x, y + pad_y - bb[1]), label, fill=fg, font=font)
    return x, y, x + w, y + h


def arrow_line(draw: ImageDraw.ImageDraw, pts: list[tuple[int, int]], color: tuple[int, int, int] = LINE) -> None:
    draw.line(pts, fill=color, width=s(2.5), joint="curve")
    x0, y0 = pts[-2]
    x1, y1 = pts[-1]
    ang = math.atan2(y1 - y0, x1 - x0)
    size = s(10)
    p1 = (x1, y1)
    p2 = (x1 - size * math.cos(ang - 0.45), y1 - size * math.sin(ang - 0.45))
    p3 = (x1 - size * math.cos(ang + 0.45), y1 - size * math.sin(ang + 0.45))
    draw.polygon([p1, p2, p3], fill=color)


def dashed_line(draw: ImageDraw.ImageDraw, x0: int, y0: int, x1: int, y1: int) -> None:
    length = math.hypot(x1 - x0, y1 - y0)
    dash, gap = s(6), s(5)
    steps = max(int(length / (dash + gap)), 1)
    for i in range(steps):
        t0 = i / steps
        t1 = min((i * (dash + gap) + dash) / length, 1.0)
        if t0 >= 1:
            break
        sx = int(x0 + (x1 - x0) * t0)
        sy = int(y0 + (y1 - y0) * t0)
        ex = int(x0 + (x1 - x0) * t1)
        ey = int(y0 + (y1 - y0) * t1)
        draw.line((sx, sy, ex, ey), fill=LINE, width=s(2))
    ang = math.atan2(y1 - y0, x1 - x0)
    size = s(9)
    draw.polygon(
        [
            (x1, y1),
            (x1 - size * math.cos(ang - 0.45), y1 - size * math.sin(ang - 0.45)),
            (x1 - size * math.cos(ang + 0.45), y1 - size * math.sin(ang + 0.45)),
        ],
        fill=LINE,
    )


def draw_header(base: Image.Image) -> None:
    draw = ImageDraw.Draw(base)
    logo = s(72)
    lx, ly = s(80), s(48)
    lg = vertical_gradient((logo, logo), BRAND, BRAND2)
    mask = Image.new("L", (logo, logo), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, logo, logo), radius=s(20), fill=255)
    base.paste(lg, (lx, ly), mask)
    draw.text((lx + logo // 2 - s(10), ly + s(14)), "N", fill=WHITE, font=load_font(34, True))
    text_left(draw, lx + logo + s(24), s(58), "nouryLog", load_font(36, True), INK)  # Latin OK in Malgun
    text_left(draw, lx + logo + s(24), s(98), "서비스 아키텍처 · 식단 기록 · 영양 분석 · OCR", load_font(18), MUTED)


def draw_layer_labels(draw: ImageDraw.ImageDraw) -> None:
    font = load_font(13, True)
    for label, y in (("CLIENT", s(168)), ("SHARED", s(430)), ("BACKEND", s(560)), ("DATA", s(860)), ("EXTERNAL", s(560))):
        x = s(1240) if label == "EXTERNAL" else s(80)
        draw.text((x, y), label, fill=(148, 163, 184), font=font)


def draw_mobile_card(base: Image.Image) -> None:
    x, y, w, h = s(120), s(190), s(420), s(200)
    paste_card(base, x, y, w, h, s(24))
    draw = ImageDraw.Draw(base)
    draw.rounded_rectangle((x, y, x + s(8), y + h), radius=s(4), fill=BLUE)
    rounded_rect_fill(base, (x + s(28), y + s(24), x + s(76), y + s(72)), s(14), (239, 246, 255))
    draw.text((x + s(40), y + s(34)), "Mobile", fill=BLUE, font=load_font(11, True))
    text_left(draw, x + s(92), y + s(26), "Mobile App", load_font(24, True), INK)
    text_left(draw, x + s(92), y + s(56), "Expo / React Native", load_font(15), MUTED)
    px, py = x + s(92), y + s(88)
    for label in ("식단기록", "OCR", "통계", "체중", "프로필"):
        _, _, x2, _ = pill(draw, px, py, label, (239, 246, 255))
        px = x2 + s(8)
        if px > x + w - s(80):
            px = x + s(92)
            py += s(38)


def draw_admin_card(base: Image.Image) -> None:
    x, y, w, h = s(1060), s(190), s(420), s(200)
    paste_card(base, x, y, w, h, s(24))
    draw = ImageDraw.Draw(base)
    draw.rounded_rectangle((x + w - s(8), y, x + w, y + h), radius=s(4), fill=VIOLET)
    rounded_rect_fill(base, (x + s(28), y + s(24), x + s(76), y + s(72)), s(14), (245, 243, 255))
    draw.text((x + s(36), y + s(34)), "Admin", fill=VIOLET, font=load_font(11, True))
    text_left(draw, x + s(92), y + s(26), "Admin Web", load_font(24, True), INK)
    text_left(draw, x + s(92), y + s(56), "Vite + React", load_font(15), MUTED)
    px, py = x + s(92), y + s(88)
    for label in ("대시보드", "회원 · 음식 · 문의 · 공지"):
        _, _, x2, _ = pill(draw, px, py, label, (245, 243, 255))
        px = x2 + s(8)


def draw_api_client(base: Image.Image) -> None:
    x, y, w, h = s(520), s(450), s(560), s(88)
    paste_card(base, x, y, w, h, s(22))
    draw = ImageDraw.Draw(base)
    tint = Image.new("RGBA", (w, h), (99, 102, 241, 18))
    mask = Image.new("L", (w, h), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, w, h), radius=s(22), fill=255)
    base.paste(tint, (x, y), mask)
    text_center(
        draw,
        (x, y, x + w, y + h),
        [
            ("packages/api-client", mono(22, True), (67, 56, 202)),
            ("OpenAPI 타입 / 클라이언트", load_font(15), MUTED),
        ],
        gap=6,
    )


def draw_api_server(base: Image.Image) -> None:
    x, y, w, h = s(280), s(580), s(1040), s(240)
    paste_card(base, x, y, w, h, s(28))
    draw = ImageDraw.Draw(base)
    draw.rounded_rectangle((x, y, x + w, y + s(6)), radius=s(3), fill=BRAND)
    text_left(draw, x + s(40), y + s(34), "API Server", load_font(28, True), INK)
    text_left(draw, x + s(40), y + s(72), "Express + Prisma", load_font(16), MUTED)
    bx, by, bw, bh = x + w - s(172), y + s(28), s(132), s(34)
    draw.rounded_rectangle((bx, by, bx + bw, by + bh), radius=bh // 2, fill=(243, 232, 255), outline=(196, 181, 253))
    draw.ellipse((bx + s(12), by + bh // 2 - s(5), bx + s(22), by + bh // 2 + s(5)), fill=(124, 58, 237))
    draw.text((bx + s(28), by + s(7)), "Railway", fill=(109, 40, 217), font=load_font(14, True))

    routes = [
        (x + s(40), s(110), s(180), s(96), "/public", "정책 · 공개 API", (248, 250, 252), (226, 232, 240)),
        (x + s(250), s(110), s(340), s(96), "/me", "인증 · 식사 · OCR · 통계", (240, 253, 244), (134, 239, 172)),
        (x + s(620), s(110), s(180), s(96), "/admin", "운영 관리", (248, 250, 252), (226, 232, 240)),
    ]
    for rx, ry, rw, rh, path, desc, bg, border in routes:
        abs_y = y + ry
        draw.rounded_rectangle((rx, abs_y, rx + rw, abs_y + rh), radius=s(16), fill=bg, outline=border, width=s(1.5))
        if path == "/me":
            text_center(
                draw,
                (rx, abs_y, rx + rw, abs_y + rh),
                [
                    (path, mono(22, True), INK),
                    (desc, load_font(16, True), (22, 101, 52)),
                ],
                gap=4,
            )
        else:
            text_center(
                draw,
                (rx, abs_y, rx + rw, abs_y + rh),
                [
                    (path, mono(22, True), INK),
                    (desc, load_font(13), MUTED),
                ],
                gap=4,
            )


def draw_db(base: Image.Image) -> None:
    x, y, w, h = s(600), s(880), s(400), s(88)
    paste_card(base, x, y, w, h, s(22))
    draw = ImageDraw.Draw(base)
    tint = vertical_gradient((w, h), (255, 247, 237), (255, 237, 213))
    mask = Image.new("L", (w, h), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, w, h), radius=s(22), fill=255)
    base.paste(tint, (x, y), mask)
    cx, top = x + s(40), y + s(26)
    draw.ellipse((cx - s(22), top, cx + s(22), top + s(18)), fill=(251, 146, 60, 90))
    draw.rounded_rectangle((cx - s(22), top + s(10), cx + s(22), top + s(38)), radius=s(6), fill=(255, 247, 237), outline=(253, 186, 116), width=s(1.5))
    draw.ellipse((cx - s(22), top + s(10), cx + s(22), top + s(28)), outline=(253, 186, 116), width=s(1.5))
    text_left(draw, x + s(90), y + s(24), "PostgreSQL", load_font(24, True), INK)
    text_left(draw, x + s(90), y + s(54), "Railway · Prisma ORM", load_font(15), MUTED)


def draw_external(base: Image.Image, y: int, icon_bg: tuple[int, int, int], title: str, desc: str) -> None:
    x, w, h = s(1240), s(280), s(92)
    paste_card(base, x, y, w, h, s(18))
    draw = ImageDraw.Draw(base)
    rounded_rect_fill(base, (x + s(24), y + s(22), x + s(60), y + s(58)), s(10), icon_bg)
    text_left(draw, x + s(72), y + s(22), title, load_font(16, True), INK)
    text_left(draw, x + s(72), y + s(46), desc, load_font(13), MUTED)


def main() -> None:
    OUT.parent.mkdir(parents=True, exist_ok=True)
    img = bg_canvas()
    draw = ImageDraw.Draw(img)
    draw_header(img)
    draw_layer_labels(draw)

    draw_mobile_card(img)
    draw_admin_card(img)
    draw_api_client(img)
    draw_api_server(img)
    draw_db(img)

    draw_external(img, s(590), (254, 243, 199), "Google Cloud Vision", "OCR 영양성분 인식")
    draw_external(img, s(700), (252, 231, 243), "SNS Login", "Naver · Kakao · Google")
    draw_external(img, s(810), (224, 231, 255), "PostHog", "이용 분석 (app=nourylog)")

    d = ImageDraw.Draw(img)
    arrow_line(d, [(s(330), s(390)), (s(330), s(420)), (s(620), s(450))])
    arrow_line(d, [(s(1270), s(390)), (s(1270), s(420)), (s(980), s(450))])
    arrow_line(d, [(s(800), s(538)), (s(800), s(580))])
    arrow_line(d, [(s(800), s(820)), (s(800), s(880))])
    dashed_line(d, s(1120), s(636), s(1240), s(636))
    dashed_line(d, s(1120), s(746), s(1240), s(746))
    dashed_line(d, s(1120), s(856), s(1240), s(856))

    d.text((s(80), s(970)), "※ 광고 · 구독 미포함", fill=MUTED, font=load_font(13))

    img.save(OUT, format="PNG", optimize=True)
    print(f"Saved: {OUT}")


if __name__ == "__main__":
    main()
