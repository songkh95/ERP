import { supabase } from '../../common/db.js';
export { render } from './clients.view.js';

export async function init() {
    // ... (DOM 요소 선택 변수들 - 기존과 동일) ...
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

    const boxSelectModel = document.getElementById('box-select-model');
    const boxNewModelForm = document.getElementById('box-new-model-form');
    const selNewModel = document.getElementById('sel-new-model');
    const btnShowNewModelForm = document.getElementById('btn-show-new-model-form');
    const btnCancelNewModel = document.getElementById('btn-cancel-new-model');
    const inpNewMaker = document.getElementById('inp-new-maker');
    const inpNewModelName = document.getElementById('inp-new-model-name');
    const selNewType = document.getElementById('sel-new-type');
    const inpNewSerial = document.getElementById('inp-new-serial');

    const btnExcelExport = document.getElementById('btn-excel-export');
    const btnExcelImport = document.getElementById('btn-excel-import');
    const inpExcelFile = document.getElementById('inp-excel-file');

    const usageContainer = document.getElementById('usage-container');
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
    let usageData = []; 

    loadData();
    setupUIEvents();

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
    // 3. 기기 목록 (Assets) - 계약 정보 로드 수정 (핵심)
    // ---------------------------------------------------------
    async function loadAssets(clientId) {
        assetListContainer.innerHTML = '<div style="color:#999; text-align:center;">로딩 중...</div>';
        
        const { data: branches } = await supabase.from('clients').select('id, name').eq('parent_id', clientId);
        const targetIds = [clientId];
        const branchMap = {};
        if (branches) branches.forEach(b => { targetIds.push(b.id); branchMap[b.id] = b.name; });

        // contracts 테이블 조인
        const { data: assets } = await supabase
            .from('assets')
            .select('*, products(model_name), clients(name), contracts(*)')
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

            // ★ [핵심] 배열 또는 객체 처리
            let con = asset.contracts;
            if (Array.isArray(con)) con = con.length > 0 ? con[0] : null;
            
            const feeInfo = con ? `${con.monthly_fee.toLocaleString()}원` : '<span style="color:red; font-size:0.8em;">(계약미설정)</span>';
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
                        <button class="btn-edit-asset" style="color:#2563eb; background:white; border:1px solid #bfdbfe; border-radius:4px; padding:3px 8px;">수정</button>
                        <button class="btn-return-asset" style="color:#dc2626; background:white; border:1px solid #fecaca; border-radius:4px; padding:3px 8px;">철수</button>
                    </div>
                </div>
                <div class="asset-details">
                    <div class="info-grid">
                        <div><span class="info-label">설치장소</span> ${asset.install_location || '-'}</div>
                        <div><span class="info-label">청구방식</span> ${asset.billing_method || '-'} / ${billDayDisplay}</span></div>
                        <div><span class="info-label">계약일자</span> ${showDate(asset.contract_date)}</div>
                        <div><span class="info-label">만기일</span> ${showDate(asset.contract_end_date)}</div>
                        <div class="info-full" style="background:#f8f9fa; padding:8px; border-radius:4px;">
                            <span class="info-label">💰 계약 요금 상세</span>
                            <div style="font-weight:500; color:#333;">월 기본료: ${con ? con.monthly_fee.toLocaleString() : 0}원</div>
                            <div style="font-size:0.85rem; color:#666;">기본제공: 흑백 ${con ? con.base_bw : 0}매 / 컬러 ${con ? con.base_color : 0}매</div>
                        </div>
                        <div class="info-full"><span class="info-label">비고</span><span class="info-value" style="color:#666; font-size:0.8rem;">${asset.memo || '-'}</span></div>
                    </div>
                </div>`;
            
            // 이벤트 연결
            const header = card.querySelector('.asset-header');
            const details = card.querySelector('.asset-details');
            const arrow = card.querySelector('.arrow-icon');
            header.addEventListener('click', () => {
                const isHidden = getComputedStyle(details).display === 'none';
                details.style.display = isHidden ? 'block' : 'none';
                arrow.style.transform = isHidden ? 'rotate(90deg)' : 'rotate(0deg)';
                header.style.background = isHidden ? '#f9fafb' : '#fff';
            });

            card.querySelector('.btn-edit-asset').addEventListener('click', (e) => {
                e.stopPropagation();
                window.openAssetModal(asset);
            });

            card.querySelector('.btn-return-asset').addEventListener('click', async (e) => {
                e.stopPropagation();
                if (!confirm(`[${asset.products?.model_name}] 기기를 철수하시겠습니까?`)) return;
                const { error } = await supabase.from('assets').update({ client_id: null, status: '재고', install_location: '' }).eq('id', asset.id);
                if (error) alert('철수 실패: ' + error.message);
                else { alert('철수 완료'); loadAssets(clientId); }
            });

            assetListContainer.appendChild(card);
        });
    }

    // ---------------------------------------------------------
    // 4. 기기 추가/수정 모달 로직
    // ---------------------------------------------------------
    async function loadProducts() {
        const { data } = await supabase.from('products').select('*').order('model_name');
        if (data) productsList = data.filter((item, index, self) => index === self.findIndex((t) => t.model_name === item.model_name));
        else productsList = [];
    }

    if(btnShowNewModelForm) btnShowNewModelForm.addEventListener('click', () => { boxSelectModel.classList.add('hidden'); boxNewModelForm.classList.remove('hidden'); });
    if(btnCancelNewModel) btnCancelNewModel.addEventListener('click', () => { boxNewModelForm.classList.add('hidden'); boxSelectModel.classList.remove('hidden'); });

    // ★ 글로벌 함수로 등록 (팝업 열기)
    window.openAssetModal = async function(asset = null) {
        await loadProducts();
        document.getElementById('hdn-asset-id').value = asset ? asset.id : '';
        hdnAssetClientId.value = asset ? asset.client_id : selectedClientId;

        boxNewModelForm.classList.add('hidden'); boxSelectModel.classList.remove('hidden');
        
        // 입력값 안전 채우기
        const safeSet = (id, val) => { const el = document.getElementById(id); if(el) el.value = val || ''; };

        safeSet('inp-asset-loc', asset?.install_location);
        safeSet('inp-con-date', asset?.contract_date);
        safeSet('inp-start-date', asset?.contract_start_date);
        safeSet('inp-end-date', asset?.contract_end_date);
        safeSet('inp-cancel-date', asset?.cancel_date);
        safeSet('inp-asset-bill-method', asset?.billing_method);
        safeSet('inp-asset-bill-day', asset?.billing_day);
        safeSet('inp-memo', asset?.memo);

        // ★ 계약 정보 채우기 (배열/객체 체크)
        let con = asset?.contracts;
        if (Array.isArray(con)) con = con.length > 0 ? con[0] : null;

        safeSet('inp-contract-fee', con?.monthly_fee || 0);
        safeSet('inp-contract-base-bw', con?.base_bw || 0);
        safeSet('inp-contract-base-col', con?.base_color || 0);
        safeSet('inp-contract-rate-bw', con?.rate_bw || 10);
        safeSet('inp-contract-rate-a4', con?.rate_color_a4 || 100);
        safeSet('inp-contract-rate-a3', con?.rate_color_a3 || 200);

        selNewModel.innerHTML = '<option value="">-- 모델 선택 --</option>' + productsList.map(p => `<option value="${p.id}">${p.model_name}</option>`).join('');
        if (asset) { selNewModel.value = asset.product_id; inpNewSerial.value = asset.serial_number; } 
        else { selNewModel.value = ''; inpNewSerial.value = ''; }
        
        assetModal.style.display = 'flex';
    };

    if(btnAddAssetModal) btnAddAssetModal.addEventListener('click', () => { if (!selectedClientId) return alert('거래처를 선택하세요.'); window.openAssetModal(null); });
    if(btnAssetCancel) btnAssetCancel.addEventListener('click', () => assetModal.style.display = 'none');

    // ★ 저장 로직
    if(btnAssetSave) btnAssetSave.addEventListener('click', async () => {
        const assetId = document.getElementById('hdn-asset-id').value; 
        const serial = document.getElementById('inp-new-serial').value.trim();
        let finalProductId = selNewModel.value;
        
        if (!finalProductId) return alert('모델 선택 필수');
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

        // Asset 저장
        let savedAssetId = assetId;
        const query = assetId 
            ? supabase.from('assets').update(assetPayload).eq('id', assetId).select()
            : supabase.from('assets').insert(assetPayload).select();
            
        const { data: assetData, error: assetErr } = await query.single();
        if (assetErr) return alert('기기 저장 실패: ' + assetErr.message);
        savedAssetId = assetData.id;

        // Contract 저장
        const contractPayload = {
            asset_id: savedAssetId,
            monthly_fee: Number(safeVal('inp-contract-fee') || 0),
            base_bw: Number(safeVal('inp-contract-base-bw') || 0),
            base_color: Number(safeVal('inp-contract-base-col') || 0),
            rate_bw: Number(safeVal('inp-contract-rate-bw') || 0),
            rate_color_a4: Number(safeVal('inp-contract-rate-a4') || 0),
            rate_color_a3: Number(safeVal('inp-contract-rate-a3') || 0)
        };

        const { error: conErr } = await supabase.from('contracts').upsert(contractPayload, { onConflict: 'asset_id' });

        if (conErr) alert('계약 정보 저장 실패: ' + conErr.message);
        else {
            alert('저장되었습니다.');
            assetModal.style.display = 'none';
            loadAssets(selectedClientId);
            if(!boxNewModelForm.classList.contains('hidden')) loadProducts(); 
        }
    });

    // ---------------------------------------------------------
    // 6. 사용량 (Accounting) 조회
    // ---------------------------------------------------------
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

    // ---------------------------------------------------------
    // 7. UI 유틸
    // ---------------------------------------------------------
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