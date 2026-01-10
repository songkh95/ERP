// src/common/utils.js

/**
 * [CSS 동적 로드 함수]
 * 각 페이지(모듈)에 필요한 스타일만 로드하여 초기 로딩 속도를 최적화합니다.
 * @param {string} filePath - CSS 파일 경로
 */
export function loadCSS(filePath) {
    // 이미 로드된 파일인지 확인 (중복 로드 방지)
    if (document.querySelector(`link[href="${filePath}"]`)) {
        return; 
    }

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = filePath;
    document.head.appendChild(link);
}

/**
 * [HTML 동적 로드 함수]
 * HTML 파일을 텍스트로 가져옵니다. 라우터에서 뷰(View)를 렌더링할 때 사용합니다.
 * @param {string} filePath - HTML 파일 경로
 * @returns {Promise<string>} HTML 내용 문자열
 */
export async function loadHTML(filePath) {
    try {
        const response = await fetch(filePath);
        
        // 404 등의 에러 처리
        if (!response.ok) {
            throw new Error(`HTML 로드 실패: ${filePath} (Status: ${response.status})`);
        }

        return await response.text(); 
    } catch (error) {
        console.error('loadHTML Error:', error);
        // 사용자에게 에러 상황을 UI로 보여주기 위한 반환값
        return `<div style="padding: 20px; color: #dc3545; font-weight: bold; text-align: center;">
                    <h3>페이지를 불러올 수 없습니다.</h3>
                    <p>관리자에게 문의해주세요.<br>(${filePath})</p>
                </div>`;
    }
}

/**
 * [추가 제안: 컴포넌트 렌더링 함수]
 * 가져온 HTML 문자열을 실제 DOM 요소에 삽입하는 함수입니다.
 * @param {string} selector - HTML을 넣을 부모 요소의 CSS 선택자 (예: '#app', '#main-content')
 * @param {string} html - loadHTML로 가져온 HTML 문자열
 */
export function render(selector, html) {
    const element = document.querySelector(selector);
    if (element) {
        element.innerHTML = html;
    } else {
        console.error(`렌더링 실패: '${selector}' 요소를 찾을 수 없습니다.`);
    }
}