import { supabase } from '../../../common/db.js';
import { loadCSS } from '../../../common/utils.js';
import { render } from './parts.view.js';

export { render };

export async function init() {
    loadCSS('./src/features/assets-mgr/style.css');

    // DOM 선택
    const modal = document.getElementById('parts-modal');
    const btnOpenModal = document.getElementById('btn-open-modal');
    const btnCloseX = document.getElementById('btn-close-x');
    const btnCloseBottom = document.getElementById('btn-close-bottom');
    const btnSave = document.getElementById('btn-save');
    const formTitle = document.getElementById('form-title');

    const tbody = document.getElementById('parts-list-tbody');
    const searchInput = document.getElementById('search-input');
    const searchFilter = document.getElementById('search-filter');

    // 폼 요소
    const inputId = document.getElementById('parts-id');
    const inputQuantity = document.getElementById('input-quantity');
    const inputLocation = document.getElementById('input-location');

    const selTargetModel = document.getElementById('select-target-model');
    const btnNewModelMode = document.getElementById('btn-new-model-mode');
    const inputNewTargetModel = document.getElementById('input-new-target-model');
    const newModelInputArea = document.getElementById('new-model-input-area');

    const selPartsName = document.getElementById('select-parts-name');
    const btnNewPartsMode = document.getElementById('btn-new-parts-mode');
    const newPartsInputs = document.getElementById('new-parts-inputs');
    const inputNewName = document.getElementById('input-new-name');
    const inputNewCode = document.getElementById('input-new-code');

    let editingId = null;
    let isNewModelMode = false;      
    let isNewPartsMode = false; 
    let allParts = [];

    // 초기 로드
    await loadParts(); 

    // --- 모달 제어 ---
    function openModal(isEdit) {
        if(!modal) return;
        modal.style.display = 'flex';
        
        loadRegisteredModels();
        loadPartsOptions();

        if (isEdit) {
            formTitle.innerHTML = "<i class='bx bx-edit'></i> 부품 정보 수정";
        } else {
            formTitle.innerHTML = "<i class='bx bx-cog'></i> 부품 입고";
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

        isNewPartsMode = false;
        if(selPartsName) {
            selPartsName.disabled = false;
            selPartsName.value = '';
        }
        if(newPartsInputs) newPartsInputs.style.display = 'none';
        if(btnNewPartsMode) {
            btnNewPartsMode.textContent = "✨ 새 부품";
            btnNewPartsMode.style.background = "#fff";
            btnNewPartsMode.style.color = "#333";
        }

        if(inputNewName) inputNewName.value = '';
        if(inputNewCode) inputNewCode.value = '';
    }

    if(btnOpenModal) btnOpenModal.addEventListener('click', () => openModal(false));
    if(btnCloseX) btnCloseX.addEventListener('click', closeModal);
    if(btnCloseBottom) btnCloseBottom.addEventListener('click', closeModal);


    // --- 데이터 로드 ---
    async function loadParts() {
        const { data, error } = await supabase
            .from('parts')
            .select('*')
            .order('target_model', { ascending: true })
            .order('name', { ascending: true })
            .order('created_at', { ascending: false });

        if (error) {
            console.error(error);
            return;
        }

        allParts = data || [];
        renderList(allParts);
        
        loadRegisteredModels();
        loadPartsOptions();
    }

    function loadRegisteredModels() {
        if(!selTargetModel) return;
        const uniqueModels = new Set();
        uniqueModels.add("공용");
        allParts.forEach(item => {
            if(item.target_model) uniqueModels.add(item.target_model);
        });
        const sortedModels = [...uniqueModels].sort();
        let options = '<option value="">-- 모델 선택 --</option>';
        sortedModels.forEach(modelName => {
            options += `<option value="${modelName}">${modelName}</option>`;
        });
        selTargetModel.innerHTML = options;
    }

    function loadPartsOptions() {
        if (!selPartsName) return;
        if (allParts.length === 0) {
            selPartsName.innerHTML = '<option value="">(등록된 부품 없음)</option>';
            return;
        }
        const uniqueItems = [];
        const map = new Map();
        allParts.forEach(item => {
            if(!map.has(item.name)){
                map.set(item.name, true);
                uniqueItems.push(item);
            }
        });
        uniqueItems.sort((a, b) => a.name.localeCompare(b.name));
        selPartsName.innerHTML = '<option value="">-- 부품 선택 --</option>' + 
            uniqueItems.map(item => `<option value="${item.name}" data-category="${item.category}" data-code="${item.code}">[${item.category || '부품'}] ${item.name}</option>`).join('');
    }

    // --- 리스트 렌더링 (아코디언 + 필터) ---
    function renderList(list) {
        if(!tbody) return;
        if (!list || list.length === 0) {
            tbody.innerHTML = '<tr><td colspan="2" style="text-align:center; padding:40px; color:#666;">데이터가 없습니다.</td></tr>';
            return;
        }

        const grouped = {};
        list.forEach(item => {
            const modelKey = item.target_model || '공용 (기타)';
            if (!grouped[modelKey]) grouped[modelKey] = {};
            const nameKey = item.name;
            if (!grouped[modelKey][nameKey]) grouped[modelKey][nameKey] = [];
            grouped[modelKey][nameKey].push(item);
        });

        let html = '';
        
        for (const [modelName, nameGroups] of Object.entries(grouped)) {
            let itemsHtml = '';
            
            for (const [partName, entries] of Object.entries(nameGroups)) {
                const totalQty = entries.reduce((sum, entry) => sum + (entry.quantity || 0), 0);
                const category = entries[0].category || '부품';
                const latestEntry = entries[0];
                const latestDate = new Date(latestEntry.created_at).toLocaleDateString();
                const uniqueId = `detail-${modelName.replace(/\s/g, '-')}-${partName.replace(/\s/g, '-')}`;

                const SHOW_LIMIT = 5;
                const recentEntries = entries.slice(0, SHOW_LIMIT);
                const hiddenEntries = entries.slice(SHOW_LIMIT);
                
                const createRowHtml = (entry) => {
                    const date = new Date(entry.created_at).toLocaleDateString();
                    const location = entry.location || '-';
                    
                    let qtyDisplay = `${entry.quantity}개`;
                    let rowColor = "#fafafa";
                    
                    if (entry.quantity < 0) {
                        if (location.includes('회수')) qtyDisplay = `<span style="color:blue; font-weight:bold;">${entry.quantity}개 (회수)</span>`;
                        else qtyDisplay = `<span style="color:#e74c3c; font-weight:bold;">${entry.quantity}개 (사용)</span>`;
                    } else {
                        if (location.includes('반환')) qtyDisplay = `<span style="color:green; font-weight:bold;">+${entry.quantity}개 (반환)</span>`;
                        else qtyDisplay = `<span style="color:#333; font-weight:bold;">+${entry.quantity}개 (입고)</span>`;
                    }

                    return `
                    <div class="history-row" data-date="${entry.created_at.split('T')[0]}" data-location="${location}" style="display:flex; justify-content:space-between; align-items:center; padding:8px 15px; border-bottom:1px solid #eee; background:${rowColor}; font-size:0.9rem;">
                        <div style="flex:2; color:#555;">${date}</div>
                        <div style="flex:2; text-align:right;">${qtyDisplay}</div>
                        <div style="flex:3; text-align:right; color:#666; font-size:0.85rem;">${location}</div>
                        <div style="flex:1; text-align:right;">
                            <button class="btn-edit-entry" data-id="${entry.id}" style="border:1px solid #ddd; background:white; cursor:pointer; padding:2px 5px; border-radius:3px;">✏️</button>
                            <button class="btn-delete-entry" data-id="${entry.id}" style="border:1px solid #fee2e2; color:red; background:white; cursor:pointer; padding:2px 5px; border-radius:3px;">🗑️</button>
                        </div>
                    </div>`;
                };

                const visibleRows = recentEntries.map(createRowHtml).join('');
                const hiddenRows = hiddenEntries.map(createRowHtml).join('');

                let moreBtnHtml = '';
                if (hiddenEntries.length > 0) {
                    moreBtnHtml = `
                    <div style="text-align:center; padding:10px; background:#fff;">
                        <button class="btn-show-more" onclick="this.parentElement.previousElementSibling.style.display='block'; this.parentElement.style.display='none';" 
                            style="width:100%; padding:8px; border:1px dashed #ccc; background:#f8f9fa; color:#666; cursor:pointer; border-radius:4px;">
                            ▼ 이전 내역 ${hiddenEntries.length}건 더보기
                        </button>
                    </div>
                    <div class="hidden-rows" style="display:none;">${hiddenRows}</div>
                    `;
                }

                itemsHtml += `
                <div class="parts-group" style="margin-bottom:5px; border:1px solid #eee; border-radius:6px; overflow:hidden;">
                    <div class="group-header" onclick="document.getElementById('${uniqueId}').style.display = document.getElementById('${uniqueId}').style.display === 'none' ? 'block' : 'none'" 
                         style="display:flex; justify-content:space-between; align-items:center; padding:12px 15px; background:white; cursor:pointer;">
                        <div style="display:flex; align-items:center; gap:10px;">
                            <span class="badge" style="background:#fff3cd; color:#856404;">${category}</span>
                            <span style="font-weight:600; color:#333; font-size:1.05rem;">${partName}</span>
                            <i class='bx bx-chevron-down' style="color:#999;"></i>
                        </div>
                        <div style="text-align:right;">
                            <div style="font-size:1.1rem; font-weight:bold; color:#333;">재고: ${totalQty}개</div>
                            <div style="font-size:0.8rem; color:#888;">최근: ${latestDate}</div>
                        </div>
                    </div>

                    <div id="${uniqueId}" style="display:none; border-top:1px solid #eee;">
                        <div style="padding:10px; background:#f1f3f5; display:flex; flex-wrap:wrap; gap:5px; align-items:center; border-bottom:1px solid #ddd;">
                            <span style="font-size:0.8rem; font-weight:bold;">🔎 검색:</span>
                            <input type="date" class="date-filter-start" style="padding:4px; border:1px solid #ccc; font-size:0.8rem; width:110px;">
                            <span>~</span>
                            <input type="date" class="date-filter-end" style="padding:4px; border:1px solid #ccc; font-size:0.8rem; width:110px;">
                            <input type="text" class="location-filter" placeholder="장소/거래처/내용" style="padding:4px; border:1px solid #ccc; font-size:0.8rem; width:120px;">
                            <button class="btn-apply-filter" style="padding:4px 10px; background:#666; color:white; border:none; border-radius:3px; cursor:pointer; font-size:0.8rem;">조회</button>
                            <button class="btn-reset-filter" style="padding:4px 10px; background:white; border:1px solid #ccc; border-radius:3px; cursor:pointer; font-size:0.8rem;">초기화</button>
                        </div>

                        <div style="background:#fff; padding:5px 15px; font-size:0.8rem; color:#888; display:flex; font-weight:bold; border-bottom:1px solid #eee;">
                            <div style="flex:2;">일시</div>
                            <div style="flex:2; text-align:right;">변동 수량</div>
                            <div style="flex:3; text-align:right;">내용/위치</div>
                            <div style="flex:1; text-align:right;">관리</div>
                        </div>

                        <div class="rows-container">
                            ${visibleRows}
                            ${moreBtnHtml}
                        </div>
                    </div>
                </div>
                `;
            }

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

        attachFilterEvents();
    }

    function attachFilterEvents() {
        document.querySelectorAll('.btn-apply-filter').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const parent = e.target.closest('div').parentElement;
                
                const startVal = parent.querySelector('.date-filter-start').value;
                const endVal = parent.querySelector('.date-filter-end').value;
                const locVal = parent.querySelector('.location-filter').value.toLowerCase();

                const rows = parent.querySelectorAll('.history-row');
                const moreBtn = parent.querySelector('.btn-show-more')?.parentElement;
                const hiddenDiv = parent.querySelector('.hidden-rows');

                if(!startVal && !endVal && !locVal) return alert('검색 조건을 입력하세요.');

                if(moreBtn) moreBtn.style.display = 'none';
                if(hiddenDiv) hiddenDiv.style.display = 'block';

                let visibleCount = 0;
                rows.forEach(row => {
                    const rowDate = row.dataset.date;
                    const rowLoc = (row.dataset.location || '').toLowerCase();

                    let show = true;
                    if(startVal && rowDate < startVal) show = false;
                    if(endVal && rowDate > endVal) show = false;
                    if(locVal && !rowLoc.includes(locVal)) show = false;
                    
                    row.style.display = show ? 'flex' : 'none';
                    if(show) visibleCount++;
                });

                if(visibleCount === 0) alert('검색 결과가 없습니다.');
            });
        });

        document.querySelectorAll('.btn-reset-filter').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const parent = e.target.closest('div').parentElement;
                parent.querySelector('.date-filter-start').value = '';
                parent.querySelector('.date-filter-end').value = '';
                parent.querySelector('.location-filter').value = '';
                
                const rows = parent.querySelectorAll('.history-row');
                rows.forEach(r => r.style.display = 'flex');
                
                const hiddenDiv = parent.querySelector('.hidden-rows');
                if(hiddenDiv) hiddenDiv.style.display = 'block';
                
                const moreBtn = parent.querySelector('.btn-show-more')?.parentElement;
                if(moreBtn) moreBtn.style.display = 'none';
            });
        });
    }

    if(btnSave) {
        btnSave.addEventListener('click', async () => {
            let category = "부품";
            let name, code, targetModel;
            const quantity = parseInt(inputQuantity.value);
            const location = inputLocation.value.trim();

            if(isNewModelMode) {
                targetModel = inputNewTargetModel.value.trim();
                if(!targetModel) return alert('새로운 모델명을 입력해주세요.');
            } else {
                targetModel = selTargetModel.value;
                if(!targetModel) return alert('적용 모델을 선택해주세요.');
            }

            if (isNewPartsMode) {
                name = inputNewName.value.trim();
                code = inputNewCode.value.trim();
                if (!name) return alert('부품명을 입력해주세요.');
            } else {
                if (!selPartsName.value) return alert('부품을 선택해주세요.');
                const selectedOption = selPartsName.options[selPartsName.selectedIndex];
                name = selPartsName.value;
                category = selectedOption.dataset.category || "부품";
                code = selectedOption.dataset.code;
            }

            if (editingId) {
                await supabase.from('parts')
                    .update({ category, name, code, target_model: targetModel, quantity, location })
                    .eq('id', editingId);
                alert('수정되었습니다.');
            } else {
                await supabase.from('parts')
                    .insert({ category, name, code, target_model: targetModel, quantity, location });
                alert('등록되었습니다.');
            }

            closeModal();
            await loadParts();
        });
    }

    if(tbody) {
        tbody.addEventListener('click', async (e) => {
            const btnEdit = e.target.closest('.btn-edit-entry');
            const btnDelete = e.target.closest('.btn-delete-entry');

            if (btnEdit) {
                const id = btnEdit.dataset.id;
                const item = allParts.find(c => c.id == id);
                if(item) {
                    editingId = item.id;
                    inputId.value = editingId;
                    
                    isNewPartsMode = true;
                    newPartsInputs.style.display = 'block';
                    selPartsName.disabled = true;
                    selPartsName.value = "";
                    btnNewPartsMode.textContent = "↩️ 취소";
                    btnNewPartsMode.style.background = "#6c757d";
                    btnNewPartsMode.style.color = "white";

                    isNewModelMode = true;
                    newModelInputArea.style.display = 'block';
                    selTargetModel.disabled = true;
                    selTargetModel.value = "";
                    btnNewModelMode.textContent = "↩️ 취소";
                    btnNewModelMode.style.background = "#6c757d";
                    btnNewModelMode.style.color = "white";

                    inputNewTargetModel.value = item.target_model || '공용';
                    inputNewName.value = item.name;
                    inputNewCode.value = item.code || '';
                    inputQuantity.value = item.quantity;
                    inputLocation.value = item.location || '';

                    openModal(true);
                }
            }

            if (btnDelete) {
                if(confirm('이 등록 내역을 삭제하시겠습니까?')) {
                    await supabase.from('parts').delete().eq('id', btnDelete.dataset.id);
                    loadParts();
                }
            }
        });
    }

    if(searchInput) {
        searchInput.addEventListener('keyup', () => {
            const keyword = searchInput.value.toLowerCase();
            const filterType = searchFilter.value;
            const filtered = allParts.filter(item => {
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