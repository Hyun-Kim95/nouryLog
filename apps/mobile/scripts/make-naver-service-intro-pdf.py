"""네이버 로그인 검수용 nouryLog 서비스 소개 PDF 생성."""
from __future__ import annotations

import argparse
from pathlib import Path

from fpdf import FPDF
from PIL import Image

ROOT = Path(__file__).resolve().parents[3]
DEFAULT_OUT = ROOT / 'docs' / 'release' / 'nourylog-service-intro.pdf'
ICON = ROOT / 'apps' / 'mobile' / 'assets' / 'icon.png'
FEATURE = ROOT / 'apps' / 'mobile' / 'assets' / 'store' / 'play-feature-graphic.png'
FONT_REG = Path(r'C:\Windows\Fonts\malgun.ttf')
FONT_BOLD = Path(r'C:\Windows\Fonts\malgunbd.ttf')

TERMS_URL = 'https://api-server-production-52bc.up.railway.app/public/policies/terms/page'
PRIVACY_URL = 'https://api-server-production-52bc.up.railway.app/public/policies/privacy/page'


class IntroPDF(FPDF):
    def __init__(self) -> None:
        super().__init__(orientation='P', unit='mm', format='A4')
        self.set_margins(18, 18, 18)
        self.add_font('Malgun', '', str(FONT_REG))
        self.add_font('Malgun', 'B', str(FONT_BOLD))
        self.set_auto_page_break(auto=True, margin=18)

    def reset_x(self) -> None:
        self.set_x(self.l_margin)

    def heading(self, text: str) -> None:
        self.reset_x()
        self.set_font('Malgun', 'B', 16)
        self.set_text_color(15, 23, 42)
        self.multi_cell(0, 9, text)
        self.ln(2)

    def subheading(self, text: str) -> None:
        self.reset_x()
        self.set_font('Malgun', 'B', 12)
        self.set_text_color(22, 163, 74)
        self.multi_cell(0, 7, text)
        self.ln(1)

    def body(self, text: str) -> None:
        self.reset_x()
        self.set_font('Malgun', '', 10)
        self.set_text_color(51, 65, 85)
        self.multi_cell(0, 5.5, text)
        self.ln(1)

    def bullet(self, text: str) -> None:
        self.reset_x()
        self.set_font('Malgun', '', 10)
        self.set_text_color(51, 65, 85)
        self.multi_cell(0, 5.5, f'- {text}')

    def url_line(self, label: str, url: str) -> None:
        self.reset_x()
        self.set_font('Malgun', 'B', 9)
        self.set_text_color(51, 65, 85)
        self.cell(0, 5, label, new_x='LMARGIN', new_y='NEXT')
        self.reset_x()
        self.set_font('Malgun', '', 8)
        self.set_text_color(37, 99, 235)
        self.multi_cell(0, 4.5, url)
        self.ln(1)


def compress_image_for_pdf(src: Path, max_width_px: int = 1600) -> Path:
    tmp = src.parent / f'.pdf-tmp-{src.stem}.jpg'
    img = Image.open(src).convert('RGB')
    if img.width > max_width_px:
        ratio = max_width_px / img.width
        img = img.resize((max_width_px, int(img.height * ratio)), Image.Resampling.LANCZOS)
    img.save(tmp, format='JPEG', quality=85, optimize=True)
    return tmp


def add_image_fit_width(pdf: IntroPDF, path: Path, max_w_mm: float = 170, caption: str | None = None) -> None:
    tmp = compress_image_for_pdf(path)
    try:
        with Image.open(tmp) as img:
            w_px, h_px = img.size
        w_mm = max_w_mm
        h_mm = w_mm * (h_px / w_px)
        max_h = 250 - pdf.get_y()
        if h_mm > max_h and max_h > 20:
            h_mm = max_h
            w_mm = h_mm * (w_px / h_px)
        x = (210 - w_mm) / 2
        y = pdf.get_y()
        pdf.image(str(tmp), x=x, y=y, w=w_mm, h=h_mm)
        pdf.set_y(y + h_mm + 2)
        if caption:
            pdf.reset_x()
            pdf.set_font('Malgun', '', 9)
            pdf.set_text_color(100, 116, 139)
            pdf.multi_cell(0, 5, caption, align='C')
            pdf.ln(2)
    finally:
        if tmp.exists():
            tmp.unlink(missing_ok=True)


