// main.js

// 사용할 모듈들을 미리 가져옵니다.
import * as Dashboard from './src/features/dashboard/dashboard.js';
import * as Clients from './src/features/clients/clients.js';

// 경로와 모듈을 연결합니다.
const routes = {
    'dashboard': Dashboard,
    'clients': Clients
};

// 화면을 변경하는 함수
async function navigate(pageName) {
    const app = document.getElementById('app');
    const module = routes[pageName];

    if (!module) return;

    // 1. 화면 그리기 (render)
    app.innerHTML = module.render();

    // 2. 기능 실행하기 (init) - 만약 init 함수가 있다면 실행
    if (module.init) {
        await module.init();
    }
}

// 메뉴 버튼 클릭 이벤트 설정
document.addEventListener('DOMContentLoaded', () => {
    // 메뉴 클릭 감지
    document.body.addEventListener('click', (e) => {
        if (e.target.matches('[data-target]')) {
            const target = e.target.dataset.target;
            navigate(target);
        }
    });

    // 첫 화면은 대시보드
    navigate('dashboard');
});