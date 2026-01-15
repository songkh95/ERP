export async function render() {
    // 1일 ~ 31일 옵션 (필터용)
    let dayOptions = '<option value="">전체 청구일</option>';
    for(let i=1; i<=31; i++) {
        dayOptions += `<option value="${i}">${i}일</option>`;
    }
    dayOptions += '<option value="말일">말일</option>';

    return `
    <style>
        /* 탭 스타일 */
        .tab-header { display: flex; gap: 10px; margin-bottom: 20px; border-bottom: 2px solid #e5e7eb; }
        .tab-btn {
            padding: 10px 20px; font-size: 1rem; font-weight: 600; color: #6b7280;
            background: none; border: none; border-bottom: 2px solid transparent;
            cursor: pointer; transition: all 0.2s; margin-bottom: -2px;
        }
        .tab-btn:hover { color: #374151; }
        .tab-btn.active { color: #2563eb; border-bottom: 2px solid #2563eb; }

        /* 테이블 스타일 */
        .data-table { width: 100%; border-collapse: collapse; margin-top: 0; }
        .data-table th { background: #f9fafb; padding: 12px; text-align: center; border-bottom: 1px solid #e5e7eb; color: #4b5563; font-weight: 600; }
        .data-table td { padding: 8px 12px; border-bottom: 1px solid #f3f4f6; vertical-align: middle; }
        
        /* 숫자 입력 화살표 제거 */
        input[type=number]::-webkit-outer-spin-button,
        input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
    </style>

    <section class="accounting-page" style="padding: 20px;">
        <h1 style="font-size:1.5rem; font-weight:bold; margin-bottom:20px;">
            🖨️ 사용매수(검침) 관리
        </h1>
        
        <div class="tab-header">
            <button class="tab-btn active" data-target="panel-register">📝 검침 입력 (등록)</button>
            <button class="tab-btn" data-target="panel-history">📋 검침 이력 (조회/수정)</button>
        </div>

        <div id="panel-register">
            <div class="card" style="padding:15px; margin-bottom:20px;">
                <div style="display:flex; justify-content:space-between; align-items:flex-end; gap:15px; flex-wrap:wrap;">
                    
                    <div style="display:flex; gap:15px; align-items:center;">
                        <div>
                            <label style="display:block; font-size:0.8rem; color:#666; margin-bottom:4px;">검침 일자 (등록일)</label>
                            <input type="month" id="inp-reg-date" class="form-input" style="width:140px; font-weight:bold;">
                        </div>
                        
                        <div>
                            <label style="display:block; font-size:0.8rem; color:#666; margin-bottom:4px;">청구일 필터</label>
                            <select id="sel-bill-day" class="form-input" style="width:140px;">
                                ${dayOptions}
                            </select>
                        </div>

                        <div style="padding-top:18px;">
                            <button id="btn-load-assets" class="btn-secondary"><i class='bx bx-refresh'></i> 불러오기</button>
                        </div>
                    </div>

                    <div style="flex:1; max-width:300px;">
                        <label style="display:block; font-size:0.8rem; color:#666; margin-bottom:4px;">거래처 검색</label>
                        <div style="position:relative;">
                            <i class='bx bx-search' style="position:absolute; left:10px; top:10px; color:#999;"></i>
                            <input type="text" id="inp-search-register" class="form-input" placeholder="거래처명..." style="padding-left:30px; width:100%;">
                        </div>
                    </div>
                </div>
            </div>

            <div class="card" style="padding:0; overflow:hidden;">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th style="width:18%;">거래처명 / 청구일</th>
                            <th style="width:20%;">모델명 (S/N)</th>
                            <th style="width:10%;">구분</th>
                            <th style="width:12%;">전월(최근) 지침</th>
                            <th style="width:12%;">금월 지침 (입력)</th>
                            <th style="width:10%;">사용량</th>
                            <th style="width:10%;">저장</th>
                        </tr>
                    </thead>
                    <tbody id="register-tbody">
                        <tr><td colspan="7" style="padding:40px; text-align:center; color:#999;">데이터를 불러와주세요.</td></tr>
                    </tbody>
                </table>
            </div>
        </div>

<div id="panel-history" class="hidden">
            <div class="card" style="padding:15px; margin-bottom:20px;">
                <div style="display:flex; justify-content:space-between; align-items:flex-end;">
                    <div style="display:flex; gap:15px; align-items:center;">
                        <div>
                            <label style="display:block; font-size:0.8rem; color:#666; margin-bottom:4px;">조회 일자</label>
                            <input type="date" id="inp-history-month" class="form-input">
                        </div>
                        <div style="padding-top:18px;">
                            <button id="btn-search-history" class="btn-primary"><i class='bx bx-search'></i> 조회</button>
                        </div>
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
                        <tr>
                            <th>검침일자</th>
                            <th>거래처명</th>
                            <th>모델명 (S/N)</th>
                            <th style="text-align:right;">흑백 지침</th>
                            <th style="text-align:right;">칼라 지침</th>
                            <th style="text-align:right;">A3 지침</th>
                            <th>관리</th>
                        </tr>
                    </thead>
                    <tbody id="history-tbody">
                        <tr><td colspan="7" style="padding:40px; text-align:center; color:#999;">조회 버튼을 눌러주세요.</td></tr>
                    </tbody>
                </table>
            </div>
        </div>

    </section>

<div id="edit-modal" class="modal-overlay" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); z-index:9999; justify-content:center; align-items:center;">
        <div class="card" style="width:400px; padding:25px;">
            <h3 style="margin-bottom:15px; border-bottom:1px solid #eee; padding-bottom:10px;">✏️ 검침 이력 수정</h3>
            <input type="hidden" id="hdn-edit-id">
            
            <div class="form-group">
                <label>검침일자 (수정불가)</label>
                <input type="month" id="inp-edit-date" class="form-input" disabled style="background-color: #f3f4f6; color:#999; cursor:not-allowed;">
                <div style="font-size:0.75rem; color:#ef4444; margin-top:4px;">* 날짜 변경은 삭제 후 재등록해주세요.</div>
            </div>
            
            <div class="grid-3" style="margin-top:15px;">
                <div class="form-group"><label>흑백</label><input type="number" id="inp-edit-bw" class="form-input" style="text-align:right;"></div>
                <div class="form-group"><label>칼라</label><input type="number" id="inp-edit-col" class="form-input" style="text-align:right;"></div>
                <div class="form-group"><label>A3</label><input type="number" id="inp-edit-a3" class="form-input" style="text-align:right;"></div>
            </div>

            <div style="margin-top:20px; text-align:right; display:flex; justify-content:flex-end; gap:10px;">
                <button id="btn-edit-cancel" class="btn-secondary">취소</button>
                <button id="btn-edit-save" class="btn-primary">수정 저장</button>
            </div>
        </div>
    </div>
    `;
}