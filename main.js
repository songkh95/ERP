// main.js
import * as Dashboard from './src/features/dashboard/dashboard.js';
import * as Clients from './src/features/clients/clients.js';
// * 아직 안 만든 파일들은 import 하면 에러나니까 일단 주석 처리하거나, 파일이 있다면 푸세요.
// import * as AssetsMgr from './src/features/assets-mgr/assets-mgr.js'; 
// import * as Service from './src/features/service/service.js';

// 라우트 설정
const routes = {
    'dashboard': Dashboard,
    'clients': Clients,
    'assets-mgr': { render: () => '<h1>🚧 준비 중입니다</h1>', init: () => {} }, // 임시
    'service': { render: () => '<h1>🚧 준비 중입니다</h1>', init: () => {} }     // 임시
};

async function navigate(target, titleName) {
    const app = document.getElementById('app');
    const pageTitle = document.getElementById('page-title');
    const module = routes[target];

    if (!module) return;

    // 1. 상단 제목 변경
    pageTitle.textContent = titleName || 'CS ERP';

    // 2. 화면 그리기
    app.innerHTML = module.render();

    // 3. 기능 실행
    if (module.init) {
        await module.init();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // 메뉴 클릭 이벤트 위임
    const menuContainer = document.querySelector('.menu');

    menuContainer.addEventListener('click', (e) => {
        // 클릭한 요소가 버튼이거나 버튼 내부의 아이콘일 수 있으므로 .closest() 사용
        const button = e.target.closest('button');
        
        if (button && button.dataset.target) {
            const target = button.dataset.target;
            const title = button.dataset.title; // HTML에 적어둔 제목 가져오기

            // 1. 모든 버튼에서 active 클래스 제거 (색깔 초기화)
            document.querySelectorAll('.menu button').forEach(btn => btn.classList.remove('active'));
            
            // 2. 클릭한 버튼에 active 클래스 추가 (색깔 칠하기)
            button.classList.add('active');

            // 3. 페이지 이동
            navigate(target, title);
        }
    });

    // 초기 실행 (대시보드)
    const initButton = document.querySelector('button[data-target="dashboard"]');
    if (initButton) {
        initButton.click(); // 강제로 클릭 효과를 줘서 초기화
    }
});