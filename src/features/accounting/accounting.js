import { supabase } from '../../common/db.js';
export { render } from './accounting.view.js';

// 전역 변수
let registerAssets = []; // 데이터 저장소
let historyData = [];    

export async function init() {
    // --- 탭 전환 로직 ---
    const tabBtns = document.querySelectorAll('.tab-btn');
    const panels = {
        'panel-register': document.getElementById('panel-register'),
        'panel-history': document.getElementById('panel-history')
    };

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            Object.values(panels).forEach(p => p.classList.add('hidden'));
            const target = btn.dataset.target;
            if(panels[target]) panels[target].classList.remove('hidden');
            
            if (target === 'panel-history' && historyData.length === 0) loadHistory();
        });
    });

    // =========================================================
    //  TAB 1. 검침 입력 및 요금 확인
    // =========================================================
    const inpRegDate = document.getElementById('inp-reg-date');
    const selBillDay = document.getElementById('sel-bill-day');
    const inpSearchReg = document.getElementById('inp-search-register');
    const btnLoadAssets = document.getElementById('btn-load-assets');
    const regTbody = document.getElementById('register-tbody');

    // 초기값: 오늘 날짜의 '년-월'
    inpRegDate.value = new Date().toISOString().slice(0, 7);

    btnLoadAssets.addEventListener('click', loadRegisterData);
    selBillDay.addEventListener('change', renderRegisterTable);
    inpSearchReg.addEventListener('keyup', renderRegisterTable);

    // 초기 로딩
    loadRegisterData();

    async function loadRegisterData() {
        regTbody.innerHTML = '<tr><td colspan="12" style="text-align:center; padding:30px;">데이터 로딩 및 계산 중...</td></tr>';

        const currentMonthVal = inpRegDate.value; 
        if (!currentMonthVal) return;
        const targetDate = currentMonthVal + '-01'; // 조회 기준일

        try {
            // 1. 기기 + 계약 정보 조회
            const { data: assets, error } = await supabase
                .from('assets')
                .select(`
                    id, serial_number, billing_day, billing_method,
                    products (model_name),
                    clients (id, name),
                    contracts (*) 
                `)
                .not('client_id', 'is', null)
                .order('client_id');

            if (error) throw error;

            // 2. 과거 지침 조회 (전월/전전월 계산용)
            const { data: pastReadings } = await supabase
                .from('meter_readings')
                .select('*')
                .lt('reading_date', targetDate)
                .order('reading_date', { ascending: false });

            // 3. 당월 이미 저장된 지침 조회
            const nextMonth = new Date(currentMonthVal);
            nextMonth.setMonth(nextMonth.getMonth() + 1);
            const nextMonthStr = nextMonth.toISOString().slice(0, 7) + '-01';

            const { data: currentReadings } = await supabase
                .from('meter_readings')
                .select('*')
                .gte('reading_date', targetDate)
                .lt('reading_date', nextMonthStr);

            // 4. 데이터 병합 및 계산
            registerAssets = assets.map(asset => {
                const contract = asset.contracts?.[0] || null;

                // 과거 기록 필터링
                const assetPast = pastReadings?.filter(r => r.asset_id === asset.id) || [];
                const prevReading = assetPast[0] || { reading_bw:0, reading_col:0, reading_col_a3:0 };     // 전월
                const prevPrevReading = assetPast[1] || { reading_bw:0, reading_col:0, reading_col_a3:0 }; // 전전월
                
                // 전월 확정 요금 계산
                const prevFee = calculateFee(contract, prevReading, prevPrevReading);

                // 당월 저장된 값 확인
                const savedCurrent = currentReadings?.find(r => r.asset_id === asset.id) || {};
                
                return {
                    ...asset,
                    contract,
                    prev_reading: prevReading,
                    prev_fee: prevFee,
                    curr_input: {
                        bw: savedCurrent.reading_bw || 0, 
                        col: savedCurrent.reading_col || 0,
                        a3: savedCurrent.reading_col_a3 || 0,
                        is_saved: !!savedCurrent.id 
                    }
                };
            });

            renderRegisterTable();

        } catch (err) {
            console.error(err);
            alert('데이터 로딩 실패: ' + err.message);
        }
    }

    // ★ 요금 계산기 (계약 없어도 사용량은 반환)
    function calculateFee(contract, endReading, startReading) {
        // 사용량 계산 (음수 방지)
        const uBw = Math.max(0, (endReading.reading_bw || 0) - (startReading.reading_bw || 0));
        const uCol = Math.max(0, (endReading.reading_col || 0) - (startReading.reading_col || 0));
        const uA3 = Math.max(0, (endReading.reading_col_a3 || 0) - (startReading.reading_col_a3 || 0));

        // 계약 정보 없으면 사용량만 리턴
        if (!contract) {
            return { usage_bw: uBw, usage_col: uCol, usage_a3: uA3, bw_amt: 0, col_amt: 0, a3_amt: 0, total: 0 };
        }

        // 금액 계산
        let costBw = 0, costCol = 0, costA3 = 0;
        
        if (uBw > contract.base_bw) costBw = (uBw - contract.base_bw) * contract.rate_bw;
        if (uCol > contract.base_color) costCol = (uCol - contract.base_color) * contract.rate_color_a4;
        costA3 = uA3 * (contract.rate_color_a3 || 0);

        return {
            usage_bw: uBw, usage_col: uCol, usage_a3: uA3,
            bw_amt: costBw, col_amt: costCol, a3_amt: costA3,
            total: contract.monthly_fee + costBw + costCol + costA3
        };
    }

    function renderRegisterTable() {
        const filterDay = selBillDay.value;
        const keyword = inpSearchReg.value.toLowerCase().trim();

        const filtered = registerAssets.filter(item => {
            const cName = (item.clients?.name || '').toLowerCase();
            const bDay = String(item.billing_day || '');
            
            const matchKey = cName.includes(keyword);
            let matchDay = true;
            if (filterDay) {
                if(filterDay === '말일') matchDay = bDay.includes('말') || bDay.includes('30') || bDay.includes('31');
                else matchDay = bDay.includes(filterDay);
            }
            return matchKey && matchDay;
        });

        regTbody.innerHTML = '';
        if (filtered.length === 0) {
            regTbody.innerHTML = '<tr><td colspan="12" style="text-align:center; padding:30px; color:#999;">조건에 맞는 기기가 없습니다.</td></tr>';
            return;
        }

        const fmt = n => n ? n.toLocaleString() : '0';

        filtered.forEach(asset => {
            const con = asset.contract;
            const prev = asset.prev_fee;
            
            // 저장 버튼 상태 (계약 없으면 비활성화)
            const isNoContract = !con;
            const btnState = isNoContract ? 'disabled style="background:#ccc; cursor:not-allowed;"' : '';
            const btnText = isNoContract ? '계약필요' : (asset.curr_input.is_saved ? '수정' : '저장');
            const contractWarning = isNoContract ? '<br><span style="color:red; font-size:0.7rem;">⚠️ 계약정보 없음 (청구불가)</span>' : '';

            // ID 생성
            const idBw = `curr-bw-${asset.id}`;
            const idCol = `curr-col-${asset.id}`;
            const idA3 = `curr-a3-${asset.id}`;

            // 행 생성
            const trBw = document.createElement('tr');
            const trCol = document.createElement('tr');
            const trA3 = document.createElement('tr');

            const cellInfo = `padding:10px; vertical-align:middle; border-right:1px solid #eee;`;
            const cellPrev = `background-color:#f8f9fa; color:#666; text-align:right; border-right:1px solid #eee;`;
            const cellCurr = `background-color:#f0f7ff; text-align:right; border-right:1px solid #e1f5fe;`;

            // 1행: 흑백
            trBw.innerHTML = `
                <td rowspan="3" style="${cellInfo} font-weight:bold; color:#333;">
                    ${asset.clients?.name} <span style="font-size:0.8rem; color:#2563eb;">(${asset.billing_day || '-'})</span><br>
                    <span style="font-weight:normal; font-size:0.85rem; color:#666;">${asset.products?.model_name} (${asset.serial_number})</span>
                    ${contractWarning}
                </td>
                <td style="text-align:center;"><span class="badge" style="background:#eee; color:#333; font-size:0.8rem;">흑백</span></td>
                
                <td style="${cellPrev}">${fmt(asset.prev_reading.reading_bw)}</td>
                <td style="${cellPrev}">${fmt(prev.usage_bw)}</td>
                <td style="${cellPrev}">${fmt(prev.bw_amt)}</td>
                <td rowspan="3" style="${cellPrev} font-weight:bold; color:#333; border-left:1px solid #ddd;">${fmt(prev.total)}</td>

                <td style="${cellCurr} border-left:2px solid #2563eb;">${fmt(asset.prev_reading.reading_bw)}</td>
                <td style="${cellCurr} padding:5px;">
                    <input type="number" id="${idBw}" class="inp-reading" value="${asset.curr_input.bw || ''}" placeholder="0">
                </td>
                <td style="${cellCurr}" id="usage-bw-${asset.id}">0</td>
                <td style="${cellCurr}" id="cost-bw-${asset.id}">0</td>
                <td rowspan="3" style="${cellCurr} font-weight:bold; color:#0056b3; font-size:1.1em;" id="total-curr-${asset.id}">0</td>

                <td rowspan="3" style="text-align:center; border-left:1px solid #ddd;">
                    <button class="btn-primary btn-reg-save" data-id="${asset.id}" ${btnState} style="padding:8px 12px; font-size:0.85rem;">${btnText}</button>
                </td>
            `;

            // 2행: 컬러
            trCol.innerHTML = `
                <td style="text-align:center;"><span class="badge" style="background:#fff7ed; color:#c2410c; font-size:0.8rem;">컬러</span></td>
                <td style="${cellPrev}">${fmt(asset.prev_reading.reading_col)}</td>
                <td style="${cellPrev}">${fmt(prev.usage_col)}</td>
                <td style="${cellPrev}">${fmt(prev.col_amt)}</td>
                <td style="${cellCurr} border-left:2px solid #2563eb;">${fmt(asset.prev_reading.reading_col)}</td>
                <td style="${cellCurr} padding:5px;">
                    <input type="number" id="${idCol}" class="inp-reading" value="${asset.curr_input.col || ''}" placeholder="0">
                </td>
                <td style="${cellCurr}" id="usage-col-${asset.id}">0</td>
                <td style="${cellCurr}" id="cost-col-${asset.id}">0</td>
            `;

            // 3행: A3
            trA3.style.borderBottom = "2px solid #ccc";
            trA3.innerHTML = `
                <td style="text-align:center;"><span class="badge" style="background:#fefce8; color:#a16207; font-size:0.8rem;">A3</span></td>
                <td style="${cellPrev}">${fmt(asset.prev_reading.reading_col_a3)}</td>
                <td style="${cellPrev}">${fmt(prev.usage_a3)}</td>
                <td style="${cellPrev}">${fmt(prev.a3_amt)}</td>
                <td style="${cellCurr} border-left:2px solid #2563eb;">${fmt(asset.prev_reading.reading_col_a3)}</td>
                <td style="${cellCurr} padding:5px;">
                    <input type="number" id="${idA3}" class="inp-reading" value="${asset.curr_input.a3 || ''}" placeholder="0">
                </td>
                <td style="${cellCurr}" id="usage-a3-${asset.id}">0</td>
                <td style="${cellCurr}" id="cost-a3-${asset.id}">0</td>
            `;

            regTbody.appendChild(trBw);
            regTbody.appendChild(trCol);
            regTbody.appendChild(trA3);

            // 초기 계산 실행 (저장값 반영)
            updateCurrentCalc(asset);
        });

        // 이벤트 리스너 바인딩 (입력 및 저장)
        filtered.forEach(asset => {
            const inputs = [
                document.getElementById(`curr-bw-${asset.id}`),
                document.getElementById(`curr-col-${asset.id}`),
                document.getElementById(`curr-a3-${asset.id}`)
            ];
            
            inputs.forEach(inp => {
                if(inp) inp.addEventListener('input', () => updateCurrentCalc(asset));
            });
        });

        document.querySelectorAll('.btn-reg-save').forEach(btn => {
            if(!btn.disabled) btn.addEventListener('click', handleSave);
        });
    }

    // ★ 실시간 계산 함수 (화면 업데이트)
    function updateCurrentCalc(asset) {
        const bwInp = document.getElementById(`curr-bw-${asset.id}`);
        const colInp = document.getElementById(`curr-col-${asset.id}`);
        const a3Inp = document.getElementById(`curr-a3-${asset.id}`);

        if(!bwInp) return;

        const endReading = {
            reading_bw: parseInt(bwInp.value) || 0,
            reading_col: parseInt(colInp.value) || 0,
            reading_col_a3: parseInt(a3Inp.value) || 0
        };

        const startReading = asset.prev_reading;
        const result = calculateFee(asset.contract, endReading, startReading);
        const fmt = n => n.toLocaleString();

        // DOM 업데이트
        document.getElementById(`usage-bw-${asset.id}`).innerText = fmt(result.usage_bw);
        document.getElementById(`cost-bw-${asset.id}`).innerText = fmt(result.bw_amt);
        
        document.getElementById(`usage-col-${asset.id}`).innerText = fmt(result.usage_col);
        document.getElementById(`cost-col-${asset.id}`).innerText = fmt(result.col_amt);
        
        document.getElementById(`usage-a3-${asset.id}`).innerText = fmt(result.usage_a3);
        document.getElementById(`cost-a3-${asset.id}`).innerText = fmt(result.a3_amt);

        document.getElementById(`total-curr-${asset.id}`).innerText = fmt(result.total);
    }

    // 저장 핸들러
    async function handleSave(e) {
        const btn = e.target;
        const assetId = btn.dataset.id;
        const monthVal = inpRegDate.value;
        if(!monthVal) return alert('검침월이 선택되지 않았습니다.');
        
        const bw = document.getElementById(`curr-bw-${assetId}`).value;
        const col = document.getElementById(`curr-col-${assetId}`).value;
        const a3 = document.getElementById(`curr-a3-${assetId}`).value;

        const payload = {
            asset_id: assetId,
            reading_date: monthVal + '-01',
            reading_bw: parseInt(bw) || 0,
            reading_col: parseInt(col) || 0,
            reading_col_a3: parseInt(a3) || 0
        };

        const originalText = btn.innerText;
        btn.innerText = '...';

        const { error } = await supabase
            .from('meter_readings')
            .upsert(payload, { onConflict: 'asset_id, reading_date' });

        if(error) {
            alert('저장 실패: ' + error.message);
            btn.innerText = originalText;
        } else {
            // 데이터 상태 업데이트 (저장됨)
            const asset = registerAssets.find(a => a.id == assetId);
            if(asset) {
                asset.curr_input = { bw: payload.reading_bw, col: payload.reading_col, a3: payload.reading_col_a3, is_saved: true };
            }
            btn.innerText = '완료';
            setTimeout(() => btn.innerText = '수정', 1000);
            
            historyData = []; // 이력 탭 갱신 유도
        }
    }

    // =========================================================
    //  TAB 2. 검침 이력 (기존 로직 유지)
    // =========================================================
    const inpHistDate = document.getElementById('inp-history-month'); 
    const btnSearchHist = document.getElementById('btn-search-history');
    const inpSearchHist = document.getElementById('inp-search-history');
    const histTbody = document.getElementById('history-tbody');
    
    const editModal = document.getElementById('edit-modal');
    const btnEditSave = document.getElementById('btn-edit-save');
    const btnEditCancel = document.getElementById('btn-edit-cancel');

    inpHistDate.value = new Date().toISOString().slice(0, 10);

    btnSearchHist.addEventListener('click', loadHistory);
    inpSearchHist.addEventListener('keyup', renderHistoryTable);

    async function loadHistory() {
        const dateVal = inpHistDate.value;
        histTbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:20px;">이력 조회 중...</td></tr>';

        try {
            const { data, error } = await supabase
                .from('meter_readings')
                .select(`id, reading_date, reading_bw, reading_col, reading_col_a3, assets ( serial_number, products (model_name), clients (name) )`)
                .eq('reading_date', dateVal) 
                .order('reading_date', { ascending: false });

            if (error) throw error;
            historyData = data || [];
            renderHistoryTable();
        } catch (err) {
            alert('이력 조회 실패');
        }
    }

    function renderHistoryTable() {
        const keyword = inpSearchHist.value.toLowerCase().trim();
        const filtered = historyData.filter(item => {
            const cName = (item.assets?.clients?.name || '').toLowerCase();
            const model = (item.assets?.products?.model_name || '').toLowerCase();
            return cName.includes(keyword) || model.includes(keyword);
        });

        histTbody.innerHTML = '';
        if (filtered.length === 0) {
            histTbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:20px;">검색 결과가 없습니다.</td></tr>';
            return;
        }

        filtered.forEach(row => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="text-align:center;">${row.reading_date}</td>
                <td>${row.assets?.clients?.name || '-'}</td>
                <td><strong>${row.assets?.products?.model_name || '-'}</strong><br><span style="font-size:0.8rem; color:#888;">${row.assets?.serial_number}</span></td>
                <td style="text-align:right;">${row.reading_bw.toLocaleString()}</td>
                <td style="text-align:right;">${row.reading_col.toLocaleString()}</td>
                <td style="text-align:right;">${row.reading_col_a3.toLocaleString()}</td>
                <td style="text-align:center;">
                    <button class="btn-secondary btn-hist-edit" data-id="${row.id}" style="padding:4px 8px; margin-right:5px;">수정</button>
                    <button class="btn-secondary btn-hist-del" data-id="${row.id}" style="padding:4px 8px; color:red; border-color:#fee2e2;">삭제</button>
                </td>
            `;
            histTbody.appendChild(tr);
        });

        document.querySelectorAll('.btn-hist-edit').forEach(btn => {
            btn.addEventListener('click', (e) => openEditModal(historyData.find(d => d.id == e.target.dataset.id)));
        });

        document.querySelectorAll('.btn-hist-del').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                if(confirm('정말 삭제하시겠습니까?')) {
                    await supabase.from('meter_readings').delete().eq('id', e.target.dataset.id);
                    loadHistory();
                }
            });
        });
    }

    function openEditModal(item) {
        if(!item) return;
        document.getElementById('hdn-edit-id').value = item.id;
        document.getElementById('inp-edit-date').value = item.reading_date.slice(0, 7);
        document.getElementById('inp-edit-bw').value = item.reading_bw;
        document.getElementById('inp-edit-col').value = item.reading_col;
        document.getElementById('inp-edit-a3').value = item.reading_col_a3;
        editModal.style.display = 'flex';
    }

    btnEditCancel.addEventListener('click', () => editModal.style.display = 'none');
    
    btnEditSave.addEventListener('click', async () => {
        const id = document.getElementById('hdn-edit-id').value;
        const bw = document.getElementById('inp-edit-bw').value;
        const col = document.getElementById('inp-edit-col').value;
        const a3 = document.getElementById('inp-edit-a3').value;

        const { error } = await supabase.from('meter_readings')
            .update({ reading_bw: parseInt(bw)||0, reading_col: parseInt(col)||0, reading_col_a3: parseInt(a3)||0 })
            .eq('id', id);

        if(error) alert('수정 실패: ' + error.message);
        else {
            alert('수정되었습니다.');
            editModal.style.display = 'none';
            loadHistory();
        }
    });
}