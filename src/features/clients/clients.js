import { supabase } from '../../common/db.js';
export { render } from './clients.view.js';

export async function init() {
    // DOM 요소
    const listContainer = document.getElementById('client-list-container');
    const searchInput = document.getElementById('search-input');
    const filterType = document.getElementById('filter-type');
    const totalCount = document.getElementById('total-count');
    const emptyState = document.getElementById('empty-state');
    const detailView = document.getElementById('client-detail-view');
    
    // 폼 요소
    const inpName = document.getElementById('inp-name');
    const inpCode = document.getElementById('inp-code');
    const inpContact = document.getElementById('inp-contact');
    const inpEmail = document.getElementById('inp-email');
    const inpAddress = document.getElementById('inp-address');
    
    // 메인/서브 요소
    const selParentClient = document.getElementById('sel-parent-client');
    
    // 버튼
    const btnAddClient = document.getElementById('btn-add-client');
    const btnSaveClient = document.getElementById('btn-save-client');
    const btnDeleteClient = document.getElementById('btn-delete-client');
    const clientFormTitle = document.getElementById('client-form-title'); 
    
    // 기기 관련
    const assetListContainer = document.getElementById('asset-list-container');
    const btnAddAssetModal = document.getElementById('btn-add-asset-modal');
    const assetModal = document.getElementById('asset-modal');
    const btnAssetSave = document.getElementById('btn-asset-save');
    const btnAssetCancel = document.getElementById('btn-asset-cancel');
    const usageContainer = document.getElementById('usage-container');

    // 모달 내부
    const boxSelectModel = document.getElementById('box-select-model');
    const boxNewModelForm = document.getElementById('box-new-model-form');
    const selNewModel = document.getElementById('sel-new-model');
    const btnShowNewModelForm = document.getElementById('btn-show-new-model-form');
    const btnCancelNewModel = document.getElementById('btn-cancel-new-model');
    const inpNewMaker = document.getElementById('inp-new-maker');
    const inpNewModelName = document.getElementById('inp-new-model-name');
    const selNewType = document.getElementById('sel-new-type');
    const inpNewSerial = document.getElementById('inp-new-serial');
    
    const hdnAssetClientId = document.getElementById('hdn-asset-client-id');

    // 엑셀
    const btnExcelExport = document.getElementById('btn-excel-export');
    const btnExcelImport = document.getElementById('btn-excel-import');
    const inpExcelFile = document.getElementById('inp-excel-file');

    // 사용량 수정 모달 관련 요소
    const usageEditModal = document.getElementById('usage-edit-modal');
    const inpUsageId = document.getElementById('hdn-usage-id');
    const inpUsageDate = document.getElementById('inp-usage-date');
    const inpUsageBw = document.getElementById('inp-usage-bw');
    const inpUsageCol = document.getElementById('inp-usage-col');
    const inpUsageA3 = document.getElementById('inp-usage-a3');
    const btnUsageSave = document.getElementById('btn-usage-save');
    const btnUsageCancel = document.getElementById('btn-usage-cancel');

    let allClients = [];
    let selectedClientId = null;
    let productsList = []; 

    loadData();

    // =========================================================
    // 1. 데이터 로드
    // =========================================================
    async function loadData() {
        const { data, error } = await supabase.from('clients').select('*').order('name');
        if (error) return console.error(error);
        allClients = data;
        renderClientList(allClients);
        
        await loadProducts();
        updateParentOptions();

        if (selectedClientId) {
            const exists = allClients.find(c => c.id == selectedClientId);
            if(exists) selectClient(selectedClientId);
            else if(allClients.length > 0) selectClient(allClients[0].id);
            else resetView();
        } else if (allClients.length > 0) {
            selectClient(allClients[0].id);
        } else {
            resetView();
        }
    }

    function resetView() {
        selectedClientId = null;
        emptyState.classList.remove('hidden');
        detailView.classList.add('hidden');
    }

    function updateParentOptions() {
        if (!selParentClient) return;
        selParentClient.innerHTML = '<option value="">-- 없음 (이곳이 메인) --</option>';
        allClients.forEach(c => {
            if (selectedClientId && c.id == selectedClientId) return;
            selParentClient.innerHTML += `<option value="${c.id}">${c.name}</option>`;
        });
    }

    async function loadProducts() {
        const { data } = await supabase.from('products').select('*').order('model_name');
        if (data) {
            const uniqueProducts = data.filter((item, index, self) =>
                index === self.findIndex((t) => (
                    t.model_name === item.model_name
                ))
            );
            productsList = uniqueProducts;
        } else {
            productsList = [];
        }
    }

    function renderClientList(list) {
        totalCount.innerText = list.length;
        listContainer.innerHTML = '';
        if (list.length === 0) { listContainer.innerHTML = '<div style="padding:20px; text-align:center;">없음</div>'; return; }
        
        list.forEach(c => {
            const el = document.createElement('div');
            el.className = 'client-list-item';
            el.dataset.id = c.id;
            if (c.id == selectedClientId) el.classList.add('active');
            
            let typeBadge = '';
            if (c.parent_id) {
                typeBadge = `<span style="font-size:0.7rem; color:#0369a1; background:#e0f2fe; padding:1px 4px; border-radius:3px; margin-left:5px;">서브</span>`;
            } else {
                typeBadge = `<span style="font-size:0.7rem; color:#15803d; background:#dcfce7; padding:1px 4px; border-radius:3px; margin-left:5px;">메인</span>`;
            }

            el.innerHTML = `<div class="client-name">${c.name} ${typeBadge}</div><div class="client-meta">${c.client_code || '-'}</div>`;
            el.addEventListener('click', () => selectClient(c.id));
            listContainer.appendChild(el);
        });
    }

    function applyFilter() {
        const keyword = searchInput.value.toLowerCase();
        const type = filterType.value;

        const filtered = allClients.filter(c => {
            const matchText = (c.name && c.name.toLowerCase().includes(keyword)) ||
                              (c.client_code && c.client_code.toLowerCase().includes(keyword)) ||
                              (c.contact_person && c.contact_person.toLowerCase().includes(keyword));
            
            let matchType = true;
            if (type === 'main') matchType = !c.parent_id;
            if (type === 'sub') matchType = !!c.parent_id;

            return matchText && matchType;
        });

        renderClientList(filtered);
    }

    searchInput.addEventListener('keyup', applyFilter);
    filterType.addEventListener('change', applyFilter);


    // =========================================================
    // 2. 거래처 선택, 신규, 저장, 삭제
    // =========================================================
    async function selectClient(id) {
        selectedClientId = id;
        if(clientFormTitle) clientFormTitle.innerHTML = `<i class='bx bx-id-card'></i> 상세 정보`;
        document.querySelectorAll('.client-list-item').forEach(el => el.classList.toggle('active', el.dataset.id == id));
        const client = allClients.find(c => c.id == id);
        if (!client) return;

        emptyState.classList.add('hidden');
        detailView.classList.remove('hidden');

        inpName.value = client.name;
        inpCode.value = client.client_code;
        inpContact.value = client.contact_person || '';
        inpEmail.value = client.email || '';
        inpAddress.value = client.address || '';
        
        updateParentOptions();
        selParentClient.value = client.parent_id || '';
        
        loadAssets(id);
        loadUsage(id);
    }
    
    btnAddClient.addEventListener('click', () => {
        selectedClientId = null;
        document.querySelectorAll('.client-list-item').forEach(el => el.classList.remove('active'));

        emptyState.classList.add('hidden');
        detailView.classList.remove('hidden');
        
        if(clientFormTitle) clientFormTitle.innerHTML = `<i class='bx bx-user-plus'></i> ✨ 새 거래처 등록하기`;

        inpName.value = '';
        inpCode.value = '';
        inpContact.value = '';
        inpEmail.value = '';
        inpAddress.value = '';
        
        updateParentOptions();
        selParentClient.value = '';

        assetListContainer.innerHTML = `
            <div style="padding:30px; text-align:center; color:#9ca3af; border:2px dashed #e5e7eb; border-radius:8px;">
                <i class='bx bx-save' style="font-size:2rem; margin-bottom:5px;"></i><br>
                거래처 정보를 먼저 저장한 후<br>기기를 등록할 수 있습니다.
            </div>
        `;
        usageContainer.innerHTML = `<div style="padding:30px; text-align:center; color:#9ca3af;">신규 등록 모드입니다.</div>`;

        inpName.focus();
    });

    btnSaveClient.addEventListener('click', async () => {
        const isSub = selParentClient.value ? true : false;
        const payload = {
            name: inpName.value, 
            contact_person: inpContact.value,
            email: inpEmail.value, 
            address: inpAddress.value,
            parent_id: selParentClient.value || null,
            relation_type: isSub ? '서브' : '메인'
        };

        if (!payload.name) return alert('거래처명은 필수입니다.');

        let res;
        if (selectedClientId) {
            res = await supabase.from('clients').update(payload).eq('id', selectedClientId);
        } else {
            const newCode = `C-${Math.floor(1000 + Math.random() * 9000)}`;
            payload.client_code = newCode;
            res = await supabase.from('clients').insert(payload).select().single();
        }

        if (res.error) {
            alert('저장 실패: ' + res.error.message);
        } else {
            alert(selectedClientId ? '수정되었습니다.' : '새 거래처가 등록되었습니다.');
            if (!selectedClientId && res.data) {
                selectedClientId = res.data.id;
            }
            loadData(); 
        }
    });

    if (btnDeleteClient) {
        btnDeleteClient.addEventListener('click', async () => {
            if (!selectedClientId) return alert('삭제할 거래처를 선택해주세요.');
            if (!confirm('정말 삭제하시겠습니까?\n이 거래처에 등록된 기기 정보의 연결이 해제됩니다.')) return;

            const { error } = await supabase.from('clients').delete().eq('id', selectedClientId);
            if (error) {
                alert('삭제 실패: ' + error.message);
            } else {
                alert('거래처가 삭제되었습니다.');
                selectedClientId = null;
                loadData(); 
            }
        });
    }

    // =========================================================
    // 3. 기기 목록 (Assets)
    // =========================================================
    async function loadAssets(clientId) {
        assetListContainer.innerHTML = '<div style="color:#999; text-align:center;">로딩 중...</div>';
        
        const { data: branches } = await supabase
            .from('clients')
            .select('id, name')
            .eq('parent_id', clientId);
            
        const targetIds = [clientId];
        const branchMap = {};
        
        if (branches && branches.length > 0) {
            branches.forEach(b => {
                targetIds.push(b.id);
                branchMap[b.id] = b.name; 
            });
        }

        const { data: assets } = await supabase
            .from('assets')
            .select('*, products(model_name), clients(name)')
            .in('client_id', targetIds)
            .order('created_at');
        
        if (!assets || assets.length === 0) { 
            assetListContainer.innerHTML = '<div style="padding:20px; text-align:center; color:#9ca3af;">등록된 기기가 없습니다.</div>'; 
            return; 
        }
        
        assetListContainer.innerHTML = '';
        
        assets.forEach(asset => {
            const card = document.createElement('div');
            card.className = 'asset-card';
            
            let subBadge = '';
            if (asset.client_id !== clientId) {
                const subName = branchMap[asset.client_id] || asset.clients?.name || '서브';
                subBadge = `<span style="background:#e0f2fe; color:#0369a1; font-size:0.75rem; padding:1px 5px; border-radius:3px; margin-left:6px; border:1px solid #bae6fd; white-space:nowrap;">🔗 ${subName}</span>`;
            }

            const showDate = (d) => d || '-';
            const cost = (n) => n ? n.toLocaleString() : '0';
            let billDayDisplay = '-';
            if (asset.billing_day) billDayDisplay = asset.billing_day === '말일' ? '말일' : `${asset.billing_day}일`;
            
            card.innerHTML = `
                <div class="asset-header">
                    <div class="asset-header-left">
                        <i class='bx bx-chevron-right arrow-icon' style="font-size:1.2rem; color:#9ca3af; min-width:20px; transition:transform 0.2s;"></i>
                        <span class="asset-model" title="${asset.products?.model_name || ''}">${asset.products?.model_name || 'Unknown'}</span> 
                        <span class="asset-sn">${asset.serial_number}</span>
                        ${subBadge}
                    </div>
                    
                    <div style="flex-shrink:0; margin-left:10px; display:flex; gap:5px;">
                        <button class="btn-edit-asset" data-id="${asset.id}" style="color:#2563eb; background:white; border:1px solid #bfdbfe; border-radius:4px; padding:3px 8px; cursor:pointer; font-size:0.75rem; display:flex; align-items:center; gap:3px; white-space:nowrap;">
                            <i class='bx bx-edit'></i> 수정
                        </button>
                        
                        <button class="btn-return-asset" data-id="${asset.id}" style="color:#dc2626; background:white; border:1px solid #fecaca; border-radius:4px; padding:3px 8px; cursor:pointer; font-size:0.75rem; display:flex; align-items:center; gap:3px; white-space:nowrap;">
                            <i class='bx bx-log-out-circle'></i> 철수
                        </button>
                    </div>
                </div>

                <div class="asset-details">
                    <div class="info-grid">
                        <div><span class="info-label">설치부서</span> <span class="info-value">${asset.install_location || '-'}</span></div>
                        <div><span class="info-label">청구방식</span> <span class="info-value">${asset.billing_method || '-'} / ${billDayDisplay}</span></div>
                        <div><span class="info-label">계약일자</span> <span class="info-value">${showDate(asset.contract_date)}</span></div>
                        <div><span class="info-label">만기일</span> <span class="info-value">${showDate(asset.contract_end_date)}</span></div>
                        <div><span class="info-label">월 기본료</span> <span class="info-value">${cost(asset.rental_cost)}원</span></div>
                        <div><span class="info-label">기본매수</span> <span class="info-value">흑백:${cost(asset.base_count_bw)} / 칼라:${cost(asset.base_count_col)}</span></div>
                        <div class="info-full"><span class="info-label">비고</span><span class="info-value" style="color:#666; font-size:0.8rem;">${asset.memo || '-'}</span></div>
                    </div>
                </div>`;
            
            // --- 이벤트 리스너 ---
            const header = card.querySelector('.asset-header');
            const details = card.querySelector('.asset-details');
            const arrow = card.querySelector('.arrow-icon');
            
            header.addEventListener('click', () => {
                const isHidden = getComputedStyle(details).display === 'none';
                if (isHidden) {
                    details.style.display = 'block'; 
                    arrow.style.transform = 'rotate(90deg)'; 
                    header.style.background = '#f9fafb';
                } else {
                    details.style.display = 'none'; 
                    arrow.style.transform = 'rotate(0deg)';
                    header.style.background = '#fff';
                }
            });

            const editBtn = card.querySelector('.btn-edit-asset');
            editBtn.addEventListener('click', (e) => {
                e.stopPropagation(); 
                window.openAssetModal(asset);
            });

            const returnBtn = card.querySelector('.btn-return-asset');
            returnBtn.addEventListener('click', async (e) => {
                e.stopPropagation(); 
                
                if (!confirm(`[${asset.products?.model_name || ''}] 기기를 철수하시겠습니까?\n\n'확인'을 누르면 즉시 재고로 전환되며,\n이 거래처 목록에서 사라집니다.`)) return;

                const { error } = await supabase.from('assets').update({
                    client_id: null,
                    status: '재고',
                    install_location: ''
                }).eq('id', asset.id);

                if (error) {
                    alert('철수 처리 실패: ' + error.message);
                } else {
                    alert('✅ 재고로 회수되었습니다.');
                    loadAssets(clientId); 
                }
            });

            assetListContainer.appendChild(card);
        });
    }

    // =========================================================
    // 4. 기기 추가 모달
    // =========================================================
    btnShowNewModelForm.addEventListener('click', () => { boxSelectModel.classList.add('hidden'); boxNewModelForm.classList.remove('hidden'); inpNewMaker.focus(); });
    btnCancelNewModel.addEventListener('click', () => { boxNewModelForm.classList.add('hidden'); boxSelectModel.classList.remove('hidden'); inpNewMaker.value = ''; inpNewModelName.value = ''; });

    window.openAssetModal = async function(asset = null) {
        await loadProducts();
        
        document.getElementById('hdn-asset-id').value = asset ? asset.id : '';
        hdnAssetClientId.value = asset ? asset.client_id : selectedClientId;

        boxNewModelForm.classList.add('hidden'); boxSelectModel.classList.remove('hidden');
        
        document.getElementById('inp-asset-loc').value = asset ? asset.install_location || '' : '';
        document.getElementById('inp-con-date').value = asset ? asset.contract_date || '' : '';
        document.getElementById('inp-start-date').value = asset ? asset.contract_start_date || '' : '';
        document.getElementById('inp-end-date').value = asset ? asset.contract_end_date || '' : '';
        document.getElementById('inp-cancel-date').value = asset ? asset.cancel_date || '' : '';
        document.getElementById('inp-asset-bill-method').value = asset ? asset.billing_method || '' : '';
        document.getElementById('inp-asset-bill-day').value = asset ? asset.billing_day || '' : '';
        document.getElementById('inp-rental-cost').value = asset ? asset.rental_cost : '';
        document.getElementById('inp-base-bw').value = asset ? asset.base_count_bw : '';
        document.getElementById('inp-base-col').value = asset ? asset.base_count_col : '';
        document.getElementById('inp-over-bw').value = asset ? asset.overage_cost_bw : '';
        document.getElementById('inp-over-col').value = asset ? asset.overage_cost_col : '';
        document.getElementById('inp-memo').value = asset ? asset.memo || '' : '';
        
        selNewModel.innerHTML = '<option value="">-- 모델 선택 --</option>' + productsList.map(p => `<option value="${p.id}">${p.model_name}</option>`).join('');
        if (asset) { selNewModel.value = asset.product_id; inpNewSerial.value = asset.serial_number; } else { selNewModel.value = ''; inpNewSerial.value = ''; }
        
        assetModal.style.display = 'flex';
    };

    btnAddAssetModal.addEventListener('click', () => { 
        if (!selectedClientId) return alert('거래처를 선택하세요.'); 
        window.openAssetModal(null); 
    });
    
    btnAssetCancel.addEventListener('click', () => assetModal.style.display = 'none');

    btnAssetSave.addEventListener('click', async () => {
        const assetId = document.getElementById('hdn-asset-id').value; 
        const serial = document.getElementById('inp-new-serial').value.trim();
        let finalProductId = null;
        const isNewModelMode = !boxNewModelForm.classList.contains('hidden'); 
        
        if (isNewModelMode) {
            const maker = inpNewMaker.value.trim(); const modelName = inpNewModelName.value.trim(); const type = selNewType.value;
            if (!maker || !modelName) return alert('제조사와 모델명은 필수입니다.');
            const { data: newProd, error: prodErr } = await supabase.from('products').insert({ brand: maker, model_name: modelName, type: type }).select().single();
            if (prodErr) return alert('모델 등록 실패: ' + prodErr.message);
            finalProductId = newProd.id;
        } else { 
            finalProductId = selNewModel.value; 
            if (!finalProductId) return alert('모델을 선택하세요.'); 
        }

        if (!serial) return alert('Serial No.는 필수입니다.');
        
        const { data: duplicate } = await supabase.from('assets').select('id, serial_number').eq('serial_number', serial).maybeSingle();
        if (duplicate) { 
            if (!assetId) return alert(`❌ 이미 등록된 S/N입니다.`); 
            if (assetId && duplicate.id != assetId) return alert(`❌ 이미 다른 기기에서 사용 중인 S/N입니다.`); 
        }

        const targetClientId = hdnAssetClientId.value || selectedClientId;

        const payload = {
            client_id: targetClientId, 
            product_id: finalProductId, 
            serial_number: serial,
            install_location: document.getElementById('inp-asset-loc').value, 
            contract_date: document.getElementById('inp-con-date').value || null,
            contract_start_date: document.getElementById('inp-start-date').value || null, 
            contract_end_date: document.getElementById('inp-end-date').value || null,
            cancel_date: document.getElementById('inp-cancel-date').value || null, 
            billing_method: document.getElementById('inp-asset-bill-method').value,
            billing_day: document.getElementById('inp-asset-bill-day').value, 
            rental_cost: Number(document.getElementById('inp-rental-cost').value) || 0,
            base_count_bw: Number(document.getElementById('inp-base-bw').value) || 0, 
            base_count_col: Number(document.getElementById('inp-base-col').value) || 0,
            overage_cost_bw: Number(document.getElementById('inp-over-bw').value) || 0, 
            overage_cost_col: Number(document.getElementById('inp-over-col').value) || 0,
            memo: document.getElementById('inp-memo').value, 
            status: '사용중'
        };

        let res; 
        if (assetId) res = await supabase.from('assets').update(payload).eq('id', assetId); 
        else res = await supabase.from('assets').insert(payload);
        
        if (res.error) { 
            if (res.error.code === '23505') alert('❌ 중복된 Serial No. 입니다.'); 
            else alert('저장 실패: ' + res.error.message); 
        } else { 
            alert('✅ 저장되었습니다.'); 
            assetModal.style.display = 'none'; 
            loadAssets(selectedClientId); 
            if(isNewModelMode) loadProducts();
        }
    });

    // 사용량 수정 모달 이벤트 (수정됨)
    if (btnUsageCancel) {
        btnUsageCancel.addEventListener('click', () => {
            usageEditModal.style.display = 'none';
        });
    }

    if (btnUsageSave) {
        btnUsageSave.addEventListener('click', async () => {
            const id = inpUsageId.value;
            // ★ [수정] 날짜 필드 제외 (수정 불가)
            const payload = {
                reading_bw: Number(inpUsageBw.value) || 0,
                reading_col: Number(inpUsageCol.value) || 0,
                reading_col_a3: Number(inpUsageA3.value) || 0
            };

            const { error } = await supabase
                .from('meter_readings')
                .update(payload)
                .eq('id', id);

            if (error) {
                alert('수정 실패: ' + error.message);
            } else {
                alert('수정되었습니다.');
                usageEditModal.style.display = 'none';
                loadUsage(selectedClientId); 
            }
        });
    }

    // =========================================================
    // 5. 사용량 (Accounting) 관리 - 리사이징 & CRUD (수정됨)
    // =========================================================
    
    let usageData = []; 

    async function loadUsage(clientId) {
        const usageContainer = document.getElementById('usage-container');
        usageContainer.innerHTML = '<div style="text-align:center; padding:20px; color:#666;">데이터를 불러오는 중...</div>';
        
        try {
            const { data: readings, error } = await supabase
                .from('meter_readings')
                .select(`
                    *,
                    assets!inner (
                        id, serial_number,
                        products ( model_name )
                    )
                `)
                .eq('assets.client_id', clientId)
                .order('reading_date', { ascending: false });

            if (error) {
                console.error("사용량 조회 에러:", error);
                throw error;
            }

            usageData = readings || []; 
            renderUsageUI(clientId);

        } catch (err) {
            console.error(err);
            usageContainer.innerHTML = `<div style="text-align:center; padding:20px; color:red;">불러오기 실패<br><span style="font-size:0.8rem;">${err.message}</span></div>`;
        }
    }

    function renderUsageUI(clientId) {
        const usageContainer = document.getElementById('usage-container');

        let dayOptions = '<option value="">일(전체)</option>';
        for(let i=1; i<=31; i++) {
            const val = String(i).padStart(2, '0'); 
            dayOptions += `<option value="${val}">${i}일</option>`;
        }

        const filterHtml = `
            <div class="usage-filter-bar">
                <input type="month" id="filter-usage-month" class="form-input" style="width:110px; font-size:0.8rem;">
                
                <select id="filter-usage-day" class="form-input" style="width:80px; font-size:0.8rem;">
                    ${dayOptions}
                </select>

                <input type="text" id="filter-usage-search" class="form-input" placeholder="모델명, S/N 검색..." style="flex:1; font-size:0.8rem;">
            </div>
            
            <div class="usage-table-wrapper">
                <table class="resizable-table" id="usage-table">
                    <thead>
                        <tr>
                            <th style="width: 90px;">날짜 <div class="resize-handle"></div></th>
                            <th style="width: 140px;">모델명 (S/N) <div class="resize-handle"></div></th>
                            <th style="width: 70px;">흑백 <div class="resize-handle"></div></th>
                            <th style="width: 70px;">칼라 <div class="resize-handle"></div></th>
                            <th style="width: 70px;">A3 <div class="resize-handle"></div></th>
                            <th style="width: 60px;">관리</th>
                        </tr>
                    </thead>
                    <tbody id="usage-tbody"></tbody>
                </table>
            </div>
        `;
        usageContainer.innerHTML = filterHtml;
        
        renderUsageTableRows();

        document.getElementById('filter-usage-month').addEventListener('change', renderUsageTableRows);
        document.getElementById('filter-usage-day').addEventListener('change', renderUsageTableRows);
        document.getElementById('filter-usage-search').addEventListener('keyup', renderUsageTableRows);
        
        enableTableResizing('usage-table');
    }

    function renderUsageTableRows() {
        const tbody = document.getElementById('usage-tbody');
        if (!tbody) return;

        const filterMonth = document.getElementById('filter-usage-month').value; 
        const filterDay = document.getElementById('filter-usage-day').value;     
        const keyword = document.getElementById('filter-usage-search').value.toLowerCase(); 

        const filtered = usageData.filter(item => {
            const date = item.reading_date || ''; 
            
            const matchMonth = filterMonth ? date.startsWith(filterMonth) : true;
            const dayPart = date.slice(-2); 
            const matchDay = filterDay ? (dayPart === filterDay) : true;
            const modelName = (item.assets?.products?.model_name || '').toLowerCase();
            const serial = (item.assets?.serial_number || '').toLowerCase();
            const matchText = modelName.includes(keyword) || serial.includes(keyword);

            return matchMonth && matchDay && matchText;
        });

        if (filtered.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:20px; color:#999;">데이터가 없습니다.</td></tr>';
            return;
        }

        tbody.innerHTML = filtered.map(item => `
            <tr>
                <td style="text-align:center;">${item.reading_date}</td>
                <td style="text-align:left;">
                    <div style="font-weight:bold; color:#0369a1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                        ${item.assets.products.model_name}
                    </div>
                    <div style="font-size:0.7rem; color:#888;">${item.assets.serial_number}</div>
                </td>
                <td>${item.reading_bw?.toLocaleString()}</td>
                <td>${item.reading_col?.toLocaleString()}</td>
                <td>${item.reading_col_a3?.toLocaleString() || 0}</td>
                <td style="text-align:center;">
                    <button class="btn-edit-reading" data-id="${item.id}" style="border:none; background:none; cursor:pointer; color:#2563eb; padding:2px;"><i class='bx bx-edit'></i></button>
                    <button class="btn-del-reading" data-id="${item.id}" style="border:none; background:none; cursor:pointer; color:#ef4444; padding:2px;"><i class='bx bx-trash'></i></button>
                </td>
            </tr>
        `).join('');

        // 1. 삭제 버튼
        tbody.querySelectorAll('.btn-del-reading').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.target.closest('button').dataset.id;
                if (!confirm('정말 삭제하시겠습니까?')) return;

                const { error } = await supabase.from('meter_readings').delete().eq('id', id);
                if (error) alert('삭제 실패: ' + error.message);
                else loadUsage(selectedClientId);
            });
        });

        // 2. 수정 버튼 (모달 열기)
        tbody.querySelectorAll('.btn-edit-reading').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.closest('button').dataset.id;
                const item = usageData.find(d => d.id == id);
                
                if (item) {
                    const inpUsageId = document.getElementById('hdn-usage-id');
                    const inpUsageDate = document.getElementById('inp-usage-date');
                    const inpUsageBw = document.getElementById('inp-usage-bw');
                    const inpUsageCol = document.getElementById('inp-usage-col');
                    const inpUsageA3 = document.getElementById('inp-usage-a3');
                    const usageEditModal = document.getElementById('usage-edit-modal');

                    inpUsageId.value = item.id;
                    inpUsageDate.value = item.reading_date;
                    inpUsageBw.value = item.reading_bw || 0;
                    inpUsageCol.value = item.reading_col || 0;
                    inpUsageA3.value = item.reading_col_a3 || 0;
                    
                    usageEditModal.style.display = 'flex';
                }
            });
        });
    }

    function enableTableResizing(tableId) {
        const table = document.getElementById(tableId);
        if(!table) return;
        const headers = table.querySelectorAll('th');

        headers.forEach(th => {
            const handle = th.querySelector('.resize-handle');
            if (!handle) return;

            handle.addEventListener('mousedown', (e) => {
                e.preventDefault();
                const startX = e.pageX;
                const startWidth = th.offsetWidth;

                const onMouseMove = (moveEvent) => {
                    const newWidth = startWidth + (moveEvent.pageX - startX);
                    if (newWidth > 30) th.style.width = `${newWidth}px`;
                };

                const onMouseUp = () => {
                    document.removeEventListener('mousemove', onMouseMove);
                    document.removeEventListener('mouseup', onMouseUp);
                    handle.classList.remove('active');
                };

                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('mouseup', onMouseUp);
                handle.classList.add('active');
            });
        });
    }

    enableResizing();

    function enableResizing() {
        const container = document.getElementById('layout-container');
        const resizerLeft = document.getElementById('resizer-left');
        const resizerRight = document.getElementById('resizer-right');

        let leftWidth = 280;
        let midWidth = 500;
        
        const disableSelect = () => { document.body.style.userSelect = 'none'; document.body.style.cursor = 'col-resize'; };
        const enableSelect = () => { document.body.style.userSelect = ''; document.body.style.cursor = ''; };

        if (resizerLeft) {
            resizerLeft.addEventListener('mousedown', (e) => {
                e.preventDefault(); disableSelect();
                document.addEventListener('mousemove', onMouseMoveLeft); document.addEventListener('mouseup', onMouseUpLeft);
                resizerLeft.classList.add('resizing');
            });
        }
        function onMouseMoveLeft(e) {
            const containerLeft = container.getBoundingClientRect().left;
            const newLeftW = e.clientX - containerLeft;
            if (newLeftW > 150 && newLeftW < 600) { leftWidth = newLeftW; updateGrid(); }
        }
        function onMouseUpLeft() {
            enableSelect(); document.removeEventListener('mousemove', onMouseMoveLeft); document.removeEventListener('mouseup', onMouseUpLeft);
            if(resizerLeft) resizerLeft.classList.remove('resizing');
        }

        if (resizerRight) {
            resizerRight.addEventListener('mousedown', (e) => {
                e.preventDefault(); disableSelect();
                document.addEventListener('mousemove', onMouseMoveRight); document.addEventListener('mouseup', onMouseUpRight);
                resizerRight.classList.add('resizing');
            });
        }
        function onMouseMoveRight(e) {
            const containerLeft = container.getBoundingClientRect().left;
            const leftTotal = containerLeft + leftWidth + 5; 
            const newMidW = e.clientX - leftTotal;
            if (newMidW > 300 && newMidW < 1000) { midWidth = newMidW; updateGrid(); }
        }
        function onMouseUpRight() {
            enableSelect(); document.removeEventListener('mousemove', onMouseMoveRight); document.removeEventListener('mouseup', onMouseUpRight);
            if(resizerRight) resizerRight.classList.remove('resizing');
        }

        function updateGrid() {
            container.style.gridTemplateColumns = `${leftWidth}px 5px ${midWidth}px 5px 1fr`;
        }
    }

    setupAccordion('header-client-info', 'body-client-info', 'icon-client-info');
    setupAccordion('header-asset-info', 'body-asset-info', 'icon-asset-info');

    function setupAccordion(headerId, bodyId, iconId) {
        const header = document.getElementById(headerId);
        const body = document.getElementById(bodyId);
        const icon = document.getElementById(iconId);

        if (header && body && icon) {
            header.addEventListener('click', (e) => {
                if (e.target.tagName === 'BUTTON' || e.target.closest('button')) return;
                body.classList.toggle('hidden-body');
                icon.classList.toggle('rotate');
            });
        }
    }
}