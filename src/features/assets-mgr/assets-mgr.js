// src/features/assets-mgr/assets-mgr.js

import { supabase } from '../../common/db.js';
import { loadCSS } from '../../common/utils.js';
// ★ 중요: 분리한 view 파일에서 render 함수를 가져옵니다.
import { render } from './assets-mgr.view.js';

// router가 호출할 수 있도록 그대로 내보내줍니다.
export { render };

// ============================================================
//  2. [Init] 기능 로직 (기존 코드 유지)
// ============================================================
export async function init() {
    loadCSS('./src/features/assets-mgr/style.css');

    // DOM 요소 선택
    const modal = document.getElementById('asset-modal');
    const btnOpenModal = document.getElementById('btn-open-modal');
    const btnCloseModal = document.getElementById('btn-close-modal');
    const btnSave = document.getElementById('btn-save');
    const formTitle = document.getElementById('form-title');

    const tbody = document.getElementById('asset-list-tbody');
    const searchInput = document.getElementById('search-input');
    const searchFilter = document.getElementById('search-filter');

    // 폼 내부 요소
    const selModel = document.getElementById('select-model');
    const selClient = document.getElementById('select-client');
    const inputSerial = document.getElementById('input-serial');
    const inputStatus = document.getElementById('input-status');
    const assetIdField = document.getElementById('asset-id');

    // 새 모델 관련
    const btnNewModelMode = document.getElementById('btn-new-model-mode');
    const newModelInputs = document.getElementById('new-model-inputs');
    const inputNewBrand = document.getElementById('input-new-brand');
    const inputNewModel = document.getElementById('input-new-model');
    const inputNewType = document.getElementById('input-new-type');

    let editingId = null;
    let isNewModelMode = false;
    let allAssets = [];

    // 초기 데이터 로드
    await Promise.all([loadAssets(), loadModels(), loadClients()]);

    // --- 모달 제어 함수 ---
    function openModal(isEdit) {
        modal.style.display = 'flex';
        
        if (isEdit) {
            formTitle.innerHTML = "<i class='bx bx-edit'></i> 기기 정보 수정";
        } else {
            formTitle.innerHTML = "<i class='bx bx-box'></i> 신규 기기 입고";
            resetForm();
        }
    }

    function closeModal() {
        modal.style.display = 'none';
        resetForm();
    }

    function resetForm() {
        editingId = null;
        assetIdField.value = '';
        inputSerial.value = '';
        selClient.value = '';
        inputStatus.value = '재고';
        
        isNewModelMode = false;
        newModelInputs.classList.add('hidden');
        selModel.disabled = false;
        selModel.value = '';
        btnNewModelMode.textContent = "✨ 새 모델";
        btnNewModelMode.classList.remove('btn-primary');
        btnNewModelMode.classList.add('btn-secondary');
        
        inputNewBrand.value = '';
        inputNewModel.value = '';
    }

    if(btnOpenModal) btnOpenModal.addEventListener('click', () => openModal(false));
    if(btnCloseModal) btnCloseModal.addEventListener('click', closeModal);


    // --- [기능 1] 데이터 로드 ---
    async function loadModels() {
        const { data } = await supabase.from('products').select('*').order('brand', { ascending: true });
        if (data) {
            selModel.innerHTML = '<option value="">-- 모델 선택 --</option>' + 
                data.map(p => `<option value="${p.id}">[${p.brand}] ${p.model_name} (${p.type})</option>`).join('');
        }
    }

    async function loadClients() {
        const { data } = await supabase.from('clients').select('id, name').order('name');
        if (data) {
            selClient.innerHTML = '<option value="">(미지정 - 창고 보관)</option>' + 
                data.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
        }
    }

    async function loadAssets() {
        const { data, error } = await supabase
            .from('assets')
            .select(`*, products ( brand, model_name, type ), clients ( name )`)
            .order('created_at', { ascending: false });

        if (error) return console.error(error);
        allAssets = data;
        
        const countSpan = document.getElementById('total-asset-count');
        if (countSpan) countSpan.textContent = `${data.length}대`;
        
        renderList(allAssets);
    }

    function renderList(list) {
        if (!list || list.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:30px; color:#999;">데이터가 없습니다.</td></tr>';
            return;
        }

        tbody.innerHTML = list.map(asset => {
            const product = asset.products || { brand: '-', model_name: '미상', type: '' };
            const clientName = asset.clients ? `🏢 ${asset.clients.name}` : `<span style="color:#9ca3af">📦 창고 대기</span>`;
            
            let statusBadge = `<span class="badge" style="background:#f3f4f6; color:#4b5563;">${asset.status}</span>`;
            if (asset.status === '사용중') statusBadge = `<span class="badge" style="background:#dcfce7; color:#16a34a;">사용중</span>`;
            if (asset.status === '수리중') statusBadge = `<span class="badge" style="background:#fee2e2; color:#dc2626;">수리중</span>`;

            return `
            <tr style="border-bottom:1px solid #eee;">
                <td style="padding:12px;">
                    <div style="font-weight:600; color:#333;">${product.model_name}</div>
                    <div style="font-size:0.8rem; color:#888;">${product.brand} (${product.type})</div>
                </td>
                <td style="font-family:monospace; font-weight:600;">${asset.serial_number}</td>
                <td>${statusBadge}</td>
                <td>${clientName}</td>
                <td>
                    <button class="btn-edit" 
                        data-id="${asset.id}" 
                        data-pid="${asset.product_id}" 
                        data-cid="${asset.client_id || ''}" 
                        data-sn="${asset.serial_number}"
                        data-st="${asset.status}"
                        style="cursor:pointer; border:1px solid #ddd; background:white; border-radius:4px; padding:4px 8px; margin-right:5px;">
                        ✏️
                    </button>
                    <button class="btn-delete" 
                        data-id="${asset.id}"
                        style="cursor:pointer; border:1px solid #fee2e2; background:white; color:red; border-radius:4px; padding:4px 8px;">
                        🗑️
                    </button>
                </td>
            </tr>
            `;
        }).join('');
    }

    // --- [기능 2] 폼 동작 ---
    
    // 새 모델 모드 토글
    btnNewModelMode.addEventListener('click', () => {
        isNewModelMode = !isNewModelMode;
        if (isNewModelMode) {
            newModelInputs.classList.remove('hidden');
            selModel.disabled = true;
            selModel.value = "";
            btnNewModelMode.textContent = "↩️ 취소";
            btnNewModelMode.classList.remove('btn-secondary');
            btnNewModelMode.classList.add('btn-primary');
        } else {
            newModelInputs.classList.add('hidden');
            selModel.disabled = false;
            btnNewModelMode.textContent = "✨ 새 모델";
            btnNewModelMode.classList.remove('btn-primary');
            btnNewModelMode.classList.add('btn-secondary');
        }
    });

    // -------------------------------------------------------------
    // ★ 자동 상태 변경 로직 (양방향)
    // -------------------------------------------------------------
    
    // 1. 고객사를 선택하면 -> 상태가 '사용중'이 됨
    selClient.addEventListener('change', () => {
        if (selClient.value) {
            inputStatus.value = '사용중';
        } else {
            inputStatus.value = '재고';
        }
    });

    // 2. 상태를 '재고'로 바꾸면 -> 고객사가 풀림 (요청사항 반영)
    inputStatus.addEventListener('change', () => {
        if (inputStatus.value === '재고') {
            selClient.value = ""; // 고객 선택 해제
        }
    });


    // --- [기능 3] 저장 로직 (★ 시리얼 중복 체크 추가) ---
    btnSave.addEventListener('click', async () => {
        const serial = inputSerial.value.trim(); // 공백제거
        const status = inputStatus.value;
        const clientId = selClient.value || null;
        let finalProductId = selModel.value;

        if (!serial) return alert('시리얼 번호는 필수입니다.');

        // 1. 시리얼 번호 중복 체크 (DB 조회)
        let duplicateCheck = supabase.from('assets').select('id').eq('serial_number', serial);
        // 수정 중이라면, 내 자신(editingId)은 중복 체크에서 제외해야 함
        if (editingId) {
            duplicateCheck = duplicateCheck.neq('id', editingId);
        }
        
        const { data: duplicates } = await duplicateCheck;
        
        if (duplicates && duplicates.length > 0) {
            alert(`⚠️ 이미 존재하는 시리얼 번호입니다: ${serial}\n\n다른 번호를 입력해주세요.`);
            return; // 저장 중단
        }

        // 2. 신규 모델 생성 로직
        if (isNewModelMode) {
            const newBrand = inputNewBrand.value;
            const newModelName = inputNewModel.value;
            const newType = inputNewType.value;
            if (!newBrand || !newModelName) return alert('새 모델 정보를 입력하세요.');

            const { data: prodData, error: prodError } = await supabase
                .from('products')
                .insert({ brand: newBrand, model_name: newModelName, type: newType })
                .select().single();
            
            if (prodError) return alert('모델 생성 실패: ' + prodError.message);
            finalProductId = prodData.id;
            await loadModels();
        }

        if (!finalProductId) return alert('모델을 선택해주세요.');

        // 3. 최종 저장
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

        if (result.error) alert('저장 실패: ' + result.error.message);
        else {
            alert('저장되었습니다.');
            closeModal();
            loadAssets();
        }
    });

    // --- [기능 4] 수정/삭제/검색 ---
    tbody.addEventListener('click', async (e) => {
        const btnEdit = e.target.closest('.btn-edit');
        const btnDelete = e.target.closest('.btn-delete');

        if (btnEdit) {
            editingId = btnEdit.dataset.id;
            assetIdField.value = editingId;
            selModel.value = btnEdit.dataset.pid;
            inputSerial.value = btnEdit.dataset.sn;
            inputStatus.value = btnEdit.dataset.st;
            selClient.value = btnEdit.dataset.cid;
            
            isNewModelMode = false;
            newModelInputs.classList.add('hidden');
            selModel.disabled = false;
            btnNewModelMode.textContent = "✨ 새 모델";
            btnNewModelMode.classList.remove('btn-primary');
            btnNewModelMode.classList.add('btn-secondary');

            openModal(true);
        }

        if (btnDelete) {
            if(confirm('정말 삭제하시겠습니까?')) {
                await supabase.from('assets').delete().eq('id', btnDelete.dataset.id);
                loadAssets();
            }
        }
    });

    searchInput.addEventListener('keyup', () => {
        const keyword = searchInput.value.toLowerCase();
        const filterType = searchFilter.value;
        const filtered = allAssets.filter(asset => {
            const sn = asset.serial_number.toLowerCase();
            const brand = (asset.products?.brand || '').toLowerCase();
            const model = (asset.products?.model_name || '').toLowerCase();
            const client = (asset.clients?.name || '').toLowerCase();
            const status = (asset.status || '').toLowerCase(); 

            if (filterType === 'serial') return sn.includes(keyword);
            if (filterType === 'model') return model.includes(keyword) || brand.includes(keyword);
            if (filterType === 'client') return client.includes(keyword);
            return sn.includes(keyword) || model.includes(keyword) || brand.includes(keyword) || client.includes(keyword) || status.includes(keyword);
        });
        renderList(filtered);
    });
}