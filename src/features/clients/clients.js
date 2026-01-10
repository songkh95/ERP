import { supabase } from '../../common/db.js';
import { loadCSS } from '../../common/utils.js';

// ============================================================
//  1. [Render] HTML 구조
// ============================================================
export { render } from './clients.view.js';

// ============================================================
//  2. [Init] 기능 로직
// ============================================================
export async function init() {
    // loadCSS('./src/features/clients/style.css'); 

    // --- DOM 요소 선택 ---
    const modal = document.getElementById('client-modal');
    const btnAddClient = document.getElementById('btn-add-client'); 
    const btnCancel = document.getElementById('btn-cancel'); 
    const btnSave = document.getElementById('btn-save');
    const formTitle = document.getElementById('form-title');
    const formPanel = document.getElementById('form-panel'); 
    
    // 리스트 & 검색
    const ul = document.getElementById('client-list-ul');
    const searchInput = document.getElementById('search-input');
    const countSpan = document.getElementById('total-count');

    // [그룹 1] 기본 정보
    const inpName = document.getElementById('inp-name');
    const inpCode = document.getElementById('inp-code');
    const inpAddress = document.getElementById('inp-address'); // ★ [추가] 주소 필드
    const inpContact = document.getElementById('inp-contact');
    const inpRecipient = document.getElementById('inp-recipient');
    const inpDept = document.getElementById('inp-dept');

    // [그룹 2] 계약 정보
    const inpContractType = document.getElementById('inp-contract-type');
    const inpContractDate = document.getElementById('inp-contract-date');
    const inpStartDate = document.getElementById('inp-start-date');
    const inpEndDate = document.getElementById('inp-end-date');
    const inpCancelDate = document.getElementById('inp-cancel-date');

    // [그룹 3] 청구 정보
    const inpBillMethod = document.getElementById('inp-bill-method');
    const inpBillDay = document.getElementById('inp-bill-day');

    // [그룹 4] 기기 관리
    const groupAssets = document.getElementById('group-assets');
    const msgSaveFirst = document.getElementById('msg-save-first');
    const miniAssetUl = document.getElementById('mini-asset-list');

    const tabStock = document.getElementById('tab-stock');
    const tabNew = document.getElementById('tab-new');
    const panelStock = document.getElementById('panel-stock');
    const panelNew = document.getElementById('panel-new');

    const selStockAsset = document.getElementById('sel-stock-asset');
    const btnAddStock = document.getElementById('btn-add-stock');
    
    const selNewModelId = document.getElementById('sel-new-model-id');
    const inpNewSerial = document.getElementById('inp-new-serial');
    const btnCreateAsset = document.getElementById('btn-create-asset');

    let editingId = null; 
    let allClients = [];

    // 초기 실행
    loadData();

    // ============================================================
    //  3. 데이터 로드 및 렌더링
    // ============================================================
    
    async function loadData() {
        const { data, error } = await supabase
            .from('clients')
            .select(`*, assets (id, products (model_name))`)
            .order('client_code', { ascending: true });
        
        if (error) return console.error(error);
        allClients = data;
        renderList(allClients);
    }

    function renderList(list) {
        if (countSpan) countSpan.innerText = list ? list.length : 0;
        
        if (!list || list.length === 0) {
            ul.innerHTML = '<li style="padding:20px; text-align:center;">검색 결과가 없습니다.</li>';
            return;
        }

        ul.innerHTML = list.map(client => {
            const assetModels = client.assets && client.assets.length > 0
                ? client.assets.map(a => `<span class="badge" style="background:#e0f2fe; color:#0369a1; margin-right:4px;">${a.products?.model_name}</span>`).join('')
                : '<span style="color:#ccc; font-size:0.8rem;">기기 없음</span>';

            const showDate = (d) => d || '-';
            const address = client.address || '-'; // ★ [추가] 주소 표시용

            return `
            <li class="client-item" style="border-bottom:1px solid #f3f4f6; padding:20px 0;">
                <div class="client-summary" data-id="${client.id}" style="cursor:pointer; display:flex; justify-content:space-between; align-items:center;">
                    <div style="display:flex; align-items:center; gap:10px;">
                        <i class='bx bx-chevron-down' style="color:#2563eb; font-size:1.2rem;"></i>
                        <div>
                            <strong style="font-size:1.05rem; color:#111827;">${client.name}</strong>
                            <span style="font-size:0.8rem; color:#6b7280; margin-left:5px;">(${client.client_code || '미정'})</span>
                        </div>
                    </div>
                    <div style="text-align:right;">
                        <span class="badge" style="background:#f3f4f6; color:#4b5563;">${client.contract_type || '미지정'}</span>
                    </div>
                </div>
                
                <div class="client-details" style="display:none; margin-top:15px; background:#f9fafb; padding:20px; border-radius:8px;">
                    <div class="detail-compact-grid" style="display:grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap:15px; font-size:0.9rem;">
                        <div style="grid-column: 1 / -1; border-bottom:1px dashed #e5e7eb; padding-bottom:10px; margin-bottom:5px;">
                            <label style="color:#9ca3af; font-size:0.75rem;">주소</label> 
                            <div style="font-weight:500;">${address}</div>
                        </div>

                        <div><label style="color:#9ca3af; font-size:0.75rem;">담당자</label> <div style="font-weight:500;">${client.contact_person || '-'}</div></div>
                        <div><label style="color:#9ca3af; font-size:0.75rem;">연락처</label> <div>${client.recipient || '-'}</div></div>
                        <div><label style="color:#9ca3af; font-size:0.75rem;">부서/장소</label> <div>${client.department || '-'}</div></div>
                        
                        <div><label style="color:#9ca3af; font-size:0.75rem;">청구방법</label> <div>${client.billing_method || '-'}</div></div>
                        <div><label style="color:#9ca3af; font-size:0.75rem;">계약일</label> <div>${showDate(client.contract_date)}</div></div>
                        <div><label style="color:#9ca3af; font-size:0.75rem;">만기일</label> <div>${showDate(client.end_date)}</div></div>

                        <div style="grid-column: 1 / -1; margin-top:5px;">
                            <label style="color:#9ca3af; font-size:0.75rem; display:block; margin-bottom:5px;">보유 기기</label>
                            <div>${assetModels}</div>
                        </div>
                    </div>

                    <div style="text-align:right; margin-top:15px; padding-top:15px; border-top:1px dashed #e5e7eb;">
                        <button class="btn-secondary btn-edit" data-id="${client.id}"><i class='bx bx-edit'></i> 수정 및 기기관리</button>
                        <button class="btn-secondary btn-delete" data-id="${client.id}" style="color:#dc2626; border-color:#fee2e2;"><i class='bx bx-trash'></i> 삭제</button>
                    </div>
                </div>
            </li>
            `;
        }).join('');
    }

    // 검색 기능
    searchInput.addEventListener('keyup', () => {
        const keyword = searchInput.value.toLowerCase();
        const filtered = allClients.filter(c => 
            (c.name||'').toLowerCase().includes(keyword) || 
            (c.client_code||'').toLowerCase().includes(keyword) ||
            (c.address||'').toLowerCase().includes(keyword) || // ★ [추가] 주소로도 검색 가능
            (c.contact_person||'').toLowerCase().includes(keyword)
        );
        renderList(filtered);
    });

    // ============================================================
    //  4. 폼 제어 (모달 Open/Close) & CRUD
    // ============================================================

    async function generateNextCode() {
        const { data } = await supabase
            .from('clients')
            .select('client_code')
            .not('client_code', 'is', null)
            .order('client_code', { ascending: false })
            .limit(1);

        let nextNum = 1;
        if (data && data.length > 0) {
            const lastCode = data[0].client_code; 
            const parts = lastCode.split('-');
            if (parts.length > 1) {
                const num = parseInt(parts[1]);
                if (!isNaN(num)) nextNum = num + 1;
            }
        }
        return `C-${String(nextNum).padStart(3, '0')}`;
    }

    function openModal(isEdit) {
        modal.style.display = 'flex';
        inpCode.readOnly = true;

        if (isEdit) {
            formTitle.innerHTML = "<i class='bx bx-edit'></i> 거래처 상세 정보 수정";
            groupAssets.classList.remove('hidden');
            msgSaveFirst.classList.add('hidden');
            
            loadClientAssets(editingId);
            loadStockAssets();
        } else {
            formTitle.innerHTML = "<i class='bx bx-plus-circle'></i> 신규 거래처 등록";
            groupAssets.classList.add('hidden');
            msgSaveFirst.classList.remove('hidden');
            
            resetFormInputs();
            generateNextCode().then(code => inpCode.value = code);
        }
    }

    function closeModal() {
        modal.style.display = 'none';
        resetFormInputs();
    }

    function resetFormInputs() {
        editingId = null;
        formPanel.querySelectorAll('input').forEach(i => i.value = '');
        formPanel.querySelectorAll('select').forEach(s => s.value = '');
        miniAssetUl.innerHTML = '';
    }

    if(btnAddClient) btnAddClient.addEventListener('click', () => openModal(false));
    if(btnCancel) btnCancel.addEventListener('click', closeModal);

    // [저장 버튼] 클릭
    if(btnSave) {
        btnSave.addEventListener('click', async () => {
            if (!inpName.value) return alert('거래처명은 필수입니다!');

            const payload = {
                name: inpName.value,
                client_code: inpCode.value,
                address: inpAddress.value, // ★ [추가] 주소 저장
                contact_person: inpContact.value,
                recipient: inpRecipient.value,
                department: inpDept.value,
                
                contract_type: inpContractType.value,
                contract_date: inpContractDate.value || null,
                start_date: inpStartDate.value || null,
                end_date: inpEndDate.value || null,
                cancel_date: inpCancelDate.value || null,
                
                billing_method: inpBillMethod.value,
                billing_day: inpBillDay.value
            };

            let res;
            if (editingId) {
                res = await supabase.from('clients').update(payload).eq('id', editingId);
            } else {
                res = await supabase.from('clients').insert(payload);
            }

            if (res.error) {
                if (res.error.code === '23505') {
                    alert('❌ 중복된 번호입니다. 다시 시도해주세요.');
                    generateNextCode().then(code => inpCode.value = code);
                } else {
                    alert('오류: ' + res.error.message);
                }
            } else {
                alert('저장되었습니다.');
                if(!editingId) closeModal();
                loadData();
            }
        });
    }

    // 리스트 클릭 (수정/삭제)
    ul.addEventListener('click', async (e) => {
        // 펼치기
        const summary = e.target.closest('.client-summary');
        if (summary) {
            const detail = summary.nextElementSibling;
            detail.style.display = detail.style.display === 'none' ? 'block' : 'none';
            return;
        }

        // 수정 버튼
        const btnEdit = e.target.closest('.btn-edit');
        if (btnEdit) {
            const id = btnEdit.dataset.id;
            editingId = id;
            
            const { data } = await supabase.from('clients').select('*').eq('id', id).single();
            if (data) {
                inpName.value = data.name || '';
                inpCode.value = data.client_code || '';
                inpAddress.value = data.address || ''; // ★ [추가] 수정 시 주소 불러오기
                inpContact.value = data.contact_person || '';
                inpRecipient.value = data.recipient || '';
                inpDept.value = data.department || '';
                
                inpContractType.value = data.contract_type || '';
                inpContractDate.value = data.contract_date || '';
                inpStartDate.value = data.start_date || '';
                inpEndDate.value = data.end_date || '';
                inpCancelDate.value = data.cancel_date || '';
                
                inpBillMethod.value = data.billing_method || '';
                inpBillDay.value = data.billing_day || '';

                openModal(true);
            }
        }

        // 삭제 버튼
        const btnDelete = e.target.closest('.btn-delete');
        if (btnDelete) {
            if(confirm('정말 삭제하시겠습니까?')) {
                await supabase.from('clients').delete().eq('id', btnDelete.dataset.id);
                loadData();
            }
        }
    });

    // ============================================================
    //  5. 기기 관리 (Asset Management) 로직 (기존과 동일)
    // ============================================================
    tabStock.addEventListener('click', () => {
        tabStock.classList.add('active'); tabStock.classList.replace('btn-secondary', 'btn-primary');
        tabNew.classList.remove('active'); tabNew.classList.replace('btn-primary', 'btn-secondary');
        panelStock.classList.remove('hidden'); panelNew.classList.add('hidden');
    });

    tabNew.addEventListener('click', () => {
        tabNew.classList.add('active'); tabNew.classList.replace('btn-secondary', 'btn-primary');
        tabStock.classList.remove('active'); tabStock.classList.replace('btn-primary', 'btn-secondary');
        panelNew.classList.remove('hidden'); panelStock.classList.add('hidden');
        loadProductModels();
    });

    async function loadClientAssets(clientId) {
        miniAssetUl.innerHTML = '<li style="padding:10px;">로딩 중...</li>';
        const { data } = await supabase.from('assets').select('*, products(brand, model_name)').eq('client_id', clientId);
            
        if (!data || data.length === 0) {
            miniAssetUl.innerHTML = '<li style="color:#999; text-align:center; padding:10px;">현재 연결된 기기가 없습니다.</li>';
        } else {
            miniAssetUl.innerHTML = data.map(asset => `
                <li style="display:flex; justify-content:space-between; align-items:center; padding:8px; border-bottom:1px solid #eee;">
                    <div>
                        <span style="font-weight:bold; color:#333;">${asset.products?.model_name || '모델미상'}</span>
                        <span style="font-size:0.85rem; color:#666; margin-left:5px;">(S/N: ${asset.serial_number})</span>
                    </div>
                    <button class="btn-unlink" data-id="${asset.id}" style="font-size:0.75rem; color:red; border:1px solid #fee2e2; background:white; cursor:pointer; padding:2px 8px; border-radius:4px;">반납</button>
                </li>
            `).join('');
        }
    }

    miniAssetUl.addEventListener('click', async (e) => {
        if (e.target.classList.contains('btn-unlink')) {
            if(!confirm('이 기기를 반납하시겠습니까? (재고로 이동됨)')) return;
            await supabase.from('assets').update({ client_id: null, status: '재고' }).eq('id', e.target.dataset.id);
            refreshAssets();
        }
    });

    async function loadStockAssets() {
        const { data } = await supabase.from('assets').select('id, serial_number, products(model_name)').is('client_id', null);
        selStockAsset.innerHTML = '<option value="">-- 재고 기기 선택 --</option>' +
            (data || []).map(a => `<option value="${a.id}">[${a.products?.model_name}] ${a.serial_number}</option>`).join('');
    }

    btnAddStock.addEventListener('click', async () => {
        const assetId = selStockAsset.value;
        if (!assetId) return alert('기기를 선택해주세요.');
        await supabase.from('assets').update({ client_id: editingId, status: '사용중' }).eq('id', assetId);
        alert('기기가 배정되었습니다.');
        refreshAssets();
    });

    async function loadProductModels() {
        if (selNewModelId.options.length > 1) return;
        const { data } = await supabase.from('products').select('*').order('model_name');
        selNewModelId.innerHTML = '<option value="">-- 모델 선택 --</option>' + 
            (data || []).map(p => `<option value="${p.id}">[${p.brand}] ${p.model_name}</option>`).join('');
    }

    btnCreateAsset.addEventListener('click', async () => {
        const modelId = selNewModelId.value;
        const serial = inpNewSerial.value;
        if (!modelId || !serial) return alert('모델과 시리얼 번호를 입력하세요.');

        const { error } = await supabase.from('assets').insert({
            product_id: modelId,
            serial_number: serial,
            client_id: editingId,
            status: '사용중'
        });

        if (error) alert('등록 실패: ' + error.message);
        else {
            alert('새 기기가 등록되고 배정되었습니다.');
            inpNewSerial.value = '';
            refreshAssets();
        }
    });

    function refreshAssets() {
        if (editingId) {
            loadClientAssets(editingId);
            loadStockAssets();
            loadData();
        }
    }
}