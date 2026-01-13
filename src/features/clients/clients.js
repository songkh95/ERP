import { supabase } from '../../common/db.js';
export { render } from './clients.view.js';

export async function init() {
    // --- DOM 요소 ---
    const listContainer = document.getElementById('client-list-container');
    const searchInput = document.getElementById('search-input');
    const totalCount = document.getElementById('total-count');
    const emptyState = document.getElementById('empty-state');
    const detailView = document.getElementById('client-detail-view');
    const inpName = document.getElementById('inp-name');
    const inpCode = document.getElementById('inp-code');
    const inpContact = document.getElementById('inp-contact');
    const inpEmail = document.getElementById('inp-email');
    const inpAddress = document.getElementById('inp-address');
    const btnSaveClient = document.getElementById('btn-save-client');
    const btnDeleteClient = document.getElementById('btn-delete-client');
    
    const assetListContainer = document.getElementById('asset-list-container');
    const btnAddAssetModal = document.getElementById('btn-add-asset-modal');
    const assetModal = document.getElementById('asset-modal');
    const btnAssetSave = document.getElementById('btn-asset-save');
    const btnAssetCancel = document.getElementById('btn-asset-cancel');
    const usageContainer = document.getElementById('usage-container');

    // ★ 모달 내부 요소 (업그레이드)
    const boxSelectModel = document.getElementById('box-select-model');
    const boxNewModelForm = document.getElementById('box-new-model-form');
    
    const selNewModel = document.getElementById('sel-new-model');
    const btnShowNewModelForm = document.getElementById('btn-show-new-model-form');
    const btnCancelNewModel = document.getElementById('btn-cancel-new-model');
    
    const inpNewMaker = document.getElementById('inp-new-maker');
    const inpNewModelName = document.getElementById('inp-new-model-name');
    const selNewModelType = document.getElementById('sel-new-model-type');
    
    const inpNewSerial = document.getElementById('inp-new-serial');

    const btnExcelExport = document.getElementById('btn-excel-export');
    const btnExcelImport = document.getElementById('btn-excel-import');
    const inpExcelFile = document.getElementById('inp-excel-file');

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
        if (selectedClientId) selectClient(selectedClientId);
        else if (allClients.length > 0) selectClient(allClients[0].id);
    }

    async function loadProducts() {
        const { data } = await supabase.from('products').select('*').order('model_name');
        productsList = data || [];
    }

    // ... (renderClientList, selectClient, loadAssets, loadUsage, resize 로직 등은 기존 유지) ...
    function renderClientList(list) {
        totalCount.innerText = list.length;
        listContainer.innerHTML = '';
        if (list.length === 0) { listContainer.innerHTML = '<div style="padding:20px; text-align:center;">없음</div>'; return; }
        list.forEach(c => {
            const el = document.createElement('div');
            el.className = 'client-list-item';
            el.dataset.id = c.id;
            if (c.id == selectedClientId) el.classList.add('active');
            el.innerHTML = `<div class="client-name">${c.name}</div><div class="client-meta">${c.client_code || '-'}</div>`;
            el.addEventListener('click', () => selectClient(c.id));
            listContainer.appendChild(el);
        });
    }

    async function selectClient(id) {
        selectedClientId = id;
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
        loadAssets(id);
        loadUsage(id);
    }
    
    async function loadAssets(clientId) {
        assetListContainer.innerHTML = '<div style="color:#999; text-align:center;">로딩 중...</div>';
        const { data: assets } = await supabase.from('assets').select('*, products(model_name)').eq('client_id', clientId).order('created_at');
        if (!assets || assets.length === 0) { assetListContainer.innerHTML = '<div style="padding:20px; text-align:center; color:#9ca3af;">등록된 기기가 없습니다.</div>'; return; }
        assetListContainer.innerHTML = '';
        assets.forEach(asset => {
            const card = document.createElement('div');
            card.className = 'asset-card';
            const showDate = (d) => d || '-';
            const cost = (n) => n ? n.toLocaleString() : '0';
            let billDayDisplay = '-';
            if (asset.billing_day) billDayDisplay = asset.billing_day === '말일' ? '말일' : `${asset.billing_day}일`;
            card.innerHTML = `
                <div class="asset-header">
                    <div><span class="asset-model">${asset.products?.model_name || 'Unknown'}</span> <span class="asset-sn">${asset.serial_number}</span></div>
                    <button class="btn-edit-asset" data-id="${asset.id}" style="color:#2563eb; background:none; border:none; cursor:pointer; font-size:0.8rem;"><i class='bx bx-edit'></i> 수정</button>
                </div>
                <div class="info-grid">
                    <div><span class="info-label">설치부서</span> <span class="info-value">${asset.install_location || '-'}</span></div>
                    <div><span class="info-label">청구방식</span> <span class="info-value">${asset.billing_method || '-'} / ${billDayDisplay}</span></div>
                    <div><span class="info-label">계약일자</span> <span class="info-value">${showDate(asset.contract_date)}</span></div>
                    <div><span class="info-label">만기일</span> <span class="info-value">${showDate(asset.contract_end_date)}</span></div>
                    <div><span class="info-label">월 기본료</span> <span class="info-value">${cost(asset.rental_cost)}원</span></div>
                    <div><span class="info-label">기본매수</span> <span class="info-value">BW:${cost(asset.base_count_bw)} / Col:${cost(asset.base_count_col)}</span></div>
                    <div class="info-full"><span class="info-label">비고</span><span class="info-value" style="color:#666; font-size:0.8rem;">${asset.memo || '-'}</span></div>
                </div>`;
            card.querySelector('.btn-edit-asset').addEventListener('click', () => openAssetModal(asset));
            assetListContainer.appendChild(card);
        });
    }

    // =========================================================
    // ★ 모달 로직 (모델 선택 or 신규 생성 UI 토글)
    // =========================================================
    
    // 신규등록 버튼 -> 입력폼 보이기
    btnShowNewModelForm.addEventListener('click', () => {
        boxSelectModel.classList.add('hidden');
        boxNewModelForm.classList.remove('hidden');
        inpNewMaker.focus();
    });

    // 취소 버튼 -> 다시 선택박스 보이기
    btnCancelNewModel.addEventListener('click', () => {
        boxNewModelForm.classList.add('hidden');
        boxSelectModel.classList.remove('hidden');
        // 입력값 초기화
        inpNewMaker.value = '';
        inpNewModelName.value = '';
        selNewModelType.value = '흑백';
    });

    // 모달 열기
    window.openAssetModal = async function(asset = null) {
        await loadProducts(); // 모델 최신화

        // ID 저장
        document.getElementById('hdn-asset-id').value = asset ? asset.id : '';

        // 모델 선택 UI 초기화 (항상 선택 모드로 시작)
        boxNewModelForm.classList.add('hidden');
        boxSelectModel.classList.remove('hidden');
        
        // 필드 값 채우기 (기존과 동일)
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

        // 모델 드롭다운 그리기
        selNewModel.innerHTML = '<option value="">-- 모델 선택 --</option>' + 
            productsList.map(p => `<option value="${p.id}">${p.model_name}</option>`).join('');

        if (asset) {
            selNewModel.value = asset.product_id;
            inpNewSerial.value = asset.serial_number;
        } else {
            selNewModel.value = '';
            inpNewSerial.value = '';
        }

        assetModal.style.display = 'flex';
    };
    
    btnAddAssetModal.addEventListener('click', () => {
        if (!selectedClientId) return alert('거래처를 선택하세요.');
        window.openAssetModal(null);
    });

    // ★ [저장] 로직 (신규 모델 생성 + 기기 등록 통합 + 중복 S/N 원천 차단)
