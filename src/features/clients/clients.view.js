export async function render() {
    return `
    <style>
        /* (기존 스타일 그대로 유지) */
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
        .top-section { flex-shrink: 0; border-bottom: 5px solid #f3f4f6; background:#fff; }
        .bottom-section { flex: 1; overflow-y: auto; background: #fafafa; }
        .section-header { font-size: 0.9rem; font-weight: 700; color: #4b5563; padding: 15px 20px; display: flex; justify-content: space-between; align-items: center; cursor: pointer; user-select: none; border-bottom: 1px solid #f3f4f6; background: #fff; transition: background 0.2s; }
        .section-header:hover { background: #f9fafb; }
        .toggle-icon { transition: transform 0.3s; font-size: 1.2rem; color: #9ca3af; margin-right: 5px; }
        .toggle-icon.rotate { transform: rotate(-90deg); }
        .section-body { padding: 20px; transition: all 0.3s; }
        .section-body.hidden-body { display: none; }
        .asset-card { background: white; border: 1px solid #e5e7eb; border-radius: 6px; margin-bottom: 8px; overflow: hidden; transition: all 0.2s; }
        .asset-card:hover { border-color: #bfdbfe; }
        .asset-header { display: flex; justify-content: space-between; align-items: center; padding: 8px 10px; background: #fff; cursor: pointer; height: 40px; }
        .asset-header:hover { background: #f9fafb; }
        .asset-header-left { display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0; overflow: hidden; }
        .asset-model { font-weight: bold; color: #0369a1; font-size: 0.9rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .asset-sn { font-size: 0.8rem; color: #64748b; background: #f1f5f9; padding: 1px 5px; border-radius: 4px; white-space: nowrap; flex-shrink: 0; }
        .asset-details { display: none; padding: 15px; border-top: 1px dashed #e5e7eb; background: #fafafa; }
        .asset-details.show { display: block; }
        .usage-filter-bar { display: flex; gap: 5px; padding: 10px; background: #fff; border-bottom: 1px solid #eee; align-items: center; position: sticky; top: 0; z-index: 20; }
        .usage-table-wrapper { overflow-x: auto; height: 100%; }
        .resizable-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
        .resizable-table th { position: sticky; top: 0; background: #f3f4f6; border: 1px solid #d1d5db; padding: 8px; font-size: 0.8rem; text-align: center; user-select: none; z-index: 10; }
        .resizable-table td { border: 1px solid #e5e7eb; padding: 6px 8px; font-size: 0.8rem; text-align: right; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .resize-handle { position: absolute; top: 0; right: 0; bottom: 0; width: 5px; cursor: col-resize; background: transparent; z-index: 10; }
        .info-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; font-size: 0.85rem; }
        .info-label { color: #9ca3af; font-size: 0.75rem; display: block; margin-bottom: 2px; }
        .info-value { color: #374151; font-weight: 500; }
        .info-full { grid-column: 1 / -1; margin-top: 5px; border-top: 1px dotted #eee; padding-top: 5px; }
        
        .history-list { list-style: none; padding: 0; margin: 0; max-height: 100px; overflow-y: auto; border: 1px solid #eee; border-radius: 4px; background: #fff; }
        .history-item { padding: 6px 10px; border-bottom: 1px solid #f5f5f5; font-size: 0.8rem; display: flex; justify-content: space-between; }
        .history-item:last-child { border-bottom: none; }
        .history-date { font-weight: bold; color: #2563eb; margin-right: 5px; }
        .history-item:hover { background: #f0f9ff; }
        
        .btn-xs { padding: 2px 6px; font-size: 0.7rem; border-radius: 3px; cursor: pointer; border: 1px solid transparent; margin-left: 3px; }
        .btn-edit { color: #2563eb; background: #eff6ff; border-color: #bfdbfe; }
        .btn-del { color: #dc2626; background: #fef2f2; border-color: #fecaca; }

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
                    <option value="all">전체</option><option value="main">메인</option><option value="sub">서브</option>
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
                <div class="panel-title" id="client-form-title"><i class='bx bx-id-card'></i> 상세 정보</div>
                <div style="display:flex; gap:5px;">
                    <button id="btn-excel-export" class="btn-secondary" title="내보내기" style="padding:6px;"><i class='bx bx-download'></i></button>
                    <button id="btn-excel-import" class="btn-secondary" title="가져오기" style="padding:6px;"><i class='bx bx-upload'></i></button>
                    <input type="file" id="inp-excel-file" accept=".xlsx, .xls" style="display:none;" />
                    <button id="btn-save-client" class="btn-primary" style="font-size:0.8rem;"><i class='bx bx-check'></i> 기본정보 저장</button>
                </div>
            </div>

            <div id="empty-state" style="text-align:center; padding-top:150px; color:#9ca3af;">
                <i class='bx bx-mouse-alt' style="font-size:3rem; margin-bottom:10px;"></i>
                <p>거래처를 선택하거나 '신규 등록'을 눌러주세요.</p>
            </div>

            <div id="client-detail-view" class="panel-body split-container hidden">
                <div class="top-section">
                    <div class="section-header" id="header-client-info">
                        <div style="display:flex; align-items:center;"><i class='bx bx-chevron-down toggle-icon' id="icon-client-info"></i><span>🏢 고객 기본 정보</span></div>
                        <button id="btn-delete-client" style="color:#ef4444; background:none; border:none; cursor:pointer; font-size:0.8rem;"><i class='bx bx-trash'></i> 삭제</button>
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
                        <div class="form-group"><label>주소</label><input type="text" id="inp-address" class="form-input"></div>
                        <div class="form-group" style="background:#f9fafb; padding:10px; border-radius:6px; border:1px solid #e5e7eb; margin-top:10px;">
                            <label style="color:#0369a1; font-weight:bold;">🔗 메인 거래처 연결 (서브일 경우)</label>
                            <select id="sel-parent-client" class="form-input"></select>
                        </div>
                    </div>
                </div>

                <div class="bottom-section">
                    <div class="section-header" id="header-asset-info">
                        <div style="display:flex; align-items:center;"><i class='bx bx-chevron-down toggle-icon' id="icon-asset-info"></i><span>🖨️ 등록된 기계별 계약 정보</span></div>
                        <button id="btn-add-asset-modal" class="btn-secondary" style="font-size:0.75rem; padding:4px 8px;"><i class='bx bx-plus'></i> 기기 추가</button>
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
            <div id="usage-container" class="panel-body" style="padding:0;"></div>
        </aside>
    </div>

    <div id="asset-modal" class="modal-overlay" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); z-index:9999; justify-content:center; align-items:center;">
        <div class="card" style="width:650px; max-height:90vh; overflow-y:auto; padding:25px;">
            <h3 style="margin-bottom:20px; font-size:1.1rem; border-bottom:1px solid #eee; padding-bottom:10px;">✨ 기기 및 계약 설정</h3>
            <input type="hidden" id="hdn-asset-id">
            <input type="hidden" id="hdn-asset-client-id">
            <input type="hidden" id="hdn-contract-id">

            <div class="form-group" style="margin-bottom:15px;">
                <label>모델 선택 <span style="color:red">*</span></label>
                <div id="box-select-model" style="display:flex; gap:5px;">
                    <input list="dl-model-list" id="inp-search-model" class="form-input" style="flex:1; font-weight:500;" placeholder="모델명 검색 또는 선택">
                    <datalist id="dl-model-list"></datalist>
                    <button id="btn-show-new-model-form" class="btn-secondary" style="white-space:nowrap; padding:0 12px;">신규모델</button>
                </div>
                <div id="box-new-model-form" class="hidden" style="background:#f0f9ff; padding:15px; border:1px solid #bae6fd; border-radius:6px; margin-top:5px;">
                    <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
                        <span style="font-weight:bold; color:#0369a1; font-size:0.9rem;">🆕 신규 모델 등록</span>
                        <button id="btn-cancel-new-model" class="btn-secondary" style="font-size:0.75rem; padding:2px 8px;">취소</button>
                    </div>
                    <div class="form-group" style="margin-bottom:10px;"><input type="text" id="inp-new-maker" class="form-input" placeholder="제조사"></div>
                    <div class="form-group" style="margin-bottom:5px;">
                        <input type="text" id="inp-new-model-name" class="form-input" placeholder="모델명">
                        <div id="msg-dup-warning" style="color:red; font-size:0.8rem; margin-top:3px; display:none;"><i class='bx bx-error-circle'></i> 이미 등록된 모델명입니다.</div>
                    </div>
                    <div class="form-group" style="margin-top:10px;"><select id="sel-new-model-type" class="form-input"><option value="흑백">흑백</option><option value="컬러">컬러</option></select></div>
                </div>
            </div>

            <div class="grid-2">
                <div class="form-group"><label>Serial No. <span style="color:red">*</span></label><input type="text" id="inp-new-serial" class="form-input" placeholder="S/N 입력"></div>
                <div class="form-group"><label>설치장소</label><input type="text" id="inp-asset-loc" class="form-input" placeholder="예: 2층 로비"></div>
            </div>

            <h4 style="font-size:0.9rem; color:#0369a1; margin:15px 0 10px; border-top:1px dashed #eee; padding-top:10px;">📅 기간 및 청구</h4>
            <div class="grid-2">
                <div class="form-group"><label>계약일자</label><input type="date" id="inp-con-date" class="form-input"></div>
                <div class="form-group"><label>계약개시일</label><input type="date" id="inp-start-date" class="form-input"></div>
            </div>
            <div class="grid-2" style="margin-top:10px;">
                <div class="form-group"><label>계약만기일</label><input type="date" id="inp-end-date" class="form-input"></div>
                <div class="form-group"><label>해약일자</label><input type="date" id="inp-cancel-date" class="form-input"></div>
            </div>
            <div class="grid-2" style="margin-top:10px;">
                <div class="form-group">
                    <label>청구방법</label>
                    <select id="inp-asset-bill-method" class="form-input">
                        <option value="">선택</option><option value="월청구">월청구</option><option value="선청구">선청구</option><option value="수시청구">수시청구</option>
                    </select>
                </div>
                <div class="form-group"><label>청구일</label><input type="text" id="inp-asset-bill-day" class="form-input" placeholder="예: 25일"></div>
            </div>

            <div style="background:#e3f2fd; padding:10px; border-radius:4px; margin:20px 0 10px; display:flex; justify-content:space-between; align-items:center;">
                <h4 style="font-size:0.9rem; color:#0369a1; margin:0;">💰 계약 요금 설정</h4>
                <div style="font-size:0.8rem; color:#0277bd;">
                    <label style="margin-right:5px; font-weight:bold;">이 요금 적용 개시일:</label>
                    <input type="date" id="inp-effective-date" style="padding:4px; border:1px solid #90caf9; border-radius:3px;">
                </div>
            </div>
            
            <div class="grid-3" style="background:#f8f9fa; padding:15px; border-radius:6px; border:1px solid #e0e0e0;">
                <div class="form-group"><label>월 기본료(원)</label><input type="number" id="inp-contract-fee" class="form-input" style="text-align:right; font-weight:bold;" value="0"></div>
                <div class="form-group"><label>흑백 기본매수</label><input type="number" id="inp-contract-base-bw" class="form-input" style="text-align:right;" value="0"></div>
                <div class="form-group"><label>컬러 기본매수</label><input type="number" id="inp-contract-base-col" class="form-input" style="text-align:right;" value="0"></div>
                
                <div class="form-group"><label>흑백 초과(장당)</label><input type="number" id="inp-contract-rate-bw" class="form-input" style="text-align:right;" value="10"></div>
                <div class="form-group"><label>컬러A4 초과(장당)</label><input type="number" id="inp-contract-rate-a4" class="form-input" style="text-align:right;" value="100"></div>
                <div class="form-group"><label>컬러A3 초과(장당)</label><input type="number" id="inp-contract-rate-a3" class="form-input" style="text-align:right;" value="200"></div>
            </div>

            <div style="margin-top:10px;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <label style="font-size:0.8rem; color:#666; display:block; margin-bottom:5px;">📋 계약 변경 이력 (수정/삭제 가능)</label>
                    <button id="btn-new-contract-mode" class="btn-secondary" style="font-size:0.7rem; padding:2px 6px; display:none;">+ 새 계약 모드로 전환</button>
                </div>
                <ul id="contract-history-list" class="history-list">
                    <li style="padding:10px; text-align:center; color:#999;">이력 없음</li>
                </ul>
            </div>

            <h4 style="font-size:0.9rem; color:#0369a1; margin:15px 0 10px;">📝 비고</h4>
            <div class="form-group">
                <textarea id="inp-memo" class="form-input" rows="2" placeholder="특이사항 입력..."></textarea>
            </div>

            <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:25px; border-top:1px solid #eee; padding-top:20px;">
                <button id="btn-asset-cancel" class="btn-secondary">취소</button>
                <button id="btn-asset-save" class="btn-primary" style="padding:10px 20px;">저장 (새로운 계약)</button>
            </div>
        </div>
    </div>

    <div id="exchange-modal" class="modal-overlay" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); z-index:9999; justify-content:center; align-items:center;">
        <div class="card" style="width:500px; padding:25px; max-height:90vh; overflow-y:auto; background:white; border-radius:8px;">
            <h3 style="margin-bottom:15px; font-size:1.1rem; color:#dc2626; border-bottom:1px solid #fecaca; padding-bottom:10px;">🔄 기기 교체 (Exchange)</h3>
            <input type="hidden" id="hdn-exchange-asset-id">
            
            <p style="font-size:0.85rem; color:#666; margin-bottom:20px; line-height:1.4;">
                기기를 교체하면 기존 기기의 정보가 변경되고,<br>
                <strong>설정된 날짜 기준</strong>으로 새로운 시작 지침이 등록됩니다.
            </p>

            <div class="form-group" style="margin-bottom:15px;">
                <label>새로운 모델 선택 <span style="color:red">*</span></label>
                <div id="box-exch-select-model" style="display:flex; gap:5px;">
                    <input list="dl-exch-model-list" id="inp-exch-search-model" class="form-input" style="flex:1; font-weight:500;" placeholder="모델명 검색 또는 선택">
                    <datalist id="dl-exch-model-list"></datalist> <button id="btn-exch-show-new-model" class="btn-secondary" style="white-space:nowrap; padding:0 12px;">신규모델</button>
                </div>

                <div id="box-exch-new-model-form" class="hidden" style="background:#fff5f5; padding:15px; border:1px solid #fed7d7; border-radius:6px; margin-top:5px;">
                    <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
                        <span style="font-weight:bold; color:#c53030; font-size:0.9rem;">🆕 신규 모델 등록</span>
                        <button id="btn-exch-cancel-new-model" class="btn-secondary" style="font-size:0.75rem; padding:2px 8px;">취소</button>
                    </div>
                    <div class="form-group" style="margin-bottom:10px;">
                        <input type="text" id="inp-exch-new-maker" class="form-input" placeholder="제조사">
                    </div>
                    <div class="form-group" style="margin-bottom:5px;">
                        <input type="text" id="inp-exch-new-model-name" class="form-input" placeholder="모델명">
                    </div>
                    <div class="form-group" style="margin-top:10px;">
                        <select id="sel-exch-new-model-type" class="form-input"><option value="흑백">흑백</option><option value="컬러">컬러</option></select>
                    </div>
                </div>
            </div>

            <div class="form-group" style="margin-bottom:15px;">
                <label>새로운 Serial No. <span style="color:red">*</span></label>
                <input type="text" id="inp-exch-serial" class="form-input" placeholder="새 기기 S/N 입력">
            </div>

            <div class="form-group" style="margin-bottom:15px;">
                <label>교체 일자 (Accounting 적용일)</label>
                <input type="date" id="inp-exch-date" class="form-input">
            </div>

            <h4 style="font-size:0.9rem; color:#4b5563; margin-bottom:10px;">🔢 시작 지침 (중고 기기 등)</h4>
            <div class="grid-3">
                <div class="form-group"><label style="font-size:0.75rem;">흑백 A4 시작 매수</label><input type="number" id="inp-exch-bw" class="form-input" value="0"></div>
                <div class="form-group"><label style="font-size:0.75rem;">칼라 A4 시작 매수</label><input type="number" id="inp-exch-col" class="form-input" value="0"></div>
                <div class="form-group"><label style="font-size:0.75rem;">칼라 A3 시작 매수</label><input type="number" id="inp-exch-a3" class="form-input" value="0"></div>
            </div>

            <div style="margin-top:25px; text-align:right; display:flex; justify-content:flex-end; gap:10px;">
                <button id="btn-exch-cancel" class="btn-secondary">취소</button>
                <button id="btn-exch-save" class="btn-primary" style="background:#dc2626; border-color:#dc2626;">교체 확정</button>
            </div>
        </div>
    </div>

    <div id="usage-edit-modal" class="modal-overlay" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); z-index:9999; justify-content:center; align-items:center;">
        <div class="card" style="width:350px; padding:20px; background:white; border-radius:8px;">
            <h3 style="margin-bottom:15px;">✏️ 사용량 기록 수정</h3>
            <input type="hidden" id="hdn-usage-id">
            <div class="form-group"><label>날짜</label><input type="text" id="inp-usage-date" class="form-input" disabled></div>
            <div class="form-group"><label>A4 흑백</label><input type="number" id="inp-usage-bw" class="form-input"></div>
            <div class="form-group"><label>A4 칼라</label><input type="number" id="inp-usage-col" class="form-input"></div>
            <div class="form-group"><label>A3 칼라</label><input type="number" id="inp-usage-a3" class="form-input"></div>
            <div style="text-align:right; margin-top:15px;">
                <button id="btn-usage-cancel" class="btn-secondary">취소</button>
                <button id="btn-usage-save" class="btn-primary">저장</button>
            </div>
        </div>
    </div>
    `;
}