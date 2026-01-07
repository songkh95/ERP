import { supabase } from '../../common/db.js';
import { loadCSS, loadHTML } from '../../common/utils.js';

export async function render() {
    return await loadHTML('./src/features/clients/clients.html');
}

export async function init() {
    loadCSS('./src/features/clients/style.css');

    // DOM 요소
    const btnToggle = document.getElementById('btn-toggle-form');
    const formPanel = document.getElementById('form-panel');
    const formTitle = document.getElementById('form-title');
    const btnCancel = document.getElementById('btn-cancel');
    const btnSave = document.getElementById('btn-save');
    const ul = document.getElementById('client-list-ul');
    const searchInput = document.getElementById('search-input');

    // 입력 필드 & 기기 관allClients = data리 섹션
    const inputName = document.getElementById('input-name');
    const inputContact = document.getElementById('input-contact');
    const assetSection = document.getElementById('asset-manage-section');
    const miniAssetUl = document.getElementById('client-asset-list');
    
    // 기기 관리 UI
    const tabAssign = document.getElementById('tab-assign-exist');
    const tabCreate = document.getElementById('tab-create-new');
    const boxAssign = document.getElementById('box-assign-exist');
    const boxCreate = document.getElementById('box-create-new');
    const selStockAsset = document.getElementById('select-stock-asset');
    const btnAddStock = document.getElementById('btn-add-stock');
    const selNewModel = document.getElementById('select-new-model');
    const inputNewSerial = document.getElementById('input-new-serial');
    const btnCreateAsset = document.getElementById('btn-create-asset');

    let editingId = null;
    let allClients = [];

    // 초기 실행
    loadData();

    // ----------------------------------------------------
    // 1. 데이터 로드 및 렌더링 (★ 핵심 변경)
    // ----------------------------------------------------
    async function loadData() {
        const { data, error } = await supabase
            .from('clients')
            .select(`*, assets (id, serial_number, status, products (brand, model_name, type))`)
            .order('created_at', { ascending: false });
        
        if (error) return console.error(error);
            allClients = data;
            const countSpan = document.getElementById('total-count');
        if (countSpan) countSpan.textContent = `${data.length}개의 거래처`; // 예: "15개사"

        renderList(allClients);
    }

    // ★ 리스트 렌더링 함수 (아코디언 구조 적용)
    function renderList(list) {
        if (!list.length) {
            ul.innerHTML = '<li style="padding:20px; text-align:center; color:#999;">데이터가 없습니다.</li>';
            return;
        }

        ul.innerHTML = list.map(client => {
            const assets = client.assets || [];
            
            // 요약용 배지 (모델명만 간단히)
            const summaryBadge = assets.length > 0 
                ? `<span class="asset-badge"><i class='bx bxs-printer'></i> ${assets.length}대 보유</span>`
                : `<span style="color:#ccc; font-size:0.8rem;">(기기 없음)</span>`;

            // 상세용 전체 리스트 HTML
            const detailAssetsHtml = assets.length > 0
                ? assets.map(a => `
                    <div style="background:white; padding:8px; border:1px solid #eee; border-radius:4px; display:flex; justify-content:space-between;">
                        <span><b>[${a.products?.brand}] ${a.products?.model_name}</b> (${a.products?.type})</span>
                        <span style="color:#666;">S/N: ${a.serial_number}</span>
                    </div>
                  `).join('')
                : '<div style="color:#999;">등록된 기기가 없습니다.</div>';

            return `
            <li class="client-item" id="client-${client.id}">
                <div class="client-summary" data-id="${client.id}">
                    <div style="display:flex; align-items:center; gap:10px;">
                        <i class='bx bx-chevron-down toggle-icon'></i>
                        <div>
                            <strong style="font-size:1.1rem;">${client.name}</strong>
                        </div>
                    </div>
                    
                    <div style="display:flex; align-items:center; gap:15px;">
                        ${summaryBadge}
                        <span style="color:#666; font-size:0.9rem;">${client.contact_person || '미정'}</span>
                    </div>
                </div>

                <div class="client-details" id="detail-${client.id}">
                    
                    <div class="detail-grid">
                        <div class="detail-item">
                            <label>고객사명</label>
                            <span>${client.name}</span>
                        </div>
                        <div class="detail-item">
                            <label>담당자 / 연락처</label>
                            <span>${client.contact_person || '정보 없음'}</span>
                        </div>
                        <div class="detail-item">
                            <label>등록일자</label>
                            <span>${new Date(client.created_at).toLocaleDateString()}</span>
                        </div>
                        <div class="detail-item">
                            <label>비고 (추후 추가)</label>
                            <span>-</span>
                        </div>
                    </div>

                    <div style="margin-bottom:15px;">
                        <label style="font-size:0.8rem; color:#888; display:block; margin-bottom:5px;">보유 기기 목록</label>
                        <div style="display:flex; flex-direction:column; gap:5px;">
                            ${detailAssetsHtml}
                        </div>
                    </div>

                    <div style="text-align:right; border-top:1px solid #eee; padding-top:10px;">
                        <button class="btn-edit" data-id="${client.id}" data-name="${client.name}" data-contact="${client.contact_person||''}">
                            ✏️ 정보 수정 및 기기 관리
                        </button>
                        <button class="btn-delete" data-id="${client.id}" data-name="${client.name}" style="margin-left:5px;">
                            🗑️ 고객 삭제
                        </button>
                    </div>
                </div>
            </li>`;
        }).join('');
    }

    // ----------------------------------------------------
    // 2. 이벤트 리스너 (아코디언 클릭 처리)
    // ----------------------------------------------------
    
    // 리스트 클릭 이벤트 (펼치기 + 수정 + 삭제)
    ul.addEventListener('click', async (e) => {
        // A. 요약 부분 클릭 시 -> 펼치기/접기
        const summary = e.target.closest('.client-summary');
        if (summary) {
            const li = summary.parentElement;
            const detail = li.querySelector('.client-details');
            
            // 토글 클래스 추가/제거
            li.classList.toggle('expanded');
            detail.classList.toggle('show');
            return; // 펼치기만 하고 끝냄
        }

        // B. 수정 버튼 클릭
        const btnEdit = e.target.closest('.btn-edit');
        if (btnEdit) {
            e.stopPropagation(); // 부모 클릭(펼치기) 방지
            editingId = btnEdit.dataset.id;
            inputName.value = btnEdit.dataset.name;
            inputContact.value = btnEdit.dataset.contact;
            formTitle.textContent = `'${btnEdit.dataset.name}' 관리`;
            
            openForm(true);
            formPanel.scrollIntoView({ behavior: 'smooth' });
            return;
        }

        // C. 삭제 버튼 클릭
        const btnDelete = e.target.closest('.btn-delete');
        if (btnDelete) {
            e.stopPropagation(); // 부모 클릭(펼치기) 방지
            if(confirm('정말 삭제하시겠습니까?')) {
                await supabase.from('clients').delete().eq('id', btnDelete.dataset.id);
                loadData();
            }
        }
    });

    // ----------------------------------------------------
    // 3. 폼 및 기기 관리 로직 (기존 코드 유지)
    // ----------------------------------------------------
    
    // 검색
    searchInput.addEventListener('keyup', () => {
        const keyword = searchInput.value.toLowerCase();
        const filtered = allClients.filter(c => 
            (c.name||'').toLowerCase().includes(keyword) || 
            (c.contact_person||'').toLowerCase().includes(keyword)
        );
        renderList(filtered);
    });

    const openForm = (isEditMode) => {
        formPanel.classList.remove('hidden');
        btnToggle.textContent = '🔼 입력창 닫기';
        
        if (isEditMode) {
            assetSection.classList.remove('hidden');
            btnSave.textContent = '고객 정보 수정';
            loadClientAssets(editingId);
            loadStockAssets();
            loadModels();
        } else {
            resetForm();
            assetSection.classList.add('hidden');
            btnSave.textContent = '저장하기';
        }
    };

    const closeForm = () => {
        formPanel.classList.add('hidden');
        btnToggle.textContent = '➕ 신규 고객 등록';
        resetForm();
    };

    function resetForm() {
        editingId = null;
        inputName.value = '';
        inputContact.value = '';
        formTitle.textContent = '새 고객 정보 입력';
        miniAssetUl.innerHTML = '';
        inputNewSerial.value = '';
    }

    btnToggle.addEventListener('click', () => {
        if (formPanel.classList.contains('hidden')) openForm(false);
        else closeForm();
    });
    btnCancel.addEventListener('click', closeForm);

    btnSave.addEventListener('click', async () => {
        const name = inputName.value;
        const contact = inputContact.value;
        if (!name) return alert('이름 필수!');

        let res;
        if (editingId) {
            res = await supabase.from('clients').update({ name, contact_person: contact }).eq('id', editingId);
        } else {
            res = await supabase.from('clients').insert({ name, contact_person: contact });
        }

        if (res.error) alert('오류 발생');
        else {
            alert('저장되었습니다.');
            if (!editingId) closeForm();
            else alert('수정되었습니다.');
            loadData();
        }
    });

    // --- 기기 관리 내부 로직 ---
    tabAssign.addEventListener('click', () => {
        tabAssign.classList.add('active'); tabCreate.classList.remove('active');
        boxAssign.classList.remove('hidden'); boxCreate.classList.add('hidden');
    });
    tabCreate.addEventListener('click', () => {
        tabCreate.classList.add('active'); tabAssign.classList.remove('active');
        boxCreate.classList.remove('hidden'); boxAssign.classList.add('hidden');
    });

    async function loadClientAssets(clientId) {
        miniAssetUl.innerHTML = '<li>로딩 중...</li>';
        const { data } = await supabase.from('assets').select('*, products(brand, model_name, type)').eq('client_id', clientId);
        if (!data || data.length === 0) {
            miniAssetUl.innerHTML = '<li>보유 중인 기기가 없습니다.</li>';
        } else {
            miniAssetUl.innerHTML = data.map(asset => `
                <li>
                    <span><b>[${asset.products?.brand}] ${asset.products?.model_name}</b> (${asset.products?.type})</span>
                    <button class="btn-tiny btn-unlink" data-id="${asset.id}" style="color:red; border-color:red;">반납</button>
                </li>
            `).join('');
        }
    }

   // 3-2. 연결 해제 (반납) - 상태 자동 변경 로직 포함
    miniAssetUl.addEventListener('click', async (e) => {
        if (e.target.classList.contains('btn-unlink')) {
            if (!confirm('이 기기를 반납 처리하시겠습니까?\n(상태가 [재고]로 변경됩니다)')) return;
            
            // ★ 여기가 핵심입니다!
            // client_id를 null로 지우면서, 동시에 status를 '재고'로 덮어씁니다.
            await supabase
                .from('assets')
                .update({ 
                    client_id: null, 
                    status: '재고'  // <--- 이 부분이 꼭 있어야 합니다!
                })
                .eq('id', e.target.dataset.id);
            
            refreshAll(); // 화면 갱신
        }
    });

    async function loadStockAssets() {
        const { data } = await supabase.from('assets').select('id, serial_number, products(model_name)').is('client_id', null);
        selStockAsset.innerHTML = '<option value="">-- 창고 기기 선택 --</option>' + (data || []).map(a => `<option value="${a.id}">[${a.products?.model_name}] ${a.serial_number}</option>`).join('');
    }

    // 3-4. 재고 기기 추가 (Assign)
    btnAddStock.addEventListener('click', async () => {
        const assetId = selStockAsset.value;
        if (!assetId) return alert('기기를 선택하세요.');

        // ★ 여기서도 status를 '사용중'으로 함께 바꿔줍니다.
        await supabase
            .from('assets')
            .update({ 
                client_id: editingId, 
                status: '사용중' // <--- 확인 필수!
            })
            .eq('id', assetId);
        
        alert('기기가 추가되었습니다.');
        refreshAll();
    });

    async function loadModels() {
        const { data } = await supabase.from('products').select('*');
        selNewModel.innerHTML = '<option value="">모델 선택</option>' + (data || []).map(p => `<option value="${p.id}">${p.model_name}</option>`).join('');
    }

    btnCreateAsset.addEventListener('click', async () => {
        if (!selNewModel.value || !inputNewSerial.value) return alert('입력 확인');
        const { error } = await supabase.from('assets').insert({ product_id: selNewModel.value, serial_number: inputNewSerial.value, client_id: editingId, status: '사용중' });
        if (!error) { inputNewSerial.value = ''; refreshAll(); }
    });

    function refreshAll() {
        if (editingId) loadClientAssets(editingId);
        loadStockAssets();
        loadData();
    }
}