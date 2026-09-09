document.addEventListener('DOMContentLoaded', () => {
    // Dynamically calculate prefix from current pathname (e.g. "/voguem" or "/voguem/")
    const path = window.location.pathname;
    const prefix = (path.endsWith('/') ? path.slice(0, -1) : path) || '';

    // API Endpoints using dynamic prefix
    const CARDS_API = `${prefix}/api/cards`;
    const AUTH_STATUS_API = `${prefix}/api/auth/status`;

    // State Variables
    let currentCards = [];
    let activeLightboxImages = [];
    let currentLightboxIndex = 0;
    let selectedFiles = []; // Keeps track of files uploaded via file input
    let isAdmin = false; // Admin status state

    // DOM Elements
    const feedContainer = document.getElementById('feed-container');
    const adminFab = document.getElementById('admin-fab');
    const adminModal = document.getElementById('admin-modal');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const cardUploadForm = document.getElementById('card-upload-form');
    const imageInput = document.getElementById('image-input');
    const previewContainer = document.getElementById('image-preview-container');
    const submitBtn = document.getElementById('submit-btn');
    const adminCardList = document.getElementById('admin-card-list');
    const adminIndicator = document.getElementById('admin-indicator');

    // Tab Buttons
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');

    // Lightbox Elements
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    const lightboxClose = document.getElementById('lightbox-close');
    const lightboxPrev = document.getElementById('lightbox-prev');
    const lightboxNext = document.getElementById('lightbox-next');
    const lightboxCounter = document.getElementById('lightbox-counter');

    /* ==========================================
       Card Loading & Rendering
       ========================================== */
    async function loadCards() {
        try {
            // Show loading state
            feedContainer.innerHTML = `
                <div class="loading-state">
                    <div class="spinner"></div>
                    <p>저널을 불러오는 중입니다...</p>
                </div>
            `;

            const response = await fetch(CARDS_API);
            if (!response.ok) throw new Error('데이터 로드 실패');
            
            currentCards = await response.ok ? await response.json() : [];
            renderCards(currentCards);
            renderAdminCardList(currentCards);
        } catch (error) {
            console.error('Error fetching cards:', error);
            feedContainer.innerHTML = `
                <div class="loading-state">
                    <i class="fa-solid fa-triangle-exclamation" style="font-size: 40px; color: #e53e3e;"></i>
                    <p>저널 카드를 불러오는 데 실패했습니다.</p>
                    <button class="btn btn-primary" onclick="location.reload()" style="width: auto; padding: 8px 16px; margin-top: 10px;">다시 시도</button>
                </div>
            `;
        }
    }

    function renderCards(cards) {
        if (!cards || cards.length === 0) {
            feedContainer.innerHTML = `
                <div class="loading-state">
                    <i class="fa-solid fa-folder-open" style="font-size: 40px; color: #a0aec0;"></i>
                    <p>등록된 모바일 저널 카드가 없습니다.</p>
                    <p style="font-size: 11px; color: #718096; margin-top: -10px;">관리자 대시보드에서 첫 카드를 추가해주세요!</p>
                </div>
            `;
            return;
        }

        feedContainer.innerHTML = ''; // Clear feed

        cards.forEach((card, cardIdx) => {
            const cardEl = document.createElement('section');
            cardEl.className = 'journal-card';
            cardEl.id = `card-view-${card.id}`;

            // Set cinematic blurred background from first image, or default gradient
            const blurredBg = card.images && card.images.length > 0 
                ? `<div class="card-bg-blur" style="background-image: url('${card.images[0]}');"></div>`
                : `<div class="card-bg-blur" style="background: linear-gradient(135deg, #2c3e50, #000000);"></div>`;

            // Prepare dynamic Grid based on image count
            const imgCount = card.images.length;
            let gridHtml = '';
            
            if (imgCount > 0) {
                gridHtml = `<div class="card-grid grid-${imgCount}">`;
                card.images.forEach((imgUrl, imgIdx) => {
                    gridHtml += `
                        <div class="img-item" data-card-idx="${cardIdx}" data-img-idx="${imgIdx}">
                            <img src="${imgUrl}" alt="${card.title} 이미지 ${imgIdx + 1}" loading="lazy">
                        </div>
                    `;
                });
                gridHtml += '</div>';
            }

            // Assemble Full Card DOM
            cardEl.innerHTML = `
                ${blurredBg}
                <div class="card-content">
                    <div class="card-header">
                        <h2 class="card-title">${escapeHTML(card.title)}</h2>
                    </div>
                    <div class="card-image-section">
                        ${gridHtml}
                    </div>
                    <div class="card-description-section">
                        <p class="card-desc">${escapeHTML(card.description)}</p>
                    </div>
                </div>
            `;

            // Attach click event listeners to images for lightbox
            cardEl.querySelectorAll('.img-item').forEach(item => {
                item.addEventListener('click', () => {
                    const cIdx = parseInt(item.getAttribute('data-card-idx'));
                    const iIdx = parseInt(item.getAttribute('data-img-idx'));
                    openLightbox(cIdx, iIdx);
                });
            });

            feedContainer.appendChild(cardEl);
        });
    }

    /* ==========================================
       Admin Management List (Tab 2)
       ========================================== */
    function renderAdminCardList(cards) {
        if (!cards || cards.length === 0) {
            adminCardList.innerHTML = '<li class="empty-list-msg">등록된 카드가 없습니다.</li>';
            return;
        }

        adminCardList.innerHTML = '';
        cards.forEach(card => {
            const li = document.createElement('li');
            li.className = 'admin-card-item';
            
            // Set thumbnail using first image, or a folder icon if empty
            const thumbnailSrc = card.images && card.images.length > 0 ? card.images[0] : '';
            const thumbnailHtml = thumbnailSrc 
                ? `<img src="${thumbnailSrc}" alt="섬네일">`
                : `<div style="width: 44px; height: 44px; background: #e2e8f0; border-radius: 8px; display: flex; justify-content: center; align-items: center; color: #a0aec0;"><i class="fa-solid fa-image"></i></div>`;

            li.innerHTML = `
                ${thumbnailHtml}
                <div class="admin-card-info">
                    <h3>${escapeHTML(card.title)}</h3>
                    <p><i class="fa-solid fa-images"></i> 사진 ${card.images.length}장</p>
                </div>
                <button class="delete-item-btn" data-id="${card.id}" title="삭제">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
            `;

            // Attach delete click handler
            li.querySelector('.delete-item-btn').addEventListener('click', async (e) => {
                const cardId = e.currentTarget.getAttribute('data-id');
                if (confirm('정말로 이 카드를 삭제하시겠습니까?\n삭제된 저널은 복구할 수 없습니다.')) {
                    await deleteCard(cardId);
                }
            });

            adminCardList.appendChild(li);
        });
    }

    async function deleteCard(cardId) {
        try {
            const response = await fetch(`${CARDS_API}/${cardId}`, {
                method: 'DELETE'
            });

            const result = await response.json();
            if (response.ok && result.status === 'success') {
                alert('카드가 성공적으로 삭제되었습니다.');
                await loadCards(); // Reload cards
            } else {
                throw new Error(result.detail || '삭제 실패');
            }
        } catch (error) {
            console.error('Error deleting card:', error);
            alert(`카드 삭제 실패: ${error.message}`);
        }
    }

    /* ==========================================
       Admin Tabs Controller
       ========================================== */
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.getAttribute('data-tab');
            
            // Toggle Button States
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Toggle Content Panes
            tabPanes.forEach(pane => {
                if (pane.id === targetTab) {
                    pane.classList.add('active');
                } else {
                    pane.classList.remove('active');
                }
            });
        });
    });

    /* ==========================================
       Image Multi-Upload & Preview Controller
       ========================================== */
    imageInput.addEventListener('change', (e) => {
        const files = Array.from(e.target.files);
        
        // Prevent total count from exceeding 4 files
        if (selectedFiles.length + files.length > 4) {
            alert('사진은 최대 4장까지만 등록할 수 있습니다.');
            imageInput.value = ''; // Reset file input
            return;
        }

        // Add verified files
        files.forEach(file => {
            // Check file type
            if (!file.type.startsWith('image/')) {
                alert(`${file.name}은(는) 이미지 파일이 아닙니다.`);
                return;
            }
            selectedFiles.push(file);
        });

        renderPreviews();
        imageInput.value = ''; // Reset input to allow re-uploading same named file
    });

    function renderPreviews() {
        previewContainer.innerHTML = '';
        
        selectedFiles.forEach((file, idx) => {
            const reader = new FileReader();
            const previewItem = document.createElement('div');
            previewItem.className = 'preview-item';
            
            reader.onload = (e) => {
                previewItem.innerHTML = `
                    <img src="${e.target.result}" alt="업로드 이미지 ${idx + 1}">
                    <button class="remove-btn" type="button" data-idx="${idx}">&times;</button>
                `;

                // Wire up remove click event
                previewItem.querySelector('.remove-btn').addEventListener('click', (event) => {
                    const removeIdx = parseInt(event.target.getAttribute('data-idx'));
                    selectedFiles.splice(removeIdx, 1);
                    renderPreviews();
                });
            };
            
            reader.readAsDataURL(file);
            previewContainer.appendChild(previewItem);
        });
    }

    /* ==========================================
       New Card Form Submission
       ========================================== */
    cardUploadForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const title = document.getElementById('title-input').value.trim();
        const description = document.getElementById('desc-input').value.trim();

        if (!title || !description) {
            alert('제목과 설명을 모두 입력해 주세요.');
            return;
        }

        if (selectedFiles.length === 0) {
            alert('적어도 한 장 이상의 사진을 첨부해 주세요.');
            return;
        }

        // Build Multipart Form Data
        const formData = new FormData();
        formData.append('title', title);
        formData.append('description', description);
        
        selectedFiles.forEach(file => {
            formData.append('images', file);
        });

        try {
            // Disable submit button and show loading indicator
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> 카드 올리는 중...';

            const response = await fetch(CARDS_API, {
                method: 'POST',
                body: formData
            });

            const result = await response.json();
            
            if (response.ok && result.status === 'success') {
                alert('사랑나눔 저널 카드가 무사히 등록되었습니다!');
                
                // Reset Form state
                cardUploadForm.reset();
                selectedFiles = [];
                renderPreviews();
                
                // Close Dashboard
                closeAdminModal();
                
                // Reload feed
                await loadCards();
            } else {
                throw new Error(result.detail || '등록 실패');
            }
        } catch (error) {
            console.error('Error uploading card:', error);
            alert(`카드 등록에 실패했습니다: ${error.message}`);
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> 저널 카드 등록하기';
        }
    });

    /* ==========================================
       Admin Modal (Dashboard) Actions & Authentication
       ========================================== */
    async function checkAuthStatus() {
        try {
            const response = await fetch(AUTH_STATUS_API);
            const data = await response.json();
            isAdmin = data.is_admin;
            updateUIForAuth(isAdmin);
        } catch (error) {
            console.error('Failed to verify session status:', error);
            isAdmin = false;
            updateUIForAuth(false);
        }
    }

    function updateUIForAuth(is_admin) {
        if (is_admin) {
            adminIndicator.innerHTML = '<i class="fa-solid fa-user-gear"></i> 관리자 모드';
            adminIndicator.className = 'admin-badge mode-admin';
            adminFab.innerHTML = '<i class="fa-solid fa-sliders"></i>';
            adminFab.title = "관리자 대시보드 열기";
        } else {
            adminIndicator.innerHTML = '<i class="fa-solid fa-book-open"></i> 독자 모드';
            adminIndicator.className = 'admin-badge mode-reader';
            adminFab.innerHTML = '<i class="fa-solid fa-user-lock"></i>';
            adminFab.title = "관리자 로그인";
        }
    }

    adminFab.addEventListener('click', () => {
        if (isAdmin) {
            openAdminModal();
        } else {
            // Reader Mode (독자 모드) -> Redirect to Keycloak authorization with callback on holyseeds.thewayworks.net
            if (confirm("관리자 모드로 전환하기 위해 통합 로그인 페이지로 이동하시겠습니까?")) {
                const redirectUrl = encodeURIComponent(window.location.href);
                window.location.href = `https://holyseeds.thewayworks.net/auth/login?error=관리자+권한이+필요한+서비스입니다.&redirect=${redirectUrl}&require_role=manager`;
            }
        }
    });

    closeModalBtn.addEventListener('click', closeAdminModal);

    // Close on click outside modal content
    adminModal.addEventListener('click', (e) => {
        if (e.target === adminModal) {
            closeAdminModal();
        }
    });

    function openAdminModal() {
        if (!isAdmin) return;
        adminModal.classList.remove('hidden');
        document.body.style.overflow = 'hidden'; // Lock scrolling
    }

    function closeAdminModal() {
        adminModal.classList.add('hidden');
        document.body.style.overflow = ''; // Release scrolling
    }

    /* ==========================================
       Lightbox & Slide Management
       ========================================== */
    function openLightbox(cardIdx, imgIdx) {
        const card = currentCards[cardIdx];
        if (!card || !card.images || card.images.length === 0) return;

        activeLightboxImages = card.images;
        currentLightboxIndex = imgIdx;

        renderLightboxImage();
        lightbox.classList.remove('hidden');
    }

    function renderLightboxImage() {
        const imgUrl = activeLightboxImages[currentLightboxIndex];
        lightboxImg.src = imgUrl;

        // Update counter text
        lightboxCounter.textContent = `${currentLightboxIndex + 1} / ${activeLightboxImages.length}`;

        // Toggle navigation arrows visibility based on index limits
        lightboxPrev.style.visibility = currentLightboxIndex > 0 ? 'visible' : 'hidden';
        lightboxNext.style.visibility = currentLightboxIndex < activeLightboxImages.length - 1 ? 'visible' : 'hidden';
    }

    function showPrevImage() {
        if (currentLightboxIndex > 0) {
            currentLightboxIndex--;
            renderLightboxImage();
        }
    }

    function showNextImage() {
        if (currentLightboxIndex < activeLightboxImages.length - 1) {
            currentLightboxIndex++;
            renderLightboxImage();
        }
    }

    function closeLightbox() {
        lightbox.classList.add('hidden');
        lightboxImg.src = '';
        activeLightboxImages = [];
    }

    // Lightbox Control Buttons Click Handlers
    lightboxClose.addEventListener('click', closeLightbox);
    lightboxPrev.addEventListener('click', (e) => { e.stopPropagation(); showPrevImage(); });
    lightboxNext.addEventListener('click', (e) => { e.stopPropagation(); showNextImage(); });
    lightbox.addEventListener('click', closeLightbox);
    lightboxImg.addEventListener('click', (e) => e.stopPropagation()); // Prevent closing when clicking image itself

    // Keyboard navigation support
    document.addEventListener('keydown', (e) => {
        if (lightbox.classList.contains('hidden')) return;

        if (e.key === 'ArrowLeft') {
            showPrevImage();
        } else if (e.key === 'ArrowRight') {
            showNextImage();
        } else if (e.key === 'Escape') {
            closeLightbox();
        }
    });

    /* Touch Swipe Support for mobile viewing in Lightbox */
    let touchStartX = 0;
    let touchEndX = 0;

    lightbox.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    lightbox.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    }, { passive: true });

    function handleSwipe() {
        const swipeThreshold = 50; // Minimum distance to detect swipe
        if (touchEndX < touchStartX - swipeThreshold) {
            // Swiped Left -> Show next
            showNextImage();
        } else if (touchEndX > touchStartX + swipeThreshold) {
            // Swiped Right -> Show prev
            showPrevImage();
        }
    }

    /* ==========================================
       Utility Functions
       ========================================== */
    function escapeHTML(str) {
        if (!str) return '';
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    /* ==========================================
       Initialize Application
       ========================================== */
    checkAuthStatus();
    loadCards();
});
