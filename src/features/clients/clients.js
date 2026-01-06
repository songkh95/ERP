import { supabase } from '../../common/db.js';
import { loadCSS, loadHTML } from '../../common/utils.js';

export async function render() {
    return await loadHTML('./src/features/clients/clients.html');
}

export async function init() {
    loadCSS('./src/features/clients/style.css');

    // DOM 요소 선택
    const btnToggle = document.getElementById('btn-toggle-form');
    const formPanel = document.getElementById('form-panel');
    const btnCancel = document.getElementById('btn-cancel');
    const btnSave = document.getElementById('btn-save');
    const ul = document.getElementById('client-list-ul');
    
    // 입력 input
    const inputName = document.getElementById('input-name');
    const inputContact = document.getElementById('input-contact');
    const panelTitle = formPanel.querySelector('h3');

    // [추가됨] 검색 input
    const searchName = document.getElementById('search-name');
    const searchContact = document.getElementById('search-contact');

    // 상태 변수
    let editingId = null;
    let allClients = []; // 전체 데이터를 저장해두는 창고

    // 1. 초기 데이터 로드
    await loadData();

    // --- [추가됨] 검색 이벤트 리스너 ---
    // 키보드를 뗄 때(keyup)마다 필터링 실행
    searchName.addEventListener('keyup', filterData);
    searchContact.addEventListener('keyup', filterData);

    // ★ 필터링 함수
    function filterData() {
        const nameKeyword = searchName.value.toLowerCase(); // 소문자로 변환 (대소문자 무시)
        const contactKeyword = searchContact.value.toLowerCase();

        // 전체 데이터(allClients) 중에서 조건에 맞는 것만 골라냄
        const filtered = allClients.filter(client => {
            const name = (client.name || '').toLowerCase();
            const contact = (client.contact_person || '').toLowerCase();

            // 이름에도 포함되고(AND) 담당자에도 포함되는 것
            return name.includes(nameKeyword) && contact.includes(contactKeyword);
        });

        // 걸러진 목록만 화면에 그리기
        renderList(filtered);
    }

    // --- 기본 기능 (토글, 저장, 수정, 삭제) ---
    const toggleForm = (show) => {
        if (show) {
            formPanel.classList.remove('hidden');
            btnToggle.textContent = '🔼 입력창 닫기';
            btnToggle.style.backgroundColor = '#6c757d';
        } else {
            formPanel.classList.add('hidden');
            btnToggle.textContent = '➕ 신규 등록 열기';
            btnToggle.style.backgroundColor = '#007bff';
            resetFormMode();
        }
    };

    function resetFormMode() {
        editingId = null;
        inputName.value = '';
        inputContact.value = '';
        btnSave.textContent = '저장하기';
        panelTitle.textContent = '새 고객 정보 입력';
    }

    if(btnToggle) {
        btnToggle.addEventListener('click', () => {
            const isHidden = formPanel.classList.contains('hidden');
            if (isHidden) resetFormMode();
            toggleForm(isHidden);
        });
    }
    if(btnCancel) btnCancel.addEventListener('click', () => toggleForm(false));

    if(btnSave) {
        btnSave.addEventListener('click', async () => {
            const name = inputName.value;
            const contact = inputContact.value;

            if (!name) return alert('이름을 입력해주세요!');

            let result;
            if (editingId) {
                result = await supabase.from('clients').update({ name, contact_person: contact }).eq('id', editingId);
            } else {
                result = await supabase.from('clients').insert({ name, contact_person: contact });
            }

            const { error } = result;
            if (error) {
                alert('오류 발생');
            } else {
                alert(editingId ? '수정되었습니다.' : '등록되었습니다.');
                toggleForm(false);
                loadData(); // 데이터 다시 가져오기
            }
        });
    }

    if(ul) {
        ul.addEventListener('click', async (e) => {
            const btnEdit = e.target.closest('.btn-edit');
            const btnDelete = e.target.closest('.btn-delete');

            if (btnEdit) {
                editingId = btnEdit.dataset.id;
                inputName.value = btnEdit.dataset.name;
                inputContact.value = btnEdit.dataset.contact;
                panelTitle.textContent = `'${btnEdit.dataset.name}' 정보 수정`;
                btnSave.textContent = '수정 완료';
                toggleForm(true);
            }

            if (btnDelete) {
                const name = btnDelete.dataset.name;
                if (confirm(`정말 '${name}' 고객을 삭제하시겠습니까?`)) {
                    await supabase.from('clients').delete().eq('id', btnDelete.dataset.id);
                    alert('삭제되었습니다.');
                    loadData();
                }
            }
        });
    }

    // --- [변경됨] 데이터 가져오기 & 그리기 분리 ---
    
    // 1. Supabase에서 데이터만 가져와서 allClients에 저장
    async function loadData() {
        const { data, error } = await supabase
            .from('clients')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) return console.error(error);

        // 전역 변수에 저장 (검색할 때 쓰려고)
        allClients = data;
        
        // 검색창 초기화
        searchName.value = '';
        searchContact.value = '';

        // 전체 목록 그리기
        renderList(allClients);
    }

    // 2. 받은 리스트를 화면(HTML)에 그리는 함수 (재사용)
    function renderList(listData) {
        if (listData.length === 0) {
            ul.innerHTML = '<li style="justify-content:center; color:#999;">검색 결과가 없습니다.</li>';
            return;
        }

        ul.innerHTML = listData.map(client => `
            <li>
                <div class="client-info">
                    <span style="font-weight:bold; font-size:1.1em;">${client.name}</span>
                    <span style="color: #666; font-size: 0.9em;">
                        👤 ${client.contact_person || '미정'}
                    </span>
                </div>
                <div class="btn-group">
                    <button class="btn-edit" 
                        data-id="${client.id}" 
                        data-name="${client.name}" 
                        data-contact="${client.contact_person || ''}">
                        수정
                    </button>
                    <button class="btn-delete" 
                        data-id="${client.id}" 
                        data-name="${client.name}">
                        삭제
                    </button>
                </div>
            </li>
        `).join('');
    }
}