import { supabase } from '../../common/db.js';
import { loadCSS, loadHTML } from '../../common/utils.js';

export async function render() {
    return await loadHTML('./src/features/clients/clients.html');
}

export async function init() {
    loadCSS('./src/features/clients/style.css');

    // --- DOM 요소 선택 ---
    const btnToggle = document.getElementById('btn-toggle-form');
    const formPanel = document.getElementById('form-panel');
    const formTitle = document.getElementById('form-title');
    const btnCancel = document.getElementById('btn-cancel');
    const btnSave = document.getElementById('btn-save');
    const ul = document.getElementById('client-list-ul');
    const searchInput = document.getElementById('search-input');

    // 입력 필드
    const inputName = document.getElementById('input-name');
    const inputContact = document.getElementById('input-contact');

    // --- [추가됨] 기기 관리 섹션 요소들 ---
    const assetSection = document.getElementById('asset-manage-section');
    const miniAssetUl = document.getElementById('client-asset-list');
    
    // 기기 추가 탭 버튼
    const tabAssign = document.getElementById('tab-assign-exist');
    const tabCreate = document.getElementById('tab-create-new');
    const boxAssign = document.getElementById('box-assign-exist');
    const boxCreate = document.getElementById('box-create-new');

    // 기기 추가 입력 요소
    const selStockAsset = document.getElementById('select-stock-asset');
    const btnAddStock = document.getElementById('btn-add-stock');
    const selNewModel = document.getElementById('select-new-model');
    const inputNewSerial = document.getElementById('input-new-serial');
    const btnCreateAsset = document.getElementById('btn-create-asset');

    // 상태 변수
    let editingId = null; 
    let allClients = [];

    // 초기 로드
    loadData();

    // ============================================================
    //  1. 메인 기능: 고객 목록 & 검색 & CRUD
    // ============================================================

    async function loadData() {
        // 고객 + 보유 자산 정보 + 자산의 모델 정보
        const { data, error } = await supabase
            .from('clients')
            .select(`
                *,
                assets (
                    id, serial_number, status,
                    products ( brand, model_name )
                )
            `)
            .order('created_at', { ascending: false });
        
        if (error) return console.error(error);
        allClients = data;
        renderList(allClients);
    }

    function renderList(list) {
        if (!list.length) {
            ul.innerHTML = '<li style="justify-content:center; color:#999;">데이터가 없습니다.</li>';
            return;
        }
        ul.innerHTML = list.map(client => {
            const assets = client.assets || [];
            const assetsBadge = assets.length > 0
                ? assets.map(a => `<span class="asset-badge"><i class='bx bxs-printer'></i> ${a.products?.model_name}</span>`).join(' ')
                : '<span style="color:#ccc; font-size:0.8rem;">(기기 없음)</span>';

            return `
            <li>
                <div class="client-info">
                    <div>
                        <strong>${client.name}</strong>
                        <small style="color:#666; background:#eee; padding:2px 5px; border-radius:4px;">${client.contact_person || '미정'}</small>
                    </div>
                    <div class="asset-tags" style="margin-top:5px;">${assetsBadge}</div>
                </div>
                <div class="btn-group">
                    <button class="btn-edit" data-id="${client.id}" data-name="${client.name}" data-contact="${client.contact_person||''}">수정/기기관리</button>
                    <button class="btn-delete" data-id="${client.id}" data-name="${client.name}">삭제</button>
                </div>
            </li>`;
        }).join('');
    }

    // 검색
    searchInput.addEventListener('keyup', () => {
        const keyword = searchInput.value.toLowerCase();
        const filtered = allClients.filter(c => 
            (c.name||'').toLowerCase().includes(keyword) || 
            (c.contact_person||'').toLowerCase().includes(keyword)
        );
        renderList(filtered);
    });

    // ============================================================
    //  2. 폼 제어 (수정 모드일 때 기기 관리 섹션 열림)
    // ============================================================

    const openForm = (isEditMode) => {
        formPanel.classList.remove('hidden');
        btnToggle.textContent = '🔼 입력창 닫기';
        
        if (isEditMode) {
            assetSection.classList.remove('hidden'); // 기기 관리 보이기
            btnSave.textContent = '고객 정보 수정';
            // 수정 모드일 때 필요한 데이터 로드
            loadClientAssets(editingId); // 이 고객의 기기 목록
            loadStockAssets();           // 창고에 있는 기기 목록
            loadModels();                // 모델 목록 (신규 등록용)
        } else {
            resetForm();
            assetSection.classList.add('hidden'); // 신규 등록 땐 숨기기
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
        // 기기 관련 UI 초기화
        miniAssetUl.innerHTML = '';
        inputNewSerial.value = '';
    }

    btnToggle.addEventListener('click', () => {
        if (formPanel.classList.contains('hidden')) openForm(false); // 신규 모드로 열기
        else closeForm();
    });
    btnCancel.addEventListener('click', closeForm);

    // 고객 저장/수정
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
            if (!editingId) closeForm(); // 신규 등록이면 닫기
            else {
                 alert('정보가 수정되었습니다. 기기 관리를 계속할 수 있습니다.');
            }
            loadData(); // 메인 리스트 갱신
        }
    });

    // 리스트 클릭 (수정/삭제)
    ul.addEventListener('click', async (e) => {
        const btnEdit = e.target.closest('.btn-edit');
        const btnDelete = e.target.closest('.btn-delete');

        if (btnEdit) {
            editingId = btnEdit.dataset.id;
            inputName.value = btnEdit.dataset.name;
            inputContact.value = btnEdit.dataset.contact;
            formTitle.textContent = `'${btnEdit.dataset.name}' 관리`;
            
            openForm(true); // ★ 수정 모드로 열기
            
            // 화면 스크롤을 폼으로 이동
            formPanel.scrollIntoView({ behavior: 'smooth' });
        }

        if (btnDelete) {
            if(confirm('삭제하시겠습니까? 연결된 기기 정보가 꼬일 수 있습니다.')) {
                await supabase.from('clients').delete().eq('id', btnDelete.dataset.id);
                loadData();
            }
        }
    });


    // ============================================================
    //  3. [핵심] 폼 내부 기기 관리 (Asset Management)
    // ============================================================

    // 3-0. 기기 추가 탭 전환 (재고 vs 신규)
    tabAssign.addEventListener('click', () => {
        tabAssign.classList.add('active'); tabCreate.classList.remove('active');
        boxAssign.classList.remove('hidden'); boxCreate.classList.add('hidden');
    });
    tabCreate.addEventListener('click', () => {
        tabCreate.classList.add('active'); tabAssign.classList.remove('active');
        boxCreate.classList.remove('hidden'); boxAssign.classList.add('hidden');
    });

    // 3-1. 현재 고객의 보유 기기 로드
    async function loadClientAssets(clientId) {
        miniAssetUl.innerHTML = '<li>로딩 중...</li>';
        
        const { data } = await supabase
            .from('assets')
            .select('*, products(model_name)')
            .eq('client_id', clientId);
            
        if (!data || data.length === 0) {
            miniAssetUl.innerHTML = '<li>보유 중인 기기가 없습니다.</li>';
        } else {
            miniAssetUl.innerHTML = data.map(asset => `
                <li>
                    <span>
                        <b>${asset.products?.model_name}</b> (S/N: ${asset.serial_number})
                    </span>
                    <button class="btn-tiny btn-unlink" data-id="${asset.id}" style="color:red; border-color:red;">반납(연결해제)</button>
                </li>
            `).join('');
        }
    }

    // 3-2. 연결 해제 (반납)
    miniAssetUl.addEventListener('click', async (e) => {
        if (e.target.classList.contains('btn-unlink')) {
            if (!confirm('이 기기를 고객 목록에서 제외하시겠습니까? (창고 재고로 변경됨)')) return;
            
            // client_id를 null로 변경, status를 '재고'로 변경
            await supabase.from('assets').update({ client_id: null, status: '재고' }).eq('id', e.target.dataset.id);
            
            refreshAll(); // 화면 갱신
        }
    });

    // 3-3. 창고(재고) 기기 목록 로드
    async function loadStockAssets() {
        // client_id가 비어있는 것(null)만 가져옴
        const { data } = await supabase.from('assets')
            .select('id, serial_number, products(model_name)')
            .is('client_id', null);
            
        selStockAsset.innerHTML = '<option value="">-- 창고 기기 선택 --</option>' + 
            (data || []).map(a => `<option value="${a.id}">[${a.products?.model_name}] ${a.serial_number}</option>`).join('');
    }

    // 3-4. 재고 기기 추가 (Assign)
    btnAddStock.addEventListener('click', async () => {
        const assetId = selStockAsset.value;
        if (!assetId) return alert('기기를 선택하세요.');

        // client_id를 현재 고객으로, status를 '사용중'으로 변경
        await supabase.from('assets').update({ client_id: editingId, status: '사용중' }).eq('id', assetId);
        
        alert('기기가 추가되었습니다.');
        refreshAll();
    });

    // 3-5. 신규 기기 즉석 등록 (Create & Assign)
    async function loadModels() {
        const { data } = await supabase.from('products').select('*');
        selNewModel.innerHTML = '<option value="">모델 선택</option>' + 
            (data || []).map(p => `<option value="${p.id}">${p.model_name}</option>`).join('');
    }

    btnCreateAsset.addEventListener('click', async () => {
        const modelId = selNewModel.value;
        const serial = inputNewSerial.value;
        if (!modelId || !serial) return alert('모델과 시리얼을 입력하세요.');

        // 기기 생성과 동시에 현재 고객에게 할당
        const { error } = await supabase.from('assets').insert({
            product_id: modelId,
            serial_number: serial,
            client_id: editingId, // ★ 현재 수정중인 고객 ID 바로 할당
            status: '사용중'
        });

        if (error) alert('등록 실패: ' + error.message);
        else {
            alert('새 기기가 등록되고 배정되었습니다.');
            inputNewSerial.value = '';
            refreshAll();
        }
    });

    // ★ 모든 데이터 새로고침 헬퍼
    function refreshAll() {
        if (editingId) loadClientAssets(editingId); // 미니 리스트 갱신
        loadStockAssets(); // 재고 목록 갱신 (방금 가져온 건 빠져야 하니까)
        loadData();        // 메인 고객 리스트 갱신
    }
}