import { loadCSS } from '../../common/utils.js';
import { render as renderShell } from './assets-mgr.view.js'; 

// 1. 라우터용 렌더링
export async function render() {
    return await renderShell();
}

// 2. 초기화
export async function init() {
    loadCSS('./src/features/assets-mgr/style.css');

    // ★ 안전 장치: HTML이 생길 때까지 0.05초마다 체크
    const checkExist = setInterval(async () => {
        const contentArea = document.getElementById('tab-content-area');
        if (contentArea) {
            clearInterval(checkExist); // 찾았으니 중단
            
            // (1) 기본 탭(복합기) 로드
            await loadTab('machines');
            
            // (2) 탭 버튼 이벤트 연결
            bindTabEvents();
        }
    }, 50);
}

function bindTabEvents() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(btn => {
        btn.addEventListener('click', async (e) => {
            tabButtons.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            const tabName = e.target.dataset.tab;
            await loadTab(tabName);
        });
    });
}

async function loadTab(tabName) {
    const contentArea = document.getElementById('tab-content-area');
    if (!contentArea) return;

    contentArea.innerHTML = '<div style="padding:40px; text-align:center;">로딩 중...</div>';

    try {
        // tabs 폴더 안의 파일을 가져옴
        const module = await import(`./tabs/${tabName}.js`);

        if (module.render) {
            contentArea.innerHTML = await module.render();
        }
        if (module.init) {
            await module.init();
        }
    } catch (error) {
        console.error(`탭 로드 실패:`, error);
        contentArea.innerHTML = `<div style="color:red; padding:20px;">페이지 로드 에러: ${error.message}</div>`;
    }
}