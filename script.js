let homeworkPackages = [];
let currentQuestions = [];
let currentIndex = 0;
let currentHomeworkTitle = ""; 
let currentFilter = "all"; // 현재 선택된 필터 상태 저장
let searchQuery = "";
let searchRenderTimer;
let filteredHomeworkPackages = [];
let visibleHomeworkRange = "";
let scrollAnimationFrame;

const HOMEWORK_ROW_HEIGHT = 94;
const HOMEWORK_OVERSCAN = 6;

let selectedWords = [];
let availableWords = [];
let correctAnswerWords = [];

// DOM 요소
const homeView = document.getElementById('home-view');
const gameView = document.getElementById('game-view');
const completeView = document.getElementById('complete-view'); 
const homeworkList = document.getElementById('homework-list');
const progressText = document.getElementById('progress-text');
const koreanText = document.getElementById('korean-text');
const selectedArea = document.getElementById('selected-area');
const availableArea = document.getElementById('available-area');
const checkBtn = document.getElementById('check-btn');
const errorModal = document.getElementById('error-modal');
const correctAnswerDisplay = document.getElementById('correct-answer-text');
const emojiContainer = document.getElementById('emoji-container');
const typeFilter = document.getElementById('type-filter'); // 필터 요소 추가
const homeworkSearch = document.getElementById('homework-search');

// 이벤트 리스너
checkBtn.addEventListener('click', checkAnswer);
document.getElementById('retry-btn').addEventListener('click', retryQuestion);
document.getElementById('back-btn').addEventListener('click', showHomeView);
document.getElementById('go-home-btn').addEventListener('click', showHomeView);

// 필터 변경 이벤트 리스너 추가
typeFilter.addEventListener('change', (e) => {
    currentFilter = e.target.value;
    renderHomeList();
});

// 입력이 빠르게 이어질 때는 한 번만 목록을 갱신합니다.
homeworkSearch.addEventListener('input', (e) => {
    searchQuery = normalizeSearchText(e.target.value);
    clearTimeout(searchRenderTimer);
    searchRenderTimer = setTimeout(renderHomeList, 80);
});

homeworkList.addEventListener('scroll', scheduleVirtualListRender, { passive: true });
window.addEventListener('resize', scheduleVirtualListRender);

function normalizeSearchText(value) {
    return String(value || "")
        .normalize("NFC")
        .toLowerCase()
        .replace(/\s+/g, " ")
        .trim();
}

function createSearchText(pkg) {
    const questionText = (pkg.questions || [])
        .flatMap(question => [question.ko, question.en, ...(question.distractors || [])])
        .join(" ");

    return normalizeSearchText([pkg.title, pkg.type, pkg.date, questionText].join(" "));
}

async function initApp() {
    try {
        const response = await fetch('data.json');
        if (!response.ok) throw new Error('네트워크 응답 실패');
        
        const rawData = await response.json();
        
        // 🔥 데이터를 정렬하기 전에 순수 인덱스를 기반으로 고유 ID를 자동 할당합니다.
        homeworkPackages = rawData.map((pkg, idx) => {
            const packageWithId = {
                id: `hw-package-${idx}`,
                ...pkg
            };

            // 검색 때마다 전체 문장을 다시 조합하지 않도록 검색용 텍스트를 미리 생성합니다.
            packageWithId.searchText = createSearchText(packageWithId);
            return packageWithId;
        });

        homeworkPackages.sort((a, b) => new Date(b.date) - new Date(a.date));
        renderHomeList();
    } catch (error) {
        document.querySelector('.widget-header span').innerText = "오류 발생";
        homeworkList.innerHTML = "<p style='color:red; font-size:14px;'>데이터 로드에 실패했습니다.</p>";
    }
}