def collect_screenshots(folder: Path | None) -> list[tuple[str, Path]]:
    if folder is None or not folder.is_dir():
        return []
    labels = {
        'login': '로그인 — SNS(네이버·구글·카카오) 회원가입·로그인',
        'home': '홈 — 오늘 섭취·목표 요약',
        'log': '기록 — 끼니별 음식 기록',
        'stats': '통계 — 일·주·월 영양·칼로리',
        'settings': '설정 — 프로필·알림·약관',
        'onboard': '온보딩 — 신체 정보 입력·권장량 계산',
    }
    items: list[tuple[str, Path]] = []
    for path in sorted(folder.glob('*')):
        if path.suffix.lower() not in {'.png', '.jpg', '.jpeg', '.webp'}:
            continue
        key = next((k for k in labels if k in path.stem.lower()), None)
        caption = labels.get(key, path.stem) if key else path.stem
        items.append((caption, path))
    return items


def build_pdf(out_path: Path, screenshot_dir: Path | None) -> None:
    if not FONT_REG.exists() or not FONT_BOLD.exists():
        raise FileNotFoundError('맑은 고딕 폰트(malgun.ttf)를 찾을 수 없습니다.')

    pdf = IntroPDF()
    out_path.parent.mkdir(parents=True, exist_ok=True)

    # Page 1 — cover
    pdf.add_page()
    if ICON.exists():
        add_image_fit_width(pdf, ICON, max_w_mm=28)
    pdf.ln(2)
    pdf.heading('nouryLog 서비스 소개')
    pdf.body('네이버 로그인 사전 검수 제출용 · Android 모바일 앱')
    pdf.ln(3)
    pdf.subheading('서비스 개요')
    pdf.bullet('서비스명: nouryLog')
    pdf.bullet('서비스 유형: Android 모바일 앱 (건강·식단·영양 관리)')
    pdf.bullet('패키지명: com.nourylog.app')
    pdf.bullet('한 줄 소개: 음식 섭취 기록, 영양 통계, 맞춤 권장량을 제공하는 식단 관리 앱')
    pdf.ln(2)
    pdf.subheading('대상 이용자')
    pdf.body('일상 식단·칼로리·영양소를 기록하고 목표 대비 현황을 확인하려는 개인 사용자.')
    pdf.ln(1)
    pdf.subheading('제공하지 않는 서비스')
    pdf.bullet('전자상거래, 예약·청약, 매매, 결제형 쇼핑몰 서비스 아님')
    pdf.bullet('게시판·댓글 중심의 커뮤니티 플랫폼 아님')
    pdf.ln(1)
    pdf.subheading('네이버 로그인 적용 범위')
    pdf.bullet('앱 최초 진입 시 신규 회원가입 및 로그인 (SNS 전용)')
    pdf.bullet('네이버·구글·카카오 중 선택하여 가입·로그인')

    # Page 2 — features
    pdf.add_page()
    pdf.heading('주요 기능 (메뉴별)')
    pdf.ln(1)
    features = [
        ('로그인', 'SNS(네이버·구글·카카오)로 회원가입·로그인. 이메일 단독 가입 화면 없음.'),
        ('홈', '오늘 섭취 칼로리·단백질·탄수화물·지방과 목표 대비 달성률을 한눈에 표시.'),
        ('기록', '아침·점심·저녁·간식 등 끼니별 음식 기록. 사진·OCR·수동 입력으로 영양 정보 저장.'),
        ('통계', '일·주·월 단위 섭취·영양 통계 조회 및 추이 확인.'),
        ('설정', '프로필(신장·체중·활동량), 알림, 테마, 이용약관·개인정보, 공지·문의.'),
        ('온보딩', '신규 가입 후 성별·나이·신장·체중 등 입력 → 맞춤 칼로리·영양 권장량 계산.'),
    ]
    for title, desc in features:
        pdf.subheading(title)
        pdf.body(desc)
        pdf.ln(1)

    pdf.subheading('신규 이용자 흐름')
    flow = (
        '1) 앱 실행 → 로그인 화면\n'
        '2) 네이버 로그인 선택 → 네이버 인증·정보 제공 동의\n'
        '3) 앱 필수 약관 동의 (만 14세, 이용약관, 개인정보)\n'
        '4) (신규) 프로필 온보딩 입력\n'
        '5) 홈 화면에서 식단 기록·통계 이용'
    )
    pdf.body(flow)

    # Page 3 — visuals
    pdf.add_page()
    pdf.heading('서비스 화면')
    pdf.body('nouryLog는 웹 URL이 아닌 Android 앱으로 제공됩니다. 아래는 실제 서비스 UI입니다.')
    pdf.ln(2)
    if FEATURE.exists():
        add_image_fit_width(
            pdf,
            FEATURE,
            max_w_mm=175,
            caption='nouryLog 홈 화면 — 오늘의 식단·목표 달성·하단 탭(홈/기록/통계/설정)',
        )

    extra = collect_screenshots(screenshot_dir)
    for caption, path in extra[:4]:
        add_image_fit_width(pdf, path, max_w_mm=70, caption=caption)

    # Page 4 — legal & access
    pdf.add_page()
    pdf.heading('공개 정책 및 접근 정보')
    pdf.ln(1)
    pdf.subheading('공개 URL (웹에서 확인 가능)')
    pdf.url_line('이용약관', TERMS_URL)
    pdf.url_line('개인정보처리방침', PRIVACY_URL)
    pdf.ln(2)
    pdf.subheading('앱 배포')
    pdf.body(
        '본 서비스는 Google Play를 통해 Android 앱(com.nourylog.app)으로 배포·운영됩니다. '
        '웹 브라우저 단독 서비스 URL은 없으며, 본 PDF와 첨부 캡처로 서비스 콘텐츠를 확인해 주시기 바랍니다.'
    )
    pdf.ln(2)
    pdf.subheading('개인정보 처리 (네이버 로그인)')
    pdf.bullet('네이버로부터 수신: 이용자 식별자, 이메일 주소 (로그인·회원 식별 목적)')
    pdf.bullet('서비스 내 저장: 식단 기록, 프로필(신장·체중 등), 통계 데이터')
    pdf.ln(2)
    pdf.subheading('검수 관련 안내')
    pdf.body(
        '네이버 로그인 이용 절차(버튼 클릭 → 네이버 동의 → 앱 약관 → 홈) 상세 캡처는 '
        '별도 첨부 파일(naver-login-flow)로 제출합니다.'
    )

    pdf.output(str(out_path))


def main() -> None:
    parser = argparse.ArgumentParser(description='nouryLog 네이버 검수용 서비스 소개 PDF')
    parser.add_argument(
        '-o',
        '--output',
        type=Path,
        default=DEFAULT_OUT,
        help=f'출력 PDF 경로 (기본: {DEFAULT_OUT})',
    )
    parser.add_argument(
        '-s',
        '--screenshots',
        type=Path,
        default=None,
        help='추가 앱 캡처 폴더 (파일명에 login/home/log/stats/settings/onboard 포함 권장)',
    )
    args = parser.parse_args()
    build_pdf(args.output, args.screenshots)
    size_kb = args.output.stat().st_size / 1024
    print(f'saved: {args.output} ({size_kb:.1f} KB)')


if __name__ == '__main__':
    main()
