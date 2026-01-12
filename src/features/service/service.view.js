export async function render() {
    return `
    <div class="service-wrapper">
        <div class="card">
            <div class="page-title-area">
                <h3><i class='bx bx-list-check'></i> A/S 및 방문 일지 현황</h3>
                <button id="btn-open-modal" class="btn-primary">
                    <i class='bx bx-plus'></i> 신규 접수 등록
                </button>
            </div>
            
            <ul id="service-list-ul" class="service-list" style="padding:0; list-style:none;">
                <li style="text-align:center; padding:30px; color:#999;">데이터 로딩 중...</li>
            </ul>
        </div>

        <div id="service-modal" class="modal-overlay" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); z-index:999; justify-content:center; align-items:center;">
            
            <div class="card" style="width:700px; max-width:90%; max-height:90vh; overflow-y:auto; margin:0; animation: slideDown 0.3s ease;">
                
                <div class="page-title-area">
                    <h3 id="form-title"><i class='bx bx-edit'></i> A/S 접수 및 일지 작성</h3>
                </div>
                
                <div style="display:flex; flex-direction:column; gap:15px;">
                    <div class="grid-3" style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:15px;">
                        <div class="form-group">
                            <label>접수일자</label>
                            <input type="date" id="input-date" class="form-input">
                        </div>
                        <div class="form-group">
                            <label>거래처 선택</label>
                            <select id="select-client" class="form-input">
                                <option value="">로딩 중...</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>기기 선택</label>
                            <select id="select-asset" class="form-input">
                                <option value="">거래처를 먼저 선택하세요</option>
                            </select>
                        </div>
                    </div>

                    <div class="form-group">
                        <label>방문/점검 내용 (증상)</label>
                        <input type="text" id="input-visit" class="form-input" placeholder="예: 정기점검, 인쇄 흐림 조치">
                    </div>

                    <div class="form-group" style="background:#f8f9fa; padding:15px; border-radius:8px; border:1px solid #eee;">
                        <label style="margin-bottom:10px; display:block; font-weight:600;">📦 소모품 사용 내역 (다중 선택 가능)</label>
                        
                        <div style="display:flex; gap:10px; align-items:flex-end; margin-bottom:10px;">
                            <div style="flex:3;">
                                <label style="font-size:0.8rem; color:#666;">소모품 선택</label>
                                <select id="service-consumable-select" class="form-input" style="width:100%;">
                                    <option value="">(목록 로딩 중...)</option>
                                </select>
                            </div>
                            <div style="flex:1;">
                                <label style="font-size:0.8rem; color:#666;">수량 (마이너스 가능)</label>
                                <input type="number" id="service-consumable-qty" class="form-input" value="1" style="width:100%;">
                            </div>
                            <button id="btn-add-consumable" class="btn-secondary" style="padding:10px 15px; height:42px;">
                                <i class='bx bx-plus'></i> 추가
                            </button>
                        </div>

                        <div id="added-consumables-list" style="background:white; border:1px solid #ddd; border-radius:4px; min-height:50px; padding:10px; display:flex; flex-direction:column; gap:5px;">
                            <div style="color:#999; font-size:0.9rem; text-align:center;">사용된 소모품이 없습니다.</div>
                        </div>
                        
                        <p style="font-size:0.75rem; color:#888; margin-top:8px;">
                            ※ 양수(+) 입력 시 재고 차감, 음수(-) 입력 시 재고 반환 처리됩니다.
                        </p>
                    </div>

                    <div class="grid-2" style="display:grid; grid-template-columns: 1fr 1fr; gap:15px;">
                        <div class="form-group">
                            <label>여유분 제공</label>
                            <input type="text" id="input-spare" class="form-input" placeholder="예: 토너 BK 1개">
                        </div>
                        <div class="form-group">
                            <label>비고 (특이사항)</label>
                            <input type="text" id="input-note" class="form-input" placeholder="메모할 내용">
                        </div>
                    </div>

                    <div style="display:flex; gap:10px; margin-top:20px;">
                        <button id="btn-save-log" class="btn-primary" style="flex:1; padding:12px;">
                            <i class='bx bx-check'></i> 저장하기
                        </button>
                        <button id="btn-close-modal" class="btn-secondary" style="flex:1; padding:12px;">
                            닫기
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
    `;
}