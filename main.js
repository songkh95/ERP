// main.js

// 1. 각 페이지 모듈 import
import * as Dashboard from './src/features/dashboard/dashboard.js';
import * as Clients from './src/features/clients/clients.js';
import * as AssetsMgr from './src/features/assets-mgr/assets-mgr.js'; 
import * as Service from './src/features/service/service.js';
import * as Accounting from './src/features/accounting/accounting.js'; // 변수명 대문자로 통일 추천

// 2. 라우트 설정 (여기에 'accounting'이 꼭 있어야 합니다!)
const routeInfo = {
    'dashboard': { module: Dashboard, title: '대시보드' },
    'clients':   { module: Clients,   title: '거래처 관리' },
    'assets-mgr':{ module: AssetsMgr, title: '자산 및 기기 관리' },
    'service':   { module: Service,   title: 'A/S 접수 현황' },
    
    // ★ [핵심 수정] 여기에 accounting을 추가해야 navigate 함수가 찾을 수 있습니다.
    'accounting':{ module: Accounting, title: '사용매수(검침) 입력' } 
};

// (참고: 아까 작성하신 handleRoute 함수는 아래 navigate 함수가 역할을 대신하므로 삭제했습니다.)

// 3. 페이지 이동 함수 (실제 작동하는 함수)
async function navigate(routeKey) {
    const app = document.getElementById('app');
    const titleEl = document.getElementById('page-title');

    const info = routeInfo[routeKey]; // 여기서 accounting 정보를 찾습니다.

    if (!info) {
        console.error(`Route not found: ${routeKey}`);
        return;
    }

    // (1) 헤더 제목 변경
    if (titleEl) {
        titleEl.textContent = info.title;
    }

    // (2) 모듈 로드 및 렌더링
    const module = info.module;
    try {
        app.innerHTML = await module.render(); // HTML 그리기
        if (module.init) await module.init();  // 기능 실행
    } catch (err) {
        console.error(err);
        app.innerHTML = `<p>에러 발생: ${err.message}</p>`;
    }
}

// 4. 메뉴 활성화(파란색 하이라이트) 처리 함수
function updateActiveMenu(routeKey) {
    const links = document.querySelectorAll('.nav-link');
    links.forEach(link => {
        link.classList.remove('active');
        if (link.dataset.route === routeKey) {
            link.classList.add('active');
        }
    });
}

// 5. 이벤트 리스너 설정 (DOM 로드 후 실행)
document.addEventListener('DOMContentLoaded', () => {
    
    // (1) 메뉴 클릭 이벤트
    const navMenu = document.querySelector('.nav-menu');
    const btnToggle = document.getElementById('btn-toggle-sidebar');
    const appContainer = document.querySelector('.app-container');
    
    // 사이드바 토글
    if (btnToggle && appContainer) {
        btnToggle.addEventListener('click', () => {
            appContainer.classList.toggle('collapsed');
        });
    }
    
    // 네비게이션 클릭 처리
    if (navMenu) {
        navMenu.addEventListener('click', (e) => {
            const link = e.target.closest('.nav-link');
            
            if (link) {
                e.preventDefault(); 
                
                const routeKey = link.dataset.route;
                
                // 페이지 이동 및 메뉴 활성화
                navigate(routeKey);
                updateActiveMenu(routeKey);
            }
        });
    } else {
        console.error("Error: '.nav-menu' element not found in index.html");
    }

    // (2) 초기 로드 시 대시보드 화면 띄우기
    const initialRoute = 'dashboard'; 
    navigate(initialRoute);
    updateActiveMenu(initialRoute);
});