function renderHomeList() {
    homeworkList.innerHTML = "";
    const searchTerms = searchQuery ? searchQuery.split(" ") : [];
    
    // 필터 조건에 맞는 패키지만 선별
    filteredHomeworkPackages = homeworkPackages.filter(pkg => {
        const matchesType = currentFilter === "all" || pkg.type === currentFilter;
        const matchesSearch = searchTerms.every(term => pkg.searchText.includes(term));
        return matchesType && matchesSearch;
    });

    // ⚠️ 예외 처리: 해당 타입의 숙제가 존재하지 않을 때
    if (filteredHomeworkPackages.length === 0) {
        const emptyMsg = document.createElement('div');
        emptyMsg.className = 'empty-message';
        emptyMsg.innerText = searchQuery
            ? `'${homeworkSearch.value}'에 해당하는 숙제가 없습니다.`
            : `선택하신 '${currentFilter}' 타입의 숙제가 없습니다.`;
        homeworkList.appendChild(emptyMsg);
        return;
    }

    const spacer = document.createElement('div');
    spacer.className = 'virtual-list-spacer';
    spacer.style.height = `${filteredHomeworkPackages.length * HOMEWORK_ROW_HEIGHT}px`;

    const itemsLayer = document.createElement('div');
    itemsLayer.className = 'virtual-list-items';
    homeworkList.append(spacer, itemsLayer);

    // 검색이나 필터가 바뀔 때는 새 결과의 첫 항목부터 보여줍니다.
    homeworkList.scrollTop = 0;
    visibleHomeworkRange = "";
    renderVisibleHomeworkItems();
}

function scheduleVirtualListRender() {
    if (scrollAnimationFrame) return;

    scrollAnimationFrame = requestAnimationFrame(() => {
        scrollAnimationFrame = undefined;
        renderVisibleHomeworkItems();
    });
}

function renderVisibleHomeworkItems() {
    const itemsLayer = homeworkList.querySelector('.virtual-list-items');
    if (!itemsLayer || filteredHomeworkPackages.length === 0) return;

    const viewportHeight = homeworkList.clientHeight;
    const startIndex = Math.max(0, Math.floor(homeworkList.scrollTop / HOMEWORK_ROW_HEIGHT) - HOMEWORK_OVERSCAN);
    const endIndex = Math.min(
        filteredHomeworkPackages.length,
        Math.ceil((homeworkList.scrollTop + viewportHeight) / HOMEWORK_ROW_HEIGHT) + HOMEWORK_OVERSCAN
    );
    const nextRange = `${startIndex}:${endIndex}`;

    if (nextRange === visibleHomeworkRange) return;
    visibleHomeworkRange = nextRange;

    const fragment = document.createDocumentFragment();
    for (let index = startIndex; index < endIndex; index++) {
        fragment.appendChild(createHomeworkItem(filteredHomeworkPackages[index]));
    }

    itemsLayer.replaceChildren(fragment);
    itemsLayer.style.transform = `translateY(${startIndex * HOMEWORK_ROW_HEIGHT}px)`;
}

function createHomeworkItem(pkg) {
    const itemRow = document.createElement('div');
    itemRow.className = 'homework-item';
    itemRow.title = pkg.title;
    itemRow.innerHTML = `
        <div class="item-title-row">
            <div class="item-title">${pkg.title}</div>
            <span class="item-type-badge">${pkg.type || '미분류'}</span>
        </div>
        <div class="item-date">${pkg.date}</div>
    `;
    itemRow.onclick = () => startHomework(pkg.id);
    return itemRow;
}

// 🔥 고유 ID를 기반으로 정확한 원본 패키지를 조회합니다.
function startHomework(packageId) {
    const targetPackage = homeworkPackages.find(pkg => pkg.id === packageId);
    if (!targetPackage) return;

    currentQuestions = targetPackage.questions;
    currentHomeworkTitle = targetPackage.title; 
    currentIndex = 0;
    
    homeView.classList.add('hidden');
    completeView.classList.add('hidden');
    gameView.classList.remove('hidden');
    
    loadQuestion(currentIndex);
}

