export async function render() {
    return `
    <style>
        /* (기존 스타일 유지) */
        .saas-container { display: grid; grid-template-columns: 280px 5px 500px 5px 1fr; height: calc(100vh - 70px); background-color: #f3f4f6; overflow: hidden; }
        .panel { background: white; display: flex; flex-direction: column; overflow: hidden; position: relative; }
        .panel-header { height: 50px; padding: 0 15px; border-bottom: 1px solid #e5e7eb; background: #fff; flex-shrink: 0; display: flex; justify-content: space-between; align-items: center; }
        .panel-title { font-weight: 700; color: #111827; font-size: 0.95rem; display:flex; gap:5px; align-items:center; }
        .panel-body { flex: 1; overflow-y: auto; padding: 0; }
        .resizer { background: #f3f4f6; cursor: col-resize; z-index: 10; border-left: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb; transition: background 0.2s; }
        .resizer:hover, .resizer.resizing { background: #3b82f6; border-color: #3b82f6; }
        
        .client-list-item { padding: 15px; border-bottom: 1px solid #f3f4f6; cursor: pointer; transition: all 0.1s; }
        .client-list-item:hover { background: #f9fafb; }
        .client-list-item.active { background: #eff6ff; border-left: 3px solid #2563eb; }
        .client-name { font-weight: 600; color: #374151; }
        .client-meta { font-size: 0.8rem; color: #9ca3af; margin-top: 4px; }

        .split-container { display: flex; flex-direction: column; height: 100%; }
        /* top/bottom section 패딩 제거 (내부 wrapper에서 처리) */
        .top-section { flex-shrink: 0; border-bottom: 5px solid #f3f4f6; background:#fff; }
        .bottom-section { flex: 1; overflow-y: auto; background: #fafafa; }
        
        /* [수정] 섹션 헤더: 클릭 가능하게 변경 */
        .section-header { 
            font-size: 0.9rem; font-weight: 700; color: #4b5563; 
            padding: 15px 20px; /* 패딩을 헤더로 이동 */
            display: flex; justify-content: space-between; align-items: center; 
            cursor: pointer; user-select: none;
            border-bottom: 1px solid #f3f4f6;
            background: #fff;
            transition: background 0.2s;
        }
        .section-header:hover { background: #f9fafb; }

        /* [추가] 아코디언 화살표 및 본문 스타일 */
        .toggle-icon { transition: transform 0.3s; font-size: 1.2rem; color: #9ca3af; margin-right: 5px; }
        .toggle-icon.rotate { transform: rotate(-90deg); } /* 접혔을 때 회전 */
        
        .section-body { padding: 20px; transition: all 0.3s; }
        .section-body.hidden-body { display: none; } /* 숨김 클래스 */

        /* 기기 카드 스타일 (콤팩트 아코디언) */
        .asset-card { background: white; border: 1px solid #e5e7eb; border-radius: 6px; margin-bottom: 8px; overflow: hidden; transition: all 0.2s; }
        .asset-card:hover { border-color: #bfdbfe; }
        .asset-header { display: flex; justify-content: space-between; align-items: center; padding: 8px 10px; background: #fff; cursor: pointer; height: 40px; }
        .asset-header:hover { background: #f9fafb; }
        .asset-header-left { display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0; overflow: hidden; }
        .asset-model { font-weight: bold; color: #0369a1; font-size: 0.9rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .asset-sn { font-size: 0.8rem; color: #64748b; background: #f1f5f9; padding: 1px 5px; border-radius: 4px; white-space: nowrap; flex-shrink: 0; }
        .asset-header span { white-space: nowrap; }
        .asset-details { display: none; padding: 15px; border-top: 1px dashed #e5e7eb; background: #fafafa; }
        .asset-details.show { display: block; }

        .info-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; font-size: 0.85rem; }
        .info-label { color: #9ca3af; font-size: 0.75rem; display: block; margin-bottom: 2px; }
        .info-value { color: #374151; font-weight: 500; }
        .info-full { grid-column: 1 / -1; margin-top: 5px; border-top: 1px dotted #eee; padding-top: 5px; }
        .usage-table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
        .usage-table th { background: #f9fafb; padding: 8px; text-align: center; color: #6b7280; }
        .usage-table td { border-top: 1px solid #eee; padding: 8px; text-align: center; }

        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
    </style>

    <div class="saas-container" id="layout-container">
        <aside class="panel">
            <div class="panel-header">
                <div class="panel-title"><i class='bx bx-list-ul'></i> 거래처 목록 <span id="total-count" class="badge blue" style="font-size:0.7rem; margin-left:5px;">0</span></div>
                <button id="btn-add-client" class="btn-primary" style="padding:4px 8px; font-size:0.75rem; white-space:nowrap;">
                    <i class='bx bx-plus'></i> 신규 등록
                </button>
            </div>
            <div style="padding:10px; border-bottom:1px solid #e5e7eb; display:flex; gap:5px;">
                <select id="filter-type" class="form-input" style="width:80px; padding:0 5px; font-size:0.8rem;">
                    <option value="all">전체</option>
                    <option value="main">메인</option>
                    <option value="sub">서브</option>
                </select>
                <input type="text" id="search-input" class="form-input" placeholder="검색..." style="flex:1;">
            </div>
            <div id="client-list-container" class="panel-body">
                <div style="padding:20px; text-align:center; color:#999;">로딩 중...</div>
            </div>
        </aside>

        <div class="resizer" id="resizer-left"></div>

        <main class="panel">
            <div class="panel-header">
                <div class="panel-title" id="client-form-title">
                    <i class='bx bx-id-card'></i> 상세 정보
                </div>
                <div style="display:flex; gap:5px;">
                    <button id="btn-excel-export" class="btn-secondary" title="내보내기" style="padding:6px;"><i class='bx bx-download'></i></button>
                    <button id="btn-excel-import" class="btn-secondary" title="가져오기" style="padding:6px;"><i class='bx bx-upload'></i></button>
                    <input type="file" id="inp-excel-file" accept=".xlsx, .xls" style="display:none;" />
                    <button id="btn-save-client" class="btn-primary" style="font-size:0.8rem;"><i class='bx bx-check'></i> 기본정보 저장</button>
                </div>
            </div>

            <div id="empty-state" style="text-align:center; padding-top:150px; color:#9ca3af;">
                <i class='bx bx-mouse-alt' style="font-size:3rem; margin-bottom:10px;"></i>
                <p>거래처를 선택하거나<br>'새 거래처 등록하기'를 눌러주세요.</p>
            </div>

            <div id="client-detail-view" class="panel-body split-container hidden">
                <div class="top-section">
                    <div class="section-header" id="header-client-info">
                        <div style="display:flex; align-items:center;">
                            <i class='bx bx-chevron-down toggle-icon' id="icon-client-info"></i>
                            <span>🏢 고객 기본 정보</span>
                        </div>
                        <button id="btn-delete-client" style="color:#ef4444; background:none; border:none; cursor:pointer; font-size:0.8rem;">
                            <i class='bx bx-trash'></i> 거래처 삭제
                        </button>
                    </div>
                    
                    <div class="section-body" id="body-client-info">
                        <div class="grid-2">
                            <div class="form-group"><label>거래처명</label><input type="text" id="inp-name" class="form-input"></div>
                            <div class="form-group"><label>고객번호</label><input type="text" id="inp-code" class="form-input" readonly style="background:#f9fafb;" placeholder="자동 생성"></div>
                        </div>
                        <div class="grid-2">
                            <div class="form-group"><label>담당자</label><input type="text" id="inp-contact" class="form-input"></div>
                            <div class="form-group"><label>이메일</label><input type="email" id="inp-email" class="form-input"></div>
                        </div>
                        <div class="form-group" style="background:#f9fafb; padding:10px; border-radius:6px; border:1px solid #e5e7eb; margin-bottom:10px;">
                            <label style="color:#0369a1; font-weight:bold;">🔗 메인 거래처 연결 (서브일 경우 설정)</label>
                            <select id="sel-parent-client" class="form-input"></select>
                            <div style="font-size:0.75rem; color:#6b7280; margin-top:4px;">
                                * <strong>메인 거래처</strong>를 선택하면, 이곳은 <strong>서브</strong>가 됩니다.<br>
                                * 메인 거래처 화면에서 이 서브 거래처의 기기까지 한 번에 조회됩니다.
                            </div>
                        </div>
                        <div class="form-group"><label>주소</label><input type="text" id="inp-address" class="form-input"></div>
                    </div>
                </div>

                <div class="bottom-section">
                    <div class="section-header" id="header-asset-info">
                        <div style="display:flex; align-items:center;">
                            <i class='bx bx-chevron-down toggle-icon' id="icon-asset-info"></i>
                            <span>🖨️ 등록된 기계별 계약 정보</span>
                        </div>
                        <button id="btn-add-asset-modal" class="btn-secondary" style="font-size:0.75rem; padding:4px 8px;">
                            <i class='bx bx-plus'></i> 기기 추가
                        </button>
                    </div>

                    <div class="section-body" id="body-asset-info">
                        <div id="asset-list-container"></div>
                    </div>
                </div>
            </div>
        </main>

        <div class="resizer" id="resizer-right"></div>

        <aside class="panel" style="background:#f9fafb;">
            <div class="panel-header">
                <div class="panel-title"><i class='bx bx-bar-chart-alt-2'></i> 사용량 (Accounting)</div>
            </div>
            <div id="usage-container" class="panel-body" style="padding:15px;">
                <div style="padding:20px; text-align:center; color:#999;">선택 대기중...</div>
            </div>
        </aside>
    </div>

    <div id="asset-modal" class="modal-overlay" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); z-index:9999; justify-content:center; align-items:center;">
        <div class="card" style="width:650px; max-height:90vh; overflow-y:auto; padding:25px;">
            <h3 style="margin-bottom:20px; font-size:1.1rem; border-bottom:1px solid #eee; padding-bottom:10px;">
                ✨ 기기 및 계약 상세 설정
            </h3>
            <input type="hidden" id="hdn-asset-id">
            <input type="hidden" id="hdn-asset-client-id">
            
            <h4 style="font-size:0.9rem; color:#0369a1; margin-bottom:10px;">📌 기기 식별</h4>
            <div class="form-group" style="margin-bottom:15px;">
                <label>모델 선택 <span style="color:red">*</span></label>
                <div id="box-select-model" style="display:flex; gap:5px;">
                    <select id="sel-new-model" class="form-input" style="flex:1; font-weight:500;"></select>
                    <button id="btn-show-new-model-form" class="btn-secondary" title="새 모델 등록" style="white-space:nowrap; padding:0 12px;">
                        <i class='bx bx-plus'></i> 신규모델
                    </button>
                </div>
                <div id="box-new-model-form" class="hidden" style="background:#f0f9ff; padding:15px; border:1px solid #bae6fd; border-radius:6px;">
                    <div style="display:flex; justify-content:space-between; margin-bottom:10px; border-bottom:1px dashed #bae6fd; padding-bottom:5px;">
                        <span style="font-weight:bold; color:#0369a1; font-size:0.9rem;">🆕 신규 모델 정보 입력</span>
                        <button id="btn-cancel-new-model" class="btn-secondary" style="font-size:0.75rem; padding:2px 8px;">취소</button>
                    </div>
                    <div class="form-group" style="margin-bottom:10px;"><label style="font-size:0.8rem; color:#666;">제조사</label><input type="text" id="inp-new-maker" class="form-input" placeholder="예: 신도리코"></div>
                    <div class="form-group" style="margin-bottom:10px;"><label style="font-size:0.8rem; color:#666;">모델명</label><input type="text" id="inp-new-model-name" class="form-input" placeholder="예: N600"></div>
                    <div class="form-group"><label style="font-size:0.8rem; color:#666;">타입</label><select id="sel-new-model-type" class="form-input"><option value="흑백">흑백</option><option value="칼라">칼라</option></select></div>
                </div>
            </div>

            <div class="grid-2">
                <div class="form-group"><label>Serial No. <span style="color:red">*</span></label><input type="text" id="inp-new-serial" class="form-input" placeholder="S/N 입력 (필수)"></div>
                <div class="form-group"><label>설치부서/장소</label><input type="text" id="inp-asset-loc" class="form-input" placeholder="예: 2층 로비"></div>
            </div>

            <h4 style="font-size:0.9rem; color:#0369a1; margin:20px 0 10px; border-top:1px dashed #eee; padding-top:15px;">📅 기간 및 청구 설정</h4>
            <div class="grid-2">
                <div class="form-group"><label>계약일자</label><input type="date" id="inp-con-date" class="form-input"></div>
                <div class="form-group"><label>계약개시일</label><input type="date" id="inp-start-date" class="form-input"></div>
                <div class="form-group"><label>계약만기일</label><input type="date" id="inp-end-date" class="form-input"></div>
                <div class="form-group"><label>해약일자</label><input type="date" id="inp-cancel-date" class="form-input"></div>
            </div>
            <div class="grid-2" style="margin-top:10px;">
                <div class="form-group"><label>청구방법</label><select id="inp-asset-bill-method" class="form-input"><option value="">선택</option><option value="월청구">월청구</option><option value="선청구">선청구</option><option value="수시청구">수시청구</option></select></div>
                <div class="form-group"><label>청구일</label><input type="text" id="inp-asset-bill-day" class="form-input" placeholder="예: 매월 25일"></div>
            </div>

            <h4 style="font-size:0.9rem; color:#0369a1; margin:15px 0 10px;">💰 요금 조건</h4>
            <div class="grid-3">
                <div class="form-group"><label>월 기본료</label><input type="number" id="inp-rental-cost" class="form-input" style="text-align:right;"></div>
                <div class="form-group"><label>흑백 기본매수</label><input type="number" id="inp-base-bw" class="form-input" style="text-align:right;"></div>
                <div class="form-group"><label>칼라 기본매수</label><input type="number" id="inp-base-col" class="form-input" style="text-align:right;"></div>
                <div class="form-group"><label>흑백 추가(원)</label><input type="number" id="inp-over-bw" class="form-input" style="text-align:right;"></div>
                <div class="form-group"><label>칼라 추가(원)</label><input type="number" id="inp-over-col" class="form-input" style="text-align:right;"></div>
            </div>

            <h4 style="font-size:0.9rem; color:#0369a1; margin:15px 0 10px;">📝 비고</h4>
            <div class="form-group"><textarea id="inp-memo" class="form-input" rows="2" placeholder="특이사항 입력..."></textarea></div>

            <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:25px; border-top:1px solid #eee; padding-top:20px;">
                <button id="btn-asset-cancel" class="btn-secondary">취소</button>
                <button id="btn-asset-save" class="btn-primary" style="padding:10px 20px;">저장 완료</button>
            </div>
        </div>
    </div>
    `;
}