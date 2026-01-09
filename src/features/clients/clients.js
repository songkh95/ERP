import { supabase } from '../../common/db.js';
import { loadCSS, loadHTML } from '../../common/utils.js';

export async function render() {
    return await loadHTML('./src/features/clients/clients.html');
}

export async function init() {
    loadCSS('./src/features/clients/style.css');

    // ============================================================
    //  1. DOM 요소 선택 (화면의 모든 입력창과 버튼 가져오기)
    // ============================================================
    
    // 메인 컨트롤
    const btnToggle = document.getElementById('btn-toggle-form');
    const formPanel = document.getElementById('form-panel');
    const formTitle = document.getElementById('form-title');
    const btnCancel = document.getElementById('btn-cancel');
    const btnSave = document.getElementById('btn-save');
    const ul = document.getElementById('client-list-ul');
    const searchInput = document.getElementById('search-input');

    // [그룹 1] 기본 정보
    const inpName = document.getElementById('inp-name');
    const inpCode = document.getElementById('inp-code'); // ReadOnly
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

    // [그룹 4] 기기 관리 섹션 요소들
    const groupAssets = document.getElementById('group-assets');
    const msgSaveFirst = document.getElementById('msg-save-first');
    const miniAssetUl = document.getElementById('mini-asset-list');
    
    // 기기 관리 탭 & 패널
    const tabStock = document.getElementById('tab-stock');
    const tabNew = document.getElementById('tab-new');
    const panelStock = document.getElementById('panel-stock');
    const panelNew = document.getElementById('panel-new');
    
    // 기기 추가/등록 입력창
    const selStockAsset = document.getElementById('sel-stock-asset');
    const btnAddStock = document.getElementById('btn-add-stock');
    const selNewModelId = document.getElementById('sel-new-model-id');
    const inpNewSerial = document.getElementById('inp-new-serial');
    const btnCreateAsset = document.getElementById('btn-create-asset');

    // 상태 변수
    let editingId = null; 
    let allClients = [];

    // 초기 실행
    loadData();

    // ============================================================
    //  2. 메인 기능: 거래처 목록 불러오기 & 렌더링
    // ============================================================
    
    async function loadData() {
        // 거래처 정보 + 보유 기기(모델명) 가져오기
        const { data, error } = await supabase
            .from('clients')
            .select(`
                *,
                assets (
                    id, 
                    products (model_name)
                )
            `)
            .order('client_code', { ascending: true }); // 고객번호순 정렬
        
        if (error) return console.error(error);
        allClients = data;
        renderList(allClients);
    }

    function renderList(list) {
        const countSpan = document.getElementById('total-count');
        if (countSpan) {
            // list가 있으면 개수를, 없으면 0을 넣음
            countSpan.innerText = list ? list.length : 0; 
        }
        
        if (!list || list.length === 0) {
            ul.innerHTML = '<li style="padding:20px; text-align:center;">데이터가 없습니다.</li>';
            return;
        }

        ul.innerHTML = list.map(client => {
            // 보유 기기 모델명 요약
            const assetModels = client.assets && client.assets.length > 0
                ? client.assets.map(a => `[${a.products?.model_name}]`).join(' ')
                : '<span style="color:#ccc">보유 기기 없음</span>';

            // 날짜 표시 헬퍼 (null이면 '-')
            const showDate = (d) => d || '-';

            return `
            <li class="client-item">
                <div class="client-summary" data-id="${client.id}">
                    <div style="display:flex; align-items:center; gap:10px;">
                        <i class='bx bx-chevron-down toggle-icon'></i>
                        <div>
                            <strong style="font-size:1.1rem;">${client.name}</strong>
                            <span style="font-size:0.8rem; color:#666; margin-left:5px;">(${client.client_code || '코드미정'})</span>
                        </div>
                    </div>
                    <div>
                        <span style="font-size:0.8rem; background:#eee; padding:2px 6px; border-radius:4px;">${client.contract_type || '미지정'}</span>
                    </div>
                </div>
                
                <div class="client-details">
                    
                    <div class="detail-compact-grid">
                        
                        <div class="info-item"><label>담당자</label> <span>${client.contact_person || '-'}</span></div>
                        <div class="info-item"><label>연락처/부서</label> <span>${client.department || '-'}</span></div>
                        <div class="info-item"><label>수취인명</label> <span>${client.recipient || '-'}</span></div>
                        
                        <div class="info-item"><label>청구방법</label> <span>${client.billing_method || '-'}</span></div>
                        <div class="info-item"><label>청구일</label> <span>${client.billing_day || '-'}</span></div>
                        
                        <div class="info-item"><label>계약일자</label> <span>${showDate(client.contract_date)}</span></div>
                        <div class="info-item"><label>계약개시일</label> <span>${showDate(client.start_date)}</span></div>
                        <div class="info-item"><label>계약만기일</label> <span>${showDate(client.end_date)}</span></div>
                        <div class="info-item"><label>해약일자</label> <span style="color:${client.cancel_date ? 'red' : '#333'}">${showDate(client.cancel_date)}</span></div>

                        <div class="info-item full-width">
                            <label>🖨️ 보유 및 관리 기기</label> 
                            <span style="font-weight:bold;">${assetModels}</span>
                        </div>
                        
                    </div>
                    <div style="text-align:right; margin-top:15px; padding-top:10px; border-top:1px dashed #eee;">
                        <button class="btn-edit" data-id="${client.id}">✏️ 정보 수정 및 기기 관리</button>
                        <button class="btn-delete" data-id="${client.id}">🗑️ 삭제</button>
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
            (c.contact_person||'').toLowerCase().includes(keyword)
        );
        renderList(filtered);
    });

    // ============================================================
    //  3. 폼 제어 및 저장 로직 (CRUD)
    // ============================================================

    // 다음 고객번호(C-XXX) 자동 생성 함수
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

    // 폼 열기
    async function openForm(isEdit) {
        formPanel.classList.remove('hidden');
        btnToggle.textContent = '닫기';
        
        // 고객번호는 절대 수정 불가 (UI 잠금)
        inpCode.readOnly = true;

        if (isEdit) {
            formTitle.textContent = '거래처 상세 정보 수정';
            // 수정 모드: 기기 관리 섹션 보이기
            groupAssets.classList.remove('hidden');
            msgSaveFirst.classList.add('hidden');
            
            // 기기 데이터 로드
            loadClientAssets(editingId);
            loadStockAssets();
        } else {
            // 신규 모드
            formTitle.textContent = '신규 거래처 등록';
            // 신규 모드: 기기 관리 섹션 숨기기
            groupAssets.classList.add('hidden');
            msgSaveFirst.classList.remove('hidden');
            
            resetFormInputs();
            
            // 번호 자동 생성
            inpCode.placeholder = '번호 생성 중...';
            const nextCode = await generateNextCode();
            inpCode.value = nextCode;
        }
    }

    function closeForm() {
        formPanel.classList.add('hidden');
        btnToggle.textContent = '➕ 신규 거래처 등록';
        resetFormInputs();
    }

    function resetFormInputs() {
        editingId = null;
        // 패널 내 모든 input/select 초기화
        formPanel.querySelectorAll('input').forEach(i => i.value = '');
        formPanel.querySelectorAll('select').forEach(s => s.value = '');
        miniAssetUl.innerHTML = '';
    }

    // [저장 버튼] 클릭
    btnSave.addEventListener('click', async () => {
        if (!inpName.value) return alert('거래처명은 필수입니다!');

        const payload = {
            name: inpName.value,
            client_code: inpCode.value,
            // client_seq 삭제됨
            contact_person: inpContact.value,
            recipient: inpRecipient.value,
            department: inpDept.value,
            
            contract_type: inpContractType.value,
            contract_date: inpContractDate.value || null,
            start_date: inpStartDate.value || null,
            end_date: inpEndDate.value || null,
            cancel_date: inpCancelDate.value || null,
            
            // product_type, contract_model, contract_serial 삭제됨 (assets에서 관리)

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
            // 중복 번호 에러 처리
            if (res.error.code === '23505') {
                alert('❌ 이미 존재하는 고객번호입니다.\n번호를 다시 생성합니다. 다시 저장해주세요.');
                const newCode = await generateNextCode();
                inpCode.value = newCode;
            } else {
                alert('오류: ' + res.error.message);
            }
        } else {
            alert('저장되었습니다.');
            if(!editingId) closeForm(); // 신규면 닫기
            else loadData(); // 수정이면 리스트만 갱신 (기기관리 계속 할 수 있게)
            
            // 메인 리스트 갱신
            if(!editingId) loadData(); 
        }
    });

    // 리스트 클릭 이벤트 (아코디언, 수정, 삭제)
    ul.addEventListener('click', async (e) => {
        // 아코디언 토글
        const summary = e.target.closest('.client-summary');
        if (summary) {
            const detail = summary.nextElementSibling;
            detail.classList.toggle('show');
            return;
        }

        // 수정 버튼
        const btnEdit = e.target.closest('.btn-edit');
        if (btnEdit) {
            const id = btnEdit.dataset.id;
            editingId = id;
            
            const { data } = await supabase.from('clients').select('*').eq('id', id).single();
            if (data) {
                // 폼 값 채우기
                inpName.value = data.name || '';
                inpCode.value = data.client_code || '';
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

                openForm(true); // 수정 모드로 열기
                // 스크롤 이동
                formPanel.scrollIntoView({ behavior: 'smooth' });
            }
        }

        // 삭제 버튼
        const btnDelete = e.target.closest('.btn-delete');
        if (btnDelete) {
            if(confirm('정말 삭제하시겠습니까? 연결된 기기가 있다면 먼저 반납 처리해야 합니다.')) {
                await supabase.from('clients').delete().eq('id', btnDelete.dataset.id);
                loadData();
            }
        }
    });

    // 컨트롤 패널 버튼
    btnToggle.addEventListener('click', () => {
        if(formPanel.classList.contains('hidden')) openForm(false);
        else closeForm();
    });
    btnCancel.addEventListener('click', closeForm);


    // ============================================================
    //  4. [통합된] 기기 관리 섹션 로직 (Asset Management)
    // ============================================================

    // 탭 전환 UI
    tabStock.addEventListener('click', () => {
        tabStock.classList.add('active'); tabNew.classList.remove('active');
        panelStock.classList.remove('hidden'); panelNew.classList.add('hidden');
    });

    tabNew.addEventListener('click', () => {
        tabNew.classList.add('active'); tabStock.classList.remove('active');
        panelNew.classList.remove('hidden'); panelStock.classList.add('hidden');
        loadProductModels();
    });

    // 4-1. 현재 거래처의 보유 기기 로드
    async function loadClientAssets(clientId) {
        miniAssetUl.innerHTML = '<li style="padding:10px;">로딩 중...</li>';
        
        const { data } = await supabase
            .from('assets')
            .select('*, products(brand, model_name)')
            .eq('client_id', clientId);
            
        if (!data || data.length === 0) {
            miniAssetUl.innerHTML = '<li style="color:#999; text-align:center;">현재 연결된 기기가 없습니다.</li>';
        } else {
            miniAssetUl.innerHTML = data.map(asset => `
                <li class="asset-item">
                    <div>
                        <span class="asset-tag">${asset.products?.model_name || '모델미상'}</span>
                        <span>S/N: <b>${asset.serial_number}</b></span>
                    </div>
                    <button class="btn-tiny btn-unlink" data-id="${asset.id}" style="color:red; border:1px solid #ffcccc; background:white;">
                        반납
                    </button>
                </li>
            `).join('');
        }
    }

    // 4-2. 반납(연결해제) 버튼 동작
    miniAssetUl.addEventListener('click', async (e) => {
        if (e.target.classList.contains('btn-unlink')) {
            if(!confirm('이 기기를 반납하시겠습니까? (재고로 이동됨)')) return;
            // client_id 제거, status '재고' 변경
            await supabase.from('assets').update({ client_id: null, status: '재고' }).eq('id', e.target.dataset.id);
            refreshAssets();
        }
    });

    // 4-3. 재고(Stock) 목록 불러오기
    async function loadStockAssets() {
        const { data } = await supabase
            .from('assets')
            .select('id, serial_number, products(model_name)')
            .is('client_id', null); // 주인이 없는 기기만

        selStockAsset.innerHTML = '<option value="">-- 재고 기기 선택 --</option>' +
            (data || []).map(a => `<option value="${a.id}">[${a.products?.model_name}] ${a.serial_number}</option>`).join('');
    }

    // 4-4. 재고에서 추가 (배정)
    btnAddStock.addEventListener('click', async () => {
        const assetId = selStockAsset.value;
        if (!assetId) return alert('기기를 선택해주세요.');
        
        await supabase.from('assets').update({ client_id: editingId, status: '사용중' }).eq('id', assetId);
        
        alert('기기가 배정되었습니다.');
        refreshAssets();
    });

    // 4-5. 신규 기기 즉시 생성 및 배정
    async function loadProductModels() {
        if (selNewModelId.options.length > 1) return; // 이미 로드했으면 생략
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
            client_id: editingId, // ★ 현재 고객 바로 할당
            status: '사용중'
        });

        if (error) alert('등록 실패: ' + error.message);
        else {
            alert('새 기기가 등록되고 배정되었습니다.');
            inpNewSerial.value = '';
            refreshAssets();
        }
    });

    // 4-6. 기기 관련 화면 갱신 헬퍼
    function refreshAssets() {
        if (editingId) {
            loadClientAssets(editingId); // 보유 목록 갱신
            loadStockAssets();           // 재고 목록 갱신
            // 메인 리스트(보유 기종 텍스트)도 갱신 필요할 수 있으므로
            loadData(); 
        }
    }
}