import { supabase } from '../../common/db.js';
import { loadCSS, loadHTML } from '../../common/utils.js';

export async function render() {
    return await loadHTML('./src/features/assets-mgr/assets-mgr.html');
}

export async function init() {
    loadCSS('./src/features/assets-mgr/style.css');

    // DOM 요소 선택
    const btnToggle = document.getElementById('btn-toggle-form');
    const formPanel = document.getElementById('form-panel');
    const btnCancel = document.getElementById('btn-cancel');
    const btnSave = document.getElementById('btn-save');
    const ul = document.getElementById('asset-list-ul');
    
    // 검색
    const searchInput = document.getElementById('search-input');
    const searchFilter = document.getElementById('search-filter');

    // 입력 필드들
    const selModel = document.getElementById('select-model');
    const selClient = document.getElementById('select-client');
    const inputSerial = document.getElementById('input-serial');
    const inputStatus = document.getElementById('input-status');

    // 새 모델 만들기 관련 DOM
    const btnNewModelMode = document.getElementById('btn-new-model-mode');
    const btnDeleteModel = document.getElementById('btn-delete-model');
    const newModelInputs = document.getElementById('new-model-inputs');
    const inputNewBrand = document.getElementById('input-new-brand');
    const inputNewModel = document.getElementById('input-new-model');
    const inputNewType = document.getElementById('input-new-type');

    // 상태 변수
    let editingId = null;   // 수정 중인 자산 ID
    let isNewModelMode = false; // "새 모델 만들기" 모드인지?
    let allAssets = [];     // 검색용 전체 데이터

    // 1. 초기 데이터 로드 (자산, 모델, 고객)
    await Promise.all([loadAssets(), loadModels(), loadClients()]);

    // --- [기능 1] 모델 목록 & 고객 목록 불러오기 ---
    async function loadModels() {
        const { data } = await supabase.from('products').select('*').order('brand', { ascending: true });
        if (data) {
            selModel.innerHTML = '<option value="">-- 모델을 선택하세요 --</option>' + 
                data.map(p => `<option value="${p.id}">[${p.brand}] ${p.model_name} (${p.type})</option>`).join('');
        }
    }

    async function loadClients() {
        const { data } = await supabase.from('clients').select('id, name');
        if (data) {
            selClient.innerHTML = '<option value="">(미지정 - 창고 보관)</option>' + 
                data.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
        }
    }

    // --- [기능 2] 자산 목록 불러오기 (Join) ---
    async function loadAssets() {
        const { data, error } = await supabase
            .from('assets')
            .select(`
                *,
                products ( brand, model_name, type ),
                clients ( name )
            `)
            .order('created_at', { ascending: false });

        if (error) return console.error(error);
            allAssets = data;
            const countSpan = document.getElementById('total-asset-count');
        if (countSpan) countSpan.textContent = `${data.length}대`; // 예: "42대"
        renderList(allAssets);
    }

    function renderList(list) {
        if (!list || list.length === 0) {
            ul.innerHTML = '<li style="justify-content:center; color:#999;">데이터가 없습니다.</li>';
            return;
        }

        ul.innerHTML = list.map(asset => {
            const product = asset.products || { brand: '?', model_name: '삭제된 모델', type: '' };
            const clientName = asset.clients ? `🏢 ${asset.clients.name}` : `<span style="color:#999">📦 창고 대기</span>`;
            
            // 상태별 뱃지 클래스
            let statusClass = 'st-stock';
            if (asset.status === '사용중') statusClass = 'st-active';
            if (asset.status === '수리중') statusClass = 'st-repair';

            return `
            <li>
                <div class="asset-main-info">
                    <div>
                        <span class="badge" style="background:#eee;">${product.brand}</span>
                        <strong style="font-size:1.1rem; color:#333;">${product.model_name}</strong>
                        <small style="color:#888;">(${product.type})</small>
                    </div>
                    <div class="asset-sub-info">
                        <span class="status-badge ${statusClass}">${asset.status}</span>
                        <span>S/N: <b>${asset.serial_number}</b></span>
                        <span style="margin-left:10px;">${clientName}</span>
                    </div>
                </div>
                <div class="btn-group">
                    <button class="btn-edit btn-edit" 
                        data-id="${asset.id}" 
                        data-pid="${asset.product_id}" 
                        data-cid="${asset.client_id || ''}" 
                        data-sn="${asset.serial_number}"
                        data-st="${asset.status}">수정/이동</button>
                    <button class="btn-delete btn-delete" data-id="${asset.id}">삭제</button>
                </div>
            </li>
            `;
        }).join('');
    }

    // --- [기능 3] 폼 UI 제어 ---
    
    // 새 모델 만들기 버튼 토글
    btnNewModelMode.addEventListener('click', () => {
        isNewModelMode = !isNewModelMode; // true <-> false 반전
        
        if (isNewModelMode) {
            newModelInputs.classList.remove('hidden');
            selModel.disabled = true; // 기존 선택박스 잠금
            selModel.value = "";
            btnNewModelMode.textContent = "↩️ 기존 모델 선택하기";
            btnNewModelMode.style.backgroundColor = "#666";
        } else {
            newModelInputs.classList.add('hidden');
            selModel.disabled = false; // 잠금 해제
            btnNewModelMode.textContent = "✨ 새 모델 만들기";
            btnNewModelMode.style.backgroundColor = "#6c5ce7";
        }
    });

    const toggleForm = (show) => {
        if(show) {
            formPanel.classList.remove('hidden');
            btnToggle.textContent = '🔼 입력창 닫기';
        } else {
            formPanel.classList.add('hidden');
            btnToggle.textContent = '➕ 기기 입고/등록';
            resetForm();
        }
    };

    function resetForm() {
        editingId = null;
        inputSerial.value = '';
        selClient.value = '';
        inputStatus.value = '재고';
        
        // 모델 관련 리셋
        isNewModelMode = false;
        newModelInputs.classList.add('hidden');
        selModel.disabled = false;
        selModel.value = '';
        btnNewModelMode.textContent = "✨ 새 모델 만들기";
        btnNewModelMode.style.backgroundColor = "#6c5ce7";
        
        inputNewBrand.value = '';
        inputNewModel.value = '';
    }

    btnToggle.addEventListener('click', () => toggleForm(formPanel.classList.contains('hidden')));
    btnCancel.addEventListener('click', () => toggleForm(false));
    
    // 선택한 모델 삭제하기 (카탈로그 정리)
    if (btnDeleteModel) {
        btnDeleteModel.addEventListener('click', async () => {
            const modelId = selModel.value;
            
            // 1. 선택된 모델이 없으면 경고
            if (!modelId) return alert('삭제할 모델을 목록에서 선택해주세요.');

            // 2. 현재 선택된 텍스트 가져오기 (확인 메시지용)
            const modelText = selModel.options[selModel.selectedIndex].text;

            if (!confirm(`정말 모델 목록에서 삭제하시겠습니까?\n\n대상: ${modelText}\n\n(주의: 해당 모델로 등록된 기기가 단 하나라도 있으면 삭제되지 않습니다.)`)) {
                return;
            }

            // 3. Supabase 삭제 요청
            const { error } = await supabase
                .from('products')
                .delete()
                .eq('id', modelId);

            if (error) {
                // 외래키 제약조건 에러 (기기가 남아있는데 모델을 지우려 할 때)
                if (error.code === '23503') { // Postgres FK violation code
                    alert('❌ 삭제 실패!\n\n이 모델로 등록된 기기(Assets)가 아직 남아있습니다.\n기기를 먼저 모두 삭제하거나 모델을 변경해주세요.');
                } else {
                    alert('삭제 중 오류 발생: ' + error.message);
                }
            } else {
                alert('🗑️ 모델이 삭제되었습니다.');
                loadModels(); // 모델 목록 새로고침
                selModel.value = ''; // 선택 초기화
            }
        });
    }
    
    // --- [기능 4] 저장 로직 (★ 제일 중요) ---
    btnSave.addEventListener('click', async () => {
        const serial = inputSerial.value;
        const status = inputStatus.value;
        const clientId = selClient.value || null;
        let finalProductId = selModel.value; // 최종적으로 저장될 모델 ID

        if (!serial) return alert('시리얼 번호는 필수입니다.');

        // 4-1. 만약 "새 모델 만들기" 모드라면?
        if (isNewModelMode) {
            const newBrand = inputNewBrand.value;
            const newModelName = inputNewModel.value;
            const newType = inputNewType.value;

            if (!newBrand || !newModelName) return alert('새 모델의 제조사와 모델명을 입력해주세요.');

            // (1) Products 테이블에 먼저 저장
            const { data: prodData, error: prodError } = await supabase
                .from('products')
                .insert({ brand: newBrand, model_name: newModelName, type: newType })
                .select() // 저장된 데이터(ID 포함)를 바로 반환받음
                .single();

            if (prodError) return alert('모델 생성 실패: ' + prodError.message);
            
            // (2) 생성된 ID 확보
            finalProductId = prodData.id;
            
            // (3) 목록 새로고침 (다음에 쓸 수 있게)
            loadModels(); 
        }

        if (!finalProductId) return alert('모델을 선택하거나 새로 만들어주세요.');

        // 4-2. Assets 테이블에 저장
        const payload = {
            serial_number: serial,
            status: status,
            client_id: clientId,
            product_id: finalProductId
        };

        let result;
        if (editingId) {
            result = await supabase.from('assets').update(payload).eq('id', editingId);
        } else {
            result = await supabase.from('assets').insert(payload);
        }

        if (result.error) {
            alert('저장 실패: ' + result.error.message);
        } else {
            alert('저장되었습니다.');
            toggleForm(false);
            loadAssets();
        }
    });

    // -----------------------------------------------------------
    // ★ [추가 기능] 설치처 선택 시 상태 자동 변경 (자동화)
    // -----------------------------------------------------------
    selClient.addEventListener('change', () => {
        // 고객을 선택했다면? (value가 있으면)
        if (selClient.value) {
            inputStatus.value = '사용중'; // 자동으로 '사용중'으로 변경
        } else {
            // 고객 선택을 취소했다면? (미지정)
            inputStatus.value = '재고';   // 자동으로 '재고'로 변경
        }
    });

    // --- [기능 5] 수정/삭제/검색 ---
    ul.addEventListener('click', async (e) => {
        const btnEdit = e.target.closest('.btn-edit');
        const btnDelete = e.target.closest('.btn-delete');

        if (btnEdit) {
            editingId = btnEdit.dataset.id;
            selModel.value = btnEdit.dataset.pid; // 기존 모델 선택
            inputSerial.value = btnEdit.dataset.sn;
            inputStatus.value = btnEdit.dataset.st;
            selClient.value = btnEdit.dataset.cid;
            
            // 수정 시에는 "새 모델 만들기" 기능 끄기 (복잡도 방지)
            isNewModelMode = false;
            newModelInputs.classList.add('hidden');
            selModel.disabled = false;

            toggleForm(true);
        }

        if (btnDelete) {
            if(confirm('정말 삭제하시겠습니까?')) {
                await supabase.from('assets').delete().eq('id', btnDelete.dataset.id);
                loadAssets();
            }
        }
    });

    // 검색 로직
// --- [기능 5] 검색 로직 (상태 검색 추가됨) ---
    searchInput.addEventListener('keyup', () => {
        const keyword = searchInput.value.toLowerCase(); // 검색어
        const filterType = searchFilter.value;           // 필터 종류

        const filtered = allAssets.filter(asset => {
            // 1. 비교할 데이터들 준비
            const sn = asset.serial_number.toLowerCase();
            const brand = (asset.products?.brand || '').toLowerCase();
            const model = (asset.products?.model_name || '').toLowerCase();
            const client = (asset.clients?.name || '').toLowerCase();
            const status = (asset.status || '').toLowerCase(); 

            // 2. 필터 선택에 따른 검색
            if (filterType === 'serial') return sn.includes(keyword);
            if (filterType === 'model') return model.includes(keyword) || brand.includes(keyword);
            if (filterType === 'client') return client.includes(keyword);
            
            // 3. 전체(all) 선택 시 -> 상태(status)도 함께 검사!
            return sn.includes(keyword) || 
                   model.includes(keyword) || 
                   brand.includes(keyword) || 
                   client.includes(keyword) ||
                   status.includes(keyword); // <--- 여기가 핵심!
        });
        
        renderList(filtered);
    });
} // init 함수 끝