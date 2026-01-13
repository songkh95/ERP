import { supabase } from '../../common/db.js';
export { render } from './clients.view.js';

export async function init() {
    // --- DOM 요소 ---
    const listContainer = document.getElementById('client-list-container');
    const searchInput = document.getElementById('search-input');
    const totalCount = document.getElementById('total-count');
    
    // 뷰 전환
    const emptyState = document.getElementById('empty-state');
    const detailView = document.getElementById('client-detail-view');
    
    // 기본 정보 폼
    const inpName = document.getElementById('inp-name');
    const inpCode = document.getElementById('inp-code');
    const inpContact = document.getElementById('inp-contact');
    const inpEmail = document.getElementById('inp-email');
    const inpAddress = document.getElementById('inp-address');
    const btnSaveClient = document.getElementById('btn-save-client');
    const btnDeleteClient = document.getElementById('btn-delete-client');
    
    // 기기 리스트 및 모달
    const assetListContainer = document.getElementById('asset-list-container');
    const btnAddAssetModal = document.getElementById('btn-add-asset-modal');
    const assetModal = document.getElementById('asset-modal');
    const btnAssetSave = document.getElementById('btn-asset-save');
    const btnAssetCancel = document.getElementById('btn-asset-cancel');

    // 우측 패널
    const usageContainer = document.getElementById('usage-container');

    // 엑셀
    const btnExcelExport = document.getElementById('btn-excel-export');
    const btnExcelImport = document.getElementById('btn-excel-import');
    const inpExcelFile = document.getElementById('inp-excel-file');

    let allClients = [];
    let selectedClientId = null;
    let productsList = []; // 모델명 리스트 캐싱

    loadData();

    // =========================================================
    // 1. 초기 데이터 로드
    // =========================================================
    async function loadData() {
        const { data, error } = await supabase
            .from('clients')
            .select('*')
            .order('name');
        
        if (error) return console.error(error);
        allClients = data;
        renderClientList(allClients);
        
        // 제품 목록 미리 로드 (기기 등록용)
        const prodRes = await supabase.from('products').select('*');
        if(prodRes.data) productsList = prodRes.data;

        // 선택 유지 or 첫번째 선택
        if (selectedClientId) selectClient(selectedClientId);
        else if (allClients.length > 0) selectClient(allClients[0].id);
    }

    function renderClientList(list) {
        totalCount.innerText = list.length;
        listContainer.innerHTML = '';
        if (list.length === 0) {
            listContainer.innerHTML = '<div style="padding:20px; text-align:center;">없음</div>';
            return;
        }
        list.forEach(c => {
            const el = document.createElement('div');
            el.className = 'client-list-item';
            el.dataset.id = c.id;
            if (c.id == selectedClientId) el.classList.add('active');
            el.innerHTML = `
                <div class="client-name">${c.name}</div>
                <div class="client-meta">${c.client_code || '-'}</div>
            `;
            el.addEventListener('click', () => selectClient(c.id));
            listContainer.appendChild(el);
        });
    }

    // =========================================================
    // 2. 고객 선택 & 상세 정보 로드
    // =========================================================
    async function selectClient(id) {
        selectedClientId = id;
        
        // 리스트 하이라이트
        document.querySelectorAll('.client-list-item').forEach(el => {
            el.classList.toggle('active', el.dataset.id == id);
        });

        const client = allClients.find(c => c.id == id);
        if (!client) return;

        emptyState.classList.add('hidden');
        detailView.classList.remove('hidden');

        // [상단] 기본 정보 채우기
        inpName.value = client.name;
        inpCode.value = client.client_code;
        inpContact.value = client.contact_person || '';
        inpEmail.value = client.email || '';
        inpAddress.value = client.address || '';

        // [하단] 기기 목록 가져오기 (계약정보 포함)
        loadAssets(id);

        // [우측] 사용량 로드
        loadUsage(id);
    }

    // 기기 목록 로드 및 렌더링
async function loadAssets(clientId) {
        assetListContainer.innerHTML = '<div style="color:#999; text-align:center;">로딩 중...</div>';
        
        const { data: assets } = await supabase
            .from('assets')
            .select('*, products(model_name)')
            .eq('client_id', clientId)
            .order('created_at');

        if (!assets || assets.length === 0) {
            assetListContainer.innerHTML = '<div style="padding:20px; text-align:center; color:#9ca3af;">등록된 기기가 없습니다.</div>';
            return;
        }

        assetListContainer.innerHTML = '';
        assets.forEach(asset => {
            const card = document.createElement('div');
            card.className = 'asset-card';
            
            // 날짜/금액 포맷 헬퍼
            const showDate = (d) => d || '-';
            const cost = (n) => n ? n.toLocaleString() : '0';
            
            // ★ [수정됨] 청구일 표시 로직 (말일/숫자/빈값 구분)
            let billDayDisplay = '-';
            if (asset.billing_day) {
                // '말일'이면 '일' 안 붙임, 아니면 '일' 붙임
                billDayDisplay = asset.billing_day === '말일' ? '말일' : `${asset.billing_day}일`;
            }

            card.innerHTML = `
                <div class="asset-header">
                    <div>
                        <span class="asset-model">${asset.products?.model_name || 'Unknown'}</span>
                        <span class="asset-sn">${asset.serial_number}</span>
                    </div>
                    <button class="btn-edit-asset" data-id="${asset.id}" style="color:#2563eb; background:none; border:none; cursor:pointer; font-size:0.8rem;">
                        <i class='bx bx-edit'></i> 수정
                    </button>
                </div>
                
                <div class="info-grid">
                    <div><span class="info-label">설치부서</span> <span class="info-value">${asset.install_location || '-'}</span></div>
                    
                    <div><span class="info-label">청구방식</span> <span class="info-value">${asset.billing_method || '-'} / ${billDayDisplay}</span></div>
                    
                    <div><span class="info-label">계약일자</span> <span class="info-value">${showDate(asset.contract_date)}</span></div>
                    <div><span class="info-label">만기일</span> <span class="info-value">${showDate(asset.contract_end_date)}</span></div>
                    
                    <div><span class="info-label">월 기본료</span> <span class="info-value">${cost(asset.rental_cost)}원</span></div>
                    <div><span class="info-label">기본매수</span> <span class="info-value">BW:${cost(asset.base_count_bw)} / Col:${cost(asset.base_count_col)}</span></div>
                </div>
            `;

            card.querySelector('.btn-edit-asset').addEventListener('click', () => openAssetModal(asset));
            assetListContainer.appendChild(card);
        });
    }

    // =========================================================
    // 3. 기기 등록/수정 모달 로직
    // =========================================================
    function openAssetModal(asset = null) {
        // 모달 초기화
        document.getElementById('hdn-asset-id').value = asset ? asset.id : '';
        document.getElementById('inp-new-serial').value = asset ? asset.serial_number : '';
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

        // 모델 셀렉트박스 채우기
        const selModel = document.getElementById('sel-new-model');
        selModel.innerHTML = productsList.map(p => 
            `<option value="${p.id}" ${asset && asset.product_id == p.id ? 'selected' : ''}>${p.model_name}</option>`
        ).join('');

        assetModal.style.display = 'flex';
    }

btnAssetSave.addEventListener('click', async () => {
        const assetId = document.getElementById('hdn-asset-id').value; // 수정일 경우 ID가 있음
        const serial = document.getElementById('inp-new-serial').value.trim(); // 공백 제거
        
        // 1. 유효성 검사
        if(!serial) return alert('Serial No.는 필수 입력 사항입니다.');

        // 2. ★ 중복 검사 로직 추가 ★
        // "입력한 시리얼 번호를 가진 기기가 있는지 찾아봐라"
        const { data: duplicateCheck, error: checkError } = await supabase
            .from('assets')
            .select('id')
            .eq('serial_number', serial)
            .maybeSingle(); // 하나만 가져옴

        if (duplicateCheck) {
            // 중복된 기기가 발견됨
            
            // A. 신규 등록인데 중복인 경우 -> 차단
            if (!assetId) {
                return alert(`❌ 이미 등록된 Serial No. 입니다. (${serial})`);
            }
            
            // B. 수정 중인데, 검색된 기기가 '나(현재 수정중인 기기)'와 다른 경우 -> 차단
            if (assetId && duplicateCheck.id != assetId) {
                return alert(`❌ 이미 다른 기기에서 사용 중인 Serial No. 입니다.`);
            }
        }

        // 3. 데이터 준비
        const payload = {
            client_id: selectedClientId,
            product_id: document.getElementById('sel-new-model').value,
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
            
            status: '사용중'
        };

        // 4. 저장 실행
        let res;
        if (assetId) {
            // 수정 (Update)
            res = await supabase.from('assets').update(payload).eq('id', assetId);
        } else {
            // 신규 (Insert)
            res = await supabase.from('assets').insert(payload);
        }

        // 5. 결과 처리
        if (res.error) {
            // 혹시 JS 검사를 뚫고 DB 제약조건에 걸렸을 경우 (코드 23505)
            if (res.error.code === '23505') {
                alert('❌ 중복된 Serial No. 입니다.');
            } else {
                alert('저장 실패: ' + res.error.message);
            }
        } else {
            alert('✅ 저장되었습니다.');
            assetModal.style.display = 'none';
            loadAssets(selectedClientId); // 리스트 갱신
        }
    });

    // =========================================================
    // 4. 이벤트 핸들러 (기본정보 저장, 엑셀, 리사이저 등)
    // =========================================================
    
    // 기본정보 저장
    btnSaveClient.addEventListener('click', async () => {
        if (!selectedClientId) return;
        const payload = {
            name: inpName.value,
            contact_person: inpContact.value,
            email: inpEmail.value,
            address: inpAddress.value
        };
        await supabase.from('clients').update(payload).eq('id', selectedClientId);
        alert('기본 정보가 수정되었습니다.');
        loadData(); // 리스트 이름 등 갱신
    });

    // 검색
    searchInput.addEventListener('keyup', (e) => {
        const key = e.target.value.toLowerCase();
        const filtered = allClients.filter(c => c.name.toLowerCase().includes(key));
        renderClientList(filtered);
    });

    // 모달 제어
    btnAddAssetModal.addEventListener('click', () => {
        if(!selectedClientId) return alert('고객을 먼저 선택하세요.');
        openAssetModal(null);
    });
    btnAssetCancel.addEventListener('click', () => assetModal.style.display = 'none');

    // 엑셀 기능 (유지)
    if(btnExcelExport) {
        btnExcelExport.addEventListener('click', () => {
            if (allClients.length === 0) return alert('내보낼 데이터가 없습니다.');
            
            // ★ 수정: DB에 있는 컬럼만 내보내기
            const excelData = allClients.map(c => ({
                '고객번호': c.client_code,
                '거래처명': c.name,
                '대표자/담당자': c.contact_person,
                '이메일': c.email,
                '주소': c.address
            }));
            
            const ws = XLSX.utils.json_to_sheet(excelData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "거래처목록");
            XLSX.writeFile(wb, `거래처목록_${new Date().toISOString().slice(0,10)}.xlsx`);
        });
    }

    // [가져오기]
    if(btnExcelImport) {
        btnExcelImport.addEventListener('click', () => inpExcelFile.click());
    }

    if(inpExcelFile) {
        inpExcelFile.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            if(!confirm('엑셀 파일의 [거래처 기본 정보]를 등록하시겠습니까?\n(계약/청구 정보는 기기 등록 시 별도로 설정해야 합니다.)')) {
                inpExcelFile.value = ''; 
                return;
            }

            const reader = new FileReader();
            reader.onload = async (evt) => {
                try {
                    const data = evt.target.result;
                    const workbook = XLSX.read(data, { type: 'binary' });
                    const sheetName = workbook.SheetNames[0];
                    const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

                    if (jsonData.length === 0) {
                        alert('데이터가 없습니다.');
                        return;
                    }

                    // ★ 수정: DB 'clients' 테이블에 실제 존재하는 컬럼만 매핑
                    const payload = jsonData.map(row => {
                        // 엑셀 컬럼명과 매칭 (없으면 null 처리)
                        return {
                            client_code: row['고객번호'] || row['코드'], // 코드 자동생성 로직이 필요하면 추가 가능
                            name: row['거래처명'] || row['상호명'],
                            contact_person: row['대표자/담당자'] || row['담당자'],
                            email: row['이메일'],
                            address: row['주소']
                        };
                    }).filter(r => r.name); // 이름 없는 행 제외

                    // DB 저장 (clients 테이블만)
                    const { error } = await supabase.from('clients').insert(payload);

                    if (error) {
                        // 고객번호 중복 등 에러 처리
                        if (error.code === '23505') alert('중복된 고객번호가 있거나 이미 등록된 거래처입니다.');
                        else alert('등록 실패: ' + error.message);
                    } else {
                        alert(`✅ 총 ${payload.length}건의 거래처 기본 정보가 등록되었습니다.\n기기 및 계약 정보는 상세 화면에서 추가해주세요.`);
                        loadData(); // 리스트 갱신
                    }
                } catch (err) {
                    console.error(err);
                    alert('엑셀 처리 중 오류 발생: ' + err.message);
                } finally {
                    inpExcelFile.value = ''; // 초기화
                }
            };
            reader.readAsBinaryString(file);
        });
    }

    // 우측 사용량 로드 (이전과 동일 로직)
    async function loadUsage(clientId) {
        usageContainer.innerHTML = '<div style="padding:20px; text-align:center;">로딩 중...</div>';
        const { data: assets } = await supabase.from('assets').select('id').eq('client_id', clientId);
        if (!assets || assets.length === 0) {
            usageContainer.innerHTML = '<div style="text-align:center; padding:20px; color:#999;">기기 없음</div>';
            return;
        }
        
        const ids = assets.map(a => a.id);
        const { data: readings } = await supabase.from('meter_readings')
            .select('*, assets(products(model_name))')
            .in('asset_id', ids)
            .order('reading_date', {ascending:false})
            .limit(20);

        if (!readings || readings.length === 0) {
            usageContainer.innerHTML = '<div style="text-align:center; padding:20px; color:#999;">기록 없음</div>';
            return;
        }

        // 테이블 그리기
        usageContainer.innerHTML = `
            <table class="usage-table">
                <thead><tr><th>모델</th><th>날짜</th><th>흑백</th><th>칼라</th></tr></thead>
                <tbody>
                    ${readings.map(r => `
                        <tr>
                            <td style="text-align:left;">${r.assets?.products?.model_name}</td>
                            <td>${r.reading_date}</td>
                            <td>${r.reading_bw?.toLocaleString()}</td>
                            <td>${r.reading_col?.toLocaleString()}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    // ★ 리사이저 로직 (그대로 유지)
    enableResizing();
    function enableResizing() {
        const container = document.getElementById('layout-container');
        const leftResizer = document.getElementById('resizer-left');
        const rightResizer = document.getElementById('resizer-right');
        
        let leftW = 280, midW = 500;

        // 왼쪽 핸들
        leftResizer.addEventListener('mousedown', initDragLeft);
        function initDragLeft(e) {
            window.addEventListener('mousemove', doDragLeft);
            window.addEventListener('mouseup', stopDragLeft);
        }
        function doDragLeft(e) {
            const newW = e.clientX - container.offsetLeft;
            if(newW > 150 && newW < 400) { leftW = newW; updateGrid(); }
        }
        function stopDragLeft() { window.removeEventListener('mousemove', doDragLeft); window.removeEventListener('mouseup', stopDragLeft); }

        // 오른쪽 핸들
        rightResizer.addEventListener('mousedown', initDragRight);
        function initDragRight(e) {
            window.addEventListener('mousemove', doDragRight);
            window.addEventListener('mouseup', stopDragRight);
        }
        function doDragRight(e) {
            // 왼쪽 패널 + 핸들(5) + 중간 패널 = 현재 마우스 X
            const newMidW = e.clientX - container.offsetLeft - leftW - 5;
            if(newMidW > 300 && newMidW < 800) { midW = newMidW; updateGrid(); }
        }
        function stopDragRight() { window.removeEventListener('mousemove', doDragRight); window.removeEventListener('mouseup', stopDragRight); }

        function updateGrid() {
            container.style.gridTemplateColumns = `${leftW}px 5px ${midW}px 5px 1fr`;
        }
    }
}