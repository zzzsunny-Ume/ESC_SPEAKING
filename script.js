// 전역 상태 변수
let homeworkPackages = []; // 전체 숙제 패키지 데이터
let currentQuestions = []; // 현재 선택된 숙제의 10문제 배열
let currentIndex = 0;      // 현재 문제 번호
let selectedWords = [];
let availableWords = [];
let correctAnswerWords = [];

// DOM 요소 캐싱
const homeView = document.getElementById('home-view');
const gameView = document.getElementById('game-view');
const homeworkList = document.getElementById('homework-list');
const progressText = document.getElementById('progress-text');
const koreanText = document.getElementById('korean-text');
const selectedArea = document.getElementById('selected-area');
const availableArea = document.getElementById('available-area');
const checkBtn = document.getElementById('check-btn');
const errorModal = document.getElementById('error-modal');
const correctAnswerDisplay = document.getElementById('correct-answer-text');

// 이벤트 리스너 등록
checkBtn.addEventListener('click', checkAnswer);
document.getElementById('retry-btn').addEventListener('click', retryQuestion);
document.getElementById('back-btn').addEventListener('click', showHomeView);

// 앱 초기화 및 데이터 가져오기
async function initApp() {
    try {
        const response = await fetch('data.json');
        if (!response.ok) throw new Error('네트워크 응답 실패');
        
        homeworkPackages = await response.json();
        
        // 날짜 기준 최신순 정렬 (최신 날짜가 위로 오도록 함)
        homeworkPackages.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        renderHomeList();
    } catch (error) {
        console.error("데이터 로드 실패:", error);
        document.querySelector('.widget-header').innerText = "오류 발생";
        homeworkList.innerHTML = "<p style='color:red; font-size:14px;'>데이터 로드에 실패했습니다. Live Server 환경인지 확인하세요.</p>";
    }
}

// 홈 화면에 숙제 목록 출력
function renderHomeList() {
    homeworkList.innerHTML = "";
    
    homeworkPackages.forEach((pkg, index) => {
        const itemRow = document.createElement('div');
        itemRow.className = 'homework-item';
        
        // HTML 요소 조립 (제목 및 날짜 표현)
        itemRow.innerHTML = `
            <div class="item-title">${pkg.title}</div>
            <div class="item-date">${pkg.date}</div>
        `;
        
        // 클릭 시 해당 숙제 게임 시작
        itemRow.onclick = () => startHomework(index);
        homeworkList.appendChild(itemRow);
    });
}

// 특정 숙제 게임 시작하기
function startHomework(packageIndex) {
    currentQuestions = homeworkPackages[packageIndex].questions;
    currentIndex = 0;
    
    // 화면 보기 전환
    homeView.classList.add('hidden');
    gameView.classList.remove('hidden');
    
    loadQuestion(currentIndex);
}

// 홈 화면으로 돌아가기
function showHomeView() {
    gameView.classList.add('hidden');
    homeView.classList.remove('hidden');
    errorModal.style.display = "none";
}

// 배열 섞기 유틸리티 함수
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// 문제 로드
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

// 화면에 단어 버튼 배치
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

// 정답 확인
function checkAnswer() {
    const userAnswer = selectedWords.join(" ");
    const actualAnswer = correctAnswerWords.join(" ");

    if (userAnswer === actualAnswer) {
        currentIndex++;
        if (currentIndex < currentQuestions.length) {
            loadQuestion(currentIndex);
        } else {
            alert("🎉 이 숙제의 모든 문제를 완료했습니다!");
            showHomeView(); // 완료 시 목록 홈화면으로 이동
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

// 최초 실행
initApp();