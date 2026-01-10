// main.js

// 1. 각 페이지 모듈 import
import * as Dashboard from './src/features/dashboard/dashboard.js';
import * as Clients from './src/features/clients/clients.js';
// (주의) 폴더명이나 파일명이 다를 수 있으니 본인 경로에 맞게 확인해주세요.
import * as AssetsMgr from './src/features/assets-mgr/assets-mgr.js'; 
import * as Service from './src/features/service/service.js';

// 2. 라우트 설정 (제목 정보 추가)
const routeInfo = {
    'dashboard': { module: Dashboard, title: '대시보드' },
    'clients':   { module: Clients,   title: '거래처 관리' },
    'assets-mgr':{ module: AssetsMgr, title: '자산 및 기기 관리' },
    'service':   { module: Service,   title: 'A/S 접수 현황' }
};

// 3. 페이지 이동 함수
async function navigate(routeKey) {
    const app = document.getElementById('app');
    const titleEl = document.getElementById('page-title'); // 타이틀 요소 찾기

    const info = routeInfo[routeKey]; // 정보 가져오기

    if (!info) {
        console.error(`Route not found: ${routeKey}`);
        return;
    }

    // (1) 헤더 제목 변경 ★
    if (titleEl) {
        titleEl.textContent = info.title;
    }

    // (2) 모듈 로드 및 렌더링
    const module = info.module;
    try {
        app.innerHTML = await module.render();
        if (module.init) await module.init();
    } catch (err) {
        console.error(err);
        app.innerHTML = `<p>에러 발생: ${err.message}</p>`;
    }
}

// 4. 메뉴 활성화(파란색 하이라이트) 처리 함수
function updateActiveMenu(routeKey) {
    // 모든 메뉴 링크에서 active 제거
    const links = document.querySelectorAll('.nav-link');
    links.forEach(link => {
        link.classList.remove('active');
        
        // 현재 라우트와 일치하면 active 추가
        if (link.dataset.route === routeKey) {
            link.classList.add('active');
        }
    });
}

// 5. 이벤트 리스너 설정 (DOM 로드 후 실행)
document.addEventListener('DOMContentLoaded', () => {
    
    // (1) 메뉴 클릭 이벤트 (이벤트 위임)
    // 에러 해결 핵심: .menu가 아니라 .nav-menu를 찾아야 합니다!
    const navMenu = document.querySelector('.nav-menu');
    const btnToggle = document.getElementById('btn-toggle-sidebar');
    const appContainer = document.querySelector('.app-container');
    
    if (btnToggle && appContainer) {
        btnToggle.addEventListener('click', () => {
            // .app-container에 'collapsed' 클래스를 넣었다 뺐다 함
            appContainer.classList.toggle('collapsed');
        });
    }
    
    if (navMenu) {
        navMenu.addEventListener('click', (e) => {
            // 클릭된 요소가 링크(a 태그)인지 확인
            const link = e.target.closest('.nav-link');
            
            if (link) {
                e.preventDefault(); // 링크 이동 방지
                
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