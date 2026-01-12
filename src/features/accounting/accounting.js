import { supabase } from '../../common/db.js';

export { render } from './accounting.view.js';

let allAssets = []; // 전체 자산 데이터
let readingMap = {}; // 이번 달 검침 데이터 (저장된 값)
let prevReadingMap = {}; // 저번 달 검침 데이터 (자동 계산용)

export async function init() {
    const inpMonth = document.getElementById('inp-month');
    const selBillDay = document.getElementById('sel-bill-day');
    const inpSearch = document.getElementById('inp-search-client');
    const btnLoad = document.getElementById('btn-load-data');
    const tbody = document.getElementById('reading-list-tbody');

    // 1. 기본 설정 (이번 달)
    const now = new Date();
    const currentMonthStr = now.toISOString().slice(0, 7); 
    inpMonth.value = currentMonthStr;

    // 2. 이벤트 리스너
    btnLoad.addEventListener('click', () => loadAllData(inpMonth.value));
    selBillDay.addEventListener('change', filterAndRender);
    inpSearch.addEventListener('keyup', filterAndRender);

    // 초기 로딩
    loadAllData(currentMonthStr);

    // =========================================================
    //  1. 데이터 불러오기 (자산 + 이번달기록 + 저번달기록)
    // =========================================================
    async function loadAllData(targetMonth) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:20px;">데이터 로딩 중...</td></tr>';

        // (1) 날짜 계산
        const targetDate = `${targetMonth}-01`; // 이번 달 1일
        
        // 저번 달 계산 (YYYY-MM-01)
        const dateObj = new Date(targetDate);
        dateObj.setMonth(dateObj.getMonth() - 1);
        const prevMonthStr = dateObj.toISOString().slice(0, 7);
        const prevDate = `${prevMonthStr}-01`;

        try {
            // (2) 병렬로 데이터 가져오기 (속도 향상)
            const [assetsRes, currentRes, prevRes] = await Promise.all([
                // A. 자산 목록 가져오기
                supabase.from('assets')
                    .select(`
                        id, serial_number, 
                        products (model_name),
                        clients (id, name, billing_day),
                        base_count_bw, base_count_col
                    `)
                    .not('client_id', 'is', null)
                    .order('client_id'),

                // B. 이번 달 검침 기록 가져오기
                supabase.from('meter_readings')
                    .select('*')
                    .eq('reading_date', targetDate),

                // C. 저번 달 검침 기록 가져오기
                supabase.from('meter_readings')
                    .select('*')
                    .eq('reading_date', prevDate)
            ]);

            if (assetsRes.error) throw assetsRes.error;

            allAssets = assetsRes.data || [];
            
            // 검색을 위해 데이터 매핑 (기기ID -> 검침데이터)
            readingMap = {};
            (currentRes.data || []).forEach(r => readingMap[r.asset_id] = r);

            prevReadingMap = {};
            (prevRes.data || []).forEach(r => prevReadingMap[r.asset_id] = r);

            // 화면 그리기
            filterAndRender();

        } catch (error) {
            console.error(error);
            alert('데이터 로딩 실패: ' + error.message);
        }
    }

    // =========================================================
    //  2. 필터링 및 테이블 그리기
    // =========================================================
    function filterAndRender() {
        const selectedDay = selBillDay.value; 
        const keyword = inpSearch.value.toLowerCase().trim(); 

        const filtered = allAssets.filter(asset => {
            const clientName = (asset.clients?.name || '').toLowerCase();
            const billDay = String(asset.clients?.billing_day || ''); 

            const matchKeyword = clientName.includes(keyword);
            let matchDay = true;
            if (selectedDay) {
                if (selectedDay === '말일') {
                    matchDay = billDay.includes('말') || billDay.includes('30') || billDay.includes('31');
                } else {
                    matchDay = billDay.includes(selectedDay);
                }
            }
            return matchKeyword && matchDay;
        });

        renderTable(filtered);
    }

    function renderTable(assets) {
        tbody.innerHTML = '';

        if (assets.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:30px; color:#999;">조건에 맞는 데이터가 없습니다.</td></tr>';
            return;
        }

        assets.forEach(asset => {
            const assetId = asset.id;
            
            // 저장된 기록 찾기
            const current = readingMap[assetId] || {}; // 이번 달 (입력값)
            const prev = prevReadingMap[assetId] || {}; // 저번 달 (기준값)

            // 지침 값 세팅 (없으면 0 or 빈칸)
            const prevBw = prev.reading_bw || 0;
            const prevCol = prev.reading_col || 0;
            const prevColA3 = prev.reading_col_a3 || 0;

            const curBw = current.reading_bw !== undefined ? current.reading_bw : '';
            const curCol = current.reading_col !== undefined ? current.reading_col : '';
            const curColA3 = current.reading_col_a3 !== undefined ? current.reading_col_a3 : '';

            // 사용량 초기 계산 (저장된 값이 있을 경우)
            const useBw = (curBw !== '') ? (curBw - prevBw) : 0;
            const useCol = (curCol !== '') ? (curCol - prevCol) : 0;
            const useColA3 = (curColA3 !== '') ? (curColA3 - prevColA3) : 0;

            const cellStyle = 'padding:8px; vertical-align:middle;';
            const inputStyle = 'width:100%; text-align:right; font-weight:bold;';
            const billDayStr = asset.clients?.billing_day ? `(${asset.clients.billing_day})` : '';

            // --- [1] 흑백 A4 ---
            const trBw = document.createElement('tr');
            trBw.style.borderBottom = '1px solid #f3f4f6';
            trBw.innerHTML = `
                <td rowspan="3" style="${cellStyle} font-weight:bold; color:#333; border-right:1px solid #eee;">
                    ${asset.clients?.name} <span style="font-size:0.8rem; color:#2563eb;">${billDayStr}</span>
                </td>
                <td rowspan="3" style="${cellStyle} border-right:1px solid #eee;">
                    <div style="font-weight:bold;">${asset.products?.model_name}</div>
                    <div style="font-size:0.8rem; color:#888;">${asset.serial_number}</div>
                </td>
                <td style="text-align:center; padding:6px;">
                    <span class="badge" style="background:#eee; color:#333; font-size:0.8rem; padding:2px 6px; border-radius:4px;">흑백 A4</span>
                </td>
                <td style="text-align:right; color:#666; padding:8px;">${prevBw.toLocaleString()}</td>
                <td style="padding:5px;">
                    <input type="number" class="inp-reading form-input" 
                        id="inp-bw-${assetId}" data-prev="${prevBw}" value="${curBw}"
                        placeholder="0" style="${inputStyle}">
                </td>
                <td style="text-align:right; font-weight:bold; color:#2563eb; padding:8px;" class="val-usage" id="usage-bw-${assetId}">${useBw.toLocaleString()}</td>
                
                <td rowspan="3" style="text-align:center; vertical-align:middle; border-left:1px solid #eee;">
                    <button class="btn-primary btn-save-individual" data-id="${assetId}" style="padding:6px 12px; font-size:0.85rem;">
                        <i class='bx bx-save'></i> 저장
                    </button>
                </td>
            `;

            // --- [2] 칼라 A4 ---
            const trCol = document.createElement('tr');
            trCol.style.borderBottom = '1px solid #f3f4f6';
            trCol.innerHTML = `
                <td style="text-align:center; padding:6px;">
                    <span class="badge" style="background:#fff7ed; color:#c2410c; font-size:0.8rem; padding:2px 6px; border-radius:4px;">칼라 A4</span>
                </td>
                <td style="text-align:right; color:#666; padding:8px;">${prevCol.toLocaleString()}</td>
                <td style="padding:5px;">
                    <input type="number" class="inp-reading form-input" 
                        id="inp-col-${assetId}" data-prev="${prevCol}" value="${curCol}"
                        placeholder="0" style="${inputStyle}">
                </td>
                <td style="text-align:right; font-weight:bold; color:#2563eb; padding:8px;" class="val-usage" id="usage-col-${assetId}">${useCol.toLocaleString()}</td>
            `;

            // --- [3] 칼라 A3 ---
            const trColA3 = document.createElement('tr');
            trColA3.style.borderBottom = '2px solid #999'; 
            trColA3.innerHTML = `
                <td style="text-align:center; padding:6px;">
                    <span class="badge" style="background:#fefce8; color:#a16207; font-size:0.8rem; padding:2px 6px; border-radius:4px;">칼라 A3</span>
                    <div style="font-size:0.7rem; color:#888;">(x2배)</div>
                </td>
                <td style="text-align:right; color:#666; padding:8px;">${prevColA3.toLocaleString()}</td>
                <td style="padding:5px;">
                    <input type="number" class="inp-reading form-input" 
                        id="inp-col-a3-${assetId}" data-prev="${prevColA3}" value="${curColA3}"
                        placeholder="0" style="${inputStyle}">
                </td>
                <td style="text-align:right; font-weight:bold; color:#2563eb; padding:8px;" class="val-usage" id="usage-col-a3-${assetId}">${useColA3.toLocaleString()}</td>
            `;

            tbody.appendChild(trBw);
            tbody.appendChild(trCol);
            tbody.appendChild(trColA3);
        });

        addEvents();
    }

    // =========================================================
    //  3. 이벤트 (자동 계산 & 개별 저장)
    // =========================================================
    function addEvents() {
        // (1) 입력 시 사용량 자동 계산
        const inputs = document.querySelectorAll('.inp-reading');
        inputs.forEach(input => {
            input.addEventListener('input', (e) => {
                const el = e.target;
                
                // 값이 없으면 0으로 계산하지 않고 그냥 둬야 UX상 좋을 수 있지만,
                // 여기선 계산을 위해 0처리 혹은 현재값 유지
                const currentValStr = el.value;
                const prevVal = parseInt(el.dataset.prev) || 0;
                
                const usageCell = el.closest('tr').querySelector('.val-usage');

                if (currentValStr === '') {
                    usageCell.innerText = '0';
                    return;
                }

                const currentVal = parseInt(currentValStr);
                const usage = currentVal - prevVal;
                
                if (usageCell) {
                    usageCell.innerText = usage.toLocaleString();
                    if (usage < 0) usageCell.style.color = 'red';
                    else usageCell.style.color = '#2563eb';
                }
            });
        });

        // (2) 개별 저장 버튼
        const saveBtns = document.querySelectorAll('.btn-save-individual');
        saveBtns.forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const assetId = e.target.closest('button').dataset.id;
                await saveAssetReading(assetId, e.target.closest('button'));
            });
        });
    }

    // =========================================================
    //  4. 실제 저장 함수 (DB Upsert)
    // =========================================================
    async function saveAssetReading(assetId, btnElement) {
        // 현재 선택된 년-월의 1일로 저장
        const monthStr = document.getElementById('inp-month').value; 
        const targetDate = `${monthStr}-01`; 
        
        const bwVal = document.getElementById(`inp-bw-${assetId}`).value;
        const colVal = document.getElementById(`inp-col-${assetId}`).value;
        const colA3Val = document.getElementById(`inp-col-a3-${assetId}`).value;

        // DB에 저장할 데이터 준비
        const payload = {
            asset_id: assetId,
            reading_date: targetDate,
            reading_bw: parseInt(bwVal) || 0,
            reading_col: parseInt(colVal) || 0,
            reading_col_a3: parseInt(colA3Val) || 0
        };

        // 저장 전 버튼 UI 변경 (로딩 중)
        const originalHtml = btnElement.innerHTML;
        btnElement.innerHTML = `<i class='bx bx-loader-alt bx-spin'></i>`;
        btnElement.disabled = true;

        const { error } = await supabase
            .from('meter_readings')
            .upsert(payload, { onConflict: 'asset_id, reading_date' });

        if (error) {
            alert('❌ 저장 실패: ' + error.message);
            btnElement.innerHTML = originalHtml;
            btnElement.disabled = false;
        } else {
            // 성공 시각적 효과
            btnElement.innerHTML = `<i class='bx bx-check'></i> 완료`;
            btnElement.classList.replace('btn-primary', 'btn-secondary');
            
            // 로컬 데이터(readingMap)도 갱신 (페이지 리로드 없이 데이터 유지 위해)
            readingMap[assetId] = payload; 

            setTimeout(() => {
                btnElement.innerHTML = originalHtml;
                btnElement.classList.replace('btn-secondary', 'btn-primary');
                btnElement.disabled = false;
            }, 1500);
        }
    }
}