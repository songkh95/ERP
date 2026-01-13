import { supabase } from '../../../common/db.js';
import { loadCSS } from '../../../common/utils.js';
import { render } from './machines.view.js';

export { render };

export async function init() {
    loadCSS('./src/features/assets-mgr/style.css');

    // DOM 요소 선택
    const modal = document.getElementById('asset-modal');
    const btnOpenModal = document.getElementById('btn-open-modal');
    const btnCloseX = document.getElementById('btn-close-x');       
    const btnCloseBottom = document.getElementById('btn-close-bottom'); 
    const btnSave = document.getElementById('btn-save');
    const formTitle = document.getElementById('form-title');

    const tbody = document.getElementById('asset-list-tbody');
    const modelSummaryArea = document.getElementById('model-summary-area');

    // ★ 검색 관련 요소
    const searchInput = document.getElementById('search-input');
    const searchFilter = document.getElementById('search-filter');
    const dateStart = document.getElementById('date-start');
    const dateEnd = document.getElementById('date-end');
    const btnSearchApply = document.getElementById('btn-search-apply');
    const btnSearchReset = document.getElementById('btn-search-reset');

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

    try {
        await Promise.all([loadAssets(), loadModels(), loadClients()]);
    } catch (e) {
        console.error("데이터 로드 실패:", e);
    }

    // --- 모달 제어 ---
    function openModal(isEdit) {
        if(!modal) return;
        modal.style.display = 'flex';
        
        if (isEdit) {
            formTitle.innerHTML = "<i class='bx bx-edit'></i> 기기 정보 수정";
        } else {
            formTitle.innerHTML = "<i class='bx bx-box'></i> 신규 기기 입고";
            resetForm();
        }
    }

    function closeModal() {
        if(!modal) return;
        modal.style.display = 'none';
        resetForm();
    }

    function resetForm() {
        editingId = null;
        if(assetIdField) assetIdField.value = '';
        if(inputSerial) inputSerial.value = '';
        if(selClient) selClient.value = '';
        if(inputStatus) inputStatus.value = '재고';
        
        isNewModelMode = false;
        if(newModelInputs) newModelInputs.style.display = 'none';
        
        if(selModel) {
            selModel.disabled = false;
            selModel.value = '';
        }
        if(btnNewModelMode) {
            btnNewModelMode.textContent = "✨ 새 모델";
            btnNewModelMode.style.background = "#fff"; 
            btnNewModelMode.style.color = "#333";
        }
        if(inputNewBrand) inputNewBrand.value = '';
        if(inputNewModel) inputNewModel.value = '';
    }

    if(btnOpenModal) btnOpenModal.addEventListener('click', () => openModal(false));
    if(btnCloseX) btnCloseX.addEventListener('click', closeModal);
    if(btnCloseBottom) btnCloseBottom.addEventListener('click', closeModal);


    // --- 데이터 로드 함수들 ---
async function loadModels() {
        if(!selModel) return;
        const { data } = await supabase.from('products').select('*').order('brand', { ascending: true });
        
        if (data) {
            // ★ 중복 제거 로직 추가 (model_name 기준)
            const uniqueProducts = data.filter((item, index, self) =>
                index === self.findIndex((t) => (
                    t.model_name === item.model_name
                ))
            );

            selModel.innerHTML = '<option value="">-- 모델 선택 --</option>' + 
                uniqueProducts.map(p => `<option value="${p.id}">[${p.brand}] ${p.model_name} (${p.type})</option>`).join('');
        }
    }

    async function loadClients() {
        if(!selClient) return;
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
        renderModelStats(allAssets); 
    }

    function renderModelStats(assets) {
        if (!modelSummaryArea) return;
        if (!assets || assets.length === 0) {
            modelSummaryArea.innerHTML = '<span style="color:#999;">데이터 없음</span>';
            return;
        }

        const stats = {};
        assets.forEach(item => {
            const modelName = item.products?.model_name || '모델 미지정';
            stats[modelName] = (stats[modelName] || 0) + 1;
        });

        const sortedModels = Object.entries(stats).sort((a, b) => b[1] - a[1]);

        const html = sortedModels.map(([name, count]) => `
            <div style="background:white; padding:5px 10px; border-radius:20px; border:1px solid #ddd; box-shadow:0 1px 2px rgba(0,0,0,0.05); display:flex; align-items:center;">
                <span style="font-weight:600; color:#333; margin-right:6px;">${name}</span>
                <span style="background:#e3f2fd; color:#007bff; font-weight:bold; padding:2px 8px; border-radius:10px; font-size:0.85em;">${count}</span>
            </div>
        `).join('');

        modelSummaryArea.innerHTML = html;
    }

    function renderList(list) {
        if(!tbody) return;
        if (!list || list.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:30px; color:#999;">데이터가 없습니다.</td></tr>';
            return;
        }

        tbody.innerHTML = list.map(asset => {
            const product = asset.products || { brand: '-', model_name: '미상', type: '' };
            const clientName = asset.clients ? `🏢 ${asset.clients.name}` : `<span style="color:#9ca3af">📦 창고 대기</span>`;
            const dateStr = new Date(asset.created_at).toLocaleDateString();

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
                <td style="font-size:0.9rem; color:#888;">${dateStr}</td>
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

    // --- ★ 검색 및 필터 로직 ---
    function filterAssets() {
        const keyword = searchInput.value.toLowerCase();
        const filterType = searchFilter.value;
        const startVal = dateStart.value;
        const endVal = dateEnd.value;

        const filtered = allAssets.filter(asset => {
            const sn = asset.serial_number.toLowerCase();
            const brand = (asset.products?.brand || '').toLowerCase();
            const model = (asset.products?.model_name || '').toLowerCase();
            const client = (asset.clients?.name || '').toLowerCase();
            const status = (asset.status || '').toLowerCase();
            const assetDate = asset.created_at.split('T')[0];

            // 1. 날짜 필터
            if (startVal && assetDate < startVal) return false;
            if (endVal && assetDate > endVal) return false;

            // 2. 검색어 필터
            if (!keyword) return true; // 검색어 없으면 통과

            if (filterType === 'serial') return sn.includes(keyword);
            if (filterType === 'model') return model.includes(keyword) || brand.includes(keyword);
            if (filterType === 'client') return client.includes(keyword);
            
            // 전체 검색
            return sn.includes(keyword) || model.includes(keyword) || client.includes(keyword) || status.includes(keyword);
        });

        renderList(filtered);
    }

    // 조회 버튼
    if(btnSearchApply) {
        btnSearchApply.addEventListener('click', filterAssets);
    }

    // 엔터키 검색
    if(searchInput) {
        searchInput.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') filterAssets();
        });
    }

    // 초기화 버튼
    if(btnSearchReset) {
        btnSearchReset.addEventListener('click', () => {
            searchInput.value = '';
            searchFilter.value = 'all';
            dateStart.value = '';
            dateEnd.value = '';
            renderList(allAssets);
        });
    }

    // --- 새 모델 버튼 토글 ---
    if(btnNewModelMode) {
        btnNewModelMode.addEventListener('click', () => {
            isNewModelMode = !isNewModelMode;
            if (isNewModelMode) {
                newModelInputs.style.display = 'block'; 
                selModel.disabled = true;
                selModel.value = "";
                
                btnNewModelMode.textContent = "↩️ 취소";
                btnNewModelMode.style.background = "#6c757d"; 
                btnNewModelMode.style.color = "white"; 
                btnNewModelMode.style.borderColor = "#6c757d";
            } else {
                newModelInputs.style.display = 'none';
                selModel.disabled = false;
                
                btnNewModelMode.textContent = "✨ 새 모델";
                btnNewModelMode.style.background = "#fff"; 
                btnNewModelMode.style.color = "#333"; 
                btnNewModelMode.style.borderColor = "#ccc";
            }
        });
    }

    // --- 상태 자동 변경 로직 ---
    if(selClient) {
        selClient.addEventListener('change', () => {
            if (selClient.value) inputStatus.value = '사용중';
            else inputStatus.value = '재고';
        });
    }

    if(inputStatus) {
        inputStatus.addEventListener('change', () => {
            if (inputStatus.value === '재고') selClient.value = "";
        });
    }

    // --- 저장 로직 ---
    if(btnSave) {
        btnSave.addEventListener('click', async () => {
            const serial = inputSerial.value.trim();
            const status = inputStatus.value;
            const clientId = selClient.value || null;
            let finalProductId = selModel.value;

            if (!serial) return alert('시리얼 번호는 필수입니다.');

            let duplicateCheck = supabase.from('assets').select('id').eq('serial_number', serial);
            if (editingId) duplicateCheck = duplicateCheck.neq('id', editingId);
            const { data: duplicates } = await duplicateCheck;
            if (duplicates && duplicates.length > 0) return alert(`⚠️ 이미 존재하는 시리얼 번호입니다: ${serial}`);

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
    }

    // --- 수정/삭제 (리스트 클릭) ---
    if(tbody) {
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
                newModelInputs.style.display = 'none';
                selModel.disabled = false;
                btnNewModelMode.textContent = "✨ 새 모델";
                btnNewModelMode.style.background = "#fff"; 
                btnNewModelMode.style.color = "#333";
                
                openModal(true);
            }

            if (btnDelete) {
                if(confirm('정말 삭제하시겠습니까?')) {
                    await supabase.from('assets').delete().eq('id', btnDelete.dataset.id);
                    loadAssets();
                }
            }
        });
    }
}