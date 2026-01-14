import { supabase } from '../../common/db.js';
export { render } from './clients.view.js';

export async function init() {
    // DOM 요소
    const listContainer = document.getElementById('client-list-container');
    const searchInput = document.getElementById('search-input');
    const filterType = document.getElementById('filter-type'); // ★ [추가] 필터 요소
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
            
            // ★ [수정됨] 메인/서브 뱃지 모두 표시
            let typeBadge = '';
            if (c.parent_id) {
                // 서브 (파랑)
                typeBadge = `<span style="font-size:0.7rem; color:#0369a1; background:#e0f2fe; padding:1px 4px; border-radius:3px; margin-left:5px;">서브</span>`;
            } else {
                // 메인 (초록)
                typeBadge = `<span style="font-size:0.7rem; color:#15803d; background:#dcfce7; padding:1px 4px; border-radius:3px; margin-left:5px;">메인</span>`;
            }

            el.innerHTML = `<div class="client-name">${c.name} ${typeBadge}</div><div class="client-meta">${c.client_code || '-'}</div>`;
            el.addEventListener('click', () => selectClient(c.id));
            listContainer.appendChild(el);
        });
    }

    // ★ [수정됨] 통합 필터 함수 (검색어 + 필터종류)
    function applyFilter() {
        const keyword = searchInput.value.toLowerCase();
        const type = filterType.value; // all, main, sub

        const filtered = allClients.filter(c => {
            // 1. 텍스트 검색 확인
            const matchText = (c.name && c.name.toLowerCase().includes(keyword)) ||
                              (c.client_code && c.client_code.toLowerCase().includes(keyword)) ||
                              (c.contact_person && c.contact_person.toLowerCase().includes(keyword));
            
            // 2. 메인/서브 필터 확인
            let matchType = true;
            if (type === 'main') matchType = !c.parent_id; // 부모가 없으면 메인
            if (type === 'sub') matchType = !!c.parent_id; // 부모가 있으면 서브

            return matchText && matchType;
        });

        renderClientList(filtered);
    }

    // 이벤트 리스너 연결
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
    // 3. 기기 목록 (Assets) - 철수 버튼 추가됨
    // =========================================================
    async function loadAssets(clientId) {
        assetListContainer.innerHTML = '<div style="color:#999; text-align:center;">로딩 중...</div>';
        
        // 1. 내 서브(자식) 거래처 찾기
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

        // 2. 기기 조회
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
            
            // 서브 뱃지
            let subBadge = '';
            if (asset.client_id !== clientId) {
                const subName = branchMap[asset.client_id] || asset.clients?.name || '서브';
                subBadge = `<span style="background:#e0f2fe; color:#0369a1; font-size:0.75rem; padding:1px 5px; border-radius:3px; margin-left:6px; border:1px solid #bae6fd; white-space:nowrap;">🔗 ${subName}</span>`;
            }

            const showDate = (d) => d || '-';
            const cost = (n) => n ? n.toLocaleString() : '0';
            let billDayDisplay = '-';
            if (asset.billing_day) billDayDisplay = asset.billing_day === '말일' ? '말일' : `${asset.billing_day}일`;
            
            // HTML 구조
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
                        <div><span class="info-label">기본매수</span> <span class="info-value">BW:${cost(asset.base_count_bw)} / Col:${cost(asset.base_count_col)}</span></div>
                        <div class="info-full"><span class="info-label">비고</span><span class="info-value" style="color:#666; font-size:0.8rem;">${asset.memo || '-'}</span></div>
                    </div>
                </div>`;
            
            // --- 이벤트 리스너 ---

            // 1. 아코디언 접기/펴기
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

            // 2. 수정 버튼 (이벤트 전파 중단)
            const editBtn = card.querySelector('.btn-edit-asset');
            editBtn.addEventListener('click', (e) => {
                e.stopPropagation(); 
                window.openAssetModal(asset);
            });

            // 3. ★ [추가] 철수 버튼 로직
            const returnBtn = card.querySelector('.btn-return-asset');
            returnBtn.addEventListener('click', async (e) => {
                e.stopPropagation(); // 아코디언 열림 방지
                
                if (!confirm(`[${asset.products?.model_name || ''}] 기기를 철수하시겠습니까?\n\n'확인'을 누르면 즉시 재고로 전환되며,\n이 거래처 목록에서 사라집니다.`)) return;

                // DB 업데이트: 주인 없앰, 상태 재고로, 위치 초기화
                const { error } = await supabase.from('assets').update({
                    client_id: null,      // 거래처 연결 해제
                    status: '재고',        // 상태 변경
                    install_location: ''  // 위치 초기화
                }).eq('id', asset.id);

                if (error) {
                    alert('철수 처리 실패: ' + error.message);
                } else {
                    alert('✅ 재고로 회수되었습니다.');
                    loadAssets(clientId); // 목록 새로고침
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

    // =========================================================
    // 5. 사용량 조회
    // =========================================================
    async function loadUsage(clientId) {
        usageContainer.innerHTML = '로딩중...';
        const { data: assets } = await supabase.from('assets').select('id').eq('client_id', clientId);
        if (!assets || assets.length === 0) { usageContainer.innerHTML = '기기 없음'; return; }
        const ids = assets.map(a => a.id);
        const { data: readings } = await supabase.from('meter_readings').select('*, assets(products(model_name))').in('asset_id', ids).order('reading_date', {ascending:false}).limit(20);
        if (!readings || readings.length === 0) { usageContainer.innerHTML = '기록 없음'; return; }
        usageContainer.innerHTML = `<table class="usage-table"><thead><tr><th>모델</th><th>날짜</th><th>흑백</th><th>칼라</th></tr></thead><tbody>${readings.map(r => `<tr><td>${r.assets?.products?.model_name}</td><td>${r.reading_date}</td><td>${r.reading_bw?.toLocaleString()}</td><td>${r.reading_col?.toLocaleString()}</td></tr>`).join('')}</tbody></table>`;
    }

    // =========================================================
    // 6. 엑셀 및 리사이저
    // =========================================================
    if(btnExcelExport) {
        btnExcelExport.addEventListener('click', () => {
            if (allClients.length === 0) return alert('내보낼 데이터가 없습니다.');
            const excelData = allClients.map(c => ({
                '고객번호': c.client_code, '거래처명': c.name, '메인/서브': c.relation_type, '담당자': c.contact_person, '이메일': c.email, '주소': c.address
            }));
            const ws = XLSX.utils.json_to_sheet(excelData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "거래처목록");
            XLSX.writeFile(wb, `거래처목록_${new Date().toISOString().slice(0,10)}.xlsx`);
        });
    }

    if(btnExcelImport) {
        btnExcelImport.addEventListener('click', () => inpExcelFile.click());
    }

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
}