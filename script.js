let homeworkPackages = [];
let currentQuestions = [];
let currentIndex = 0;
let currentHomeworkTitle = ""; // 현재 진행 중인 숙제 제목 저장

let selectedWords = [];
let availableWords = [];
let correctAnswerWords = [];

// DOM 요소
const homeView = document.getElementById('home-view');
const gameView = document.getElementById('game-view');
const completeView = document.getElementById('complete-view'); // 완료 뷰
const homeworkList = document.getElementById('homework-list');
const progressText = document.getElementById('progress-text');
const koreanText = document.getElementById('korean-text');
const selectedArea = document.getElementById('selected-area');
const availableArea = document.getElementById('available-area');
const checkBtn = document.getElementById('check-btn');
const errorModal = document.getElementById('error-modal');
const correctAnswerDisplay = document.getElementById('correct-answer-text');
const emojiContainer = document.getElementById('emoji-container');

// 이벤트 리스너
checkBtn.addEventListener('click', checkAnswer);
document.getElementById('retry-btn').addEventListener('click', retryQuestion);
document.getElementById('back-btn').addEventListener('click', showHomeView);
document.getElementById('go-home-btn').addEventListener('click', showHomeView);

async function initApp() {
    try {
        const response = await fetch('data.json');
        if (!response.ok) throw new Error('네트워크 응답 실패');
        
        homeworkPackages = await response.json();
        homeworkPackages.sort((a, b) => new Date(b.date) - new Date(a.date));
        renderHomeList();
    } catch (error) {
        document.querySelector('.widget-header').innerText = "오류 발생";
        homeworkList.innerHTML = "<p style='color:red; font-size:14px;'>데이터 로드에 실패했습니다.</p>";
    }
}

function renderHomeList() {
    homeworkList.innerHTML = "";
    homeworkPackages.forEach((pkg, index) => {
        const itemRow = document.createElement('div');
        itemRow.className = 'homework-item';
        itemRow.innerHTML = `
            <div class="item-title">${pkg.title}</div>
            <div class="item-date">${pkg.date}</div>
        `;
        itemRow.onclick = () => startHomework(index);
        homeworkList.appendChild(itemRow);
    });
}

function startHomework(packageIndex) {
    currentQuestions = homeworkPackages[packageIndex].questions;
    currentHomeworkTitle = homeworkPackages[packageIndex].title; // 제목 저장
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

    // 🔥 [이곳에 추가] 단어가 바뀔 때마다 스크롤을 무조건 맨 아래(뒤쪽)로 이동시킵니다.
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

// 🎉 정답 맞출 시 이모지 폭죽 효과
function showEmojiBurst() {
    const emojis = ['✨', '🎉', '👏', '🤩', '🔥', '💯'];
    const particleCount = 12; // 터지는 이모지 개수

    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'emoji-particle';
        particle.innerText = emojis[Math.floor(Math.random() * emojis.length)];
        
        // 사방으로 퍼지도록 X, Y 좌표 랜덤 설정
        const tx = (Math.random() - 0.5) * 300; // -150px ~ 150px
        const ty = (Math.random() - 0.5) * 300; // -150px ~ 150px
        
        particle.style.setProperty('--tx', `${tx}px`);
        particle.style.setProperty('--ty', `${ty}px`);
        
        emojiContainer.appendChild(particle);
        
        // 애니메이션 종료 후 DOM에서 제거
        setTimeout(() => particle.remove(), 1000);
    }
}

// 🏆 10문제 다 풀었을 때 완료 화면 표시
function showCompleteScreen() {
    gameView.classList.add('hidden');
    completeView.classList.remove('hidden');

    document.getElementById('complete-hw-title').innerText = currentHomeworkTitle;
    
    // 현재 날짜 시간 깔끔하게 포맷팅
    const now = new Date();
    const formattedTime = `${now.getFullYear()}. ${String(now.getMonth() + 1).padStart(2, '0')}. ${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    document.getElementById('complete-time').innerText = `인증 일시: ${formattedTime}`;
}

function checkAnswer() {
    const userAnswer = selectedWords.join(" ");
    const actualAnswer = correctAnswerWords.join(" ");

    if (userAnswer === actualAnswer) {
        showEmojiBurst(); // 정답 효과 실행
        currentIndex++;
        
        if (currentIndex < currentQuestions.length) {
            // 효과를 볼 수 있게 0.5초 딜레이 후 다음 문제로 넘어감
            setTimeout(() => {
                loadQuestion(currentIndex);
            }, 500);
        } else {
            // 10문제 모두 맞춘 경우
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