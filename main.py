import os
import shutil
import json
import time
from typing import List
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse, RedirectResponse
import httpx
from pathlib import Path

app = FastAPI(title="Church Bazaar Mobile Journal")

# Path Prefix setup - default to /voguem if DEFAULT_PREFIX is not set
# Normalize so that prefix always starts with '/' and does not end with '/'
PREFIX = os.getenv("DEFAULT_PREFIX", "/voguem").strip()
if not PREFIX.startswith("/"):
    PREFIX = "/" + PREFIX
PREFIX = PREFIX.rstrip("/")

# Environment variable for dynamic data directory, default to 'data'
DATA_DIR = Path(os.getenv("DATA_DIR", "./data")).resolve()
ASSETS_DIR = Path("./assets").resolve()
STATIC_DIR = Path("./static").resolve()

# Keycloak Session Verification Endpoint using the new domain holyseeds.thewayworks.net
AUTH_VERIFY_URL = "https://holyseeds.thewayworks.net/auth/api/verify-session"

async def verify_admin_session(auth_session: str) -> bool:
    """Validate user credentials and check for manager status using Keycloak API Proxy."""
    if not auth_session:
        return False
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                AUTH_VERIFY_URL,
                params={"session_id": auth_session},
                timeout=4.0
            )
            if response.status_code == 200:
                result = response.json()
                return result.get("valid") is True and result.get("is_manager") is True
    except Exception as e:
        print(f"[Auth Error] Failed to verify Keycloak session: {e}")
    return False

# Create data directory if it doesn't exist
DATA_DIR.mkdir(parents=True, exist_ok=True)

def initialize_sample_data():
    """Populate sample cards if the data directory is completely empty."""
    # Check if there are any existing subdirectories starting with 'card_'
    existing_cards = [d for d in DATA_DIR.iterdir() if d.is_dir() and d.name.startswith("card_")]
    if existing_cards:
        return

    print("Initializing sample cards from assets...")
    
    # Define sample data matching images in assets folder
    samples = [
        {
            "id": "card_1_sample_bazaar",
            "title": "👼 제13회 홀리씨즈 교회 천사데이 찬스 바자회",
            "description": "거룩한 씨앗들이 함께 모여 예수님의 사랑을 실천하는 '천사데이 찬스 바자회'에 성도님들과 지역 주민들을 초대합니다!\n\n수익금 전액은 소외된 이웃을 위한 연탄 및 쌀 나눔, 소년소녀 가장 장학금 지원, 그리고 해외 선교 후원금으로 투명하게 사용됩니다. 기쁨 가득한 축제의 자리에 함께해 주세요. 🌱\n\n📅 일시: 2026년 10월 4일 (일) 오전 9시 ~ 오후 5시\n📍 장소: 홀리씨즈 교회 앞뜰 및 SDC 교육관 광장",
            "images": ["001.webp"]
        },
        {
            "id": "card_2_sample_food",
            "title": "🍲 천사데이 '찬스 푸드 부스' 맛있는 먹거리 안내",
            "description": "축제에 빠질 수 없는 최고의 즐거움! 여전도회와 청년부에서 정성껏 마련한 '찬스 푸드존'입니다.\n\n🍢 풍성한 먹거리 메뉴:\n- 청년부의 시그니처 수제 핫도그 & 닭꼬치\n- 여전도회 표 명품 어묵탕, 매콤달콤 떡볶이 & 순대\n- SDC 인터내셔널스쿨 학생들이 직접 내리는 고품격 핸드드립 커피와 스페셜 디저트 부스\n\n정직하고 깨끗한 재료로 맛과 영양을 가득 채웠습니다. 사랑하는 가족, 이웃들과 맛있는 교제를 나눠보세요!",
            "images": ["002.webp", "003.webp"]
        },
        {
            "id": "card_3_sample_market",
            "title": "🌱 사랑나눔 아나바다 장터 & 찬스 쇼핑",
            "description": "성도님들께서 정성껏 기증해 주신 양질의 의류, 도서, 신발, 잡화 및 가전제품들을 놀라운 가격에 가져가실 수 있는 기회입니다!\n\n👕 주요 물품 품목:\n- 깨끗하게 세탁 및 소독을 마친 성인/아동 의류 및 패션 잡화\n- 미개봉 새 상품 특별 코너 (화장품, 생활 잡화)\n- 주방 용품 및 소형 가전\n\n'아껴 쓰고, 나눠 쓰고, 받아 쓰고, 다시 쓰기' 운동에 동참하여 자원 순환도 실천하고, 따뜻한 기부도 경험해 보세요.\n\n📍 위치: SDC 교육관 1층 메인 홀",
            "images": ["004.webp", "005.webp", "006.webp"]
        },
        {
            "id": "card_4_sample_events",
            "title": "🎁 천사데이 특별 경품 이벤트 & 문화 체험 부스",
            "description": "아이들부터 어르신들까지 모두가 행복한 추억을 만들 수 있는 다채로운 문화 부스가 준비되어 있습니다.\n\n🎈 스페셜 프로그램:\n- 어린이들을 위한 페이스 페인팅 및 풍선 아트 부스\n- 캘리그라피로 가훈 및 성경 말씀 카드 적어드리기\n- 오후 4시: SDC 청소년 오케스트라의 찬양 & 클래식 미니 콘서트\n- 바자회의 대미를 장식할 '천사 추첨 경품 행사'\n\n🎟️ 경품 응모권은 입구 안내소 및 각 부스에서 장당 1,000원에 후원 구매 가능합니다. 기부의 천사도 되시고 기분 좋은 행운도 잡아보세요!",
            "images": ["007.webp", "008.webp", "009.webp", "006-2.webp"]
        }
    ]

    for index, sample in enumerate(samples):
        # We append a timestamp offset to ensure proper sorting (newest first)
        timestamp_id = int(time.time()) - (100 * (len(samples) - index))
        card_name = f"card_{timestamp_id}_{sample['id']}"
        card_path = DATA_DIR / card_name
        card_path.mkdir(exist_ok=True)

        # Write info.json
        info_content = {
            "title": sample["title"],
            "description": sample["description"]
        }
        with open(card_path / "info.json", "w", encoding="utf-8") as f:
            json.dump(info_content, f, ensure_ascii=False, indent=2)

        # Copy images
        for idx, img_filename in enumerate(sample["images"]):
            source_img = ASSETS_DIR / img_filename
            if source_img.exists():
                dest_img = card_path / f"image_{idx}{source_img.suffix}"
                shutil.copy2(source_img, dest_img)
            else:
                print(f"Warning: Sample image {source_img} not found.")

