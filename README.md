# 💒 소망교회 사랑나눔 모바일 저널 (Church Bazaar Mobile Journal)

교회 바자회 행사 홍보 미디어를 카드 뉴스 형태로 저장하고 보여주는 **모바일 최적화 웹 애플리케이션**입니다.  
데이터베이스(DB) 없이 파일 시스템 디렉토리 구조를 카드 데이터로 활용하며, 도커(Docker) 컨테이너 구동 시 외부 환경변수 지정 및 볼륨 매핑을 통해 데이터를 외부에 영구 보존할 수 있습니다.

---

## ✨ 주요 기능 (Key Features)

1. **📱 모바일 맞춤형 스크롤 스냅 UX (Scroll-Snap Feed)**
   - 화면에 카드 1장씩 딱 맞게 세로로 넘겨볼 수 있는 모바일 최적화 레이아웃(TikTok/Reels 스타일)을 지원합니다.
   - 데스크톱 화면에서는 세련된 모바일 목업 프레임 내에 렌더링되어 최적의 비율을 유지합니다.

2. **📐 반응형 다이내믹 이미지 그리드 (Adaptive Image Grid)**
   - 각 카드 내 업로드된 이미지 개수(최대 4개)에 따라 레이아웃이 자동 조정됩니다.
     - **1장**: 가득 찬 단일 이미지 레이아웃
     - **2장**: 좌우 2분할 대칭 레이아웃
     - **3장**: 상단 메인 이미지 + 하단 2분할 서브 이미지 레이아웃
     - **4장**: 2x2 균등 4분할 바둑판 레이아웃

3. **🔍 풀스크린 터치 스와이프 라이트박스 (Multi-Image Lightbox)**
   - 이미지를 탭하면 화면 전체 크기 뷰어로 확대됩니다.
   - 모바일 사용자를 위해 **좌우 스와이프(드래그) 터치 제스처**, 이전/다음 네비게이션 화살표, ESC 닫기를 모두 지원합니다.

4. **🛠️ 데이터베이스 없는 영구 저장 (DB-less File-based Storage)**
   - 별도의 DB 연동 없이, 지정된 데이터 디렉토리(`DATA_DIR`) 내 하위 폴더 하나가 카드 1장의 정보가 됩니다.
   - 각 폴더 내에는 제목과 설명이 담긴 `info.json` 파일과 최대 4장의 이미지 파일이 들어갑니다.

5. **⚙️ 직관적인 관리자 대시보드 (Admin Control Panel)**
   - 우측 하단 플로팅 버튼(FAB)을 누르면 미려한 유리 질감의 대시보드가 열립니다.
   - **새 카드 등록 탭**: 사진 드래그&드롭/파일 선택(미리보기 제공 및 개별 취소 가능), 제목, 상세 정보를 적어 즉시 등록합니다.
   - **카드 관리 및 삭제 탭**: 등록된 카드의 목록을 보며 원치 않는 카드를 즉시 휴지통 버튼으로 안전하게 지울 수 있습니다.

6. **🚀 편리한 샘플 데이터 자동 초기화 (Automatic Sample Seeding)**
   - 앱을 처음 실행할 때 데이터 폴더(`data/`)가 비어 있는 경우, `assets/` 디렉토리에 있는 고품질 샘플 이미지를 읽어와 4가지 다양한 유형의 예시 카드를 자동으로 생성합니다.

---

## 🛠️ 기술 스택 (Tech Stack)

- **Backend:** Python 3.11 + FastAPI (Uvicorn 서빙)
- **Frontend:** Vanilla HTML5, CSS3 (Vanilla Style, No Tailwind), JavaScript (ES6+)
- **Icons:** FontAwesome 6 (CDN)
- **Fonts:** Noto Sans KR, Playfair Display (Google Fonts)

---

## 🚀 로컬 실행 방법 (Local Setup)

### 1. 가상환경 세팅 및 의존성 설치
```bash
# 가상환경 생성 (선택 사항)
python -m venv venv
source venv/Scripts/activate # Windows
source venv/bin/activate     # macOS/Linux

# 필수 패키지 설치
pip install -r requirements.txt
```

### 2. 애플리케이션 시작
```bash
python main.py
```
서버가 기동되면 웹 브라우저에서 `http://localhost:8000`으로 접속할 수 있습니다.

---

## 🐳 도커 실행 및 외부 저장 장치 활용 방법 (Docker Deployment)

본 애플리케이션은 **데이터 저장 환경변수(`DATA_DIR`)**를 인지하여 외부 마운트 스토리지를 적극 활용할 수 있도록 빌드되었습니다.

### 1. Docker Compose를 통한 간단 실행 (권장)
프로젝트 루트 폴더에 포함된 `docker-compose.yml`을 이용하면 로컬의 `./data` 디렉토리가 도커 내 파일 저장소와 자동으로 매핑되어 컨테이너가 교체되거나 삭제되어도 카드가 완벽히 보존됩니다.

```bash
docker-compose up --build -d
```

### 2. Docker CLI 명령어로 실행하는 경우
특정 외부 호스트 경로(예: `/host/bazaar_data`)를 카드 저장소로 지정하고 컨테이너를 실행할 수 있습니다.

```bash
# 1. 이미지 빌드
docker build -t church-bazaar-journal .

# 2. 볼륨 매핑 및 환경변수를 주입하여 컨테이너 실행
docker run -d \
  -p 8000:8000 \
  -e DATA_DIR="/app/data" \
  -v "/host/bazaar_data:/app/data" \
  --name bazaar-app \
  church-bazaar-journal
```
- `-e DATA_DIR="/app/data"`: 컨테이너 내부의 데이터 저장 디렉토리 경로 지정 (기본값 `/app/data`)
- `-v "/host/bazaar_data:/app/data"`: 호스트의 실제 물리적 경로와 매핑하여 파일 영구 지속 보존

---

## 📁 디렉토리 저장소 설계 세부 규칙

`DATA_DIR` 아래에는 생성된 저널 카드가 폴더 단위로 저장됩니다:

```text
data/
└── card_1757422200000/           # card_<업로드타임스탬프_밀리초> 형태의 폴더 생성
    ├── info.json                 # 제목(title)과 설명(description)이 담긴 UTF-8 텍스트 파일
    ├── image_0.webp              # 업로드된 이미지 1 (원본 포맷 유지 또는 자동 확장자 할당)
    └── image_1.png               # 업로드된 이미지 2 (최대 4개)
```

`info.json` 파일의 규격은 다음과 같이 심플하고 직관적입니다:
```json
{
  "title": "저널 카드 제목",
  "description": "상세한 바자회 행사 안내 글 내용..."
}
```
게시글의 렌더링 순서는 폴더명 타임스탬프 값을 기준으로 정렬되어 최신 글이 항상 최상단(가장 먼저 읽는 화면)에 배치됩니다.
