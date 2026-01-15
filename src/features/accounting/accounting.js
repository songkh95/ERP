import { supabase } from '../../common/db.js';
export { render } from './accounting.view.js';

// 전역 변수
let registerAssets = []; // 등록 탭용 데이터
let historyData = [];    // 이력 탭용 데이터

export async function init() {
    // --- [공통] 탭 제어 ---
    const tabBtns = document.querySelectorAll('.tab-btn');
    const panelRegister = document.getElementById('panel-register');
    const panelHistory = document.getElementById('panel-history');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // 탭 스타일 활성화
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // 패널 전환
            const target = btn.dataset.target;
            if (target === 'panel-register') {
                panelRegister.classList.remove('hidden');
                panelHistory.classList.add('hidden');
            } else {
                panelRegister.classList.add('hidden');
                panelHistory.classList.remove('hidden');
                // 이력 탭 처음 누르면 자동 조회
                if (historyData.length === 0) loadHistory();
            }
        });
    });

    // =========================================================
    //  TAB 1. 검침 입력 (등록)
    // =========================================================
    const inpRegDate = document.getElementById('inp-reg-date');
    const selBillDay = document.getElementById('sel-bill-day');
    const inpSearchReg = document.getElementById('inp-search-register');
    const btnLoadAssets = document.getElementById('btn-load-assets');
    const regTbody = document.getElementById('register-tbody');

    // 초기값: 오늘 날짜의 '년-월' (YYYY-MM)
    inpRegDate.value = new Date().toISOString().slice(0, 7);

    btnLoadAssets.addEventListener('click', loadRegisterData);
    selBillDay.addEventListener('change', renderRegisterTable);
    inpSearchReg.addEventListener('keyup', renderRegisterTable);

    // 초기 로딩
    loadRegisterData();

    async function loadRegisterData() {
        regTbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:20px;">데이터 로딩 중...</td></tr>';

        // ★ [핵심 수정 1] 현재 선택된 등록 날짜를 기준으로 '전월 지침'을 가져옵니다.
        // 예: 2026-03을 선택했다면 2026-03-01 이전의 데이터 중 가장 최신 값을 가져와야 함.
        const currentMonthVal = inpRegDate.value;
        const targetDate = currentMonthVal ? (currentMonthVal + '-01') : new Date().toISOString().slice(0, 10);

        try {
            // 1. 모든 기기 정보 가져오기
            const { data: assets, error } = await supabase
                .from('assets')
                .select(`
                    id, serial_number, billing_day, billing_method,
                    products (model_name),
                    clients (id, name),
                    base_count_bw, base_count_col
                `)
                .not('client_id', 'is', null)
                .order('client_id');

            if (error) throw error;
            
            // 2. [수정됨] 기준일(targetDate)보다 '과거'인 기록들만 가져오기 (날짜 내림차순)
            const { data: pastReadings } = await supabase
                .from('meter_readings')
                .select('asset_id, reading_bw, reading_col, reading_col_a3, reading_date')
                .lt('reading_date', targetDate) // ★ 중요: 이번달 등록일보다 이전 데이터만 조회
                .order('reading_date', { ascending: false });

            // 3. 매핑
            registerAssets = assets.map(asset => {
                // 이 기기의 과거 기록 중 가장 첫 번째(=가장 최신) 데이터 찾기
                const lastReading = pastReadings?.find(r => r.asset_id === asset.id) || {};
                
                return {
                    ...asset,
                    prev_bw: lastReading.reading_bw || 0,
                    prev_col: lastReading.reading_col || 0,
                    prev_col_a3: lastReading.reading_col_a3 || 0,
                    last_read_date: lastReading.reading_date // 참고용
                };
            });

            renderRegisterTable();

        } catch (err) {
            console.error(err);
            alert('데이터 로딩 실패');
        }
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
            regTbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:30px; color:#999;">조건에 맞는 기기가 없습니다.</td></tr>';
            return;
        }

        filtered.forEach(asset => {
            const trBw = document.createElement('tr');
            const trCol = document.createElement('tr');
            const trA3 = document.createElement('tr');
            
            const cellStyle = 'padding:8px; vertical-align:middle;';
            const inputStyle = 'width:100%; text-align:right; font-weight:bold;';
            const billStr = asset.billing_day ? `(${asset.billing_day === '말일' ? '말일' : asset.billing_day + '일'})` : '';

            // [Row 1] 흑백 + 기본정보 + 저장버튼
            trBw.innerHTML = `
                <td rowspan="3" style="${cellStyle} font-weight:bold; color:#333; border-right:1px solid #eee;">
                    ${asset.clients?.name} <span style="font-size:0.8rem; color:#2563eb;">${billStr}</span>
                </td>
                <td rowspan="3" style="${cellStyle} border-right:1px solid #eee;">
                    <div style="font-weight:bold;">${asset.products?.model_name}</div>
                    <div style="font-size:0.8rem; color:#888;">${asset.serial_number}</div>
                </td>
                <td style="text-align:center; padding:5px;"><span class="badge" style="background:#eee; color:#333; font-size:0.8rem;">흑백</span></td>
                <td style="text-align:right; color:#666;">${asset.prev_bw.toLocaleString()}</td>
                <td style="padding:5px;">
                    <input type="number" class="inp-reg-val form-input" id="reg-bw-${asset.id}" data-prev="${asset.prev_bw}" placeholder="0" style="${inputStyle}">
                </td>
                <td style="text-align:right; font-weight:bold; color:#2563eb;" class="usage-disp">0</td>
                <td rowspan="3" style="text-align:center; border-left:1px solid #eee;">
                    <button class="btn-primary btn-reg-save" data-id="${asset.id}" style="padding:6px 12px; font-size:0.85rem;">저장</button>
                </td>
            `;
            // [Row 2] 칼라
            trCol.innerHTML = `
                <td style="text-align:center; padding:5px;"><span class="badge" style="background:#fff7ed; color:#c2410c; font-size:0.8rem;">칼라</span></td>
                <td style="text-align:right; color:#666;">${asset.prev_col.toLocaleString()}</td>
                <td style="padding:5px;">
                    <input type="number" class="inp-reg-val form-input" id="reg-col-${asset.id}" data-prev="${asset.prev_col}" placeholder="0" style="${inputStyle}">
                </td>
                <td style="text-align:right; font-weight:bold; color:#2563eb;" class="usage-disp">0</td>
            `;
            // [Row 3] A3
            trA3.style.borderBottom = '2px solid #e5e7eb';
            trA3.innerHTML = `
                <td style="text-align:center; padding:5px;"><span class="badge" style="background:#fefce8; color:#a16207; font-size:0.8rem;">A3</span></td>
                <td style="text-align:right; color:#666;">${asset.prev_col_a3.toLocaleString()}</td>
                <td style="padding:5px;">
                    <input type="number" class="inp-reg-val form-input" id="reg-a3-${asset.id}" data-prev="${asset.prev_col_a3}" placeholder="0" style="${inputStyle}">
                </td>
                <td style="text-align:right; font-weight:bold; color:#2563eb;" class="usage-disp">0</td>
            `;

            regTbody.appendChild(trBw);
            regTbody.appendChild(trCol);
            regTbody.appendChild(trA3);
        });

        // 자동 계산 이벤트
        document.querySelectorAll('.inp-reg-val').forEach(inp => {
            inp.addEventListener('input', (e) => {
                const val = parseInt(e.target.value) || 0;
                const prev = parseInt(e.target.dataset.prev) || 0;
                const usageCell = e.target.closest('tr').querySelector('.usage-disp');
                const usage = val - prev;
                usageCell.innerText = usage.toLocaleString();
                usageCell.style.color = usage < 0 ? 'red' : '#2563eb';
            });
        });

        // 저장 버튼 이벤트
        document.querySelectorAll('.btn-reg-save').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const assetId = e.target.dataset.id;
                
                // ★ [수정 2] '년-월'(YYYY-MM) -> '년-월-일'(YYYY-MM-01) 변환
                const monthVal = inpRegDate.value;
                if(!monthVal) return alert('검침 년/월을 선택해주세요.');
                const fullDate = monthVal + '-01'; 

                const bw = document.getElementById(`reg-bw-${assetId}`).value;
                const col = document.getElementById(`reg-col-${assetId}`).value;
                const a3 = document.getElementById(`reg-a3-${assetId}`).value;

                const payload = {
                    asset_id: assetId,
                    reading_date: fullDate, // 변환된 날짜 사용
                    reading_bw: parseInt(bw) || 0,
                    reading_col: parseInt(col) || 0,
                    reading_col_a3: parseInt(a3) || 0
                };

                const originalHTML = btn.innerHTML;
                btn.innerHTML = '...';
                
                const { error } = await supabase
                    .from('meter_readings')
                    .upsert(payload, { onConflict: 'asset_id, reading_date' });

                if(error) {
                    alert('저장 실패: ' + error.message);
                    btn.innerHTML = originalHTML;
                } else {
                    btn.innerHTML = '완료';
                    btn.classList.replace('btn-primary', 'btn-secondary');
                    setTimeout(() => {
                        btn.innerHTML = originalHTML;
                        btn.classList.replace('btn-secondary', 'btn-primary');
                        // 저장했으니 이력 데이터 초기화 (다시 불러오게)
                        historyData = []; 
                    }, 1500);
                }
            });
        });
    }


    // =========================================================
    //  TAB 2. 검침 이력 (조회/수정/삭제)
    // =========================================================
    const inpHistDate = document.getElementById('inp-history-month'); // HTML에서 type="date"
    const btnSearchHist = document.getElementById('btn-search-history');
    const inpSearchHist = document.getElementById('inp-search-history');
    const histTbody = document.getElementById('history-tbody');
    
    // 모달 요소들...
    const editModal = document.getElementById('edit-modal');
    const btnEditSave = document.getElementById('btn-edit-save');
    const btnEditCancel = document.getElementById('btn-edit-cancel');

    // 초기값: 오늘 날짜 (YYYY-MM-DD)
    inpHistDate.value = new Date().toISOString().slice(0, 10);

    btnSearchHist.addEventListener('click', loadHistory);
    inpSearchHist.addEventListener('keyup', renderHistoryTable);

    async function loadHistory() {
        const dateVal = inpHistDate.value;
        if (!dateVal) return alert('조회할 일자를 선택하세요.');

        histTbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:20px;">이력 조회 중...</td></tr>';

        try {
            // 일자 일치 검색(eq)
            const { data, error } = await supabase
                .from('meter_readings')
                .select(`
                    id, reading_date, reading_bw, reading_col, reading_col_a3,
                    assets (
                        serial_number,
                        products (model_name),
                        clients (name)
                    )
                `)
                .eq('reading_date', dateVal) 
                .order('reading_date', { ascending: false });

            if (error) throw error;
            historyData = data || [];
            renderHistoryTable();

        } catch (err) {
            console.error(err);
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
                <td>
                    <strong>${row.assets?.products?.model_name || '-'}</strong>
                    <br><span style="font-size:0.8rem; color:#888;">${row.assets?.serial_number}</span>
                </td>
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

        // 수정 버튼
        document.querySelectorAll('.btn-hist-edit').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.dataset.id;
                const item = historyData.find(d => d.id == id);
                if(item) openEditModal(item);
            });
        });

        // 삭제 버튼
        document.querySelectorAll('.btn-hist-del').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                if(!confirm('정말 이 검침 기록을 삭제하시겠습니까?')) return;
                const id = e.target.dataset.id;
                await supabase.from('meter_readings').delete().eq('id', id);
                alert('삭제되었습니다.');
                loadHistory(); // 새로고침
            });
        });
    }

    // --- 수정 모달 로직 ---
    function openEditModal(item) {
        document.getElementById('hdn-edit-id').value = item.id;
        
        // ★ [수정 3] 날짜는 YYYY-MM까지만 잘라서 보여줌 (수정 불가 필드)
        if(item.reading_date) {
            document.getElementById('inp-edit-date').value = item.reading_date.slice(0, 7);
        }

        document.getElementById('inp-edit-bw').value = item.reading_bw;
        document.getElementById('inp-edit-col').value = item.reading_col;
        document.getElementById('inp-edit-a3').value = item.reading_col_a3;
        
        editModal.style.display = 'flex';
    }

    btnEditCancel.addEventListener('click', () => editModal.style.display = 'none');
    
    btnEditSave.addEventListener('click', async () => {
        const id = document.getElementById('hdn-edit-id').value;
        // ★ [수정 4] 날짜 값은 가져오지도 않고, 업데이트하지도 않음 (사용량만 수정)
        const bw = document.getElementById('inp-edit-bw').value;
        const col = document.getElementById('inp-edit-col').value;
        const a3 = document.getElementById('inp-edit-a3').value;

        const { error } = await supabase
            .from('meter_readings')
            .update({
                reading_bw: parseInt(bw)||0,
                reading_col: parseInt(col)||0,
                reading_col_a3: parseInt(a3)||0
                // reading_date는 제외됨
            })
            .eq('id', id);

        if(error) alert('수정 실패: ' + error.message);
        else {
            alert('수정되었습니다.');
            editModal.style.display = 'none';
            loadHistory();
        }
    });
}