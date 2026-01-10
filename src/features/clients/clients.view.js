export async function render() {
    return `
    <div class="container">
        <div class="card">
            <div class="page-title-area">
                <h3><i class='bx bx-buildings'></i> 거래처 목록 <span id="total-count" class="badge blue" style="font-size:0.8rem; margin-left:10px;">0</span></h3>
                <button id="btn-add-client" class="btn-primary">
                    <i class='bx bx-plus'></i> 신규 등록
                </button>
            </div>
            
            <div style="margin-bottom: 20px; position: relative;">
                <i class='bx bx-search' style="position:absolute; left:12px; top:11px; color:#9ca3af;"></i>
                <input type="text" id="search-input" class="form-input" style="padding-left: 35px;" placeholder="검색어 입력 (업체명, 주소, 담당자 등)">
            </div>

            <ul id="client-list-ul" class="client-list">
                <li style="padding: 40px; text-align: center; color: #9ca3af;">데이터를 불러오는 중입니다...</li>
            </ul>
        </div>

        <div id="client-modal" class="modal-overlay" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); z-index:999; justify-content:center; align-items:center;">
            <div class="card" style="width:800px; max-width:90%; max-height:90vh; overflow-y:auto; margin:0; animation: slideDown 0.3s ease;">
                <div class="page-title-area">
                    <h3 id="form-title"><i class='bx bx-edit'></i> 거래처 상세 정보</h3>
                </div>
                
                <div id="form-panel"> <div style="margin-bottom: 20px;">
                        <h4 style="font-size:0.9rem; color:#6b7280; border-bottom:1px solid #eee; padding-bottom:5px; margin-bottom:10px;">🏢 기본 정보</h4>
                        
                        <div class="grid-2">
                            <div class="form-group">
                                <label>거래처명 <span style="color:red">*</span></label>
                                <input type="text" id="inp-name" class="form-input" placeholder="(주)상호명">
                            </div>
                            <div class="form-group">
                                <label>고객번호</label>
                                <input type="text" id="inp-code" class="form-input" placeholder="자동 생성" readonly style="background:#f9fafb;">
                            </div>
                        </div>

                        <div class="form-group">
                            <label>주소</label>
                            <input type="text" id="inp-address" class="form-input" placeholder="주소 입력 (예: 서울시 강남구...)">
                        </div>

                        <div class="grid-2">
                            <div class="form-group">
                                <label>담당자</label>
                                <input type="text" id="inp-contact" class="form-input" placeholder="담당자 성함">
                            </div>
                            <div class="form-group">
                                <label>연락처</label>
                                <input type="text" id="inp-recipient" class="form-input" placeholder="연락처">
                            </div>
                        </div>

                        <div class="form-group">
                            <label>수취부서 (설치장소)</label>
                            <input type="text" id="inp-dept" class="form-input" placeholder="예: 2층 총무팀">
                        </div>
                    </div>

                    <div style="margin-bottom: 20px;">
                        <h4 style="font-size:0.9rem; color:#6b7280; border-bottom:1px solid #eee; padding-bottom:5px; margin-bottom:10px;">📅 계약 정보</h4>
                        
                        <div class="form-group">
                            <label>계약형태</label>
                            <select id="inp-contract-type" class="form-input">
                                <option value="">선택하세요</option>
                                <option value="임대">임대 (렌탈)</option>
                                <option value="판매">판매 (매매)</option>
                                <option value="유지보수">유지보수</option>
                            </select>
                        </div>

                        <div class="grid-2">
                            <div class="form-group"><label>계약일자</label><input type="date" id="inp-contract-date" class="form-input"></div>
                            <div class="form-group"><label>개시일</label><input type="date" id="inp-start-date" class="form-input"></div>
                            <div class="form-group"><label>만료일</label><input type="date" id="inp-end-date" class="form-input"></div>
                            <div class="form-group"><label>해약일</label><input type="date" id="inp-cancel-date" class="form-input"></div>
                        </div>
                    </div>

                    <div style="margin-bottom: 20px;">
                        <h4 style="font-size:0.9rem; color:#6b7280; border-bottom:1px solid #eee; padding-bottom:5px; margin-bottom:10px;">💰 청구 정보</h4>
                        <div class="grid-2">
                            <div class="form-group">
                                <label>청구방법</label>
                                <select id="inp-bill-method" class="form-input">
                                    <option value="">선택하세요</option>
                                    <option value="월청구">월청구 (후불)</option>
                                    <option value="선청구">선청구 (선불)</option>
                                    <option value="수시청구">수시청구</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>청구일</label>
                                <input type="text" id="inp-bill-day" class="form-input" placeholder="예: 매월 25일">
                            </div>
                        </div>
                    </div>

                    <div id="group-assets" class="hidden" style="margin-bottom: 20px; background:#f0f9ff; padding:15px; border-radius:8px;">
                        <h4 style="font-size:0.9rem; color:#0369a1; border-bottom:1px solid #bae6fd; padding-bottom:5px; margin-bottom:10px;">
                            🖨️ 보유 기기 관리
                        </h4>

                        <ul id="mini-asset-list" style="list-style:none; padding:0; margin-bottom:15px; background:white; border-radius:4px; border:1px solid #bae6fd;">
                            <li style="padding:10px; color:#999; text-align:center;">로딩 중...</li>
                        </ul>

                        <div style="display:flex; gap:10px; margin-bottom:10px;">
                            <button id="tab-stock" class="btn-secondary active" style="font-size:0.8rem; padding:5px 10px;">📦 재고에서 추가</button>
                            <button id="tab-new" class="btn-secondary" style="font-size:0.8rem; padding:5px 10px;">✨ 신규 등록</button>
                        </div>

                        <div id="panel-stock" style="display:flex; gap:5px;">
                            <select id="sel-stock-asset" class="form-input" style="flex:1; font-size:0.85rem;">
                                <option value="">-- 재고 선택 --</option>
                            </select>
                            <button id="btn-add-stock" class="btn-primary" style="font-size:0.8rem;">배정</button>
                        </div>

                        <div id="panel-new" class="hidden" style="display:flex; gap:5px;">
                            <select id="sel-new-model-id" class="form-input" style="flex:1; font-size:0.85rem;">
                                <option value="">모델 선택</option>
                            </select>
                            <input type="text" id="inp-new-serial" class="form-input" placeholder="S/N" style="width:100px; font-size:0.85rem;">
                            <button id="btn-create-asset" class="btn-primary" style="font-size:0.8rem;">생성</button>
                        </div>
                    </div>

                    <div id="msg-save-first" style="text-align:center; color:#6b7280; padding:20px; background:#f9fafb; border-radius:8px; margin-bottom:20px;">
                        <i class='bx bx-info-circle'></i> 거래처를 먼저 저장하면 기기를 등록할 수 있습니다.
                    </div>

                    <div style="display:flex; gap:10px; justify-content:flex-end; border-top:1px solid #eee; padding-top:20px;">
                        <button id="btn-save" class="btn-primary" style="padding: 10px 20px;">저장하기</button>
                        <button id="btn-cancel" class="btn-secondary" style="padding: 10px 20px;">닫기</button>
                    </div>

                </div>
            </div>
        </div>
    </div>
    `;
}