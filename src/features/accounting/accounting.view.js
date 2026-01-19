export async function render() {
    let dayOptions = '<option value="">전체 청구일</option>';
    for(let i=1; i<=31; i++) { dayOptions += `<option value="${i}">${i}일</option>`; }
    dayOptions += '<option value="말일">말일</option>';

    return `
    <style>
        /* (기존 스타일 동일) */
        .tab-header { display: flex; gap: 10px; margin-bottom: 20px; border-bottom: 2px solid #e5e7eb; }
        .tab-btn { padding: 10px 20px; font-size: 1rem; font-weight: 600; color: #6b7280; background: none; border: none; border-bottom: 2px solid transparent; cursor: pointer; transition: all 0.2s; margin-bottom: -2px; }
        .tab-btn:hover { color: #374151; }
        .tab-btn.active { color: #2563eb; border-bottom: 2px solid #2563eb; }

        .data-table { width: 100%; border-collapse: collapse; margin-top: 0; font-size: 0.85rem; }
        .data-table th { background: #f9fafb; padding: 6px 4px; text-align: center; border-bottom: 1px solid #e5e7eb; border-right: 1px solid #eee; vertical-align: middle; }
        .data-table td { padding: 6px 4px; border-bottom: 1px solid #f3f4f6; vertical-align: middle; border-right: 1px solid #f9f9f9; }
        
        .col-prev { background-color: #f8f9fa; color: #666; } 
        .col-curr { background-color: #f0f7ff; color: #000; } 
        .text-right { text-align: right; }
        .text-bold { font-weight: bold; }
        .text-blue { color: #0056b3; }
        .text-red { color: #dc3545; }

        input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
        .inp-reading { width: 100%; text-align: right; border: 1px solid #ccc; padding: 4px; border-radius: 4px; font-weight: bold; font-size: 0.9rem; }
        .inp-reading:focus { border-color: #2563eb; outline: none; box-shadow: 0 0 0 2px rgba(37,99,235,0.1); }

        .inp-fee { width: 100%; text-align: right; border: 1px solid #bfdbfe; padding: 4px; border-radius: 4px; font-weight: bold; font-size: 0.95rem; color: #0056b3; background: #fff; }
        .inp-fee:focus { border-color: #2563eb; outline: none; background: #e0f2fe; }
        
        .floating-save-bar { position: fixed; bottom: 0; left: 280px; right: 0; background: #fff; border-top: 2px solid #2563eb; padding: 15px 30px; box-shadow: 0 -2px 10px rgba(0,0,0,0.1); display: flex; justify-content: space-between; align-items: center; z-index: 100; }
        .total-summary { font-size: 1.1rem; font-weight: bold; color: #333; }
        .total-amount-highlight { color: #2563eb; font-size: 1.3rem; margin-left: 10px; }
        
        .modal-table th { background: #eee; font-size: 0.8rem; padding: 5px; text-align: center; }
        .modal-table td { padding: 5px; border-bottom: 1px solid #f0f0f0; vertical-align: middle; }
        .info-box { background: #f8f9fa; padding: 10px; border-radius: 4px; margin-bottom: 15px; border: 1px solid #eee; }
        .sub-text { font-size: 0.75rem; color: #2563eb; display: block; margin-top: 2px; }
        .confirm-list-wrapper { max-height: 400px; overflow-y: auto; border: 1px solid #eee; margin-bottom: 20px; }
        
        /* 팝업 테이블 스타일 강화 */
        .confirm-table th { position: sticky; top: 0; z-index: 10; background: #f3f4f6; }
        .confirm-footer { background: #e0f2fe; font-weight: bold; }
    </style>

    <section class="accounting-page" style="padding: 20px; padding-bottom: 80px;"> 
        <h1 style="font-size:1.5rem; font-weight:bold; margin-bottom:20px;">🖨️ 사용매수 및 요금 통합 관리</h1>
        <div class="tab-header">
            <button class="tab-btn active" data-target="panel-register">📝 검침 입력 및 요금확인</button>
            <button class="tab-btn" data-target="panel-history">📋 검침 이력 (수정/삭제)</button>
        </div>

        <div id="panel-register">
            <div class="card" style="padding:15px; margin-bottom:20px; display:flex; justify-content:space-between; align-items:flex-end;">
                <div style="display:flex; gap:15px; align-items:center; flex-wrap:wrap;">
                    <div><label style="display:block; font-size:0.8rem; color:#666; margin-bottom:4px;">검침 기준월</label><input type="month" id="inp-reg-date" class="form-input" style="width:140px; font-weight:bold;"></div>
                    <div><label style="display:block; font-size:0.8rem; color:#666; margin-bottom:4px;">청구일 필터</label><select id="sel-bill-day" class="form-input" style="width:140px;">${dayOptions}</select></div>
                    <div style="padding-top:18px;"><button id="btn-load-assets" class="btn-secondary"><i class='bx bx-refresh'></i> 데이터 불러오기</button></div>
                </div>
                <div style="width: 300px;">
                    <label style="display:block; font-size:0.8rem; color:#666; margin-bottom:4px;">거래처명 검색</label>
                    <div style="position:relative;"><i class='bx bx-search' style="position:absolute; left:10px; top:10px; color:#999;"></i><input type="text" id="inp-search-register" class="form-input" placeholder="검색어 입력..." style="padding-left:30px; width:100%;"></div>
                </div>
            </div>

            <div class="card" style="padding:0; overflow-x:auto;">
                <table class="data-table" style="min-width: 1250px;">
                    <thead>
                        <tr>
                            <th rowspan="2" style="width:40px;"><input type="checkbox" id="chk-all-rows"></th>
                            <th rowspan="2" style="width:200px;">거래처 / 제품명 (S/N)</th>
                            <th rowspan="2" style="width:60px;">구분</th>
                            <th colspan="2" class="col-prev" style="border-left:2px solid #ddd;">📉 전월 (확정)</th>
                            <th colspan="5" class="col-curr" style="border-left:2px solid #2563eb;">📈 당월 (입력 및 예상)</th>
                        </tr>
                        <tr>
                            <th class="col-prev" style="width:70px;">사용량</th>
                            <th class="col-prev text-bold" style="width:80px;">총 청구액</th>

                            <th class="col-curr" style="width:100px; border-left:2px solid #2563eb;">금월지침</th>
                            <th class="col-curr" style="width:70px;">사용량</th>
                            <th class="col-curr" style="width:100px; background:#e0f2fe;">기본료(수정)</th>
                            <th class="col-curr" style="width:80px;">추가금</th>
                            <th class="col-curr text-bold text-blue" style="width:100px;">총 렌탈료</th>
                        </tr>
                    </thead>
                    <tbody id="register-tbody">
                        <tr><td colspan="11" style="padding:40px; text-align:center; color:#999;">[불러오기] 버튼을 눌러 데이터를 조회하세요.</td></tr>
                    </tbody>
                </table>
            </div>

            <div id="floating-save-bar" class="floating-save-bar">
                <div class="total-summary">
                    이번 달 총 청구 예정 금액: <span id="grand-total-display" class="total-amount-highlight">0</span> 원
                </div>
                <button id="btn-save-all-preview" class="btn-primary" style="padding:10px 30px; font-size:1rem;">
                    <i class='bx bx-check-square'></i> 선택 항목 일괄 저장
                </button>
            </div>
        </div>

        <div id="panel-history" class="hidden">
            <div class="card" style="padding:15px; margin-bottom:20px;">
                <div style="display:flex; justify-content:space-between; align-items:flex-end;">
                    <div style="display:flex; gap:10px; align-items:center;">
                        <div><label style="display:block; font-size:0.8rem; color:#666; margin-bottom:4px;">조회 기간</label><div style="display:flex; gap:5px; align-items:center;"><input type="date" id="inp-history-start" class="form-input" style="width:130px;"><span>~</span><input type="date" id="inp-history-end" class="form-input" style="width:130px;"></div></div>
                        <div style="padding-top:18px;"><button id="btn-search-history" class="btn-primary"><i class='bx bx-search'></i> 조회</button></div>
                    </div>
                     <div style="max-width:300px; width:100%;">
                        <label style="display:block; font-size:0.8rem; color:#666; margin-bottom:4px;">이력 내 검색</label>
                        <input type="text" id="inp-search-history" class="form-input" placeholder="거래처명, 모델명..." style="width:100%;">
                    </div>
                </div>
            </div>
            <div class="card" style="padding:0; overflow:hidden;">
                <table class="data-table">
                    <thead>
                        <tr><th style="width:90px;">검침일자</th><th>거래처명</th><th>모델명 (S/N)</th><th style="text-align:right;">흑백 (누적/사용)</th><th style="text-align:right;">칼라A4 (누적/사용)</th><th style="text-align:right;">칼라A3 (누적/사용)</th><th style="text-align:right; color:#2563eb; font-weight:bold;">청구금액</th><th style="text-align:center; width:90px;">관리</th></tr>
                    </thead>
                    <tbody id="history-tbody"><tr><td colspan="8" style="padding:40px; text-align:center; color:#999;">기간을 선택하고 조회 버튼을 눌러주세요.</td></tr></tbody>
                </table>
            </div>
        </div>
    </section>

    <div id="save-confirm-modal" class="modal-overlay" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); z-index:9999; justify-content:center; align-items:center;">
        <div class="card" style="width:900px; max-height:90vh; display:flex; flex-direction:column; padding:25px;">
            <h3 style="margin-bottom:15px; border-bottom:1px solid #eee; padding-bottom:10px;">💾 청구 내역 상세 확인</h3>
            
            <p style="margin-bottom:15px; color:#666;">
                선택한 항목의 <strong>지침, 사용량, 청구액</strong>을 확인해주세요.<br>
                이상이 없다면 하단의 <strong>[최종 저장]</strong> 버튼을 눌러주세요.
            </p>

            <div class="confirm-list-wrapper">
                <table class="data-table confirm-table">
                    <thead>
                        <tr>
                            <th style="width:180px;">거래처명</th>
                            <th style="width:200px;">모델 (S/N)</th>
                            <th style="text-align:right;">당월 누적 (흑/칼/A3)</th>
                            <th style="text-align:right; color:#2563eb;">당월 사용량 (흑/칼/A3)</th>
                            <th style="text-align:right; width:100px;">청구액</th>
                        </tr>
                    </thead>
                    <tbody id="confirm-tbody">
                        </tbody>
                    <tfoot id="confirm-tfoot" class="confirm-footer">
                        </tfoot>
                </table>
            </div>

            <div style="background:#f0f9ff; padding:15px; text-align:right; border-radius:6px; margin-bottom:20px; display:flex; justify-content:space-between; align-items:center;">
                <span style="font-size:0.9rem; color:#666;">* 위 내역대로 데이터베이스에 저장됩니다.</span>
                <span style="font-weight:bold; font-size:1.1rem;">총 저장 건수: <span id="confirm-count" style="color:#2563eb;">0</span> 건</span>
            </div>

            <div style="text-align:right; display:flex; justify-content:flex-end; gap:10px;">
                <button id="btn-confirm-cancel" class="btn-secondary">취소 / 더 수정하기</button>
                <button id="btn-confirm-save" class="btn-primary" style="padding:10px 25px;">네, 최종 저장합니다</button>
            </div>
        </div>
    </div>

    <div id="edit-modal" class="modal-overlay" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); z-index:9999; justify-content:center; align-items:center;">
        <div class="card" style="width:650px; max-height:90vh; overflow-y:auto; padding:25px;">
            <h3 style="margin-bottom:15px; border-bottom:1px solid #eee; padding-bottom:10px;">✏️ 검침 및 청구내역 수정</h3>
            <input type="hidden" id="hdn-edit-id">
            <div class="info-box"><div style="font-size:1.1rem; font-weight:bold; color:#333; margin-bottom:5px;" id="modal-title-info">-</div><div style="font-size:0.9rem; color:#666;" id="modal-sub-info">-</div></div>
            <h4 style="font-size:0.9rem; color:#666; margin-bottom:5px;">📉 전월 데이터 (참고)</h4>
            <div style="background:#f1f3f5; padding:10px; border-radius:4px; margin-bottom:20px; display:flex; gap:20px;">
                <div style="flex:1;"><div style="font-size:0.8rem; color:#888;">전월 사용량</div><div style="font-weight:bold;" id="modal-prev-usage">-</div></div>
                <div style="flex:1;"><div style="font-size:0.8rem; color:#888;">전월 청구액</div><div style="font-weight:bold;" id="modal-prev-amount">-</div></div>
            </div>
            <h4 style="font-size:0.9rem; color:#0056b3; margin-bottom:5px;">📈 당월 데이터 수정 (자동계산)</h4>
            <table class="modal-table" style="width:100%; border-collapse:collapse; margin-bottom:10px;">
                <thead><tr><th style="width:15%;">구분</th><th style="width:25%;">금월 지침 (수정)</th><th style="width:20%;">사용량</th><th style="width:20%;">추가금</th><th style="width:20%;">총 렌탈료</th></tr></thead>
                <tbody>
                    <tr><td style="text-align:center; font-weight:bold;">흑백A4</td><td><input type="number" id="inp-edit-bw" class="inp-reading"></td><td style="text-align:right;" id="val-usage-bw">0</td><td style="text-align:right;" id="val-cost-bw">0</td><td rowspan="3" style="text-align:right; font-weight:bold; color:#2563eb; font-size:1.2rem; background:#f8f9fa;" id="val-total-fee">0</td></tr>
                    <tr><td style="text-align:center; font-weight:bold;">칼라A4</td><td><input type="number" id="inp-edit-col" class="inp-reading"></td><td style="text-align:right;" id="val-usage-col">0</td><td style="text-align:right;" id="val-cost-col">0</td></tr>
                    <tr><td style="text-align:center; font-weight:bold;">칼라A3</td><td><input type="number" id="inp-edit-a3" class="inp-reading"></td><td style="text-align:right;" id="val-usage-a3">0</td><td style="text-align:right;" id="val-cost-a3">0</td></tr>
                </tbody>
            </table>
            <div style="font-size:0.8rem; color:#dc3545; text-align:right;">* 지침을 수정하면 총 렌탈료(청구금액)가 자동으로 재계산됩니다.</div>
            <div style="margin-top:25px; text-align:right; display:flex; justify-content:flex-end; gap:10px;">
                <button id="btn-edit-cancel" class="btn-secondary">취소</button>
                <button id="btn-edit-save" class="btn-primary">수정사항 저장</button>
            </div>
        </div>
    </div>
    `;
}