import { supabase } from '../../common/db.js';
import { loadCSS } from '../../common/utils.js';

export { render } from './service.view.js';

export async function init() {
    loadCSS('./src/features/service/style.css');

    // DOM 요소
    const modal = document.getElementById('service-modal');
    const btnOpenModal = document.getElementById('btn-open-modal');
    const btnCloseModal = document.getElementById('btn-close-modal');
    const formTitle = document.getElementById('form-title');

    const inpDate = document.getElementById('input-date');
    const selClient = document.getElementById('select-client');
    const selAsset = document.getElementById('select-asset');
    const inpVisit = document.getElementById('input-visit');
    const inpSpare = document.getElementById('input-spare');
    const inpNote = document.getElementById('input-note');
    const btnSave = document.getElementById('btn-save-log');
    const ul = document.getElementById('service-list-ul');

    // 소모품 다중 선택 관련 DOM
    const selServiceConsumable = document.getElementById('service-consumable-select');
    const inpServiceConsumableQty = document.getElementById('service-consumable-qty');
    const btnAddConsumable = document.getElementById('btn-add-consumable');
    const listContainer = document.getElementById('added-consumables-list');

    // 상태 변수
    let editingLogId = null; 
    let currentConsumablesList = []; 

    // 초기 실행
    resetForm();
    loadClients();
    loadServiceLogs();
    loadConsumableList();

    // --- 모달 제어 ---
    function openModal(isEdit) {
        if(!modal) return;
        modal.style.display = 'flex';
        loadConsumableList(); 

        if (isEdit) {
            formTitle.innerHTML = "<i class='bx bx-edit'></i> A/S 접수 수정";
            btnSave.textContent = "수정 완료";
        } else {
            formTitle.innerHTML = "<i class='bx bx-plus-circle'></i> 신규 A/S 접수";
            btnSave.textContent = "등록하기";
            resetForm(); 
        }
    }

    function closeModal() {
        if(!modal) return;
        modal.style.display = 'none';
        resetForm();
    }

    if(btnOpenModal) btnOpenModal.addEventListener('click', () => openModal(false));
    if(btnCloseModal) btnCloseModal.addEventListener('click', closeModal);


    // --- 데이터 로드 ---
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

    async function loadConsumableList() {
        if (!selServiceConsumable) return;
        const { data } = await supabase.from('consumables').select('name, target_model, category, code').order('name');

        if (data) {
            const uniqueItems = [];
            const map = new Map();
            data.forEach(item => {
                const key = `${item.target_model}-${item.name}`;
                if(!map.has(key)){
                    map.set(key, true);
                    uniqueItems.push(item);
                }
            });

            selServiceConsumable.innerHTML = '<option value="">소모품 선택...</option>' + 
                uniqueItems.map(item => `
                    <option value="${item.name}" 
                            data-model="${item.target_model || '공용'}"
                            data-category="${item.category}"
                            data-code="${item.code || ''}">
                        [${item.target_model || '공용'}] ${item.name}
                    </option>
                `).join('');
        }
    }

    selClient.addEventListener('change', () => loadAssetsForClient(selClient.value));

    // --- ★ 소모품 장바구니 로직 ---
    // 1. 추가 버튼 클릭
    btnAddConsumable.addEventListener('click', () => {
        const name = selServiceConsumable.value;
        if (!name) return alert('소모품을 선택해주세요.');
        
        const qty = parseInt(inpServiceConsumableQty.value);
        
        // ★ 수정됨: 0만 아니면 됨 (음수 허용 -> 회수)
        if (qty === 0 || isNaN(qty)) return alert('수량은 0이 될 수 없습니다.');

        const option = selServiceConsumable.options[selServiceConsumable.selectedIndex];
        
        const existing = currentConsumablesList.find(item => item.name === name && item.target_model === option.dataset.model);
        if (existing) {
            existing.qty += qty; 
        } else {
            currentConsumablesList.push({
                name: name,
                category: option.dataset.category,
                code: option.dataset.code,
                target_model: option.dataset.model,
                qty: qty
            });
        }
        
        renderConsumableList();
        selServiceConsumable.value = "";
        inpServiceConsumableQty.value = "1";
    });

    // 2. 목록 그리기
    function renderConsumableList() {
        if (currentConsumablesList.length === 0) {
            listContainer.innerHTML = '<div style="color:#999; font-size:0.9rem; text-align:center;">사용된 소모품이 없습니다.</div>';
            return;
        }

        listContainer.innerHTML = currentConsumablesList.map((item, index) => {
            // ★ 시각적 표현: 음수면 '회수', 양수면 '사용'
            const isReturn = item.qty < 0;
            const typeText = isReturn ? "(회수)" : "";
            const qtyStyle = isReturn ? "color:blue;" : "color:#007bff;";

            return `
            <div style="display:flex; justify-content:space-between; align-items:center; background:#f1f3f5; padding:8px 10px; border-radius:4px; font-size:0.9rem;">
                <div>
                    <span style="font-weight:bold; color:#333;">${item.name}</span>
                    <span style="font-size:0.8em; color:#666;">(${item.target_model})</span>
                    <span style="margin-left:5px; font-weight:bold; ${qtyStyle}">${item.qty}개 ${typeText}</span>
                </div>
                <button type="button" class="btn-remove-item" data-index="${index}" style="border:none; background:none; color:red; cursor:pointer; font-size:1.1rem;">&times;</button>
            </div>
            `;
        }).join('');

        document.querySelectorAll('.btn-remove-item').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = parseInt(e.target.dataset.index);
                currentConsumablesList.splice(idx, 1);
                renderConsumableList();
            });
        });
    }

    // --- 저장 (등록/수정) 로직 ---
    btnSave.addEventListener('click', async () => {
        if (!selClient.value || !selAsset.value) return alert('거래처와 기기 선택은 필수입니다.');
        if (!inpDate.value) return alert('접수일자는 필수입니다.');

        const clientName = selClient.options[selClient.selectedIndex].text;

        // 보여주기용 문자열 생성
        const deliveryStr = currentConsumablesList.map(item => {
            if(item.qty < 0) return `${item.name}(회수 ${Math.abs(item.qty)})`;
            return `${item.name}(${item.qty})`;
        }).join(', ');

        const payload = {
            visit_date: inpDate.value,
            client_id: selClient.value,
            asset_id: selAsset.value,
            visit_detail: inpVisit.value,
            delivery_detail: deliveryStr,
            consumable_data: currentConsumablesList, 
            spare_parts: inpSpare.value,
            note: inpNote.value
        };

        try {
            if (editingLogId) {
                // [수정 모드]
                // 1. 기존 기록 반환 (Return old)
                const { data: oldLog } = await supabase.from('service_logs').select('consumable_data').eq('id', editingLogId).single();
                const oldItems = oldLog?.consumable_data || [];
                await handleInventoryUpdate(oldItems, clientName, 'return'); // 기존 내역을 뒤집어서 반영

                // 2. 로그 업데이트
                const { error } = await supabase.from('service_logs').update(payload).eq('id', editingLogId);
                if (error) throw error;

                // 3. 새 목록 차감 (Deduct new)
                await handleInventoryUpdate(currentConsumablesList, clientName, 'deduct'); 

                alert('✅ 수정되었습니다.');

            } else {
                // [신규 모드]
                const { error } = await supabase.from('service_logs').insert(payload);
                if (error) throw error;

                await handleInventoryUpdate(currentConsumablesList, clientName, 'deduct');

                alert('✅ 등록되었습니다.');
            }

            closeModal();
            loadServiceLogs();

        } catch (err) {
            console.error(err);
            alert('저장 실패: ' + err.message);
        }
    });

    // ★ 재고 반영 함수 (핵심 수정됨)
    // mode: 'deduct' (신규/수정 시 적용), 'return' (수정 전 기존 내역 취소 시)
    async function handleInventoryUpdate(items, clientName, mode) {
        if (!items || items.length === 0) return;

        const updates = items.map(item => {
            // mode가 deduct(차감모드)일 때:
            //   - 양수 입력(1) -> 사용이므로 재고 감소(-1)
            //   - 음수 입력(-1) -> 회수이므로 재고 증가(+1)
            //   => 즉, quantity에 -1을 곱해서 저장하면 됨.
            
            // mode가 return(반환모드)일 때:
            //   - 기존에 사용(1)했던 것 -> 다시 창고로(+1)
            //   - 기존에 회수(-1)했던 것 -> 다시 나감(-1)
            //   => 즉, quantity 그대로 저장하면 됨. (이미 위에서 뒤집혔던걸 다시 뒤집거나 원복)
            
            let finalQty;
            let locationStr;

            if (mode === 'deduct') {
                finalQty = item.qty * -1; // DB에는 반대로 저장 (사용=마이너스, 회수=플러스)
                
                if (item.qty > 0) locationStr = `${clientName} 사용`;
                else locationStr = `${clientName} 회수`;
                
            } else { // mode === 'return' (되돌리기)
                finalQty = item.qty; // 원래 수량 부호 그대로 더하면 복구됨 (예: 사용했던 -1을 +1해야 하는데, item.qty는 1이니까... 아 잠깐)
                
                // 로직 정정:
                // item.qty는 사용자가 입력했던 원본 값 (예: 1개 사용, -1개 회수)
                // deduct 할 때는:  1 -> -1 (DB저장),  -1 -> +1 (DB저장)
                // return 할 때는:  1 -> +1 (DB저장),  -1 -> -1 (DB저장)
                
                // 그러므로 return 모드에서는 item.qty 그대로 더하면 됩니다. (이전 deduct 로직의 반대)
                
                if (item.qty > 0) locationStr = `수정 반환 (${clientName})`;
                else locationStr = `수정 회수 취소 (${clientName})`;
            }

            return {
                category: item.category,
                name: item.name,
                code: item.code,
                target_model: item.target_model,
                quantity: finalQty, 
                location: locationStr
            };
        });

        // Supabase에 일괄 Insert
        const { error } = await supabase.from('consumables').insert(updates);
        if (error) console.error("재고 반영 중 오류:", error);
    }

    function resetForm() {
        editingLogId = null;
        inpDate.value = new Date().toISOString().split('T')[0];
        selClient.value = '';
        selAsset.innerHTML = '<option value="">-- 거래처를 먼저 선택하세요 --</option>';
        inpVisit.value = ''; 
        inpSpare.value = ''; 
        inpNote.value = '';
        
        selServiceConsumable.value = "";
        inpServiceConsumableQty.value = "1";
        currentConsumablesList = [];
        renderConsumableList();
    }

    // --- 리스트 로드 ---
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

    // --- 이벤트 위임 ---
    ul.addEventListener('click', async (e) => {
        const header = e.target.closest('.group-header');
        if (header) {
            const body = header.nextElementSibling;
            const icon = header.querySelector('i');
            if(body.style.display === 'none') {
                body.style.display = 'block';
                icon.style.transform = 'rotate(180deg)';
            } else {
                body.style.display = 'none';
                icon.style.transform = 'rotate(0deg)';
            }
        }

        const btnDel = e.target.closest('.btn-del');
        if (btnDel) {
            if (confirm('정말 삭제하시겠습니까? (연동된 소모품 재고는 복구되지 않습니다)')) {
                await supabase.from('service_logs').delete().eq('id', btnDel.dataset.id);
                loadServiceLogs();
            }
        }

        const btnEdit = e.target.closest('.btn-edit');
        if (btnEdit) {
            const d = btnEdit.dataset;
            editingLogId = d.id;
            
            inpDate.value = d.date;
            selClient.value = d.client;
            inpVisit.value = d.visit;
            inpSpare.value = d.spare;
            inpNote.value = d.note;

            await loadAssetsForClient(d.client, d.asset);

            const { data: logData } = await supabase.from('service_logs').select('consumable_data').eq('id', editingLogId).single();
            currentConsumablesList = logData?.consumable_data || [];
            renderConsumableList();

            openModal(true);
        }
    });
}