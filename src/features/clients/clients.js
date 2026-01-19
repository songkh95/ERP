import { supabase } from '../../common/db.js';
export { render } from './clients.view.js';

export async function init() {
    // ---------------------------------------------------------
    // 1. DOM 요소 선택
    // ---------------------------------------------------------
    const listContainer = document.getElementById('client-list-container');
    const searchInput = document.getElementById('search-input');
    const filterType = document.getElementById('filter-type');
    const totalCount = document.getElementById('total-count');
    const emptyState = document.getElementById('empty-state');
    const detailView = document.getElementById('client-detail-view');
    const clientFormTitle = document.getElementById('client-form-title');

    const inpName = document.getElementById('inp-name');
    const inpCode = document.getElementById('inp-code');
    const inpContact = document.getElementById('inp-contact');
    const inpEmail = document.getElementById('inp-email');
    const inpAddress = document.getElementById('inp-address');
    const selParentClient = document.getElementById('sel-parent-client');

    const btnAddClient = document.getElementById('btn-add-client');
    const btnSaveClient = document.getElementById('btn-save-client');
    const btnDeleteClient = document.getElementById('btn-delete-client');

    const assetListContainer = document.getElementById('asset-list-container');
    const btnAddAssetModal = document.getElementById('btn-add-asset-modal');
    const assetModal = document.getElementById('asset-modal');
    const btnAssetSave = document.getElementById('btn-asset-save');
    const btnAssetCancel = document.getElementById('btn-asset-cancel');
    const hdnAssetClientId = document.getElementById('hdn-asset-client-id');

    // 기기 등록용 모델 선택 요소
    const boxSelectModel = document.getElementById('box-select-model');
    const boxNewModelForm = document.getElementById('box-new-model-form');
    const inpSearchModel = document.getElementById('inp-search-model'); 
    const dlModelList = document.getElementById('dl-model-list');     
    const btnShowNewModelForm = document.getElementById('btn-show-new-model-form');
    const btnCancelNewModel = document.getElementById('btn-cancel-new-model');
    const inpNewMaker = document.getElementById('inp-new-maker');
    const inpNewModelName = document.getElementById('inp-new-model-name');
    const selNewType = document.getElementById('sel-new-model-type'); 
    const inpNewSerial = document.getElementById('inp-new-serial');
    const msgDupWarning = document.getElementById('msg-dup-warning');

    const btnExcelExport = document.getElementById('btn-excel-export');
    const btnExcelImport = document.getElementById('btn-excel-import');
    const inpExcelFile = document.getElementById('inp-excel-file');

    const inpEffectiveDate = document.getElementById('inp-effective-date');
    const contractHistoryList = document.getElementById('contract-history-list');
    const hdnContractId = document.getElementById('hdn-contract-id');
    const btnNewContractMode = document.getElementById('btn-new-contract-mode');

    // 기기 교체 모달 요소
    const exchangeModal = document.getElementById('exchange-modal');
    const hdnExchAssetId = document.getElementById('hdn-exchange-asset-id');
    const boxExchSelectModel = document.getElementById('box-exch-select-model');
    const boxExchNewModelForm = document.getElementById('box-exch-new-model-form');
    const inpExchSearchModel = document.getElementById('inp-exch-search-model');
    const dlExchModelList = document.getElementById('dl-exch-model-list');
    const btnExchShowNewModel = document.getElementById('btn-exch-show-new-model');
    const btnExchCancelNewModel = document.getElementById('btn-exch-cancel-new-model');
    const inpExchNewMaker = document.getElementById('inp-exch-new-maker');
    const inpExchNewModelName = document.getElementById('inp-exch-new-model-name');
    const selExchNewModelType = document.getElementById('sel-exch-new-model-type');
    const inpExchSerial = document.getElementById('inp-exch-serial');
    const inpExchDate = document.getElementById('inp-exch-date');
    const inpExchBw = document.getElementById('inp-exch-bw');
    const inpExchCol = document.getElementById('inp-exch-col');
    const inpExchA3 = document.getElementById('inp-exch-a3');
    const btnExchSave = document.getElementById('btn-exch-save');
    const btnExchCancel = document.getElementById('btn-exch-cancel');

    // 사용량 모달 (기존)
    const usageContainer = document.getElementById('usage-container');
    
    let allClients = [];
    let selectedClientId = null;
    let productsList = [];
    let usageData = [];
    let currentAssetContracts = [];

    loadData();
    setupUIEvents(); 

    // ---------------------------------------------------------
    // 기본 데이터 로드 및 렌더링
    // ---------------------------------------------------------
    async function loadData() {
        const { data, error } = await supabase.from('clients').select('*').order('name');
        if (error) return console.error(error);
        allClients = data;
        renderClientList(allClients);
        await loadProducts();
        updateParentOptions();
        if (allClients.length > 0) selectClient(allClients[0].id);
        else resetView();
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
            let typeBadge = c.parent_id ? `<span style="font-size:0.7rem; color:#0369a1; background:#e0f2fe; padding:1px 4px; border-radius:3px; margin-left:5px;">서브</span>` : `<span style="font-size:0.7rem; color:#15803d; background:#dcfce7; padding:1px 4px; border-radius:3px; margin-left:5px;">메인</span>`;
            el.innerHTML = `<div class="client-name">${c.name} ${typeBadge}</div><div class="client-meta">${c.client_code || '-'}</div>`;
            el.addEventListener('click', () => selectClient(c.id));
            listContainer.appendChild(el);
        });
    }

    function applyFilter() {
        const keyword = searchInput.value.toLowerCase();
        const type = filterType.value;
        const filtered = allClients.filter(c => {
            const matchText = (c.name?.toLowerCase().includes(keyword)) || (c.client_code?.toLowerCase().includes(keyword));
            let matchType = true;
            if (type === 'main') matchType = !c.parent_id;
            if (type === 'sub') matchType = !!c.parent_id;
            return matchText && matchType;
        });
        renderClientList(filtered);
    }
    if(searchInput) searchInput.addEventListener('keyup', applyFilter);
    if(filterType) filterType.addEventListener('change', applyFilter);

    async function selectClient(id) {
        selectedClientId = id;
        if(clientFormTitle) clientFormTitle.innerHTML = `<i class='bx bx-id-card'></i> 상세 정보`;
        document.querySelectorAll('.client-list-item').forEach(el => el.classList.toggle('active', el.dataset.id == id));
        const client = allClients.find(c => c.id == id);
        if(!client) return;
        emptyState.classList.add('hidden');
        detailView.classList.remove('hidden');
        if(inpName) inpName.value = client.name;
        if(inpCode) inpCode.value = client.client_code;
        if(inpContact) inpContact.value = client.contact_person || '';
        if(inpEmail) inpEmail.value = client.email || '';
        if(inpAddress) inpAddress.value = client.address || '';
        updateParentOptions();
        if(selParentClient) selParentClient.value = client.parent_id || '';
        loadAssets(id);
        loadUsage(id); 
    }

    function updateParentOptions() {
        if(!selParentClient) return;
        selParentClient.innerHTML = '<option value="">-- 없음 (이곳이 메인) --</option>';
        allClients.forEach(c => {
            if (c.id !== selectedClientId) selParentClient.innerHTML += `<option value="${c.id}">${c.name}</option>`;
        });
    }

    if(btnAddClient) btnAddClient.addEventListener('click', () => {
        selectedClientId = null;
        emptyState.classList.add('hidden');
        detailView.classList.remove('hidden');
        inpName.value = ''; inpCode.value = ''; inpContact.value = ''; inpEmail.value = ''; inpAddress.value = '';
        selParentClient.value = '';
        assetListContainer.innerHTML = '<div style="padding:20px; color:#999;">저장 후 기기 등록 가능</div>';
        inpName.focus();
    });

    if(btnSaveClient) btnSaveClient.addEventListener('click', async () => {
        const payload = {
            name: inpName.value, contact_person: inpContact.value, email: inpEmail.value, 
            address: inpAddress.value, parent_id: selParentClient.value || null,
            relation_type: selParentClient.value ? '서브' : '메인'
        };
        if(!payload.name) return alert('거래처명 필수');
        let res;
        if (selectedClientId) res = await supabase.from('clients').update(payload).eq('id', selectedClientId);
        else {
            payload.client_code = `C-${Math.floor(1000 + Math.random() * 9000)}`;
            res = await supabase.from('clients').insert(payload).select().single();
        }
        if (res.error) alert('저장 실패: ' + res.error.message);
        else {
            alert('저장되었습니다.');
            if(!selectedClientId && res.data) selectedClientId = res.data.id;
            loadData();
        }
    });

    if(btnDeleteClient) btnDeleteClient.addEventListener('click', async () => {
        if (!selectedClientId) return alert('삭제할 거래처 선택');
        if (!confirm('정말 삭제하시겠습니까?')) return;
        const { error } = await supabase.from('clients').delete().eq('id', selectedClientId);
        if (error) alert('삭제 실패: ' + error.message);
        else { alert('삭제됨'); selectedClientId = null; loadData(); }
    });

    // ---------------------------------------------------------
    // 기기 목록 및 철수 로직 (History 저장 포함)
    // ---------------------------------------------------------
    async function loadAssets(clientId) {
        assetListContainer.innerHTML = '<div style="color:#999; text-align:center;">로딩 중...</div>';
        const { data: branches } = await supabase.from('clients').select('id, name').eq('parent_id', clientId);
        const targetIds = [clientId, ...(branches?.map(b => b.id) || [])];
        const { data: assets } = await supabase.from('assets').select('*, products(model_name), clients(name), contracts(*)') 
            .in('client_id', targetIds).order('created_at');
        
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
                const subName = asset.clients?.name || '서브';
                subBadge = `<span style="background:#e0f2fe; color:#0369a1; font-size:0.75rem; padding:1px 5px; border-radius:3px; margin-left:6px; border:1px solid #bae6fd; white-space:nowrap;">🔗 ${subName}</span>`;
            }

            let conList = asset.contracts;
            if (!Array.isArray(conList)) conList = conList ? [conList] : [];
            conList.sort((a, b) => new Date(b.effective_date) - new Date(a.effective_date));
            const con = conList.length > 0 ? conList[0] : null;

            const feeInfo = con ? `${con.monthly_fee.toLocaleString()}원` : '<span style="color:red;">(계약미설정)</span>';
            const showDate = (d) => d || '-';
            let billDayDisplay = asset.billing_day === '말일' ? '말일' : (asset.billing_day ? `${asset.billing_day}일` : '-');
            
            card.innerHTML = `
                <div class="asset-header">
                    <div class="asset-header-left">
                        <i class='bx bx-chevron-right arrow-icon' style="font-size:1.2rem; color:#9ca3af; min-width:20px;"></i>
                        <span class="asset-model">${asset.products?.model_name || 'Unknown'}</span> 
                        <span class="asset-sn">${asset.serial_number}</span>
                        ${subBadge}
                        <span style="font-size:0.75rem; color:#666; margin-left:10px;">${feeInfo}</span>
                    </div>
                    <div style="flex-shrink:0; display:flex; gap:5px;">
                        <button class="btn-xs btn-edit-asset" style="color:#2563eb; background:white; border:1px solid #bfdbfe;">수정</button>
                        <button class="btn-xs btn-exch-asset" style="color:#b91c1c; background:white; border:1px solid #fecaca;">교체</button>
                        <button class="btn-xs btn-return-asset" style="color:#dc2626; background:white; border:1px solid #fecaca;">철수</button>
                    </div>
                </div>
                <div class="asset-details">
                    <div class="info-grid">
                        <div><span class="info-label">설치장소</span> ${asset.install_location || '-'}</div>
                        <div><span class="info-label">청구방식</span> ${asset.billing_method || '-'} / ${billDayDisplay}</div>
                        <div><span class="info-label">계약일자</span> ${showDate(asset.contract_date)}</div>
                        <div><span class="info-label">만기일</span> ${showDate(asset.contract_end_date)}</div>
                        <div class="info-full" style="background:#f8f9fa; padding:8px; border-radius:4px;">
                            <span class="info-label">💰 현재 적용 중인 계약 (${con ? (con.effective_date||'날짜미상') : '-'})</span>
                            <div style="font-weight:500; color:#333;">월 기본료: ${con ? con.monthly_fee.toLocaleString() : 0}원</div>
                            <div style="font-size:0.85rem; color:#666;">기본제공: 흑${con?.base_bw||0}, 칼${con?.base_color||0}</div>
                        </div>
                        <div class="info-full"><span class="info-label">비고</span><span class="info-value" style="color:#666; font-size:0.8rem;">${asset.memo || '-'}</span></div>
                    </div>
                </div>`;
            
            const header = card.querySelector('.asset-header');
            const details = card.querySelector('.asset-details');
            const arrow = card.querySelector('.arrow-icon');
            header.addEventListener('click', () => {
                const isHidden = getComputedStyle(details).display === 'none';
                details.style.display = isHidden ? 'block' : 'none';
                arrow.style.transform = isHidden ? 'rotate(90deg)' : 'rotate(0deg)';
                header.style.background = isHidden ? '#f9fafb' : '#fff';
            });

            card.querySelector('.btn-edit-asset').addEventListener('click', (e) => { e.stopPropagation(); window.openAssetModal(asset); });
            card.querySelector('.btn-exch-asset').addEventListener('click', (e) => { e.stopPropagation(); openExchangeModal(asset); });
            
            // ★ [철수] 버튼: 이력 저장 및 상태 변경
            card.querySelector('.btn-return-asset').addEventListener('click', async (e) => {
                e.stopPropagation();
                if (!confirm(`[${asset.products?.model_name}] 기기를 철수하시겠습니까?`)) return;
                
                // 거래처명 안전 추출
                let clientName = '알수없음';
                if (asset.clients) {
                    clientName = typeof asset.clients === 'object' ? (asset.clients.name || '') : asset.clients;
                }

                try {
                    // 1. History 저장
                    await supabase.from('asset_history').insert({
                        asset_id: asset.id,
                        client_id: asset.client_id,
                        client_name: clientName,
                        action_type: '철수',
                        action_date: new Date().toISOString().slice(0, 10),
                        memo: '사용자 요청에 의한 철수'
                    });

                    // 2. Asset 상태 변경 (Accounting용 last_client_name 저장)
                    const { error } = await supabase.from('assets').update({ 
                        client_id: null, 
                        status: '재고', 
                        install_location: '창고(철수)',
                        cancel_date: new Date().toISOString().slice(0, 10),
                        last_client_name: clientName 
                    }).eq('id', asset.id);

                    if (error) throw error;
                    alert('철수 완료'); 
                    loadAssets(clientId);

                } catch (err) {
                    alert('철수 실패: ' + err.message);
                }
            });
            assetListContainer.appendChild(card);
        });
    }

    // ---------------------------------------------------------
    // 기기 교체 로직 (이력 저장 포함)
    // ---------------------------------------------------------
    function openExchangeModal(asset) {
        hdnExchAssetId.value = asset.id;
        boxExchNewModelForm.classList.add('hidden');
        boxExchSelectModel.classList.remove('hidden');
        inpExchSearchModel.value = '';
        inpExchSerial.value = ''; 
        inpExchDate.value = new Date().toISOString().slice(0, 10); 
        inpExchBw.value = 0; inpExchCol.value = 0; inpExchA3.value = 0;
        exchangeModal.style.display = 'flex';
    }

    if(btnExchShowNewModel) btnExchShowNewModel.addEventListener('click', () => { boxExchSelectModel.classList.add('hidden'); boxExchNewModelForm.classList.remove('hidden'); });
    if(btnExchCancelNewModel) btnExchCancelNewModel.addEventListener('click', () => { boxExchNewModelForm.classList.add('hidden'); boxExchSelectModel.classList.remove('hidden'); });
    if(btnExchCancel) btnExchCancel.addEventListener('click', () => exchangeModal.style.display = 'none');

    if(btnExchSave) btnExchSave.addEventListener('click', async () => {
        const oldAssetId = hdnExchAssetId.value;
        const newSerial = inpExchSerial.value.trim();
        const date = inpExchDate.value;
        let finalProductId = null;

        const isNewModelMode = !boxExchNewModelForm.classList.contains('hidden');
        if (isNewModelMode) {
            const maker = inpExchNewMaker.value.trim();
            const modelName = inpExchNewModelName.value.trim();
            const type = selExchNewModelType.value;
            if (!maker || !modelName) return alert('제조사와 모델명을 입력해주세요.');
            const { data: newProd, error: prodErr } = await supabase.from('products').insert({ brand: maker, model_name: modelName, type: type }).select().single();
            if (prodErr) return alert('모델 등록 실패: ' + prodErr.message);
            finalProductId = newProd.id;
        } else {
            const searchVal = inpExchSearchModel.value.trim();
            if (!searchVal) return alert('새로운 모델을 선택해주세요.');
            const foundProduct = productsList.find(p => p.model_name === searchVal);
            if (!foundProduct) return alert('목록에 없는 모델입니다.');
            finalProductId = foundProduct.id;
        }
        
        if(!newSerial) return alert('새로운 S/N을 입력하세요.');
        if(!date) return alert('교체 일자를 선택하세요.');
        if(!confirm('기기를 교체하시겠습니까?')) return;

        try {
            // [Step 1] 기존 자산 조회
            const { data: oldAsset, error: fetchErr } = await supabase
                .from('assets')
                .select('*, contracts(*), clients(id, name)')
                .eq('id', oldAssetId)
                .single();

            if (fetchErr) throw new Error('기존 자산 조회 실패');

            // 거래처 정보 백업
            const currentClientId = oldAsset.client_id;
            let currentClientName = '알수없음';
            if (oldAsset.clients) {
                currentClientName = typeof oldAsset.clients === 'object' ? (oldAsset.clients.name || '') : oldAsset.clients;
            }

            // [Step 2] 새 기기 등록
            const { data: newAsset, error: newAssetErr } = await supabase.from('assets').insert({
                client_id: selectedClientId,
                product_id: finalProductId,
                serial_number: newSerial,
                status: '사용중',
                install_location: oldAsset.install_location,
                billing_method: oldAsset.billing_method,
                billing_day: oldAsset.billing_day,
                contract_date: oldAsset.contract_date,
                contract_start_date: date,
                memo: `[기기교체] 기존(${oldAsset.serial_number}) 교체분`
            }).select().single();

            if (newAssetErr) throw new Error('새 기기 등록 실패');

            // [Step 3] 계약 복사
            let oldContracts = oldAsset.contracts || [];
            oldContracts.sort((a, b) => new Date(b.effective_date) - new Date(a.effective_date));
            const activeContract = oldContracts[0]; 
            if (activeContract) {
                await supabase.from('contracts').insert({
                    asset_id: newAsset.id,
                    effective_date: date,
                    monthly_fee: activeContract.monthly_fee,
                    base_bw: activeContract.base_bw,
                    base_color: activeContract.base_color,
                    rate_bw: activeContract.rate_bw,
                    rate_color_a4: activeContract.rate_color_a4,
                    rate_color_a3: activeContract.rate_color_a3
                });
            }

            // [Step 4] 시작 지침
            await supabase.from('meter_readings').insert({
                asset_id: newAsset.id,
                reading_date: date,
                reading_bw: parseInt(inpExchBw.value) || 0,
                reading_col: parseInt(inpExchCol.value) || 0,
                reading_col_a3: parseInt(inpExchA3.value) || 0,
                total_amount: 0, 
                is_reset: true
            });

            // [Step 5] ★ History 기록 (구형 반납)
            await supabase.from('asset_history').insert([
                {
                    asset_id: oldAssetId,
                    client_id: currentClientId,
                    client_name: currentClientName,
                    action_type: '교체(구형반납)',
                    action_date: date,
                    memo: `신규기기(${newSerial})로 교체됨`
                },
                {
                    asset_id: newAsset.id,
                    client_id: selectedClientId, // 새 기기는 현재 거래처
                    client_name: currentClientName,
                    action_type: '교체(신규투입)',
                    action_date: date,
                    memo: `구형기기(${oldAsset.serial_number}) 교체 투입`
                }
            ]);

            // [Step 6] 기존 기기 반납 (상태 변경 및 이름 백업)
            const { error: returnErr } = await supabase.from('assets').update({
                status: '재고',
                client_id: null,
                install_location: '창고(교체회수)',
                cancel_date: date,
                last_client_name: currentClientName // Accounting 화면용
            }).eq('id', oldAssetId);

            if (returnErr) throw new Error('기존 기기 반납 실패');

            alert('기기 교체가 완료되었습니다.');
            exchangeModal.style.display = 'none';
            loadAssets(selectedClientId); 
            if(isNewModelMode) loadProducts(); 

        } catch (err) { console.error(err); alert('오류: ' + err.message); }
    });

    // ---------------------------------------------------------
    // 기타 로직 (모델 로드 등)
    // ---------------------------------------------------------
    async function loadProducts() {
        const { data } = await supabase.from('products').select('*').order('model_name');
        if (data) {
            productsList = data.filter((item, index, self) => index === self.findIndex((t) => t.model_name === item.model_name));
            const options = productsList.map(p => `<option value="${p.model_name}">`).join('');
            if(dlModelList) dlModelList.innerHTML = options;
            if(document.getElementById('dl-exch-model-list')) document.getElementById('dl-exch-model-list').innerHTML = options;
        } else { productsList = []; }
    }

    if(inpNewModelName) {
        inpNewModelName.addEventListener('input', () => {
            const val = inpNewModelName.value.trim();
            const exists = productsList.some(p => p.model_name.toLowerCase() === val.toLowerCase());
            if(msgDupWarning) msgDupWarning.style.display = exists ? 'block' : 'none';
        });
    }

    if(btnShowNewModelForm) btnShowNewModelForm.addEventListener('click', () => { boxSelectModel.classList.add('hidden'); boxNewModelForm.classList.remove('hidden'); });
    if(btnCancelNewModel) btnCancelNewModel.addEventListener('click', () => { boxNewModelForm.classList.add('hidden'); boxSelectModel.classList.remove('hidden'); });

    window.openAssetModal = async function(asset = null) {
        await loadProducts();
        document.getElementById('hdn-asset-id').value = asset ? asset.id : '';
        hdnAssetClientId.value = asset ? asset.client_id : selectedClientId;
        hdnContractId.value = ''; 

        boxNewModelForm.classList.add('hidden'); boxSelectModel.classList.remove('hidden');
        const safeSet = (id, val) => { const el = document.getElementById(id); if(el) el.value = val || ''; };

        safeSet('inp-asset-loc', asset?.install_location);
        safeSet('inp-con-date', asset?.contract_date);
        safeSet('inp-start-date', asset?.contract_start_date);
        safeSet('inp-end-date', asset?.contract_end_date);
        safeSet('inp-cancel-date', asset?.cancel_date);
        safeSet('inp-asset-bill-method', asset?.billing_method);
        safeSet('inp-asset-bill-day', asset?.billing_day);
        safeSet('inp-memo', asset?.memo);

        let conList = asset?.contracts || [];
        if (!Array.isArray(conList)) conList = conList ? [conList] : [];
        conList.sort((a, b) => new Date(b.effective_date) - new Date(a.effective_date));
        currentAssetContracts = conList; 

        const latestCon = conList.length > 0 ? conList[0] : null;
        resetContractForm(latestCon); 
        renderContractHistory(); 

        if (asset) {
            inpSearchModel.value = asset.products?.model_name || ''; 
            inpNewSerial.value = asset.serial_number; 
        } else {
            inpSearchModel.value = ''; 
            inpNewSerial.value = ''; 
        }
        
        assetModal.style.display = 'flex';
    };

    function renderContractHistory() {
        if (!contractHistoryList) return;
        contractHistoryList.innerHTML = '';
        if (currentAssetContracts.length === 0) {
            contractHistoryList.innerHTML = '<li style="padding:10px; text-align:center; color:#999;">이력 없음</li>';
            return;
        }
        currentAssetContracts.forEach(c => {
            const li = document.createElement('li');
            li.className = 'history-item';
            li.innerHTML = `<div><span class="history-date">${c.effective_date || '날짜미상'}</span> <span>월 ${c.monthly_fee.toLocaleString()}원</span></div><div><button class="btn-xs btn-edit" data-id="${c.id}">수정</button><button class="btn-xs btn-del" data-id="${c.id}">삭제</button></div>`;
            contractHistoryList.appendChild(li);
        });
        contractHistoryList.querySelectorAll('.btn-edit').forEach(btn => btn.addEventListener('click', (e) => {
            const conId = e.target.dataset.id;
            const con = currentAssetContracts.find(c => c.id == conId);
            handleContractEdit(con);
        }));
        contractHistoryList.querySelectorAll('.btn-del').forEach(btn => btn.addEventListener('click', (e) => handleContractDelete(e.target.dataset.id)));
    }

    function handleContractEdit(con) {
        if(!con) return;
        hdnContractId.value = con.id;
        const safeSet = (id, val) => document.getElementById(id).value = val || 0;
        document.getElementById('inp-effective-date').value = con.effective_date;
        safeSet('inp-contract-fee', con.monthly_fee);
        safeSet('inp-contract-base-bw', con.base_bw);
        safeSet('inp-contract-base-col', con.base_color);
        safeSet('inp-contract-rate-bw', con.rate_bw);
        safeSet('inp-contract-rate-a4', con.rate_color_a4);
        safeSet('inp-contract-rate-a3', con.rate_color_a3);
        btnAssetSave.innerText = "수정 저장";
        btnAssetSave.classList.replace('btn-primary', 'btn-secondary'); 
        btnNewContractMode.style.display = 'block'; 
    }

    async function handleContractDelete(id) {
        if(!confirm('정말 이 계약 이력을 삭제하시겠습니까?')) return;
        const { error } = await supabase.from('contracts').delete().eq('id', id);
        if(error) alert('삭제 실패: ' + error.message);
        else {
            currentAssetContracts = currentAssetContracts.filter(c => c.id != id);
            renderContractHistory();
            resetContractForm(currentAssetContracts[0]); 
        }
    }

    function resetContractForm(copyData = null) {
        hdnContractId.value = ''; 
        btnAssetSave.innerText = "저장 (새로운 계약)";
        btnAssetSave.classList.replace('btn-secondary', 'btn-primary');
        btnNewContractMode.style.display = 'none';
        document.getElementById('inp-effective-date').value = new Date().toISOString().slice(0, 10);
        
        const safeSet = (id, val) => document.getElementById(id).value = val || 0;
        if(copyData) {
            safeSet('inp-contract-fee', copyData.monthly_fee);
            safeSet('inp-contract-base-bw', copyData.base_bw);
            safeSet('inp-contract-base-col', copyData.base_color);
            safeSet('inp-contract-rate-bw', copyData.rate_bw);
            safeSet('inp-contract-rate-a4', copyData.rate_color_a4);
            safeSet('inp-contract-rate-a3', copyData.rate_color_a3);
        } else {
            safeSet('inp-contract-fee', 0);
            safeSet('inp-contract-base-bw', 0);
            safeSet('inp-contract-base-col', 0);
            safeSet('inp-contract-rate-bw', 10);
            safeSet('inp-contract-rate-a4', 100);
            safeSet('inp-contract-rate-a3', 200);
        }
    }
    
    if(btnNewContractMode) btnNewContractMode.addEventListener('click', (e) => { e.preventDefault(); resetContractForm(null); });
    if(btnAddAssetModal) btnAddAssetModal.addEventListener('click', () => { if (!selectedClientId) return alert('거래처를 선택하세요.'); window.openAssetModal(null); });
    if(btnAssetCancel) btnAssetCancel.addEventListener('click', () => assetModal.style.display = 'none');

    if(btnAssetSave) btnAssetSave.addEventListener('click', async () => {
        const assetId = document.getElementById('hdn-asset-id').value; 
        const serial = document.getElementById('inp-new-serial').value.trim();
        let finalProductId = null;
        const contractId = hdnContractId.value; 
        
        const isNewModelMode = !boxNewModelForm.classList.contains('hidden');

        if (isNewModelMode) {
            const maker = inpNewMaker.value.trim();
            const modelName = inpNewModelName.value.trim();
            const type = selNewType ? selNewType.value : '흑백';
            if (!maker || !modelName) return alert('제조사와 모델명을 입력해주세요.');
            const { data: newProd, error: prodErr } = await supabase.from('products').insert({ brand: maker, model_name: modelName, type: type }).select().single();
            if (prodErr) return alert('모델 등록 실패: ' + prodErr.message);
            finalProductId = newProd.id; 
        } else {
            const searchVal = inpSearchModel.value.trim();
            if (!searchVal) return alert('모델을 검색하거나 선택해주세요.');
            const foundProduct = productsList.find(p => p.model_name === searchVal);
            if (!foundProduct) return alert('목록에 없는 모델입니다.');
            finalProductId = foundProduct.id;
        }

        if (!serial) return alert('S/N 필수');
        const safeVal = (id) => document.getElementById(id) ? document.getElementById(id).value : null;

        const assetPayload = {
            client_id: hdnAssetClientId.value || selectedClientId,
            product_id: finalProductId, serial_number: serial,
            install_location: safeVal('inp-asset-loc'),
            contract_date: safeVal('inp-con-date') || null,
            contract_start_date: safeVal('inp-start-date') || null,
            contract_end_date: safeVal('inp-end-date') || null,
            cancel_date: safeVal('inp-cancel-date') || null,
            billing_method: safeVal('inp-asset-bill-method'),
            billing_day: safeVal('inp-asset-bill-day'),
            memo: safeVal('inp-memo'),
            status: '사용중'
        };

        let savedAssetId = assetId;
        const query = assetId 
            ? supabase.from('assets').update(assetPayload).eq('id', assetId).select()
            : supabase.from('assets').insert(assetPayload).select();
            
        const { data: assetData, error: assetErr } = await query.single();
        if (assetErr) return alert('기기 저장 실패: ' + assetErr.message);
        savedAssetId = assetData.id;

        const contractPayload = {
            asset_id: savedAssetId,
            effective_date: safeVal('inp-effective-date') || new Date().toISOString().slice(0, 10),
            monthly_fee: Number(safeVal('inp-contract-fee') || 0),
            base_bw: Number(safeVal('inp-contract-base-bw') || 0),
            base_color: Number(safeVal('inp-contract-base-col') || 0),
            rate_bw: Number(safeVal('inp-contract-rate-bw') || 0),
            rate_color_a4: Number(safeVal('inp-contract-rate-a4') || 0),
            rate_color_a3: Number(safeVal('inp-contract-rate-a3') || 0)
        };

        let conRes;
        if (contractId) conRes = await supabase.from('contracts').update(contractPayload).eq('id', contractId);
        else conRes = await supabase.from('contracts').insert(contractPayload);

        if (conRes.error) alert('계약 정보 저장 실패: ' + conRes.error.message);
        else {
            alert('저장되었습니다.');
            assetModal.style.display = 'none';
            loadAssets(selectedClientId);
            if(isNewModelMode) loadProducts(); 
        }
    });

    // 사용량 (기존 로직 유지)
    async function loadUsage(clientId) {
        usageContainer.innerHTML = '<div style="text-align:center; padding:20px; color:#666;">데이터를 불러오는 중...</div>';
        try {
            const { data: branches } = await supabase.from('clients').select('id').eq('parent_id', clientId);
            const targetIds = [clientId, ...(branches?.map(b => b.id) || [])];
            const { data: readings, error } = await supabase.from('meter_readings')
                .select('*, assets!inner(id, serial_number, client_id, products(model_name), clients(name))')
                .in('assets.client_id', targetIds).order('reading_date', { ascending: false });
            if (error) throw error;
            usageData = readings || [];
            renderUsageUI();
        } catch (err) { usageContainer.innerHTML = `<div style="text-align:center; padding:20px; color:red;">로드 실패: ${err.message}</div>`; }
    }

    function renderUsageUI() {
        usageContainer.innerHTML = `
            <div class="usage-filter-bar">
                <input type="month" id="filter-usage-month" class="form-input" style="width:110px; font-size:0.8rem;">
                <input type="text" id="filter-usage-search" class="form-input" placeholder="검색..." style="flex:1; font-size:0.8rem;">
            </div>
            <div class="usage-table-wrapper">
                <table class="resizable-table" id="usage-table">
                    <thead><tr><th style="width: 90px;">날짜<div class="resize-handle"></div></th><th style="width: 140px;">모델 (S/N)<div class="resize-handle"></div></th><th style="width: 70px;">흑백<div class="resize-handle"></div></th><th style="width: 70px;">칼라<div class="resize-handle"></div></th><th style="width: 60px;">관리</th></tr></thead>
                    <tbody id="usage-tbody"></tbody>
                </table>
            </div>`;
        renderUsageTableRows();
        document.getElementById('filter-usage-month').addEventListener('change', renderUsageTableRows);
        document.getElementById('filter-usage-search').addEventListener('keyup', renderUsageTableRows);
        setupUIEvents(); 
    }

    function renderUsageTableRows() {
        const tbody = document.getElementById('usage-tbody');
        if (!tbody) return;
        const fMonth = document.getElementById('filter-usage-month').value;
        const kw = document.getElementById('filter-usage-search').value.toLowerCase();
        const filtered = usageData.filter(d => {
            const date = d.reading_date || '';
            const matchM = fMonth ? date.startsWith(fMonth) : true;
            const model = (d.assets?.products?.model_name || '').toLowerCase();
            return matchM && model.includes(kw);
        });
        if (filtered.length === 0) { tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:20px;">없음</td></tr>'; return; }
        tbody.innerHTML = filtered.map(item => `
            <tr>
                <td style="text-align:center;">${item.reading_date}</td>
                <td><div style="font-weight:bold;">${item.assets.products.model_name}</div><div style="font-size:0.7rem; color:#888;">${item.assets.serial_number}</div></td>
                <td style="text-align:right;">${item.reading_bw?.toLocaleString()}</td>
                <td style="text-align:right;">${item.reading_col?.toLocaleString()}</td>
                <td style="text-align:center;"><button class="btn-del-reading" data-id="${item.id}" style="border:none; color:red; cursor:pointer;">🗑️</button></td>
            </tr>`).join('');
        tbody.querySelectorAll('.btn-del-reading').forEach(btn => btn.addEventListener('click', async (e) => {
            if (confirm('삭제하시겠습니까?')) {
                await supabase.from('meter_readings').delete().eq('id', e.target.closest('button').dataset.id);
                loadUsage(selectedClientId);
            }
        }));
    }

    function setupUIEvents() {
        enableResizing();
        setupAccordion('header-client-info', 'body-client-info', 'icon-client-info');
        setupAccordion('header-asset-info', 'body-asset-info', 'icon-asset-info');
        enableTableResizing('usage-table');
    }

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