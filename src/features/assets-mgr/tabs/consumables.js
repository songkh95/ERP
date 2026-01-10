import { supabase } from '../../../common/db.js';
import { loadCSS } from '../../../common/utils.js';
import { render } from './consumables.view.js';

export { render };

export async function init() {
    loadCSS('./src/features/assets-mgr/style.css');

    // DOM 선택
    const modal = document.getElementById('consumable-modal');
    const btnOpenModal = document.getElementById('btn-open-modal');
    const btnCloseX = document.getElementById('btn-close-x');
    const btnCloseBottom = document.getElementById('btn-close-bottom');
    const btnSave = document.getElementById('btn-save');
    const formTitle = document.getElementById('form-title');

    const tbody = document.getElementById('consumable-list-tbody');
    const searchInput = document.getElementById('search-input');
    const searchFilter = document.getElementById('search-filter');

    // 폼 요소
    const inputId = document.getElementById('consumable-id');
    const inputQuantity = document.getElementById('input-quantity');
    const inputLocation = document.getElementById('input-location');

    // 1. 적용 모델 관련
    const selTargetModel = document.getElementById('select-target-model');
    const btnNewModelMode = document.getElementById('btn-new-model-mode');
    const inputNewTargetModel = document.getElementById('input-new-target-model');
    const newModelInputArea = document.getElementById('new-model-input-area');

    // 2. 소모품 선택 관련
    const selConsumableName = document.getElementById('select-consumable-name');
    const btnNewConsumableMode = document.getElementById('btn-new-consumable-mode');
    const newConsumableInputs = document.getElementById('new-consumable-inputs');
    
    // 신규 소모품 상세
    const inputNewCategory = document.getElementById('input-new-category');
    const inputNewName = document.getElementById('input-new-name');
    const inputNewCode = document.getElementById('input-new-code');

    let editingId = null;
    let isNewModelMode = false;      
    let isNewConsumableMode = false; 
    let allConsumables = [];

    // 초기 로드
    await loadConsumables(); 

    // --- 모달 제어 ---
    function openModal(isEdit) {
        if(!modal) return;
        modal.style.display = 'flex';
        
        loadRegisteredModels();
        loadConsumableOptions();

        if (isEdit) {
            formTitle.innerHTML = "<i class='bx bx-edit'></i> 소모품 정보 수정";
        } else {
            formTitle.innerHTML = "<i class='bx bx-package'></i> 소모품 입고";
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
        if(inputId) inputId.value = '';
        if(inputQuantity) inputQuantity.value = '1';
        if(inputLocation) inputLocation.value = '';

        // 모델 초기화
        isNewModelMode = false;
        if(selTargetModel) {
            selTargetModel.disabled = false;
            selTargetModel.value = '';
        }
        if(newModelInputArea) newModelInputArea.style.display = 'none';
        if(inputNewTargetModel) inputNewTargetModel.value = '';
        if(btnNewModelMode) {
            btnNewModelMode.textContent = "✨ 새 모델";
            btnNewModelMode.style.background = "#fff";
            btnNewModelMode.style.color = "#333";
        }

        // 소모품 초기화
        isNewConsumableMode = false;
        if(selConsumableName) {
            selConsumableName.disabled = false;
            selConsumableName.value = '';
        }
        if(newConsumableInputs) newConsumableInputs.style.display = 'none';
        if(btnNewConsumableMode) {
            btnNewConsumableMode.textContent = "✨ 새 소모품";
            btnNewConsumableMode.style.background = "#fff";
            btnNewConsumableMode.style.color = "#333";
        }

        if(inputNewCategory) inputNewCategory.value = '복합기';
        if(inputNewName) inputNewName.value = '';
        if(inputNewCode) inputNewCode.value = '';
    }

    if(btnOpenModal) btnOpenModal.addEventListener('click', () => openModal(false));
    if(btnCloseX) btnCloseX.addEventListener('click', closeModal);
    if(btnCloseBottom) btnCloseBottom.addEventListener('click', closeModal);


    // --- 데이터 로드 ---
    async function loadConsumables() {
        const { data, error } = await supabase
            .from('consumables')
            .select('*')
            .order('target_model', { ascending: true })
            .order('name', { ascending: true })
            .order('created_at', { ascending: false }); // 최신순

        if (error) {
            console.error(error);
            return;
        }

        allConsumables = data || [];
        renderList(allConsumables);
        
        loadRegisteredModels();
        loadConsumableOptions();
    }

    function loadRegisteredModels() {
        if(!selTargetModel) return;
        
        const uniqueModels = new Set();
        uniqueModels.add("공용");

        allConsumables.forEach(item => {
            if(item.target_model) uniqueModels.add(item.target_model);
        });

        const sortedModels = [...uniqueModels].sort();

        let options = '<option value="">-- 모델 선택 --</option>';
        sortedModels.forEach(modelName => {
            options += `<option value="${modelName}">${modelName}</option>`;
        });
        selTargetModel.innerHTML = options;
    }

    function loadConsumableOptions() {
        if (!selConsumableName) return;
        
        if (allConsumables.length === 0) {
            selConsumableName.innerHTML = '<option value="">(등록된 소모품 없음)</option>';
            return;
        }

        const uniqueItems = [];
        const map = new Map();
        
        allConsumables.forEach(item => {
            if(!map.has(item.name)){
                map.set(item.name, true);
                uniqueItems.push(item);
            }
        });
        uniqueItems.sort((a, b) => a.name.localeCompare(b.name));
        
        selConsumableName.innerHTML = '<option value="">-- 소모품 선택 --</option>' + 
            uniqueItems.map(item => `<option value="${item.name}" data-category="${item.category}" data-code="${item.code}">[${item.category}] ${item.name}</option>`).join('');
    }

    // --- ★★★ 아코디언(펼침) 스타일 렌더링 ★★★ ---
    function renderList(list) {
        if(!tbody) return;
        if (!list || list.length === 0) {
            tbody.innerHTML = '<tr><td colspan="2" style="text-align:center; padding:40px; color:#666;">데이터가 없습니다.</td></tr>';
            return;
        }

        // 1. 모델 -> 소모품명 으로 그룹핑
        const grouped = {};
        list.forEach(item => {
            const modelKey = item.target_model || '공용 (기타)';
            if (!grouped[modelKey]) grouped[modelKey] = {};
            
            const nameKey = item.name;
            if (!grouped[modelKey][nameKey]) grouped[modelKey][nameKey] = [];
            
            grouped[modelKey][nameKey].push(item);
        });

        let html = '';
        // 1단계: 모델 루프
        for (const [modelName, nameGroups] of Object.entries(grouped)) {
            let itemsHtml = '';
            
            // 2단계: 소모품 이름 루프
            for (const [consumableName, entries] of Object.entries(nameGroups)) {
                // 통계 계산
                const totalQty = entries.reduce((sum, entry) => sum + (entry.quantity || 0), 0);
                const category = entries[0].category;
                const latestEntry = entries.reduce((prev, current) => (prev.created_at > current.created_at) ? prev : current);
                const latestDate = new Date(latestEntry.created_at).toLocaleDateString();
                const uniqueId = `detail-${modelName.replace(/\s/g, '-')}-${consumableName.replace(/\s/g, '-')}`;

                // 상세 내역 HTML (숨김 상태)
                const detailRows = entries.map(entry => {
                    const date = new Date(entry.created_at).toLocaleDateString();
                    return `
                    <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 15px; border-bottom:1px solid #eee; background:#fafafa; font-size:0.9rem;">
                        <div style="flex:2;">
                            <span style="color:#666;">${date}</span>
                        </div>
                        <div style="flex:1; text-align:right;">
                            <span style="font-weight:bold;">${entry.quantity}개</span>
                        </div>
                        <div style="flex:2; text-align:right; color:#888;">
                            ${entry.location || '-'}
                        </div>
                        <div style="flex:1; text-align:right;">
                            <button class="btn-edit-entry" data-id="${entry.id}" style="font-size:0.8rem; padding:2px 6px; cursor:pointer;">✏️</button>
                            <button class="btn-delete-entry" data-id="${entry.id}" style="font-size:0.8rem; padding:2px 6px; color:red; cursor:pointer;">🗑️</button>
                        </div>
                    </div>
                    `;
                }).join('');

                // 요약 행 HTML (클릭 시 토글)
                itemsHtml += `
                <div class="consumable-group" style="margin-bottom:5px; border:1px solid #eee; border-radius:6px; overflow:hidden;">
                    <div class="group-header" onclick="document.getElementById('${uniqueId}').style.display = document.getElementById('${uniqueId}').style.display === 'none' ? 'block' : 'none'" 
                         style="display:flex; justify-content:space-between; align-items:center; padding:12px 15px; background:white; cursor:pointer; hover:background:#f9f9f9;">
                        
                        <div style="display:flex; align-items:center; gap:10px;">
                            <span class="badge" style="background:#f3f4f6; color:#555;">${category}</span>
                            <span style="font-weight:600; color:#333; font-size:1.05rem;">${consumableName}</span>
                            <i class='bx bx-chevron-down' style="color:#999;"></i>
                        </div>
                        
                        <div style="text-align:right;">
                            <div style="font-size:1.1rem; font-weight:bold; color:#333;">총 ${totalQty}개</div>
                            <div style="font-size:0.8rem; color:#888;">최근 등록: ${latestDate}</div>
                        </div>
                    </div>

                    <div id="${uniqueId}" style="display:none; border-top:1px solid #eee;">
                        <div style="background:#f1f3f5; padding:5px 15px; font-size:0.8rem; color:#666; display:flex; font-weight:bold;">
                            <div style="flex:2;">등록 일시</div>
                            <div style="flex:1; text-align:right;">수량</div>
                            <div style="flex:2; text-align:right;">재고 위치</div>
                            <div style="flex:1; text-align:right;">관리</div>
                        </div>
                        ${detailRows}
                    </div>
                </div>
                `;
            }

            // 모델별 행 생성
            html += `
            <tr style="border-bottom:2px solid #e0e0e0;">
                <td style="vertical-align:top; background-color:#fafafa; font-weight:bold; color:#0056b3;">
                    <i class='bx bx-printer'></i> ${modelName}
                </td>
                <td style="padding:10px;">
                    ${itemsHtml}
                </td>
            </tr>
            `;
        }
        tbody.innerHTML = html;
    }

    // --- 이벤트 핸들러 ---
    if(btnNewModelMode) {
        btnNewModelMode.addEventListener('click', () => {
            isNewModelMode = !isNewModelMode;
            if(isNewModelMode) {
                newModelInputArea.style.display = 'block';
                selTargetModel.disabled = true;
                selTargetModel.value = "";
                btnNewModelMode.textContent = "↩️ 취소";
                btnNewModelMode.style.background = "#6c757d";
                btnNewModelMode.style.color = "white";
            } else {
                newModelInputArea.style.display = 'none';
                selTargetModel.disabled = false;
                btnNewModelMode.textContent = "✨ 새 모델";
                btnNewModelMode.style.background = "#fff";
                btnNewModelMode.style.color = "#333";
            }
        });
    }

    if(btnNewConsumableMode) {
        btnNewConsumableMode.addEventListener('click', () => {
            isNewConsumableMode = !isNewConsumableMode;
            if (isNewConsumableMode) {
                newConsumableInputs.style.display = 'block';
                selConsumableName.disabled = true;
                selConsumableName.value = "";
                btnNewConsumableMode.textContent = "↩️ 취소";
                btnNewConsumableMode.style.background = "#6c757d";
                btnNewConsumableMode.style.color = "white";
            } else {
                newConsumableInputs.style.display = 'none';
                selConsumableName.disabled = false;
                btnNewConsumableMode.textContent = "✨ 새 소모품";
                btnNewConsumableMode.style.background = "#fff";
                btnNewConsumableMode.style.color = "#333";
            }
        });
    }

    // --- 저장 로직 (항상 Insert) ---
    if(btnSave) {
        btnSave.addEventListener('click', async () => {
            let category, name, code, targetModel;
            const quantity = parseInt(inputQuantity.value) || 0;
            const location = inputLocation.value.trim();

            if(isNewModelMode) {
                targetModel = inputNewTargetModel.value.trim();
                if(!targetModel) return alert('새로운 모델명을 입력해주세요.');
            } else {
                targetModel = selTargetModel.value;
                if(!targetModel) return alert('적용 모델을 선택해주세요.');
            }

            if (isNewConsumableMode) {
                category = inputNewCategory.value;
                name = inputNewName.value.trim();
                code = inputNewCode.value.trim();
                if (!name) return alert('소모품명을 입력해주세요.');
            } else {
                if (!selConsumableName.value) return alert('소모품을 선택해주세요.');
                const selectedOption = selConsumableName.options[selConsumableName.selectedIndex];
                name = selConsumableName.value;
                category = selectedOption.dataset.category;
                code = selectedOption.dataset.code;
            }

            if (editingId) {
                // 수정
                await supabase.from('consumables')
                    .update({ category, name, code, target_model: targetModel, quantity, location })
                    .eq('id', editingId);
                alert('수정되었습니다.');
            } else {
                // ★ 중요: 무조건 Insert (히스토리 누적)
                await supabase.from('consumables')
                    .insert({ category, name, code, target_model: targetModel, quantity, location });
                alert('등록되었습니다.');
            }

            closeModal();
            await loadConsumables();
        });
    }

    // --- 개별 수정/삭제 (펼침 목록 내부 버튼) ---
    if(tbody) {
        tbody.addEventListener('click', async (e) => {
            // 상세 목록 안의 버튼들 처리
            const btnEdit = e.target.closest('.btn-edit-entry');
            const btnDelete = e.target.closest('.btn-delete-entry');

            if (btnEdit) {
                // 기존 데이터를 찾아서 모달에 채움
                const id = btnEdit.dataset.id;
                const item = allConsumables.find(c => c.id == id);
                if(item) {
                    editingId = item.id;
                    inputId.value = editingId;
                    
                    // 수정 시에는 상세 입력 모드로 전환해서 보여줌
                    isNewConsumableMode = true;
                    newConsumableInputs.style.display = 'block';
                    selConsumableName.disabled = true;
                    selConsumableName.value = "";
                    btnNewConsumableMode.textContent = "↩️ 취소";
                    btnNewConsumableMode.style.background = "#6c757d";
                    btnNewConsumableMode.style.color = "white";

                    isNewModelMode = true;
                    newModelInputArea.style.display = 'block';
                    selTargetModel.disabled = true;
                    selTargetModel.value = "";
                    btnNewModelMode.textContent = "↩️ 취소";
                    btnNewModelMode.style.background = "#6c757d";
                    btnNewModelMode.style.color = "white";

                    // 데이터 바인딩
                    inputNewTargetModel.value = item.target_model || '공용';
                    inputNewCategory.value = item.category;
                    inputNewName.value = item.name;
                    inputNewCode.value = item.code || '';
                    inputQuantity.value = item.quantity;
                    inputLocation.value = item.location || '';

                    openModal(true);
                }
            }

            if (btnDelete) {
                if(confirm('이 등록 내역을 삭제하시겠습니까?')) {
                    await supabase.from('consumables').delete().eq('id', btnDelete.dataset.id);
                    loadConsumables();
                }
            }
        });
    }

    if(searchInput) {
        searchInput.addEventListener('keyup', () => {
            const keyword = searchInput.value.toLowerCase();
            const filterType = searchFilter.value;
            const filtered = allConsumables.filter(item => {
                const name = (item.name || '').toLowerCase();
                const model = (item.target_model || '').toLowerCase();
                if (filterType === 'name') return name.includes(keyword);
                if (filterType === 'model') return model.includes(keyword);
                return name.includes(keyword) || model.includes(keyword);
            });
            renderList(filtered);
        });
    }
}