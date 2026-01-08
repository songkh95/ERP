// main.js
import * as Dashboard from './src/features/dashboard/dashboard.js';
import * as Clients from './src/features/clients/clients.js';
import * as AssetsMgr from './src/features/assets-mgr/assets-mgr.js'; 
import * as Service from './src/features/service/service.js';


// 라우트 설정
const routes = {
    'dashboard': Dashboard,
    'clients': Clients,
     // 연결 (route 설정)
    'assets-mgr': AssetsMgr, 
    'service': Service,
};

async function navigate(target, titleName) {
    const app = document.getElementById('app');
    const pageTitle = document.getElementById('page-title');
    const module = routes[target];

    if (!module) return;

    // 제목 변경
    pageTitle.textContent = titleName || 'CS ERP';

    // [수정됨] render 함수 앞에 await를 붙여야 합니다!
    // HTML 파일을 읽어올 때까지 기다려야 하기 때문입니다.
    app.innerHTML = await module.render(); 

    // 기능 실행
    if (module.init) {
        await module.init();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const btnToggleSidebar = document.getElementById('btn-toggle-sidebar');
    const layout = document.querySelector('.layout'); // 전체를 감싸는 div

    if (btnToggleSidebar) {
        btnToggleSidebar.addEventListener('click', () => {
            // 'collapsed' 클래스가 있으면 빼고, 없으면 넣음
            layout.classList.toggle('collapsed');
        });
    }
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