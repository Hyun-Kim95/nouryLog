"""Play Store 스크린샷 예시 1장 생성 (캡션 + 실기 캡처)."""
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[3]
ASSETS_CURSOR = Path.home() / '.cursor' / 'projects' / 'd-cursor-dietManagement' / 'assets'
OUT_DIR = ROOT / 'apps' / 'mobile' / 'assets' / 'store' / 'screenshots'

TARGET_W, TARGET_H = 1080, 1920
BG = '#f0fdf4'
PRIMARY = '#16a34a'
FG = '#0f172a'
FG_MUTED = '#475569'
CAPTION_H = 300
PAD = 48
NAV_CROP = 130


def find_home_capture() -> Path:
    matches = list(ASSETS_CURSOR.glob('*b5c8ae9f*.png'))
    if not matches:
        raise FileNotFoundError('홈 스크린샷 원본을 찾지 못했습니다.')
    return matches[0]


def load_fonts():
    bold = Path(r'C:\Windows\Fonts\malgunbd.ttf')
    regular = Path(r'C:\Windows\Fonts\malgun.ttf')
    if bold.exists() and regular.exists():
        return ImageFont.truetype(str(bold), 52), ImageFont.truetype(str(regular), 34)
    default = ImageFont.load_default()
    return default, default


def main() -> None:
    src_path = find_home_capture()
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    out_path = OUT_DIR / 'example-01-home-captioned.png'

    img = Image.open(src_path).convert('RGB')
    w, h = img.size
    cropped = img.crop((0, 0, w, h - NAV_CROP))

    canvas = Image.new('RGB', (TARGET_W, TARGET_H), BG)
    draw = ImageDraw.Draw(canvas)
    title_font, body_font = load_fonts()

    title = '오늘 섭취와 목표를 한눈에'
    subtitle = 'nouryLog · 홈'

    draw.rectangle([PAD, PAD, PAD + 8, PAD + 120], fill=PRIMARY)
    draw.text((PAD + 24, PAD + 8), title, font=title_font, fill=FG)
    draw.text((PAD + 24, PAD + 78), subtitle, font=body_font, fill=FG_MUTED)

    frame_top = CAPTION_H
    frame_bottom = TARGET_H - PAD
    frame_left = PAD
    frame_right = TARGET_W - PAD
    frame_w = frame_right - frame_left
    frame_h = frame_bottom - frame_top

    scale = min(frame_w / cropped.width, frame_h / cropped.height)
    nw, nh = int(cropped.width * scale), int(cropped.height * scale)
    resized = cropped.resize((nw, nh), Image.Resampling.LANCZOS)

    ox = frame_left + (frame_w - nw) // 2
    oy = frame_top + (frame_h - nh) // 2

    shadow = Image.new('RGB', (nw + 24, nh + 24), '#cbd5e1')
    canvas.paste(shadow, (ox - 8, oy + 12))
    bezel = Image.new('RGB', (nw + 16, nh + 16), '#ffffff')
    canvas.paste(bezel, (ox - 8, oy - 8))
    canvas.paste(resized, (ox, oy))

    draw.text(
        (PAD, TARGET_H - PAD - 36),
        'Play 스토어 스크린샷 예시 (1/6)',
        font=body_font,
        fill=FG_MUTED,
    )

    canvas.save(out_path, format='PNG', optimize=True)
    print(f'saved: {out_path} ({canvas.size[0]}x{canvas.size[1]})')


if __name__ == '__main__':
    main()
