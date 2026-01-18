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

        /* 테이블 공통 */
        .data-table { width: 100%; border-collapse: collapse; margin-top: 0; font-size: 0.9rem; }
        .data-table th { background: #f9fafb; padding: 8px 10px; text-align: center; border-bottom: 1px solid #e5e7eb; border-right: 1px solid #eee; vertical-align: middle; }
        .data-table td { padding: 8px 10px; border-bottom: 1px solid #f3f4f6; vertical-align: middle; border-right: 1px solid #f9f9f9; }
        
        /* 컬럼 스타일 */
        .col-prev { background-color: #f8f9fa; color: #666; } /* 전월 배경 */
        .col-curr { background-color: #f0f7ff; color: #000; } /* 당월 배경 */
        .text-right { text-align: right; }
        .text-bold { font-weight: bold; }
        .text-blue { color: #0056b3; }
        .text-red { color: #dc3545; }

        /* 입력창 스타일 */
        input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
        .inp-reading { width: 100%; text-align: right; border: 1px solid #ccc; padding: 5px; border-radius: 4px; font-weight: bold; }
        .inp-reading:focus { border-color: #2563eb; outline: none; box-shadow: 0 0 0 2px rgba(37,99,235,0.1); }
    </style>

    <section class="accounting-page" style="padding: 20px;">
        <h1 style="font-size:1.5rem; font-weight:bold; margin-bottom:20px;">
            🖨️ 사용매수 및 요금 통합 관리
        </h1>
        
        <div class="tab-header">
            <button class="tab-btn active" data-target="panel-register">📝 검침 입력 및 요금확인</button>
            <button class="tab-btn" data-target="panel-history">📋 검침 이력 (수정/삭제)</button>
        </div>

        <div id="panel-register">
            <div class="card" style="padding:15px; margin-bottom:20px; display:flex; justify-content:space-between; align-items:flex-end;">
                <div style="display:flex; gap:15px; align-items:center; flex-wrap:wrap;">
                    <div>
                        <label style="display:block; font-size:0.8rem; color:#666; margin-bottom:4px;">검침 기준월 (입력월)</label>
                        <input type="month" id="inp-reg-date" class="form-input" style="width:140px; font-weight:bold;">
                    </div>
                    
                    <div>
                        <label style="display:block; font-size:0.8rem; color:#666; margin-bottom:4px;">청구일 필터</label>
                        <select id="sel-bill-day" class="form-input" style="width:140px;">
                            ${dayOptions}
                        </select>
                    </div>

                    <div style="padding-top:18px;">
                        <button id="btn-load-assets" class="btn-secondary"><i class='bx bx-refresh'></i> 데이터 불러오기</button>
                    </div>
                </div>

                <div style="width: 300px;">
                    <label style="display:block; font-size:0.8rem; color:#666; margin-bottom:4px;">거래처명 검색</label>
                    <div style="position:relative;">
                        <i class='bx bx-search' style="position:absolute; left:10px; top:10px; color:#999;"></i>
                        <input type="text" id="inp-search-register" class="form-input" placeholder="검색어 입력..." style="padding-left:30px; width:100%;">
                    </div>
                </div>
            </div>

            <div class="card" style="padding:0; overflow-x:auto;">
                <table class="data-table" style="min-width: 1400px;">
                    <thead>
                        <tr>
                            <th rowspan="2" style="width:200px;">거래처 / 기기 정보</th>
                            <th rowspan="2" style="width:60px;">구분</th>
                            
                            <th colspan="4" class="col-prev" style="border-left:2px solid #ddd;">📉 전월 (확정)</th>
                            
                            <th colspan="5" class="col-curr" style="border-left:2px solid #2563eb;">📈 당월 (입력 및 예상)</th>
                            
                            <th rowspan="2" style="width:80px; border-left:1px solid #ddd;">저장</th>
                        </tr>
                        <tr>
                            <th class="col-prev">지침</th>
                            <th class="col-prev">사용량</th>
                            <th class="col-prev">추가금</th>
                            <th class="col-prev text-bold">총 청구액</th>

                            <th class="col-curr" style="border-left:2px solid #2563eb;">전월지침</th>
                            <th class="col-curr" style="width:100px;">금월지침(입력)</th>
                            <th class="col-curr">사용량</th>
                            <th class="col-curr">추가금(예상)</th>
                            <th class="col-curr text-bold text-blue">총 예상액</th>
                        </tr>
                    </thead>
                    <tbody id="register-tbody">
                        <tr><td colspan="12" style="padding:40px; text-align:center; color:#999;">[불러오기] 버튼을 눌러 데이터를 조회하세요.</td></tr>
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