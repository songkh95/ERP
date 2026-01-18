import { supabase } from '../../common/db.js';
export { render } from './clients.view.js';

export async function init() {
    // =========================================================
    // 0. DOM 요소 전체 선택
    // =========================================================
    
    // 메인 레이아웃 및 리스트
    const listContainer = document.getElementById('client-list-container');
    const searchInput = document.getElementById('search-input');
    const filterType = document.getElementById('filter-type');
    const totalCount = document.getElementById('total-count');
    const emptyState = document.getElementById('empty-state');
    const detailView = document.getElementById('client-detail-view');
    const clientFormTitle = document.getElementById('client-form-title'); 

    // 거래처 입력 폼
    const inpName = document.getElementById('inp-name');
    const inpCode = document.getElementById('inp-code');
    const inpContact = document.getElementById('inp-contact');
    const inpEmail = document.getElementById('inp-email');
    const inpAddress = document.getElementById('inp-address');
    const selParentClient = document.getElementById('sel-parent-client');
    
    // 거래처 조작 버튼
    const btnAddClient = document.getElementById('btn-add-client');
    const btnSaveClient = document.getElementById('btn-save-client');
    const btnDeleteClient = document.getElementById('btn-delete-client');
    
    // 기기(Asset) 관련 요소
    const assetListContainer = document.getElementById('asset-list-container');
    const btnAddAssetModal = document.getElementById('btn-add-asset-modal');
    const assetModal = document.getElementById('asset-modal');
    const btnAssetSave = document.getElementById('btn-asset-save');
    const btnAssetCancel = document.getElementById('btn-asset-cancel');
    const hdnAssetClientId = document.getElementById('hdn-asset-client-id');

    // 기기 모달 내부 요소
    const boxSelectModel = document.getElementById('box-select-model');
    const boxNewModelForm = document.getElementById('box-new-model-form');
    const selNewModel = document.getElementById('sel-new-model');
    const btnShowNewModelForm = document.getElementById('btn-show-new-model-form');
    const btnCancelNewModel = document.getElementById('btn-cancel-new-model');
    const inpNewMaker = document.getElementById('inp-new-maker');
    const inpNewModelName = document.getElementById('inp-new-model-name');
    const selNewType = document.getElementById('sel-new-type');
    const inpNewSerial = document.getElementById('inp-new-serial');

    // 엑셀 관련 버튼
    const btnExcelExport = document.getElementById('btn-excel-export');
    const btnExcelImport = document.getElementById('btn-excel-import');
    const inpExcelFile = document.getElementById('inp-excel-file');

    // 사용량(Usage) 관련 요소 및 모달
    const usageContainer = document.getElementById('usage-container');
    const usageEditModal = document.getElementById('usage-edit-modal');
    const inpUsageId = document.getElementById('hdn-usage-id');
    const inpUsageDate = document.getElementById('inp-usage-date');
    const inpUsageBw = document.getElementById('inp-usage-bw');
    const inpUsageCol = document.getElementById('inp-usage-col');
    const inpUsageA3 = document.getElementById('inp-usage-a3');
    const btnUsageSave = document.getElementById('btn-usage-save');
    const btnUsageCancel = document.getElementById('btn-usage-cancel');

    // 전역 변수
    let allClients = [];
    let selectedClientId = null;
    let productsList = []; 
    let usageData = []; 

    // 초기 데이터 로드
    loadData();

    // =========================================================
    // 1. 데이터 로드 및 거래처 목록 렌더링
    // =========================================================
    async function loadData() {
        const { data, error } = await supabase.from('clients').select('*').order('name');
        if (error) return console.error(error);
        allClients = data;
        renderClientList(allClients);
        
        await loadProducts();
        updateParentOptions();

        // 선택 상태 유지 로직
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

    function renderClientList(list) {
        if(totalCount) totalCount.innerText = list.length;
        listContainer.innerHTML = '';
        if (list.length === 0) { listContainer.innerHTML = '<div style="padding:20px; text-align:center;">없음</div>'; return; }
        
        list.forEach(c => {
            const el = document.createElement('div');
            el.className = 'client-list-item';
            el.dataset.id = c.id;
            if (c.id == selectedClientId) el.classList.add('active');
            
            // 메인/서브 뱃지
            let typeBadge = c.parent_id 
                ? `<span style="font-size:0.7rem; color:#0369a1; background:#e0f2fe; padding:1px 4px; border-radius:3px; margin-left:5px;">서브</span>`
                : `<span style="font-size:0.7rem; color:#15803d; background:#dcfce7; padding:1px 4px; border-radius:3px; margin-left:5px;">메인</span>`;

            el.innerHTML = `<div class="client-name">${c.name} ${typeBadge}</div><div class="client-meta">${c.client_code || '-'}</div>`;
            el.addEventListener('click', () => selectClient(c.id));
            listContainer.appendChild(el);
        });
    }

    // 통합 검색 필터
    function applyFilter() {
        const keyword = searchInput.value.toLowerCase();
        const type = filterType.value; // 'all', 'main', 'sub'

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

    if(searchInput) searchInput.addEventListener('keyup', applyFilter);
    if(filterType) filterType.addEventListener('change', applyFilter);

    // =========================================================
    // 2. 거래처 CRUD (선택, 신규, 저장, 삭제)
    // =========================================================
    async function selectClient(id) {
        selectedClientId = id;
        if(clientFormTitle) clientFormTitle.innerHTML = `<i class='bx bx-id-card'></i> 상세 정보`;
        document.querySelectorAll('.client-list-item').forEach(el => el.classList.toggle('active', el.dataset.id == id));
        
        const client = allClients.find(c => c.id == id);
        if (!client) return;

        emptyState.classList.add('hidden');
        detailView.classList.remove('hidden');

        // 폼 채우기
        if(inpName) inpName.value = client.name;
        if(inpCode) inpCode.value = client.client_code;
        if(inpContact) inpContact.value = client.contact_person || '';
        if(inpEmail) inpEmail.value = client.email || '';
        if(inpAddress) inpAddress.value = client.address || '';
        
        updateParentOptions();
        if(selParentClient) selParentClient.value = client.parent_id || '';
        
        // 하위 데이터 로드
        loadAssets(id);
        loadUsage(id); 
    }

    function updateParentOptions() {
        if (!selParentClient) return;
        selParentClient.innerHTML = '<option value="">-- 없음 (이곳이 메인) --</option>';
        allClients.forEach(c => {
            if (selectedClientId && c.id == selectedClientId) return;
            selParentClient.innerHTML += `<option value="${c.id}">${c.name}</option>`;
        });
    }
    
    // 신규 등록 버튼
    if(btnAddClient) {
        btnAddClient.addEventListener('click', () => {
            selectedClientId = null;
            document.querySelectorAll('.client-list-item').forEach(el => el.classList.remove('active'));

            emptyState.classList.add('hidden');
            detailView.classList.remove('hidden');
            if(clientFormTitle) clientFormTitle.innerHTML = `<i class='bx bx-user-plus'></i> ✨ 새 거래처 등록하기`;

            inpName.value = ''; inpCode.value = ''; inpContact.value = ''; inpEmail.value = ''; inpAddress.value = '';
            updateParentOptions(); selParentClient.value = '';

            assetListContainer.innerHTML = `<div style="padding:30px; text-align:center; color:#9ca3af; border:2px dashed #e5e7eb;">거래처 정보를 먼저 저장한 후<br>기기를 등록할 수 있습니다.</div>`;
            usageContainer.innerHTML = `<div style="padding:30px; text-align:center; color:#9ca3af;">신규 등록 모드입니다.</div>`;
            inpName.focus();
        });
    }

    // 거래처 저장
    if(btnSaveClient) {
        btnSaveClient.addEventListener('click', async () => {
            const isSub = selParentClient.value ? true : false;
            const payload = {
                name: inpName.value, contact_person: inpContact.value, email: inpEmail.value, 
                address: inpAddress.value, parent_id: selParentClient.value || null,
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

            if (res.error) alert('저장 실패: ' + res.error.message);
            else {
                alert(selectedClientId ? '수정되었습니다.' : '새 거래처가 등록되었습니다.');
                if (!selectedClientId && res.data) selectedClientId = res.data.id;
                loadData(); 
            }
        });
    }

    // 거래처 삭제
    if (btnDeleteClient) {
        btnDeleteClient.addEventListener('click', async () => {
            if (!selectedClientId) return alert('삭제할 거래처를 선택해주세요.');
            if (!confirm('정말 삭제하시겠습니까?\n이 거래처에 등록된 기기 정보의 연결이 해제됩니다.')) return;

            const { error } = await supabase.from('clients').delete().eq('id', selectedClientId);
            if (error) alert('삭제 실패: ' + error.message);
            else {
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
        
        // 1. 하위(서브) 거래처 ID 찾기
        const { data: branches } = await supabase.from('clients').select('id, name').eq('parent_id', clientId);
        const targetIds = [clientId];
        const branchMap = {};
        if (branches) branches.forEach(b => { targetIds.push(b.id); branchMap[b.id] = b.name; });

        // 2. 본점 + 지점 기기 모두 조회 (계약 정보 포함)
        const { data: assets } = await supabase
            .from('assets')
            .select('*, products(model_name), clients(name), contracts(*)') // ★ contracts 조인 필수
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
            
            // 서브 거래처 뱃지
            let subBadge = '';
            if (asset.client_id !== clientId) {
                const subName = branchMap[asset.client_id] || asset.clients?.name || '서브';
                subBadge = `<span style="background:#e0f2fe; color:#0369a1; font-size:0.75rem; padding:1px 5px; border-radius:3px; margin-left:6px; border:1px solid #bae6fd; white-space:nowrap;">🔗 ${subName}</span>`;
            }

            // 계약 정보 요약
            const con = asset.contracts?.[0]; 
            const feeInfo = con ? `${con.monthly_fee.toLocaleString()}원` : '<span style="color:red; font-size:0.8em;">(계약미설정)</span>';

            const showDate = (d) => d || '-';
            let billDayDisplay = asset.billing_day === '말일' ? '말일' : (asset.billing_day ? `${asset.billing_day}일` : '-');
            
            card.innerHTML = `
                <div class="asset-header">
                    <div class="asset-header-left">
                        <i class='bx bx-chevron-right arrow-icon' style="font-size:1.2rem; color:#9ca3af; min-width:20px; transition:transform 0.2s;"></i>
                        <span class="asset-model" title="${asset.products?.model_name || ''}">${asset.products?.model_name || 'Unknown'}</span> 
                        <span class="asset-sn">${asset.serial_number}</span>
                        ${subBadge}
                        <span style="font-size:0.75rem; color:#666; margin-left:10px;">${feeInfo}</span>
                    </div>
                    <div style="flex-shrink:0; margin-left:10px; display:flex; gap:5px;">
                        <button class="btn-edit-asset" style="color:#2563eb; background:white; border:1px solid #bfdbfe; border-radius:4px; padding:3px 8px; cursor:pointer; font-size:0.75rem; display:flex; align-items:center; gap:3px; white-space:nowrap;">
                            <i class='bx bx-edit'></i> 수정
                        </button>
                        <button class="btn-return-asset" style="color:#dc2626; background:white; border:1px solid #fecaca; border-radius:4px; padding:3px 8px; cursor:pointer; font-size:0.75rem; display:flex; align-items:center; gap:3px; white-space:nowrap;">
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
                        
                        <div class="info-full" style="background:#f8f9fa; padding:8px; border-radius:4px;">
                            <span class="info-label">💰 계약 요금 상세</span>
                            <div style="font-weight:500; color:#333;">월 기본료: ${con ? con.monthly_fee.toLocaleString() : 0}원</div>
                            <div style="font-size:0.85rem; color:#666;">기본제공: 흑백 ${con ? con.base_bw : 0}매 / 컬러 ${con ? con.base_color : 0}매</div>
                        </div>

                        <div class="info-full"><span class="info-label">비고</span><span class="info-value" style="color:#666; font-size:0.8rem;">${asset.memo || '-'}</span></div>
                    </div>
                </div>`;
            
            // 아코디언 동작
            const header = card.querySelector('.asset-header');
            const details = card.querySelector('.asset-details');
            const arrow = card.querySelector('.arrow-icon');
            header.addEventListener('click', () => {
                const isHidden = getComputedStyle(details).display === 'none';
                details.style.display = isHidden ? 'block' : 'none';
                arrow.style.transform = isHidden ? 'rotate(90deg)' : 'rotate(0deg)';
                header.style.background = isHidden ? '#f9fafb' : '#fff';
            });

            // 수정 버튼 동작
            card.querySelector('.btn-edit-asset').addEventListener('click', (e) => {
                e.stopPropagation(); 
                window.openAssetModal(asset); // ★ 글로벌 함수 호출
            });

            // 철수 버튼 동작
            card.querySelector('.btn-return-asset').addEventListener('click', async (e) => {
                e.stopPropagation(); 
                if (!confirm(`[${asset.products?.model_name}] 기기를 철수하시겠습니까?`)) return;
                const { error } = await supabase.from('assets').update({ client_id: null, status: '재고', install_location: '' }).eq('id', asset.id);
                if (error) alert('철수 실패: ' + error.message);
                else { alert('✅ 철수 완료'); loadAssets(clientId); }
            });

            assetListContainer.appendChild(card);
        });
    }

    // =========================================================
    // 4. 기기 추가/수정 모달 로직 (계약 정보 포함)
    // =========================================================
    async function loadProducts() {
        const { data } = await supabase.from('products').select('*').order('model_name');
        if (data) {
            productsList = data.filter((item, index, self) => index === self.findIndex((t) => t.model_name === item.model_name));
        } else productsList = [];
    }

    if(btnShowNewModelForm) btnShowNewModelForm.addEventListener('click', () => { boxSelectModel.classList.add('hidden'); boxNewModelForm.classList.remove('hidden'); });
    if(btnCancelNewModel) btnCancelNewModel.addEventListener('click', () => { boxNewModelForm.classList.add('hidden'); boxSelectModel.classList.remove('hidden'); });

    // ★ window 객체에 할당하여 loadAssets에서도 호출 가능하게 함
    window.openAssetModal = async function(asset = null) {
        await loadProducts();
        document.getElementById('hdn-asset-id').value = asset ? asset.id : '';
        hdnAssetClientId.value = asset ? asset.client_id : selectedClientId;

        boxNewModelForm.classList.add('hidden'); boxSelectModel.classList.remove('hidden');
        
        // 기기 정보 채우기
        const setVal = (id, val) => document.getElementById(id).value = val || '';
        setVal('inp-asset-loc', asset?.install_location);
        setVal('inp-con-date', asset?.contract_date);
        setVal('inp-start-date', asset?.contract_start_date);
        setVal('inp-end-date', asset?.contract_end_date);
        setVal('inp-cancel-date', asset?.cancel_date);
        setVal('inp-asset-bill-method', asset?.billing_method);
        setVal('inp-asset-bill-day', asset?.billing_day);
        setVal('inp-memo', asset?.memo);

        // 계약(요금) 정보 채우기
        const con = asset?.contracts?.[0]; // 조인된 계약정보
        setVal('inp-contract-fee', con?.monthly_fee || 0);
        setVal('inp-contract-base-bw', con?.base_bw || 0);
        setVal('inp-contract-base-col', con?.base_color || 0);
        setVal('inp-contract-rate-bw', con?.rate_bw || 10);
        setVal('inp-contract-rate-a4', con?.rate_color_a4 || 100);
        setVal('inp-contract-rate-a3', con?.rate_color_a3 || 200);

        selNewModel.innerHTML = '<option value="">-- 모델 선택 --</option>' + productsList.map(p => `<option value="${p.id}">${p.model_name}</option>`).join('');
        if (asset) { selNewModel.value = asset.product_id; inpNewSerial.value = asset.serial_number; } else { selNewModel.value = ''; inpNewSerial.value = ''; }
        
        assetModal.style.display = 'flex';
    };

    if(btnAddAssetModal) btnAddAssetModal.addEventListener('click', () => { if (!selectedClientId) return alert('거래처를 선택하세요.'); window.openAssetModal(null); });
    if(btnAssetCancel) btnAssetCancel.addEventListener('click', () => assetModal.style.display = 'none');

    // ★ 저장 버튼 (Asset + Contract 동시 저장)
    if(btnAssetSave) {
        btnAssetSave.addEventListener('click', async () => {
            const assetId = document.getElementById('hdn-asset-id').value; 
            const serial = document.getElementById('inp-new-serial').value.trim();
            let finalProductId = selNewModel.value;
            
            if (!boxNewModelForm.classList.contains('hidden')) {
                const maker = inpNewMaker.value.trim(); const modelName = inpNewModelName.value.trim();
                if (!maker || !modelName) return alert('제조사/모델명 필수');
                const { data: newProd, error: prodErr } = await supabase.from('products').insert({ brand: maker, model_name: modelName, type: selNewType.value }).select().single();
                if (prodErr) return alert('모델 등록 실패: ' + prodErr.message);
                finalProductId = newProd.id;
            } else if (!finalProductId) return alert('모델을 선택하세요.');

            if (!serial) return alert('Serial No. 필수');
            
            const assetPayload = {
                client_id: hdnAssetClientId.value || selectedClientId,
                product_id: finalProductId, serial_number: serial,
                install_location: document.getElementById('inp-asset-loc').value,
                contract_date: document.getElementById('inp-con-date').value || null,
                contract_start_date: document.getElementById('inp-start-date').value || null,
                contract_end_date: document.getElementById('inp-end-date').value || null,
                cancel_date: document.getElementById('inp-cancel-date').value || null,
                billing_method: document.getElementById('inp-asset-bill-method').value,
                billing_day: document.getElementById('inp-asset-bill-day').value,
                memo: document.getElementById('inp-memo').value,
                status: '사용중'
            };

            // 1. Asset 저장
            let savedAssetId = assetId;
            const query = assetId 
                ? supabase.from('assets').update(assetPayload).eq('id', assetId).select()
                : supabase.from('assets').insert(assetPayload).select();
                
            const { data: assetData, error: assetErr } = await query.single();
            if (assetErr) return alert('기기 저장 실패: ' + assetErr.message);
            savedAssetId = assetData.id;

            // 2. Contract 저장 (Upsert)
            const contractPayload = {
                asset_id: savedAssetId,
                monthly_fee: Number(document.getElementById('inp-contract-fee').value),
                base_bw: Number(document.getElementById('inp-contract-base-bw').value),
                base_color: Number(document.getElementById('inp-contract-base-col').value),
                rate_bw: Number(document.getElementById('inp-contract-rate-bw').value),
                rate_color_a4: Number(document.getElementById('inp-contract-rate-a4').value),
                rate_color_a3: Number(document.getElementById('inp-contract-rate-a3').value)
            };

            const { error: conErr } = await supabase
                .from('contracts')
                .upsert(contractPayload, { onConflict: 'asset_id' });

            if (conErr) alert('계약 정보 저장 실패: ' + conErr.message);
            else {
                alert('저장되었습니다.');
                assetModal.style.display = 'none';
                loadAssets(selectedClientId);
                if(!boxNewModelForm.classList.contains('hidden')) loadProducts(); 
            }
        });
    }

    // =========================================================
    // 5. 사용량 (Accounting) 관리
    // =========================================================
    async function loadUsage(clientId) {
        usageContainer.innerHTML = '<div style="text-align:center; padding:20px; color:#666;">데이터를 불러오는 중...</div>';
        try {
            const { data: branches } = await supabase.from('clients').select('id').eq('parent_id', clientId);
            const targetIds = [clientId, ...(branches?.map(b => b.id) || [])];

            const { data: readings, error } = await supabase
                .from('meter_readings')
                .select('*, assets!inner(id, serial_number, client_id, products(model_name), clients(name))')
                .in('assets.client_id', targetIds)
                .order('reading_date', { ascending: false });

            if (error) throw error;
            usageData = readings || [];
            renderUsageUI();
        } catch (err) {
            usageContainer.innerHTML = `<div style="text-align:center; padding:20px; color:red;">로드 실패: ${err.message}</div>`;
        }
    }

    function renderUsageUI() {
        let dayOptions = '<option value="">일(전체)</option>';
        for(let i=1; i<=31; i++) dayOptions += `<option value="${String(i).padStart(2,'0')}">${i}일</option>`;

        usageContainer.innerHTML = `
            <div class="usage-filter-bar">
                <input type="month" id="filter-usage-month" class="form-input" style="width:110px; font-size:0.8rem;">
                <select id="filter-usage-day" class="form-input" style="width:80px; font-size:0.8rem;">${dayOptions}</select>
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
            </div>`;
        
        renderUsageTableRows();
        
        document.getElementById('filter-usage-month').addEventListener('change', renderUsageTableRows);
        document.getElementById('filter-usage-day').addEventListener('change', renderUsageTableRows);
        document.getElementById('filter-usage-search').addEventListener('keyup', renderUsageTableRows);
        
        // ★ 누락되었던 함수 호출 (이제 정상 작동함)
        enableTableResizing('usage-table');
    }

    function renderUsageTableRows() {
        const tbody = document.getElementById('usage-tbody');
        if (!tbody) return;

        const fMonth = document.getElementById('filter-usage-month').value;
        const fDay = document.getElementById('filter-usage-day').value;
        const kw = document.getElementById('filter-usage-search').value.toLowerCase();

        const filtered = usageData.filter(d => {
            const date = d.reading_date || '';
            const matchM = fMonth ? date.startsWith(fMonth) : true;
            const matchD = fDay ? date.slice(-2) === fDay : true;
            const model = (d.assets?.products?.model_name || '').toLowerCase();
            const serial = (d.assets?.serial_number || '').toLowerCase();
            return matchM && matchD && (model.includes(kw) || serial.includes(kw));
        });

        if (filtered.length === 0) { tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:20px; color:#999;">데이터 없음</td></tr>'; return; }

        tbody.innerHTML = filtered.map(item => `
            <tr>
                <td style="text-align:center;">${item.reading_date}</td>
                <td style="text-align:left;">
                    <div style="font-weight:bold; color:#0369a1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                        ${item.assets.products.model_name}
                    </div>
                    <div style="font-size:0.7rem; color:#888;">${item.assets.serial_number}</div>
                    ${item.assets.clients?.name ? `<div style="font-size:0.7rem; color:#666;">(${item.assets.clients.name})</div>` : ''}
                </td>
                <td>${item.reading_bw?.toLocaleString()}</td>
                <td>${item.reading_col?.toLocaleString()}</td>
                <td>${item.reading_col_a3?.toLocaleString() || 0}</td>
                <td style="text-align:center;">
                    <button class="btn-edit-reading" data-id="${item.id}" style="border:none; background:none; cursor:pointer; color:#2563eb; padding:2px;"><i class='bx bx-edit'></i></button>
                    <button class="btn-del-reading" data-id="${item.id}" style="border:none; background:none; cursor:pointer; color:#ef4444; padding:2px;"><i class='bx bx-trash'></i></button>
                </td>
            </tr>`).join('');

        tbody.querySelectorAll('.btn-del-reading').forEach(btn => btn.addEventListener('click', async (e) => {
            const id = e.target.closest('button').dataset.id;
            if (!confirm('정말 삭제하시겠습니까?')) return;
            const { error } = await supabase.from('meter_readings').delete().eq('id', id);
            if (error) alert('삭제 실패: ' + error.message);
            else loadUsage(selectedClientId); 
        }));

        tbody.querySelectorAll('.btn-edit-reading').forEach(btn => btn.addEventListener('click', (e) => {
            const id = e.target.closest('button').dataset.id;
            const item = usageData.find(d => d.id == id);
            if (item) {
                inpUsageId.value = item.id;
                inpUsageDate.value = item.reading_date; 
                inpUsageBw.value = item.reading_bw || 0;
                inpUsageCol.value = item.reading_col || 0;
                inpUsageA3.value = item.reading_col_a3 || 0;
                usageEditModal.style.display = 'flex';
            }
        }));
    }

    if (btnUsageSave) {
        btnUsageSave.addEventListener('click', async () => {
            const id = inpUsageId.value;
            const payload = {
                reading_bw: Number(inpUsageBw.value) || 0,
                reading_col: Number(inpUsageCol.value) || 0,
                reading_col_a3: Number(inpUsageA3.value) || 0
            };
            const { error } = await supabase.from('meter_readings').update(payload).eq('id', id);
            if (error) alert('수정 실패: ' + error.message);
            else { alert('수정되었습니다.'); usageEditModal.style.display = 'none'; loadUsage(selectedClientId); }
        });
    }
    if (btnUsageCancel) btnUsageCancel.addEventListener('click', () => usageEditModal.style.display = 'none');

    // =========================================================
    // 6. 엑셀 가져오기 / 내보내기
    // =========================================================
    if(btnExcelExport) {
        btnExcelExport.addEventListener('click', () => {
            if (allClients.length === 0) return alert('내보낼 데이터가 없습니다.');
            const excelData = allClients.map(c => ({
                '고객번호': c.client_code, '거래처명': c.name, '메인/서브': c.relation_type,
                '담당자': c.contact_person, '이메일': c.email, '주소': c.address
            }));
            const ws = XLSX.utils.json_to_sheet(excelData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "거래처목록");
            XLSX.writeFile(wb, `거래처목록_${new Date().toISOString().slice(0,10)}.xlsx`);
        });
    }

    if(btnExcelImport) btnExcelImport.addEventListener('click', () => inpExcelFile.click());

    if(inpExcelFile) {
        inpExcelFile.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            if(!confirm('엑셀의 거래처 기본 정보를 등록하시겠습니까?')) { inpExcelFile.value = ''; return; }

            const reader = new FileReader();
            reader.onload = async (evt) => {
                try {
                    const data = evt.target.result;
                    const workbook = XLSX.read(data, { type: 'binary' });
                    const sheetName = workbook.SheetNames[0];
                    const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

                    if (jsonData.length === 0) { alert('데이터가 없습니다.'); return; }

                    const payload = jsonData.map(row => ({
                        client_code: row['고객번호'] || row['코드'], name: row['거래처명'] || row['상호명'],
                        contact_person: row['대표자/담당자'] || row['담당자'], email: row['이메일'], address: row['주소'],
                        relation_type: '메인'
                    })).filter(r => r.name);

                    const { error } = await supabase.from('clients').insert(payload);
                    if (error) {
                        if (error.code === '23505') alert('중복된 고객번호가 있거나 이미 등록된 거래처입니다.');
                        else alert('등록 실패: ' + error.message);
                    } else {
                        alert(`✅ ${payload.length}건 등록 완료.`);
                        loadData();
                    }
                } catch (err) { console.error(err); alert('오류: ' + err.message); } 
                finally { inpExcelFile.value = ''; }
            };
            reader.readAsBinaryString(file);
        });
    }

    // =========================================================
    // 7. UI 유틸 (리사이징, 아코디언, 테이블리사이징)
    // =========================================================
    enableResizing();
    setupAccordion('header-client-info', 'body-client-info', 'icon-client-info');
    setupAccordion('header-asset-info', 'body-asset-info', 'icon-asset-info');

    // ★ 이 함수가 누락되어 "enableTableResizing is not defined" 에러가 났던 것입니다.
    function enableTableResizing(tableId) {
        const table = document.getElementById(tableId);
        if(!table) return;
        table.querySelectorAll('th').forEach(th => {
            const handle = th.querySelector('.resize-handle');
            if (!handle) return;
            handle.addEventListener('mousedown', (e) => {
                e.preventDefault();
                const startX = e.pageX; const startW = th.offsetWidth;
                const onMove = (ev) => { if (startW + (ev.pageX - startX) > 30) th.style.width = `${startW + (ev.pageX - startX)}px`; };
                const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); handle.classList.remove('active'); };
                document.addEventListener('mousemove', onMove); document.addEventListener('mouseup', onUp); handle.classList.add('active');
            });
        });
    }

    function enableResizing() {
        const container = document.getElementById('layout-container');
        const resizerLeft = document.getElementById('resizer-left');
        const resizerRight = document.getElementById('resizer-right');
        let leftWidth = 280, midWidth = 500;
        
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
            const newLeftW = e.clientX - container.getBoundingClientRect().left;
            if (newLeftW > 150 && newLeftW < 600) { leftWidth = newLeftW; container.style.gridTemplateColumns = `${leftWidth}px 5px ${midWidth}px 5px 1fr`; }
        }
        function onMouseUpLeft() { enableSelect(); document.removeEventListener('mousemove', onMouseMoveLeft); document.removeEventListener('mouseup', onMouseUpLeft); resizerLeft.classList.remove('resizing'); }

        if (resizerRight) {
            resizerRight.addEventListener('mousedown', (e) => {
                e.preventDefault(); disableSelect();
                document.addEventListener('mousemove', onMouseMoveRight); document.addEventListener('mouseup', onMouseUpRight);
                resizerRight.classList.add('resizing');
            });
        }
        function onMouseMoveRight(e) {
            const newMidW = e.clientX - (container.getBoundingClientRect().left + leftWidth + 5);
            if (newMidW > 300 && newMidW < 1000) { midWidth = newMidW; container.style.gridTemplateColumns = `${leftWidth}px 5px ${midWidth}px 5px 1fr`; }
        }
        function onMouseUpRight() { enableSelect(); document.removeEventListener('mousemove', onMouseMoveRight); document.removeEventListener('mouseup', onMouseUpRight); resizerRight.classList.remove('resizing'); }
    }

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