export async function render() {
    // 1일 ~ 31일 옵션 생성
    let dayOptions = '<option value="">전체 청구일</option>';
    for(let i=1; i<=31; i++) {
        dayOptions += `<option value="${i}">${i}일</option>`;
    }
    dayOptions += '<option value="말일">말일</option>';

    return `
    <style>
        /* Chrome, Safari, Edge, Opera */
        input[type=number]::-webkit-outer-spin-button,
        input[type=number]::-webkit-inner-spin-button {
            -webkit-appearance: none;
            margin: 0;
        }
        /* Firefox */
        input[type=number] {
            -moz-appearance: textfield;
        }
    </style>

    <section class="accounting-page" style="padding: 20px;">
        <h1 style="font-size:1.5rem; font-weight:bold; margin-bottom:20px;">
            🖨️ 월별 사용매수 입력 (검침)
        </h1>
        
        <div class="card" style="padding:15px; margin-bottom:20px;">
            
            <div style="display:flex; justify-content:space-between; align-items:flex-end; gap:15px; flex-wrap:wrap;">
                
                <div style="display:flex; gap:15px; align-items:center;">
                    <div>
                        <label style="display:block; font-size:0.8rem; color:#666; margin-bottom:4px;">청구 년/월</label>
                        <input type="month" id="inp-month" class="form-input" style="width:150px;">
                    </div>
                    
                    <div>
                        <label style="display:block; font-size:0.8rem; color:#666; margin-bottom:4px;">청구일 필터</label>
                        <select id="sel-bill-day" class="form-input" style="width:120px;">
                            ${dayOptions}
                        </select>
                    </div>

                    <div style="padding-top:18px;">
                        <button id="btn-load-data" class="btn-secondary">
                            <i class='bx bx-refresh'></i> 조회
                        </button>
                    </div>
                </div>

                <div style="flex:1; max-width:300px;">
                    <label style="display:block; font-size:0.8rem; color:#666; margin-bottom:4px;">거래처 검색</label>
                    <div style="position:relative;">
                        <i class='bx bx-search' style="position:absolute; left:10px; top:10px; color:#999;"></i>
                        <input type="text" id="inp-search-client" class="form-input" 
                            placeholder="거래처명 입력..." style="padding-left:30px; width:100%;">
                    </div>
                </div>

            </div>
        </div>

        <div class="card" style="padding:0; overflow:hidden;">
            <table class="data-table" style="width:100%; border-collapse:collapse; margin-top: 0;">
                <thead style="background:#f9fafb; border-bottom:1px solid #e5e7eb;">
                    <tr>
                        <th style="padding:12px; width:15%;">거래처명 / 청구일</th>
                        <th style="padding:12px; width:20%;">모델명 (S/N)</th>
                        <th style="padding:12px; text-align:center; width:10%;">구분</th>
                        <th style="padding:12px; text-align:right; width:12%;">저번 달 지침</th>
                        <th style="padding:12px; text-align:right; width:12%;">이번 달 지침</th>
                        <th style="padding:12px; text-align:right; width:10%;">이번 달 사용량</th>
                        <th style="padding:12px; text-align:center; width:10%;">저장</th>
                    </tr>
                </thead>
                <tbody id="reading-list-tbody">
                    <tr>
                        <td colspan="7" style="padding:40px; text-align:center; color:#999;">
                            <i class='bx bx-search-alt' style="font-size:2rem; margin-bottom:10px;"></i><br>
                            데이터를 불러오거나 검색해주세요.
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    </section>
    `;
}