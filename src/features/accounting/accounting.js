import { supabase } from '../../common/db.js';
export { render } from './accounting.view.js';

// 전역 변수
let registerAssets = []; 
let historyData = [];    
let currentEditAsset = null; 
let pendingSaveData = [];

export async function init() {
    // ... (이벤트 리스너 부분은 기존과 동일 - 생략 없이 유지) ...
    // 편의를 위해 init 함수 시작 부분은 그대로 두시고, loadRegisterData 함수부터 교체하시면 됩니다.
    
    const tabBtns = document.querySelectorAll('.tab-btn');
    const panels = { 'panel-register': document.getElementById('panel-register'), 'panel-history': document.getElementById('panel-history') };

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            Object.values(panels).forEach(p => p.classList.add('hidden'));
            const target = btn.dataset.target;
            if(panels[target]) panels[target].classList.remove('hidden');
            if (target === 'panel-history' && historyData.length === 0) loadHistory();
            const bar = document.getElementById('floating-save-bar');
            if(bar) bar.style.display = (target === 'panel-register') ? 'flex' : 'none';
        });
    });

    const inpRegDate = document.getElementById('inp-reg-date');
    const selBillDay = document.getElementById('sel-bill-day');
    const inpSearchReg = document.getElementById('inp-search-register');
    const btnLoadAssets = document.getElementById('btn-load-assets');
    const regTbody = document.getElementById('register-tbody');
    const grandTotalDisplay = document.getElementById('grand-total-display');

    // 일괄 저장 요소
    const btnSaveAllPreview = document.getElementById('btn-save-all-preview');
    const saveConfirmModal = document.getElementById('save-confirm-modal');
    const confirmTbody = document.getElementById('confirm-tbody');
    const confirmTfoot = document.getElementById('confirm-tfoot');
    const confirmCount = document.getElementById('confirm-count');
    const btnConfirmCancel = document.getElementById('btn-confirm-cancel');
    const btnConfirmSave = document.getElementById('btn-confirm-save');

    // 이력 탭 요소
    const inpHistStart = document.getElementById('inp-history-start'); 
    const inpHistEnd = document.getElementById('inp-history-end');     
    const btnSearchHist = document.getElementById('btn-search-history');
    const inpSearchHist = document.getElementById('inp-search-history');
    const histTbody = document.getElementById('history-tbody');
    const editModal = document.getElementById('edit-modal');
    const btnEditSave = document.getElementById('btn-edit-save');
    const btnEditCancel = document.getElementById('btn-edit-cancel');

    inpRegDate.value = new Date().toISOString().slice(0, 7);
    const today = new Date();
    inpHistEnd.value = today.toISOString().slice(0, 10);
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    inpHistStart.value = firstDay.toISOString().slice(0, 10);

    btnLoadAssets.addEventListener('click', loadRegisterData);
    selBillDay.addEventListener('change', renderRegisterTable);
    inpSearchReg.addEventListener('keyup', renderRegisterTable);
    
    if(btnSaveAllPreview) btnSaveAllPreview.addEventListener('click', openSavePreview);
    if(btnConfirmCancel) btnConfirmCancel.addEventListener('click', () => saveConfirmModal.style.display = 'none');
    if(btnConfirmSave) btnConfirmSave.addEventListener('click', executeBatchSave);

    btnSearchHist.addEventListener('click', loadHistory);
    inpSearchHist.addEventListener('keyup', renderHistoryTable);
    btnEditCancel.addEventListener('click', () => editModal.style.display = 'none');
    btnEditSave.addEventListener('click', handleEditSave);

    document.addEventListener('change', (e) => {
        if (e.target && e.target.id === 'chk-all-rows') {
            const checkboxes = document.querySelectorAll('.chk-row');
            checkboxes.forEach(chk => chk.checked = e.target.checked);
        }
    });

    loadRegisterData();

    // ---------------------------------------------------------
    // ★ 1. [핵심 수정] 타임머신 로직: 조회 월 기준 자산 불러오기
    // ---------------------------------------------------------
    async function loadRegisterData() {
        regTbody.innerHTML = '<tr><td colspan="11" style="text-align:center; padding:30px;">데이터 로딩 및 계산 중...</td></tr>';
        if(grandTotalDisplay) grandTotalDisplay.innerText = '0';

        const currentMonthVal = inpRegDate.value; 
        if (!currentMonthVal) return;
        
        // 조회 기준 월의 시작일과 종료일 계산
        const targetDateStart = currentMonthVal + '-01'; 
        const dateObj = new Date(targetDateStart);
        const targetDateEnd = new Date(dateObj.getFullYear(), dateObj.getMonth() + 1, 0).toISOString().slice(0, 10); // 월말일
        const nextMonthStart = new Date(dateObj.getFullYear(), dateObj.getMonth() + 1, 1).toISOString().slice(0, 10);

        try {
            // [1] 자산 조회 (Time Machine Logic)
            // 조건: (생성일 <= 월말) AND (철수일 IS NULL OR 철수일 >= 월초)
            // 즉, "그 달에 하루라도 살아있었던 기계"를 모두 가져옴
            const { data: assets, error: assetError } = await supabase
                .from('assets')
                .select(`id, serial_number, billing_day, billing_method, created_at, cancel_date, last_client_name, 
                         products (model_name), clients (id, name), contracts (*)`)
                .lte('created_at', targetDateEnd + ' 23:59:59') // 그 달 이전에 만들어졌고
                .or(`cancel_date.is.null,cancel_date.gte.${targetDateStart}`); // 아직 안 죽었거나, 그 달 이후에 죽은 놈

            if(assetError) throw assetError;

            // 거래처명 정렬 (현재 주인이 없으면 last_client_name 사용)
            assets.sort((a, b) => {
                const nameA = a.clients?.name || a.last_client_name || '';
                const nameB = b.clients?.name || b.last_client_name || '';
                return nameA.localeCompare(nameB);
            });

            // [2] 전월 기록 조회 (조회월 1일 이전 중 가장 최신)
            // 주의: 과거 특정 달을 조회할 때는 '전월'의 개념이 상대적임
            const { data: pastReadings } = await supabase
                .from('meter_readings')
                .select('*')
                .lt('reading_date', targetDateStart)
                .order('reading_date', { ascending: false });

            // [3] 당월 기록 조회 (이미 저장된 값)
            const { data: currentReadings } = await supabase
                .from('meter_readings')
                .select('*')
                .gte('reading_date', targetDateStart)
                .lt('reading_date', nextMonthStart);

            registerAssets = assets.map(asset => {
                // 계약 정보 찾기 (해당 월에 유효했던 계약 찾기)
                let contractList = asset.contracts || [];
                if (!Array.isArray(contractList)) contractList = [contractList];
                contractList.sort((a, b) => new Date(b.effective_date) - new Date(a.effective_date));
                // 조회 월 이전에 시작된 가장 최신 계약
                const contract = contractList.find(c => c.effective_date <= targetDateEnd) || contractList[0];

                // [전월 지침 매핑] 해당 자산의 과거 기록 중 최신 1개
                const assetPast = pastReadings?.find(r => r.asset_id === asset.id) || null;
                const prevReading = assetPast || { reading_bw:0, reading_col:0, reading_col_a3:0, total_amount: 0 };     
                
                // [당월 지침 매핑]
                const savedCurrent = currentReadings?.find(r => r.asset_id === asset.id);
                const isReset = savedCurrent ? savedCurrent.is_reset : false;
                
                // 저장된 기본료 확인
                const savedBasicFee = savedCurrent ? savedCurrent.applied_monthly_fee : null;
                const defaultBasicFee = contract ? contract.monthly_fee : 0;
                const currentBasicFee = (savedBasicFee !== null && savedBasicFee !== undefined) ? savedBasicFee : defaultBasicFee;

                // ★ [수정] 입력창 초기값 설정 (저장된 값이 없으면 null -> 빈칸 표시)
                // 기존에는 || prevReading.bw 를 써서 자동채움 됐었음. 그걸 제거함.
                const currInput = {
                    bw: savedCurrent ? savedCurrent.reading_bw : null, 
                    col: savedCurrent ? savedCurrent.reading_col : null,
                    a3: savedCurrent ? savedCurrent.reading_col_a3 : null,
                    is_saved: !!savedCurrent,
                    is_reset: isReset,
                    basic_fee: currentBasicFee
                };

                // 계산용 임시 객체 (입력 없으면 0 처리하여 계산)
                const tempEndReading = {
                    reading_bw: currInput.bw || 0,
                    reading_col: currInput.col || 0,
                    reading_col_a3: currInput.a3 || 0
                };
                
                // 입력값이 하나라도 있을 때만 계산, 아니면 0
                const hasInput = (currInput.bw !== null);
                const calculatedFee = hasInput 
                    ? calculateFee(contract, tempEndReading, prevReading, isReset, currInput.basic_fee)
                    : { total: 0, bw_amt:0, col_amt:0, a3_amt:0, usage_bw:0, usage_col:0, usage_a3:0 };

                const finalTotal = (savedCurrent && savedCurrent.total_amount !== undefined) ? savedCurrent.total_amount : calculatedFee.total;

                return {
                    ...asset,
                    contract,
                    prev_reading: prevReading,
                    curr_total_fee: finalTotal,
                    curr_input: currInput,
                    curr_calc: calculatedFee 
                };
            });

            renderRegisterTable();

        } catch (err) { console.error(err); alert('데이터 로딩 실패: ' + err.message); }
    }

    // ---------------------------------------------------------
    // 2. [등록 탭] 요금 계산 로직
    // ---------------------------------------------------------
    function calculateFee(contract, endReading, startReading, isReset, manualBasicFee) {
        const baseStart = isReset ? { reading_bw: 0, reading_col: 0, reading_col_a3: 0 } : startReading;
        const uBw = Math.max(0, (endReading.reading_bw || 0) - (baseStart.reading_bw || 0));
        const uCol = Math.max(0, (endReading.reading_col || 0) - (baseStart.reading_col || 0));
        const uA3 = Math.max(0, (endReading.reading_col_a3 || 0) - (baseStart.reading_col_a3 || 0));

        if (!contract) return { usage_bw: uBw, usage_col: uCol, usage_a3: uA3, bw_amt: 0, col_amt: 0, a3_amt: 0, total: 0 };

        let costBw = 0, costCol = 0, costA3 = 0;
        if (uBw > contract.base_bw) costBw = (uBw - contract.base_bw) * contract.rate_bw;
        if (uCol > contract.base_color) costCol = (uCol - contract.base_color) * contract.rate_color_a4;
        costA3 = uA3 * (contract.rate_color_a3 || 0); 

        const basic = (manualBasicFee !== undefined) ? parseInt(manualBasicFee) : contract.monthly_fee;
        const total = basic + costBw + costCol + costA3;

        return { usage_bw: uBw, usage_col: uCol, usage_a3: uA3, bw_amt: costBw, col_amt: costCol, a3_amt: costA3, total: total };
    }

    // ---------------------------------------------------------
    // 3. [등록 탭] 테이블 렌더링
    // ---------------------------------------------------------
    function renderRegisterTable() {
        const filterDay = selBillDay.value;
        const keyword = inpSearchReg.value.toLowerCase().trim();

        const filtered = registerAssets.filter(item => {
            const cName = (item.clients?.name || item.last_client_name || '').toLowerCase();
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
            regTbody.innerHTML = '<tr><td colspan="11" style="text-align:center; padding:30px; color:#999;">조건에 맞는 기기가 없습니다.</td></tr>';
            return;
        }

        const fmt = n => n ? n.toLocaleString() : '0';

        filtered.forEach(asset => {
            const con = asset.contract;
            const prevReading = asset.prev_reading;
            const contractWarning = !con ? '<br><span style="color:red; font-size:0.7rem;">⚠️ 계약정보 없음</span>' : '';

            let clientDisplayName = asset.clients?.name;
            if (!clientDisplayName && asset.last_client_name) {
                clientDisplayName = `<span style="color:#666;">(전) ${asset.last_client_name}</span>`;
            } else if (!clientDisplayName) clientDisplayName = '미지정';

            // 철수 뱃지 (조회 월 기준으로 판단하지 않고, 현재 기기 상태 기준으로 표시하되 날짜도 보여줌)
            const cancelBadge = asset.cancel_date ? `<span style="color:red; font-size:0.7rem; font-weight:bold;">[철수:${asset.cancel_date}]</span>` : '';
            const isReset = asset.curr_input.is_reset;
            const resetBadge = isReset ? '<span style="color:blue; font-size:0.7rem; font-weight:bold;">[교체/신규]</span>' : '';

            // ★ 값이 없으면 빈 문자열('')로 처리하여 0이 뜨지 않게 함
            const valBw = (asset.curr_input.bw !== null) ? asset.curr_input.bw : '';
            const valCol = (asset.curr_input.col !== null) ? asset.curr_input.col : '';
            const valA3 = (asset.curr_input.a3 !== null) ? asset.curr_input.a3 : '';
            const valBasic = asset.curr_input.basic_fee;

            const calc = asset.curr_calc;
            const displayTotal = asset.curr_total_fee; 
            const prevTotalAmount = prevReading.total_amount || 0;

            const trBw = document.createElement('tr');
            const trCol = document.createElement('tr');
            const trA3 = document.createElement('tr');

            const cellInfo = `padding:6px 4px; vertical-align:middle; border-right:1px solid #eee;`;
            const cellPrev = `background-color:#f8f9fa; color:#666; text-align:right; border-right:1px solid #eee; padding:4px;`;
            const cellCurr = `background-color:#f0f7ff; text-align:right; border-right:1px solid #e1f5fe; padding:4px;`;

            trBw.innerHTML = `
                <td rowspan="3" style="text-align:center; vertical-align:middle; border-right:1px solid #eee;">
                    <input type="checkbox" class="chk-row" data-id="${asset.id}">
                </td>
                <td rowspan="3" style="${cellInfo} font-weight:bold; color:#333;">
                    ${clientDisplayName} <br>
                    <span style="font-weight:normal; font-size:0.8rem; color:#666;">
                        ${asset.products?.model_name} <br>(${asset.serial_number})
                    </span>
                    ${contractWarning}
                    <div style="margin-top:2px;">${cancelBadge} ${resetBadge}</div>
                </td>
                <td style="text-align:center;"><span class="badge" style="background:#eee; color:#333; font-size:0.8rem;">흑백</span></td>
                
                <td style="${cellPrev}">${fmt(prevReading.reading_bw)}</td> 
                <td rowspan="3" style="${cellPrev} font-weight:bold; color:#333; border-left:1px solid #ddd;">${fmt(prevTotalAmount)}</td> 

                <td style="${cellCurr} border-left:2px solid #2563eb; padding:2px;">
                    <input type="tel" pattern="[0-9]*" inputmode="numeric" id="curr-bw-${asset.id}" class="inp-reading" value="${valBw}">
                </td>
                <td style="${cellCurr}" id="usage-bw-${asset.id}">${fmt(calc.usage_bw)}</td>
                
                <td rowspan="3" style="${cellCurr} background:#e0f2fe; border-left:1px solid #bfdbfe; padding:5px;">
                    <input type="tel" pattern="[0-9]*" id="inp-basic-${asset.id}" class="inp-fee" value="${valBasic}" style="background:transparent; border:none; border-bottom:1px dashed #2563eb;">
                </td>

                <td style="${cellCurr}" id="cost-bw-${asset.id}">${fmt(calc.bw_amt)}</td>
                <td rowspan="3" style="${cellCurr} font-weight:bold; color:#0056b3; font-size:1.1em; text-align:right;" id="total-curr-${asset.id}">${fmt(displayTotal)}</td>
            `;

            trCol.innerHTML = `
                <td style="text-align:center;"><span class="badge" style="background:#fff7ed; color:#c2410c; font-size:0.8rem;">칼라A4</span></td>
                <td style="${cellPrev}">${fmt(prevReading.reading_col)}</td>
                <td style="${cellCurr} border-left:2px solid #2563eb; padding:2px;">
                    <input type="tel" pattern="[0-9]*" inputmode="numeric" id="curr-col-${asset.id}" class="inp-reading" value="${valCol}">
                </td>
                <td style="${cellCurr}" id="usage-col-${asset.id}">${fmt(calc.usage_col)}</td>
                <td style="${cellCurr}" id="cost-col-${asset.id}">${fmt(calc.col_amt)}</td>
            `;

            trA3.style.borderBottom = "2px solid #ccc";
            trA3.innerHTML = `
                <td style="text-align:center;"><span class="badge" style="background:#fefce8; color:#a16207; font-size:0.8rem;">칼라A3</span></td>
                <td style="${cellPrev}">${fmt(prevReading.reading_col_a3)}</td>
                <td style="${cellCurr} border-left:2px solid #2563eb; padding:2px;">
                    <input type="tel" pattern="[0-9]*" inputmode="numeric" id="curr-a3-${asset.id}" class="inp-reading" value="${valA3}">
                </td>
                <td style="${cellCurr}" id="usage-a3-${asset.id}">${fmt(calc.usage_a3)}</td>
                <td style="${cellCurr}" id="cost-a3-${asset.id}">${fmt(calc.a3_amt)}</td>
            `;

            regTbody.appendChild(trBw);
            regTbody.appendChild(trCol);
            regTbody.appendChild(trA3);
        });

        filtered.forEach(asset => {
            const inputs = [
                document.getElementById(`curr-bw-${asset.id}`),
                document.getElementById(`curr-col-${asset.id}`),
                document.getElementById(`curr-a3-${asset.id}`),
                document.getElementById(`inp-basic-${asset.id}`)
            ];
            inputs.forEach(inp => { if(inp) inp.addEventListener('input', () => { updateCurrentCalc(asset); updateGrandTotal(); }); });
        });
        
        updateGrandTotal(); 
    }

    function updateCurrentCalc(asset) {
        const bwInp = document.getElementById(`curr-bw-${asset.id}`);
        const colInp = document.getElementById(`curr-col-${asset.id}`);
        const a3Inp = document.getElementById(`curr-a3-${asset.id}`);
        const basicInp = document.getElementById(`inp-basic-${asset.id}`);

        if(!bwInp) return;

        const isReset = asset.curr_input.is_reset || false;
        const manualBasic = basicInp ? (parseInt(basicInp.value) || 0) : 0;

        // 값이 비어있으면 0으로 계산하되 화면에는 입력 중인 상태 유지
        const endReading = {
            reading_bw: parseInt(bwInp.value) || 0,
            reading_col: parseInt(colInp.value) || 0,
            reading_col_a3: parseInt(a3Inp.value) || 0
        };

        const result = calculateFee(asset.contract, endReading, asset.prev_reading, isReset, manualBasic);
        const fmt = n => n.toLocaleString();

        document.getElementById(`usage-bw-${asset.id}`).innerText = fmt(result.usage_bw);
        document.getElementById(`cost-bw-${asset.id}`).innerText = fmt(result.bw_amt);
        document.getElementById(`usage-col-${asset.id}`).innerText = fmt(result.usage_col);
        document.getElementById(`cost-col-${asset.id}`).innerText = fmt(result.col_amt);
        document.getElementById(`usage-a3-${asset.id}`).innerText = fmt(result.usage_a3);
        document.getElementById(`cost-a3-${asset.id}`).innerText = fmt(result.a3_amt);
        document.getElementById(`total-curr-${asset.id}`).innerText = fmt(result.total);
        
        asset.curr_total_fee = result.total;
        asset.curr_input.basic_fee = manualBasic;
        // 입력값이 빈 문자열이면 null로 저장 (나중에 DB 저장 시 체크)
        asset.curr_input.bw = bwInp.value === '' ? null : endReading.reading_bw;
        asset.curr_input.col = colInp.value === '' ? null : endReading.reading_col;
        asset.curr_input.a3 = a3Inp.value === '' ? null : endReading.reading_col_a3;
        asset.curr_calc = result; 
    }

    function updateGrandTotal() {
        if(!grandTotalDisplay) return;
        let sum = 0;
        registerAssets.forEach(asset => { sum += (asset.curr_total_fee || 0); });
        grandTotalDisplay.innerText = sum.toLocaleString();
    }

    // ---------------------------------------------------------
    // 4. 일괄 저장 & 팝업
    // ---------------------------------------------------------
    // (기존 코드 그대로 유지 - 이 부분은 잘 작동하고 있습니다)
    function openSavePreview() {
        pendingSaveData = [];
        let totalSum = 0;
        let sumTotalBw = 0, sumTotalCol = 0, sumTotalA3 = 0;

        const checkedBoxes = document.querySelectorAll('.chk-row:checked');
        if (checkedBoxes.length === 0) return alert('저장할 항목을 선택해주세요.');

        const checkedIds = Array.from(checkedBoxes).map(cb => cb.dataset.id);
        const selectedAssets = registerAssets.filter(a => checkedIds.includes(a.id.toString()));

        const groups = {};
        selectedAssets.forEach(asset => {
            const clientName = asset.clients?.name || asset.last_client_name || '미지정';
            if (!groups[clientName]) groups[clientName] = [];
            groups[clientName].push(asset);
        });

        for (const cName in groups) {
            const group = groups[cName];
            
            if (group.length > 1) {
                const allInput = group.every(a => a.curr_input.bw !== null);
                if (!allInput) { alert(`[${cName}]의 일부 기기에 지침이 입력되지 않았습니다.`); return; }

                let sumBw = 0, sumCol = 0, sumA3 = 0;
                group.forEach(a => {
                    sumBw += a.curr_calc.usage_bw;
                    sumCol += a.curr_calc.usage_col;
                    sumA3 += a.curr_calc.usage_a3;
                });

                const activeAsset = group.find(a => a.client_id !== null) || group[0];
                const activeContract = activeAsset.contract;

                let addBw=0, addCol=0, addA3=0;
                if(sumBw > activeContract.base_bw) addBw = (sumBw - activeContract.base_bw) * activeContract.rate_bw;
                if(sumCol > activeContract.base_color) addCol = (sumCol - activeContract.base_color) * activeContract.rate_color_a4;
                addA3 = sumA3 * (activeContract.rate_color_a3 || 0);
                
                const consolidatedTotal = parseInt(activeAsset.curr_input.basic_fee) + addBw + addCol + addA3;

                const msg = `[${cName}] 기기가 ${group.length}대 선택되었습니다.\n\n` +
                            `총 사용량: 흑백 ${sumBw.toLocaleString()} / 칼라 ${sumCol.toLocaleString()}\n` +
                            `통합 청구액: ${consolidatedTotal.toLocaleString()}원 (기본료+추가금)\n\n` +
                            `이 금액을 [${activeAsset.products?.model_name}]에 통합 부과하고,\n나머지 기기는 0원 처리하시겠습니까?`;

                if (confirm(msg)) {
                    group.forEach(a => {
                        let finalAmount = 0;
                        if (a.id === activeAsset.id) finalAmount = consolidatedTotal; 
                        
                        sumTotalBw += a.curr_calc.usage_bw;
                        sumTotalCol += a.curr_calc.usage_col;
                        sumTotalA3 += a.curr_calc.usage_a3;

                        pendingSaveData.push({
                            asset_id: a.id,
                            reading_date: inpRegDate.value + '-01',
                            reading_bw: a.curr_input.bw,
                            reading_col: a.curr_input.col,
                            reading_col_a3: a.curr_input.a3,
                            total_amount: finalAmount,
                            is_reset: a.curr_input.is_reset,
                            applied_monthly_fee: a.curr_input.basic_fee
                        });
                        totalSum += finalAmount;
                    });
                    continue; 
                }
            }

            group.forEach(asset => {
                if (asset.curr_input.bw !== null) {
                    const total = asset.curr_total_fee || 0;
                    totalSum += total;
                    
                    sumTotalBw += asset.curr_calc.usage_bw;
                    sumTotalCol += asset.curr_calc.usage_col;
                    sumTotalA3 += asset.curr_calc.usage_a3;

                    pendingSaveData.push({
                        asset_id: asset.id,
                        reading_date: inpRegDate.value + '-01',
                        reading_bw: asset.curr_input.bw,
                        reading_col: asset.curr_input.col,
                        reading_col_a3: asset.curr_input.a3,
                        total_amount: total,
                        is_reset: asset.curr_input.is_reset,
                        applied_monthly_fee: asset.curr_input.basic_fee
                    });
                }
            });
        }

        if (pendingSaveData.length === 0) return alert('저장할 내역이 없습니다.');

        let htmlRows = '';
        const fmt = n => n.toLocaleString();

        pendingSaveData.forEach(item => {
            const asset = registerAssets.find(a => a.id == item.asset_id);
            const cName = asset.clients?.name || asset.last_client_name || '미지정';
            const model = asset.products?.model_name || '-';
            const sn = asset.serial_number;
            const useBw = asset.curr_calc.usage_bw;
            const useCol = asset.curr_calc.usage_col;
            const useA3 = asset.curr_calc.usage_a3;

            htmlRows += `
                <tr>
                    <td>${cName}</td>
                    <td>${model} <span style="font-size:0.8rem; color:#888;">(${sn})</span></td>
                    <td style="text-align:right;">${item.reading_bw} / ${item.reading_col} / ${item.reading_col_a3}</td>
                    <td style="text-align:right; font-weight:bold; color:#2563eb;">${fmt(useBw)} / ${fmt(useCol)} / ${fmt(useA3)}</td>
                    <td style="text-align:right; font-weight:bold;">${item.total_amount.toLocaleString()}</td>
                </tr>
            `;
        });

        confirmTbody.innerHTML = htmlRows;
        confirmCount.innerText = pendingSaveData.length;
        
        if(confirmTfoot) {
            confirmTfoot.innerHTML = `
                <tr>
                    <td colspan="3" style="text-align:right; padding:10px;"><strong>총 사용량 합계</strong></td>
                    <td style="text-align:right; font-weight:bold; color:#2563eb;">${fmt(sumTotalBw)} / ${fmt(sumTotalCol)} / ${fmt(sumTotalA3)}</td>
                    <td style="text-align:right; font-weight:bold; font-size:1.1rem; color:#b91c1c;">${fmt(totalSum)}</td>
                </tr>
            `;
        }

        saveConfirmModal.style.display = 'flex';
    }

    async function executeBatchSave() {
        btnConfirmSave.innerText = '저장 중...';
        const promises = pendingSaveData.map(item => supabase.from('meter_readings').upsert(item, { onConflict: 'asset_id, reading_date' }));
        try {
            await Promise.all(promises);
            alert('모든 데이터가 성공적으로 저장되었습니다.');
            saveConfirmModal.style.display = 'none';
            btnConfirmSave.innerText = '네, 최종 저장합니다';
            historyData = [];
            loadRegisterData(); 
        } catch (err) { console.error(err); alert('저장 중 오류 발생'); btnConfirmSave.innerText = '네, 최종 저장합니다'; }
    }

    // (이력 조회 및 수정 로직 기존과 동일 - 생략)
    async function loadHistory() {
        // ... (기존 loadHistory 코드 그대로) ...
        // 파일 덮어쓰기 시 기존 코드의 loadHistory 이후 부분을 그대로 쓰시면 됩니다.
        // 또는 이전 답변의 전체 코드를 다시 참조해주세요.
        // 편의상 핵심 부분만 남깁니다.
        const startVal = inpHistStart.value;
        const endVal = inpHistEnd.value;
        if (!startVal || !endVal) return alert('조회 기간을 선택하세요.');
        histTbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:20px;">이력 조회 중...</td></tr>';
        try {
            const { data, error } = await supabase.from('meter_readings')
                .select(`id, reading_date, reading_bw, reading_col, reading_col_a3, total_amount, is_reset, assets ( id, serial_number, products (model_name), clients (name), contracts (*) )`)
                .gte('reading_date', startVal).lte('reading_date', endVal).order('reading_date', { ascending: false });
            if (error) throw error;
            historyData = data || [];
            await renderHistoryTable();
        } catch (err) { console.error(err); alert('이력 조회 실패'); }
    }

    async function renderHistoryTable() {
        // ... (기존과 동일)
        // 위에서 제가 드린 코드와 동일하므로 여기선 생략합니다.
        // 이력 탭 렌더링 로직입니다.
        const keyword = inpSearchHist.value.toLowerCase().trim();
        const filtered = historyData.filter(item => {
            const cName = (item.assets?.clients?.name || '').toLowerCase();
            const model = (item.assets?.products?.model_name || '').toLowerCase();
            return cName.includes(keyword) || model.includes(keyword);
        });
        histTbody.innerHTML = '';
        if (filtered.length === 0) { histTbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:20px;">검색 결과가 없습니다.</td></tr>'; return; }
        
        let htmlRows = '';
        for (const row of filtered) {
            const billAmount = row.total_amount ? row.total_amount.toLocaleString() : "0"; 
            let usageBw = row.reading_bw; let usageCol = row.reading_col; let usageA3 = row.reading_col_a3;
            if (!row.is_reset) {
                const { data: prevReadings } = await supabase.from('meter_readings').select('reading_bw, reading_col, reading_col_a3').eq('asset_id', row.assets.id).lt('reading_date', row.reading_date).order('reading_date', { ascending: false }).limit(1);
                const prev = (prevReadings && prevReadings.length > 0) ? prevReadings[0] : { reading_bw: 0, reading_col: 0, reading_col_a3: 0 };
                usageBw = Math.max(0, row.reading_bw - prev.reading_bw);
                usageCol = Math.max(0, row.reading_col - prev.reading_col);
                usageA3 = Math.max(0, row.reading_col_a3 - prev.reading_col_a3);
            }
            const fmt = n => n.toLocaleString();
            const resetTag = row.is_reset ? '<span style="color:red; font-size:0.7rem;">[교체]</span>' : '';
            htmlRows += `<tr><td style="text-align:center;">${row.reading_date}</td><td>${row.assets?.clients?.name || '-'}</td><td><strong>${row.assets?.products?.model_name || '-'}</strong><br><span style="font-size:0.8rem; color:#888;">(${row.assets?.serial_number})</span>${resetTag}</td><td style="text-align:right;"><div>누적: ${fmt(row.reading_bw)}</div><div class="sub-text">사용: ${fmt(usageBw)}</div></td><td style="text-align:right;"><div>누적: ${fmt(row.reading_col)}</div><div class="sub-text">사용: ${fmt(usageCol)}</div></td><td style="text-align:right;"><div>누적: ${fmt(row.reading_col_a3)}</div><div class="sub-text">사용: ${fmt(usageA3)}</div></td><td style="text-align:right; font-weight:bold; color:#2563eb;">${billAmount}원</td><td style="text-align:center;"><button class="btn-secondary btn-hist-edit" data-id="${row.id}">수정</button><button class="btn-secondary btn-hist-del" data-id="${row.id}">삭제</button></td></tr>`;
        }
        histTbody.innerHTML = htmlRows;
        // ... (수정/삭제 이벤트 리스너 연결)
        histTbody.querySelectorAll('.btn-hist-edit').forEach(btn => btn.addEventListener('click', (e) => openEditModal(e.target.dataset.id)));
        histTbody.querySelectorAll('.btn-hist-del').forEach(btn => btn.addEventListener('click', async (e) => { if(confirm('삭제?')) { await supabase.from('meter_readings').delete().eq('id', e.target.dataset.id); loadHistory(); } }));
    }

    async function openEditModal(id) {
        // ... (기존과 동일)
        const item = historyData.find(d => d.id == id);
        if(!item) return;
        const asset = item.assets;
        let contractList = asset.contracts || [];
        if (!Array.isArray(contractList)) contractList = [contractList];
        contractList.sort((a, b) => new Date(b.effective_date) - new Date(a.effective_date));
        const contract = contractList.find(c => c.effective_date <= item.reading_date) || contractList[0];
        const { data: prevReadings } = await supabase.from('meter_readings').select('*').eq('asset_id', asset.id).lt('reading_date', item.reading_date).order('reading_date', { ascending: false }).limit(1);
        const prevReading = (prevReadings && prevReadings.length > 0) ? prevReadings[0] : { reading_bw:0, reading_col:0, reading_col_a3:0 };
        currentEditAsset = { id: id, assetId: asset.id, contract: contract, prevReading: prevReading, readingDate: item.reading_date, isReset: item.is_reset };
        document.getElementById('modal-title-info').innerText = `${asset.clients?.name} / ${asset.products?.model_name}`;
        document.getElementById('modal-sub-info').innerText = `S/N: ${asset.serial_number}`;
        document.getElementById('modal-prev-usage').innerText = `BW:${prevReading.reading_bw}, Col:${prevReading.reading_col}`;
        document.getElementById('inp-edit-bw').value = item.reading_bw;
        document.getElementById('inp-edit-col').value = item.reading_col;
        document.getElementById('inp-edit-a3').value = item.reading_col_a3;
        updateEditModalCalc();
        editModal.style.display = 'flex';
    }

    function updateEditModalCalc() {
        // ... (기존과 동일)
        if(!currentEditAsset) return;
        const bw = parseInt(document.getElementById('inp-edit-bw').value) || 0;
        const col = parseInt(document.getElementById('inp-edit-col').value) || 0;
        const a3 = parseInt(document.getElementById('inp-edit-a3').value) || 0;
        const endReading = { reading_bw: bw, reading_col: col, reading_col_a3: a3 };
        const result = calculateFee(currentEditAsset.contract, endReading, currentEditAsset.prevReading, currentEditAsset.isReset);
        const fmt = n => n.toLocaleString();
        document.getElementById('val-usage-bw').innerText = fmt(result.usage_bw);
        document.getElementById('val-cost-bw').innerText = fmt(result.bw_amt);
        document.getElementById('val-usage-col').innerText = fmt(result.usage_col);
        document.getElementById('val-cost-col').innerText = fmt(result.col_amt);
        document.getElementById('val-total-fee').innerText = fmt(result.total) + '원';
    }

    ['inp-edit-bw', 'inp-edit-col', 'inp-edit-a3'].forEach(id => { const el = document.getElementById(id); if(el) el.addEventListener('input', updateEditModalCalc); });

    async function handleEditSave() {
        // ... (기존과 동일)
        if(!currentEditAsset) return;
        const bw = parseInt(document.getElementById('inp-edit-bw').value) || 0;
        const col = parseInt(document.getElementById('inp-edit-col').value) || 0;
        const a3 = parseInt(document.getElementById('inp-edit-a3').value) || 0;
        const endReading = { reading_bw: bw, reading_col: col, reading_col_a3: a3 };
        const result = calculateFee(currentEditAsset.contract, endReading, currentEditAsset.prevReading, currentEditAsset.isReset);
        const { error } = await supabase.from('meter_readings').update({ reading_bw: bw, reading_col: col, reading_col_a3: a3, total_amount: result.total }).eq('id', currentEditAsset.id);
        if(error) alert('수정 실패'); else { alert('수정됨'); editModal.style.display = 'none'; loadHistory(); }
    }
}