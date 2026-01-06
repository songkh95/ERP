// src/features/clients/clients.js
import { supabase } from '../../common/db.js';
import { loadCSS } from '../../common/utils.js';

// 1. 화면 그리기
export function render() {
    return `
        <section class="client-page">
            <h1>📋 고객 관리</h1>
            
            <div class="page-header">
                <button id="btn-toggle-form" class="btn-primary">➕ 신규 등록 열기</button>
            </div>

            <div id="form-panel" class="input-panel hidden">
                <h3>새 고객 정보 입력</h3>
                <div class="form-group">
                    <input type="text" id="input-name" placeholder="고객사 이름 (예: 크린솔루션)">
                    <input type="text" id="input-contact" placeholder="담당자 (예: 김철수)">
                </div>
                <div style="text-align: right;">
                    <button id="btn-cancel" class="btn-cancel">취소</button>
                    <button id="btn-save" class="btn-save">저장하기</button>
                </div>
            </div>
            
            <ul id="client-list-ul" class="client-list">
                데이터 로딩 중...
            </ul>
        </section>
    `;
}

// 2. 기능 실행
export async function init() {
    loadCSS('./src/features/clients/style.css');

    // DOM 요소 선택
    const btnToggle = document.getElementById('btn-toggle-form');
    const formPanel = document.getElementById('form-panel');
    const btnCancel = document.getElementById('btn-cancel');
    const btnSave = document.getElementById('btn-save');
    const ul = document.getElementById('client-list-ul');

    // 초기 데이터 로드
    loadData();

    // [이벤트] 토글 & 취소 버튼
    btnToggle.addEventListener('click', () => {
        const isHidden = formPanel.classList.toggle('hidden');
        updateToggleButton(isHidden);
    });
    
    btnCancel.addEventListener('click', () => {
        formPanel.classList.add('hidden');
        updateToggleButton(true);
    });

    function updateToggleButton(isHidden) {
        if (isHidden) {
            btnToggle.textContent = '➕ 신규 등록 열기';
            btnToggle.style.backgroundColor = '#007bff';
        } else {
            btnToggle.textContent = '🔼 입력창 닫기';
            btnToggle.style.backgroundColor = '#6c757d';
        }
    }

    // [이벤트] 저장 버튼
    btnSave.addEventListener('click', async () => {
        const name = document.getElementById('input-name').value;
        const contact = document.getElementById('input-contact').value;

        if (!name) return alert('고객사 이름을 입력해주세요!');

        const { error } = await supabase.from('clients').insert({
            name: name,
            contact_person: contact
        });

        if (error) {
            console.error(error);
            alert('저장 실패!');
        } else {
            alert('등록되었습니다.');
            document.getElementById('input-name').value = '';
            document.getElementById('input-contact').value = '';
            loadData(); // 목록 새로고침
        }
    });

    // ★ [이벤트] 삭제 버튼 기능 (이벤트 위임 방식)
    // 리스트(ul)에 이벤트를 걸어서, 그 안의 삭제 버튼 클릭을 감지합니다.
    ul.addEventListener('click', async (e) => {
        // 클릭한 요소가 'btn-delete' 클래스를 가지고 있는지 확인
        if (e.target.classList.contains('btn-delete')) {
            const clientName = e.target.dataset.name; // 이름 가져오기
            const clientId = e.target.dataset.id;     // ID 가져오기

            // 1. 진짜 지울 건지 물어보기
            const isConfirmed = confirm(`정말 '${clientName}' 고객을 삭제하시겠습니까?\n(복구할 수 없습니다)`);

            if (isConfirmed) {
                // 2. Supabase에 삭제 요청 (Delete)
                const { error } = await supabase
                    .from('clients')
                    .delete()
                    .eq('id', clientId); // "id가 이것과 같은(eq) 녀석을 지워라"

                if (error) {
                    console.error('삭제 실패:', error);
                    alert('삭제 중 오류가 발생했습니다.');
                } else {
                    alert('삭제되었습니다.');
                    loadData(); // 3. 목록 새로고침
                }
            }
        }
    });

    // 데이터 불러오기 함수
    async function loadData() {
        const { data, error } = await supabase
            .from('clients')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) return console.error(error);

        if (data.length === 0) {
            ul.innerHTML = '<li style="justify-content:center; color:#999;">등록된 고객이 없습니다.</li>';
        } else {
            ul.innerHTML = data.map(client => `
                <li>
                    <div class="client-info">
                        <span style="font-weight:bold; font-size:1.1em;">${client.name}</span>
                        <span style="color: #666; font-size: 0.9em;">
                            👤 ${client.contact_person || '담당자 미정'}
                        </span>
                    </div>
                    <button class="btn-delete" data-id="${client.id}" data-name="${client.name}">
                        삭제
                    </button>
                </li>
            `).join('');
        }
    }
}