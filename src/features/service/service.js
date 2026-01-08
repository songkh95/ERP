import { supabase } from '../../common/db.js';
import { loadCSS, loadHTML } from '../../common/utils.js';

export async function render() {
    return await loadHTML('./src/features/service/service.html');
}

export async function init() {
    loadCSS('./src/features/service/style.css');

    // DOM 요소
    const inpDate = document.getElementById('input-date');
    const selClient = document.getElementById('select-client');
    const selAsset = document.getElementById('select-asset');
    const inpVisit = document.getElementById('input-visit');
    const chkAllList = document.querySelectorAll('.chk-all');
    const inpSpare = document.getElementById('input-spare');
    const inpNote = document.getElementById('input-note');
    
    const btnSave = document.getElementById('btn-save-log');
    const btnCancelEdit = document.getElementById('btn-cancel-edit'); // 추가됨
    const ul = document.getElementById('service-list-ul');

    

    // 상태 변수
    let editingLogId = null; // 수정 중인 로그 ID (null이면 신규 등록)

    // 초기 설정
    resetForm();
    loadClients();
    loadServiceLogs();

    // ✅ [추가] 토너/드럼 제목 클릭 시 전체 선택/해제 로직
    chkAllList.forEach(chkAll => {
        chkAll.addEventListener('change', (e) => {
            const targetName = e.target.dataset.target; // 'toner' 또는 'drum'
            const isChecked = e.target.checked;
            const childCheckboxes = document.querySelectorAll(`input[name="deli-${targetName}"]`);
            childCheckboxes.forEach(child => child.checked = isChecked);
        });
    });


    // -----------------------------------------------------------
    // 1. 거래처 & 기기 연동
    // -----------------------------------------------------------
    async function loadClients() {
        const { data } = await supabase.from('clients').select('id, name').order('name');
        selClient.innerHTML = '<option value="">-- 거래처를 선택하세요 --</option>' +
            (data || []).map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    }

    // ★ [중요] 기기 로딩 로직 함수로 분리 (재사용 위해)
    async function loadAssetsForClient(clientId, selectedAssetId = null) {
        if (!clientId) {
            selAsset.innerHTML = '<option value="">-- 거래처를 먼저 선택하세요 --</option>';
            return;
        }
        
        // 로딩 중 표시 안 함 (수정 시 깜빡임 방지)
        const { data } = await supabase
            .from('assets')
            .select('id, serial_number, products(model_name)')
            .eq('client_id', clientId);
            // .eq('status', '사용중'); // 필요시 주석 해제 (수정 시 과거 기기일 수도 있어서 일단 뺌)

        if (!data || data.length === 0) {
            selAsset.innerHTML = '<option value="">등록된 기기가 없습니다.</option>';
        } else {
            selAsset.innerHTML = data.map(a => `<option value="${a.id}">[${a.products?.model_name}] ${a.serial_number}</option>`).join('');
            
            // 만약 선택해야 할 기기 ID가 있다면 선택해줌 (수정 모드일 때)
            if (selectedAssetId) {
                selAsset.value = selectedAssetId;
            }
        }
    }

    selClient.addEventListener('change', () => {
        loadAssetsForClient(selClient.value);
    });

    // -----------------------------------------------------------
    // 2. 저장 (신규 등록 OR 수정)
    // -----------------------------------------------------------
// ✅ [교체] 저장 버튼 로직
    btnSave.addEventListener('click', async () => {
        if (!selClient.value || !selAsset.value) return alert('거래처와 기기 선택 필수');
        if (!inpDate.value) return alert('날짜 필수');

        // (1) 체크박스 값 -> 글자로 변환
        const getCheckedValues = (name) => {
            const checked = document.querySelectorAll(`input[name="${name}"]:checked`);
            return Array.from(checked).map(c => c.value);
        };
        const tonerVals = getCheckedValues('deli-toner');
        const drumVals = getCheckedValues('deli-drum');

        let deliveryStr = '';
        if (tonerVals.length > 0) deliveryStr += `토너(${tonerVals.join(',')}) `;
        if (drumVals.length > 0) deliveryStr += `드럼(${drumVals.join(',')})`;
        
        // (2) Payload 생성
        const payload = {
            visit_date: inpDate.value,
            client_id: selClient.value,
            asset_id: selAsset.value,
            visit_detail: inpVisit.value,
            delivery_detail: deliveryStr.trim(), // 변환된 글자 저장
            spare_parts: inpSpare.value,
            note: inpNote.value
        };

        // (3) DB 전송 (기존과 동일)
        let result;
        if (editingLogId) {
            result = await supabase.from('service_logs').update(payload).eq('id', editingLogId);
        } else {
            result = await supabase.from('service_logs').insert(payload);
        }

        if (result.error) alert('실패: ' + result.error.message);
        else {
            alert(editingLogId ? '✅ 수정되었습니다.' : '✅ 등록되었습니다.');
            resetForm(); 
            loadServiceLogs(); 
        }
    });

    // 수정 취소 버튼
    btnCancelEdit.addEventListener('click', resetForm);

    // 폼 리셋 함수
 function resetForm() {
        editingLogId = null;
        inpDate.value = new Date().toISOString().split('T')[0];
        selClient.value = '';
        selAsset.innerHTML = '<option value="">-- 거래처를 먼저 선택하세요 --</option>';
        inpVisit.value = ''; 
        // inpDelivery.value = ''; <-- 삭제됨
        inpSpare.value = ''; inpNote.value = '';
        
        // ✅ [추가] 모든 체크박스 해제
        document.querySelectorAll('input[type="checkbox"]').forEach(c => c.checked = false);
        
        btnSave.textContent = '등록하기';
        btnSave.style.background = '#28a745';
        btnCancelEdit.classList.add('hidden');
    }
    // -----------------------------------------------------------
    // 3. 데이터 로드 및 렌더링
    // -----------------------------------------------------------
    async function loadServiceLogs() {
        const { data, error } = await supabase
            .from('service_logs')
            .select(`*, clients(name), assets(id, serial_number, products(model_name))`)
            .order('created_at', { ascending: false }); // false: 나중에 등록한게 위로 (3 -> 2 -> 1)

        if (error) return console.error(error);
        renderGroupedLogs(data);
    }

    function renderGroupedLogs(logs) {
        if (!logs || logs.length === 0) {
            ul.innerHTML = '<li style="padding:20px; text-align:center; color:#999;">기록이 없습니다.</li>';
            return;
        }

        // 그룹화
        const groups = {};
        logs.forEach(log => {
            const clientId = log.client_id;
            const clientName = log.clients?.name || '(삭제된 거래처)';
            if (!groups[clientId]) groups[clientId] = { name: clientName, logs: [] };
            groups[clientId].logs.push(log);
        });

        ul.innerHTML = Object.values(groups).map(group => {
            const logCount = group.logs.length;
            const latestDate = group.logs[0].visit_date;

            // ★ 내부 테이블 행 생성 (수정/삭제 버튼 추가됨)
            const rowsHtml = group.logs.map(log => `
                <tr>
                    <td style="width:12%; font-weight:bold;">${log.visit_date}</td>
                    <td style="width:18%;">${log.assets?.products?.model_name || '-'}</td>
                    <td style="width:20%; color:#333;">${log.visit_detail || '-'}</td>
                    <td style="width:15%; color:#555;">${log.delivery_detail || '-'}</td>
                    <td style="width:10%; color:#007bff;">${log.spare_parts || '-'}</td>
                    <td style="width:10%; color:#888;">${log.note || ''}</td>
                    <td style="width:15%; text-align:center;">
                        <button class="btn-mini edit" 
                            data-id="${log.id}" 
                            data-date="${log.visit_date}"
                            data-client="${log.client_id}"
                            data-asset="${log.asset_id}"
                            data-visit="${log.visit_detail || ''}"
                            data-deli="${log.delivery_detail || ''}"
                            data-spare="${log.spare_parts || ''}"
                            data-note="${log.note || ''}"
                        >수정</button>
                        <button class="btn-mini del" data-id="${log.id}">삭제</button>
                    </td>
                </tr>
            `).join('');

            return `
            <li>
                <div class="group-header">
                    <div class="col-40"><strong>${group.name}</strong> <span class="badge-count">${logCount}건</span></div>
                    <div class="col-20" style="color:#666;">총 ${logCount}회 방문</div>
                    <div class="col-30" style="color:#666;">최근: ${latestDate}</div>
                    <div class="col-10" style="text-align:center;"><i class='bx bx-chevron-down'></i></div>
                </div>
                <div class="group-body">
                    <table class="inner-table">
                        <thead>
                            <tr>
                                <th>방문일자</th>
                                <th>모델명</th>
                                <th>방문/점검 내용</th>
                                <th>배송 내용</th>
                                <th>여유분</th>
                                <th>비고</th>
                                <th>관리</th> </tr>
                        </thead>
                        <tbody>${rowsHtml}</tbody>
                    </table>
                </div>
            </li>`;
        }).join('');
    }

    // -----------------------------------------------------------
    // 4. 이벤트 위임 (펼치기, 수정, 삭제)
    // -----------------------------------------------------------
    ul.addEventListener('click', async (e) => {
        // (1) 펼치기/접기
        const header = e.target.closest('.group-header');
        if (header) {
            const body = header.nextElementSibling;
            const icon = header.querySelector('i');
            body.classList.toggle('show');
            icon.style.transform = body.classList.contains('show') ? 'rotate(180deg)' : 'rotate(0deg)';
        }

        // (2) 삭제 버튼
        const btnDel = e.target.closest('.del');
        if (btnDel) {
            if (confirm('정말 삭제하시겠습니까?')) {
                await supabase.from('service_logs').delete().eq('id', btnDel.dataset.id);
                loadServiceLogs();
            }
        }

        // (3) 수정 버튼
        const btnEdit = e.target.closest('.edit');
        if (btnEdit) {
            // 데이터 가져오기
            const d = btnEdit.dataset;
            
            // 상태 변경
            editingLogId = d.id;
            
            // 폼 채우기
            inpDate.value = d.date;
            selClient.value = d.client;
            inpVisit.value = d.visit;
            inpDelivery.value = d.deli;
            inpSpare.value = d.spare;
            inpNote.value = d.note;

            // ★ 비동기 처리: 고객 선택 후 -> 기기 목록 불러오고 -> 기기 선택까지
            await loadAssetsForClient(d.client, d.asset);

            // UI 변경
            btnSave.textContent = '수정 완료';
            btnSave.style.background = '#007bff'; // 파란색
            btnCancelEdit.classList.remove('hidden'); // 취소버튼 보이기
            
            // 맨 위로 스크롤
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    });

    
}