import { supabase } from '../../common/db.js';
import { loadCSS } from '../../common/utils.js';

// ============================================================
//  1. [Render] HTML 구조 (리스트 중심 + 모달 팝업)
// ============================================================
export { render } from './service.view.js';

// ============================================================
//  2. [Init] 기능 로직
// ============================================================
export async function init() {
    loadCSS('./src/features/service/style.css');

    // --- DOM 요소 선택 ---
    // 모달 관련
    const modal = document.getElementById('service-modal');
    const btnOpenModal = document.getElementById('btn-open-modal');
    const btnCloseModal = document.getElementById('btn-close-modal');
    const formTitle = document.getElementById('form-title');

    // 폼 내부 요소 (기존 ID 유지)
    const inpDate = document.getElementById('input-date');
    const selClient = document.getElementById('select-client');
    const selAsset = document.getElementById('select-asset');
    const inpVisit = document.getElementById('input-visit');
    const chkAllList = document.querySelectorAll('.chk-all');
    const inpSpare = document.getElementById('input-spare');
    const inpNote = document.getElementById('input-note');
    const btnSave = document.getElementById('btn-save-log');
    const ul = document.getElementById('service-list-ul');

    // 상태 변수
    let editingLogId = null; 

    // 초기 실행
    resetForm();
    loadClients();
    loadServiceLogs();

    // --- 모달 제어 함수 ---
    function openModal(isEdit) {
        modal.style.display = 'flex';
        if (isEdit) {
            formTitle.innerHTML = "<i class='bx bx-edit'></i> A/S 접수 수정";
            btnSave.textContent = "수정 완료";
        } else {
            formTitle.innerHTML = "<i class='bx bx-plus-circle'></i> 신규 A/S 접수";
            btnSave.textContent = "등록하기";
            resetForm(); // 신규일 때 폼 비우기
        }
    }

    function closeModal() {
        modal.style.display = 'none';
        resetForm();
    }

    // 버튼 이벤트
    if(btnOpenModal) btnOpenModal.addEventListener('click', () => openModal(false));
    if(btnCloseModal) btnCloseModal.addEventListener('click', closeModal);

    // --- 체크박스 전체 선택 로직 ---
    chkAllList.forEach(chkAll => {
        chkAll.addEventListener('change', (e) => {
            const targetName = e.target.dataset.target; // 'toner' or 'drum'
            const isChecked = e.target.checked;
            const childCheckboxes = document.querySelectorAll(`input[name="deli-${targetName}"]`);
            childCheckboxes.forEach(child => child.checked = isChecked);
        });
    });

    // --- 데이터 로드: 거래처 & 기기 ---
    async function loadClients() {
        const { data } = await supabase.from('clients').select('id, name').order('name');
        selClient.innerHTML = '<option value="">-- 거래처를 선택하세요 --</option>' +
            (data || []).map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    }

    async function loadAssetsForClient(clientId, selectedAssetId = null) {
        if (!clientId) {
            selAsset.innerHTML = '<option value="">-- 거래처를 먼저 선택하세요 --</option>';
            return;
        }
        
        const { data } = await supabase
            .from('assets')
            .select('id, serial_number, products(model_name)')
            .eq('client_id', clientId);

        if (!data || data.length === 0) {
            selAsset.innerHTML = '<option value="">등록된 기기가 없습니다.</option>';
        } else {
            selAsset.innerHTML = data.map(a => `<option value="${a.id}">[${a.products?.model_name}] ${a.serial_number}</option>`).join('');
            if (selectedAssetId) selAsset.value = selectedAssetId;
        }
    }

    selClient.addEventListener('change', () => {
        loadAssetsForClient(selClient.value);
    });

    // --- 저장 (등록/수정) 로직 ---
    btnSave.addEventListener('click', async () => {
        if (!selClient.value || !selAsset.value) return alert('거래처와 기기 선택은 필수입니다.');
        if (!inpDate.value) return alert('접수일자는 필수입니다.');

        // 체크박스 값 수집
        const getCheckedValues = (name) => {
            const checked = document.querySelectorAll(`input[name="${name}"]:checked`);
            return Array.from(checked).map(c => c.value);
        };
        const tonerVals = getCheckedValues('deli-toner');
        const drumVals = getCheckedValues('deli-drum');

        let deliveryStr = '';
        if (tonerVals.length > 0) deliveryStr += `토너(${tonerVals.join(',')}) `;
        if (drumVals.length > 0) deliveryStr += `드럼(${drumVals.join(',')})`;
        
        const payload = {
            visit_date: inpDate.value,
            client_id: selClient.value,
            asset_id: selAsset.value,
            visit_detail: inpVisit.value,
            delivery_detail: deliveryStr.trim(),
            spare_parts: inpSpare.value,
            note: inpNote.value
        };

        let result;
        if (editingLogId) {
            result = await supabase.from('service_logs').update(payload).eq('id', editingLogId);
        } else {
            result = await supabase.from('service_logs').insert(payload);
        }

        if (result.error) alert('실패: ' + result.error.message);
        else {
            alert(editingLogId ? '✅ 수정되었습니다.' : '✅ 등록되었습니다.');
            closeModal(); // 저장 후 닫기
            loadServiceLogs(); 
        }
    });

    function resetForm() {
        editingLogId = null;
        inpDate.value = new Date().toISOString().split('T')[0];
        selClient.value = '';
        selAsset.innerHTML = '<option value="">-- 거래처를 먼저 선택하세요 --</option>';
        inpVisit.value = ''; 
        inpSpare.value = ''; 
        inpNote.value = '';
        
        // 체크박스 초기화
        document.querySelectorAll('input[type="checkbox"]').forEach(c => c.checked = false);
    }

    // --- 리스트 로드 및 렌더링 ---
    async function loadServiceLogs() {
        const { data, error } = await supabase
            .from('service_logs')
            .select(`*, clients(name), assets(id, serial_number, products(model_name))`)
            .order('created_at', { ascending: false });

        if (error) return console.error(error);
        renderGroupedLogs(data);
    }

    function renderGroupedLogs(logs) {
        if (!logs || logs.length === 0) {
            ul.innerHTML = '<li style="padding:40px; text-align:center; color:#999;">등록된 접수 내역이 없습니다.</li>';
            return;
        }

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

            const rowsHtml = group.logs.map(log => `
                <tr>
                    <td style="width:12%; font-weight:bold;">${log.visit_date}</td>
                    <td style="width:18%;">${log.assets?.products?.model_name || '-'}</td>
                    <td style="width:20%; color:#333;">${log.visit_detail || '-'}</td>
                    <td style="width:15%; color:#555;">${log.delivery_detail || '-'}</td>
                    <td style="width:10%; color:#007bff;">${log.spare_parts || '-'}</td>
                    <td style="width:10%; color:#888;">${log.note || ''}</td>
                    <td style="width:15%; text-align:center;">
                        <button class="btn-edit" 
                            data-id="${log.id}" 
                            data-date="${log.visit_date}"
                            data-client="${log.client_id}"
                            data-asset="${log.asset_id}"
                            data-visit="${log.visit_detail || ''}"
                            data-deli="${log.delivery_detail || ''}"
                            data-spare="${log.spare_parts || ''}"
                            data-note="${log.note || ''}"
                            style="border:1px solid #d1d5db; background:white; padding:4px 8px; border-radius:4px; cursor:pointer;"
                        >수정</button>
                        <button class="btn-del" data-id="${log.id}"
                            style="border:1px solid #fee2e2; background:white; color:red; padding:4px 8px; border-radius:4px; cursor:pointer;"
                        >삭제</button>
                    </td>
                </tr>
            `).join('');

            return `
            <li>
                <div class="group-header" style="cursor:pointer; display:flex; justify-content:space-between; padding:15px; background:#f8f9fa; border-bottom:1px solid #eee;">
                    <div style="flex:2;"><strong>${group.name}</strong> <span class="badge blue" style="margin-left:5px;">${logCount}건</span></div>
                    <div style="flex:1; color:#666;">최근: ${latestDate}</div>
                    <div style="width:30px; text-align:center;"><i class='bx bx-chevron-down'></i></div>
                </div>
                <div class="group-body" style="display:none; padding:15px;">
                    <table class="inner-table" style="width:100%; border-collapse:collapse; font-size:0.9rem;">
                        <thead>
                            <tr style="background:#f1f5f9;">
                                <th style="padding:10px;">방문일자</th><th>모델명</th><th>방문/점검 내용</th><th>배송 내용</th><th>여유분</th><th>비고</th><th>관리</th>
                            </tr>
                        </thead>
                        <tbody>${rowsHtml}</tbody>
                    </table>
                </div>
            </li>`;
        }).join('');
    }

    // --- 이벤트 위임 (펼치기, 수정, 삭제) ---
    ul.addEventListener('click', async (e) => {
        // (1) 펼치기/접기
        const header = e.target.closest('.group-header');
        if (header) {
            const body = header.nextElementSibling;
            // jQuery 없이 토글 구현
            if(body.style.display === 'none') {
                body.style.display = 'block';
                header.querySelector('i').style.transform = 'rotate(180deg)';
            } else {
                body.style.display = 'none';
                header.querySelector('i').style.transform = 'rotate(0deg)';
            }
        }

        // (2) 삭제 버튼
        const btnDel = e.target.closest('.btn-del');
        if (btnDel) {
            if (confirm('정말 삭제하시겠습니까?')) {
                await supabase.from('service_logs').delete().eq('id', btnDel.dataset.id);
                loadServiceLogs();
            }
        }

        // (3) 수정 버튼
        const btnEdit = e.target.closest('.btn-edit');
        if (btnEdit) {
            const d = btnEdit.dataset;
            editingLogId = d.id;
            
            // 폼 채우기
            inpDate.value = d.date;
            selClient.value = d.client;
            inpVisit.value = d.visit;
            inpSpare.value = d.spare;
            inpNote.value = d.note;

            // 기기 목록 로드 및 선택 대기
            await loadAssetsForClient(d.client, d.asset);

            // ★ 팝업 열기 (수정 모드)
            openModal(true);
        }
    });
}