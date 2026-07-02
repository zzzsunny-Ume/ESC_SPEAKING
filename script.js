let homeworkPackages = [];
let currentQuestions = [];
let currentIndex = 0;
let currentHomeworkTitle = ""; 
let currentFilter = "all"; // 현재 선택된 필터 상태 저장

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

async function initApp() {
    try {
        const response = await fetch('data.json');
        if (!response.ok) throw new Error('네트워크 응답 실패');
        
        const rawData = await response.json();
        
        // 🔥 데이터를 정렬하기 전에 순수 인덱스를 기반으로 고유 ID를 자동 할당합니다.
        homeworkPackages = rawData.map((pkg, idx) => ({
            id: `hw-package-${idx}`,
            ...pkg
        }));

        homeworkPackages.sort((a, b) => new Date(b.date) - new Date(a.date));
        renderHomeList();
    } catch (error) {
        document.querySelector('.widget-header span').innerText = "오류 발생";
        homeworkList.innerHTML = "<p style='color:red; font-size:14px;'>데이터 로드에 실패했습니다.</p>";
    }
}

function renderHomeList() {
    homeworkList.innerHTML = "";
    
    // 필터 조건에 맞는 패키지만 선별
    const filteredPackages = homeworkPackages.filter(pkg => {
        if (currentFilter === "all") return true;
        return pkg.type === currentFilter;
    });

    // ⚠️ 예외 처리: 해당 타입의 숙제가 존재하지 않을 때
    if (filteredPackages.length === 0) {
        const emptyMsg = document.createElement('div');
        emptyMsg.className = 'empty-message';
        emptyMsg.innerText = `선택하신 '${currentFilter}' 타입의 숙제가 없습니다.`;
        homeworkList.appendChild(emptyMsg);
        return;
    }

    filteredPackages.forEach((pkg) => {
        const itemRow = document.createElement('div');
        itemRow.className = 'homework-item';
        itemRow.innerHTML = `
            <div class="item-title-row">
                <div class="item-title">${pkg.title}</div>
                <span class="item-type-badge">${pkg.type || '미분류'}</span>
            </div>
            <div class="item-date">${pkg.date}</div>
        `;
        // 🔥 인덱스가 아닌 고유 id를 인자로 전달하여 안전하게 실행합니다.
        itemRow.onclick = () => startHomework(pkg.id);
        homeworkList.appendChild(itemRow);
    });
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
    
    renderWords();
}

function renderWords() {
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
    availableArea.scrollTop = availableArea.scrollHeight;
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