btnAssetSave.addEventListener('click', async () => {
        const assetId = document.getElementById('hdn-asset-id').value; // 수정 모드일 때 ID
        const serial = document.getElementById('inp-new-serial').value.trim();
        
        // 1. 모델 ID 결정
        let finalProductId = null;
        const isNewModelMode = !boxNewModelForm.classList.contains('hidden'); 

        if (isNewModelMode) {
            // [신규 모델 생성]
            const maker = inpNewMaker.value.trim();
            const modelName = inpNewModelName.value.trim();
            const type = selNewModelType.value;
            if (!maker || !modelName) return alert('제조사와 모델명은 필수입니다.');

            const { data: newProd, error: prodErr } = await supabase.from('products')
                .insert({ brand: maker, model_name: modelName, type: type })
                .select().single();
            if (prodErr) return alert('모델 등록 실패: ' + prodErr.message);
            finalProductId = newProd.id;
        } else {
            // [기존 모델 선택]
            finalProductId = selNewModel.value;
            if (!finalProductId) return alert('모델을 선택하세요.');
        }

        if (!serial) return alert('Serial No.는 필수입니다.');

        // ============================================================
        // 🚨 [핵심] Serial No 중복 검사 (DB 조회)
        // ============================================================
        const { data: duplicate } = await supabase
            .from('assets')
            .select('id, serial_number')
            .eq('serial_number', serial)
            .maybeSingle();

        if (duplicate) {
            // 1. 신규 등록인데, 이미 DB에 같은 S/N가 있는 경우 -> 차단
            if (!assetId) {
                return alert(`❌ 이미 등록된 Serial No. 입니다. (${serial})\n중복 등록할 수 없습니다.`);
            }
            // 2. 수정 중인데, 내가 아닌 다른 기기가 이 S/N를 쓰고 있는 경우 -> 차단
            if (assetId && duplicate.id != assetId) {
                return alert(`❌ 이미 다른 기기에서 사용 중인 Serial No. 입니다. (${serial})`);
            }
        }

        // ============================================================
        // 데이터 저장 (중복 통과 시)
        // ============================================================
        const payload = {
            client_id: selectedClientId,
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
        if (assetId) {
            // 수정
            res = await supabase.from('assets').update(payload).eq('id', assetId);
        } else {
            // 신규 등록
            res = await supabase.from('assets').insert(payload);
        }

        if (res.error) {
            // 혹시 JS 검사를 뚫더라도 DB 제약조건(Unique)에 걸리면 여기서 잡힘
            if (res.error.code === '23505') { 
                alert('❌ [DB 오류] 중복된 Serial No. 입니다.');
            } else {
                alert('저장 실패: ' + res.error.message);
            }
        } else {
            alert('✅ 저장되었습니다.');
            assetModal.style.display = 'none';
            loadAssets(selectedClientId);
            if(isNewModelMode) loadProducts();
        }
    });

    // ... (엑셀, 사용량 조회 등 나머지 로직은 기존 유지) ...
    btnSaveClient.addEventListener('click', async () => {
        if (!selectedClientId) return;
        await supabase.from('clients').update({
            name: inpName.value, contact_person: inpContact.value,
            email: inpEmail.value, address: inpAddress.value
        }).eq('id', selectedClientId);
        alert('수정되었습니다.'); loadData();
    });
    async function loadUsage(clientId) {
        usageContainer.innerHTML = '로딩중...';
        const { data: assets } = await supabase.from('assets').select('id').eq('client_id', clientId);
        if (!assets || assets.length === 0) { usageContainer.innerHTML = '기기 없음'; return; }
        const ids = assets.map(a => a.id);
        const { data: readings } = await supabase.from('meter_readings').select('*, assets(products(model_name))').in('asset_id', ids).order('reading_date', {ascending:false}).limit(20);
        if (!readings || readings.length === 0) { usageContainer.innerHTML = '기록 없음'; return; }
        usageContainer.innerHTML = `<table class="usage-table"><thead><tr><th>모델</th><th>날짜</th><th>흑백</th><th>칼라</th></tr></thead><tbody>${readings.map(r => `<tr><td>${r.assets?.products?.model_name}</td><td>${r.reading_date}</td><td>${r.reading_bw?.toLocaleString()}</td><td>${r.reading_col?.toLocaleString()}</td></tr>`).join('')}</tbody></table>`;
    }
    btnAssetCancel.addEventListener('click', () => assetModal.style.display = 'none');
    const container = document.getElementById('layout-container');
    const leftResizer = document.getElementById('resizer-left');
    let leftW = 280;
    leftResizer.addEventListener('mousedown', (e) => {
        e.preventDefault();
        const onMove = (em) => { const w = em.clientX - container.offsetLeft; if(w>150 && w<400) { leftW=w; container.style.gridTemplateColumns = `${leftW}px 5px 500px 5px 1fr`; }};
        const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
        window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp);
    });
}