// src/common/utils.js

// CSS 파일을 동적으로 <head>에 추가해주는 함수
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