initialize_sample_data()

# Serve API Endpoints
@app.get(f"{PREFIX}/api/cards")
def get_cards():
    """Fetch all cards sorted by timestamp folder name descending (newest first)."""
    cards = []
    
    if not DATA_DIR.exists():
        return cards

    # List all subdirectories inside DATA_DIR that start with 'card_'
    card_dirs = [d for d in DATA_DIR.iterdir() if d.is_dir() and d.name.startswith("card_")]
    
    # Sort card directories by name descending to get newest first
    # Name format: card_<timestamp>_<id>
    card_dirs.sort(key=lambda d: d.name, reverse=True)

    for d in card_dirs:
        info_file = d / "info.json"
        if not info_file.exists():
            continue
            
        try:
            with open(info_file, "r", encoding="utf-8") as f:
                info = json.load(f)
        except Exception as e:
            print(f"Error reading {info_file}: {e}")
            continue

        # Collect image URLs
        # Gather all image files inside the directory, sorted by filename
        valid_extensions = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
        image_files = sorted(
            [f for f in d.iterdir() if f.is_file() and f.suffix.lower() in valid_extensions],
            key=lambda f: f.name
        )
        
        images = [f"{PREFIX}/data/{d.name}/{img.name}" for img in image_files]

        cards.append({
            "id": d.name,
            "title": info.get("title", ""),
            "description": info.get("description", ""),
            "images": images,
            "created_at": d.name.split("_")[1] if len(d.name.split("_")) > 1 else str(int(time.time()))
        })

    return cards

@app.get(f"{PREFIX}/api/status")
@app.get(f"/{PREFIX}/api/status") # double slash fallback in case of //voguem/api/status
def get_status():
    """Health check endpoint for container lifecycle monitoring."""
    return {"status": "ok"}

@app.get(f"{PREFIX}/api/auth/status")
async def get_auth_status(request: Request):
    """Check the client's cookie and return their admin authentication status."""
    auth_session = request.cookies.get("auth_session")
    is_admin = await verify_admin_session(auth_session)
    return {"is_admin": is_admin}