function showHomeView() {
    gameView.classList.add('hidden');
    completeView.classList.add('hidden');
    homeView.classList.remove('hidden');
    errorModal.style.display = "none";
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function loadQuestion(index) {
    if (!currentQuestions || currentQuestions.length === 0) return;

    const data = currentQuestions[index];
    correctAnswerWords = data.en.split(" ");
    
    availableWords = [...correctAnswerWords, ...data.distractors];
    shuffleArray(availableWords);
    
    selectedWords = [];
    progressText.innerText = `${index + 1} / ${currentQuestions.length}`;
    koreanText.innerText = data.ko;
    
    // 새 문제를 시작할 때만 대기 단어 목록을 맨 위에서 보여줍니다.
    renderWords(true);
}

function renderWords(resetAvailableScroll = false) {
    // 버튼을 다시 그려도 사용자가 보고 있던 대기 단어 목록의 위치를 유지합니다.
    const availableScrollTop = resetAvailableScroll ? 0 : availableArea.scrollTop;

    selectedArea.innerHTML = "";
    availableArea.innerHTML = "";

    selectedWords.forEach((word, idx) => {
        const btn = document.createElement('button');
        btn.className = 'word-btn';
        btn.innerText = word;
        btn.onclick = () => moveToAvailable(idx);
        selectedArea.appendChild(btn);
    });

    availableWords.forEach((word, idx) => {
        const btn = document.createElement('button');
        btn.className = 'word-btn';
        btn.innerText = word;
        btn.onclick = () => moveToSelected(idx);
        availableArea.appendChild(btn);
    });

    checkBtn.disabled = selectedWords.length === 0;

    selectedArea.scrollTop = selectedArea.scrollHeight;
    availableArea.scrollTop = availableScrollTop;
}

function moveToSelected(index) {
    const word = availableWords.splice(index, 1)[0];
    selectedWords.push(word);
    renderWords();
}

function moveToAvailable(index) {
    const word = selectedWords.splice(index, 1)[0];
    availableWords.push(word);
    renderWords();
}

function showEmojiBurst() {
    const emojis = ['✨', '🎉', '👏', '🤩', '🔥', '💯'];
    const particleCount = 12; 

    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'emoji-particle';
        particle.innerText = emojis[Math.floor(Math.random() * emojis.length)];
        
        const tx = (Math.random() - 0.5) * 300; 
        const ty = (Math.random() - 0.5) * 300; 
        
        particle.style.setProperty('--tx', `${tx}px`);
        particle.style.setProperty('--ty', `${ty}px`);
        
        emojiContainer.appendChild(particle);
        
        setTimeout(() => particle.remove(), 1000);
    }
}

function showCompleteScreen() {
    gameView.classList.add('hidden');
    completeView.classList.remove('hidden');

    document.getElementById('complete-hw-title').innerText = currentHomeworkTitle;
    
    const now = new Date();
    const formattedTime = `${now.getFullYear()}. ${String(now.getMonth() + 1).padStart(2, '0')}. ${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    document.getElementById('complete-time').innerText = `인증 일시: ${formattedTime}`;
}

function checkAnswer() {
    const userAnswer = selectedWords.join(" ");
    const actualAnswer = correctAnswerWords.join(" ");

    if (userAnswer === actualAnswer) {
        showEmojiBurst(); 
        currentIndex++;
        
        if (currentIndex < currentQuestions.length) {
            setTimeout(() => {
                loadQuestion(currentIndex);
            }, 500);
        } else {
            setTimeout(() => {
                showCompleteScreen();
            }, 600);
        }
    } else {
        correctAnswerDisplay.innerText = actualAnswer;
        errorModal.style.display = "flex";
    }
}

function retryQuestion() {
    errorModal.style.display = "none";
    loadQuestion(currentIndex);
}

initApp();
