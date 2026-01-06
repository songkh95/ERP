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


// HTML 파일을 읽어와서 텍스트로 반환하는 함수
export async function loadHTML(filePath) {
    try {
        const response = await fetch(filePath); // 파일을 가지러 감
        if (!response.ok) throw new Error('HTML 로드 실패');
        return await response.text(); // 파일 내용을 글자로 변환해서 줌
    } catch (error) {
        console.error(error);
        return `<h1 style="color:red">에러: ${filePath} 파일을 찾을 수 없습니다.</h1>`;
    }
}