@app.post(f"{PREFIX}/api/cards")
async def create_card(
    request: Request,
    title: str = Form(...),
    description: str = Form(...),
    images: List[UploadFile] = File(...)
):
    """Create a new card directory containing info.json and uploaded images (up to 4)."""
    # Keycloak auth check
    auth_session = request.cookies.get("auth_session")
    if not await verify_admin_session(auth_session):
        raise HTTPException(status_code=401, detail="관리자 권한이 없거나 세션이 만료되었습니다.")

    # Validation
    if not title.strip():
        raise HTTPException(status_code=400, detail="Title cannot be empty.")
    if not description.strip():
        raise HTTPException(status_code=400, detail="Description cannot be empty.")
    if not images or len(images) == 0:
        raise HTTPException(status_code=400, detail="At least one image is required.")
    if len(images) > 4:
        raise HTTPException(status_code=400, detail="You can upload up to 4 images only.")

    # Validate file types
    valid_mime_types = {"image/jpeg", "image/png", "image/webp", "image/gif"}
    for img in images:
        if img.content_type not in valid_mime_types:
            raise HTTPException(status_code=400, detail=f"Invalid file type: {img.filename}. Only JPEG, PNG, WEBP, and GIF are allowed.")

    # Create directory name with timestamp
    timestamp = int(time.time() * 1000) # millisecond timestamp
    card_name = f"card_{timestamp}"
    card_path = DATA_DIR / card_name
    card_path.mkdir(parents=True, exist_ok=True)

    try:
        # Save info.json
        info_content = {
            "title": title.strip(),
            "description": description.strip()
        }
        with open(card_path / "info.json", "w", encoding="utf-8") as f:
            json.dump(info_content, f, ensure_ascii=False, indent=2)

        # Save images
        for idx, img in enumerate(images):
            # Clean extension
            suffix = Path(img.filename).suffix.lower()
            if not suffix:
                # Default to .jpg if suffix is missing
                suffix = ".jpg"
            
            dest_filename = f"image_{idx}{suffix}"
            dest_file_path = card_path / dest_filename
            
            with open(dest_file_path, "wb") as buffer:
                shutil.copyfileobj(img.file, buffer)

        return {"status": "success", "message": "Card created successfully", "card_id": card_name}
    except Exception as e:
        # Clean up directory on failure
        if card_path.exists():
            shutil.rmtree(card_path)
        raise HTTPException(status_code=500, detail=f"Failed to create card: {str(e)}")

@app.delete(f"{PREFIX}/api/cards/{{card_id}}")
async def delete_card(request: Request, card_id: str):
    """Delete a card directory by card_id."""
    # Keycloak auth check
    auth_session = request.cookies.get("auth_session")
    if not await verify_admin_session(auth_session):
        raise HTTPException(status_code=401, detail="관리자 권한이 없거나 세션이 만료되었습니다.")

    card_path = DATA_DIR / card_id
    
    # Simple security/safety check to avoid directory traversal
    if card_id == ".." or "/" in card_id or "\\" in card_id:
        raise HTTPException(status_code=400, detail="Invalid card ID format.")

    if not card_path.exists() or not card_path.is_dir():
        raise HTTPException(status_code=404, detail="Card not found.")

    try:
        shutil.rmtree(card_path)
        return {"status": "success", "message": f"Card {card_id} deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete card: {str(e)}")

# Mount the static files and user uploads under the prefix path
if DATA_DIR.exists():
    app.mount(f"{PREFIX}/data", StaticFiles(directory=str(DATA_DIR)), name="data")

# Fallback index.html route under the trailing-slash prefix (e.g. /voguem/)
@app.get(f"{PREFIX}/")
def read_root():
    index_file = STATIC_DIR / "index.html"
    if index_file.exists():
        return FileResponse(index_file)
    return JSONResponse(status_code=404, content={"message": "Frontend index.html not found. Please implement it."})

# Force redirect from bare PREFIX (e.g. /voguem) to trailing-slash PREFIX/ (e.g. /voguem/)
# to ensure the browser updates its relative path context and loads assets correctly.
if PREFIX and PREFIX != "/":
    @app.get(PREFIX)
    def redirect_bare_prefix_to_trailing_slash():
        return RedirectResponse(url=f"{PREFIX}/", status_code=303)

    # Automatic redirect from root / to the PREFIX/ directory
    @app.get("/")
    def redirect_to_prefix():
        return RedirectResponse(url=f"{PREFIX}/", status_code=303)

# Create empty static directory if it doesn't exist
STATIC_DIR.mkdir(parents=True, exist_ok=True)
app.mount(f"{PREFIX}/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=5000, reload=True)
