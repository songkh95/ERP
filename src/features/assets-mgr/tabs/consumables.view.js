export async function render() {
    return `
    <div class="consumables-tab-content">
        <div class="card">
            <div class="page-title-area" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
                <h3>
                    <i class='bx bx-package'></i> 모델별 소모품 재고 현황
                </h3>
                <button id="btn-open-modal" class="btn-primary" style="padding: 8px 16px; background:#007bff; color:white; border:none; border-radius:4px; cursor:pointer;">
                    <i class='bx bx-plus'></i> 소모품 입고/등록
                </button>
            </div>

            <div class="search-container" style="display:flex; gap:10px; margin-bottom:15px; background:#f8f9fa; padding:10px; border-radius:6px;">
                <select id="search-filter" class="form-input" style="width:120px; padding:8px; border:1px solid #ccc; border-radius:4px;">
                    <option value="model">적용 모델</option>
                    <option value="name">소모품명</option>
                </select>
                <div style="position:relative; flex:1;">
                    <i class='bx bx-search' style="position:absolute; left:10px; top:10px; color:#999;"></i>
                    <input type="text" id="search-input" class="form-input" placeholder="모델명 또는 소모품명 검색..." style="padding:8px 8px 8px 30px; width:100%; box-sizing:border-box; border:1px solid #ccc; border-radius:4px;">
                </div>
            </div>

            <div style="overflow-x:auto;">
                <table class="data-table" style="width:100%; border-collapse:collapse;">
                    <thead>
                        <tr style="background:#f1f3f5;">
                            <th style="padding:15px; border:1px solid #ddd; width: 25%;">적용 모델 (기종)</th>
                            <th style="padding:15px; border:1px solid #ddd;">보유 소모품 (클릭하여 상세 내역 확인)</th>
                        </tr>
                    </thead>
                    <tbody id="consumable-list-tbody">
                        <tr><td colspan="2" style="text-align:center; padding:40px; color:#666;">데이터 로딩 중...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>

        <div id="consumable-modal" class="modal-overlay" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); z-index:999; justify-content:center; align-items:center;">
            
            <div class="card" style="width:500px; max-width:90%; max-height:90vh; overflow-y:auto; margin:0; animation: slideDown 0.3s ease; background:white; padding:25px; border-radius:8px;">
                
                <div class="page-title-area" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; border-bottom:1px solid #eee; padding-bottom:10px;">
                    <h3 id="form-title" style="margin:0;"><i class='bx bx-edit'></i> 소모품 정보 입력</h3>
                    <button id="btn-close-x" style="background:none; border:none; font-size:24px; cursor:pointer;">&times;</button>
                </div>

                <form id="consumable-form" onsubmit="return false;">
                    <input type="hidden" id="consumable-id">

                    <div class="form-group" style="margin-bottom: 20px; display:flex; flex-direction:column;">
                        <label style="margin-bottom:8px; font-weight:bold;">① 적용 모델 (기종) <span style="color:red">*</span></label>
                        
                        <div style="display:flex; gap:5px; margin-bottom:5px;">
                            <select id="select-target-model" class="form-input" style="flex:1; padding:8px; border:1px solid #ccc; border-radius:4px;">
                                <option value="">로딩 중...</option>
                            </select>
                            
                            <button id="btn-new-model-mode" style="white-space:nowrap; font-size:0.8rem; padding:8px 12px; border:1px solid #ccc; background:#fff; color:#333; border-radius:4px; cursor:pointer;">✨ 새 모델</button>
                        </div>

                        <div id="new-model-input-area" style="margin-top:5px; display:none;">
                            <input type="text" id="input-new-target-model" class="form-input" placeholder="새로운 모델명 입력 (예: Canon IR-2525)" style="width:100%; box-sizing:border-box; padding:8px; border:1px solid #ccc; border-radius:4px;">
                        </div>
                    </div>

                    <div class="form-group" style="margin-bottom: 20px; display:flex; flex-direction:column;">
                        <label style="margin-bottom:8px; font-weight:bold;">② 소모품 선택 <span style="color:red">*</span></label>
                        
                        <div style="display:flex; gap:5px; margin-bottom:5px;">
                            <select id="select-consumable-name" class="form-input" style="flex:1; padding:8px; border:1px solid #ccc; border-radius:4px;">
                                <option value="">로딩 중...</option>
                            </select>
                            
                            <button id="btn-new-consumable-mode" style="white-space:nowrap; font-size:0.8rem; padding:8px 12px; border:1px solid #ccc; background:#fff; color:#333; border-radius:4px; cursor:pointer;">✨ 새 소모품</button>
                        </div>
                        
                        <div id="new-consumable-inputs" style="margin-top:10px; border-top:1px dashed #ccc; padding-top:10px; display:none;">
                            <p style="font-size:0.8rem; color:#2563eb; margin-bottom:10px; font-weight:bold;">🆕 신규 소모품 상세 정보</p>
                            
                            <div style="margin-bottom: 10px; width: 100%;">
                                <select id="input-new-category" class="form-input" style="width:100%; box-sizing:border-box; padding:8px; border:1px solid #ccc; border-radius:4px;">
                                    <option value="복합기">분류: 복합기 (토너/드럼 등)</option>
                                    <option value="프린터">분류: 프린터 (잉크 등)</option>
                                    <option value="기타">분류: 기타 (용지/부자재)</option>
                                </select>
                            </div>

                            <div style="margin-bottom: 10px; width: 100%;">
                                <input type="text" id="input-new-name" class="form-input" style="width:100%; box-sizing:border-box; padding:8px; border:1px solid #ccc; border-radius:4px;" placeholder="소모품명 (예: C3520 검정 토너)">
                            </div>
                            
                            <div style="width: 100%;">
                                <input type="text" id="input-new-code" class="form-input" style="width:100%; box-sizing:border-box; padding:8px; border:1px solid #ccc; border-radius:4px;" placeholder="코드 (선택)">
                            </div>
                        </div>
                    </div>

                    <div class="form-group" style="margin-bottom: 20px; display:flex; flex-direction:column;">
                        <label style="margin-bottom:5px; font-weight:bold;">③ 입고 수량 <span style="color:red">*</span></label>
                        <input type="number" id="input-quantity" class="form-input" value="1" min="1" style="width:100%; padding:8px; border:1px solid #ccc; border-radius:4px;">
                    </div>

                    <div class="form-group" style="margin-bottom: 20px; display:flex; flex-direction:column;">
                        <label style="margin-bottom:5px; font-weight:bold;">④ 재고 위치</label>
                        <input type="text" id="input-location" class="form-input" placeholder="예: A-1 선반" style="width:100%; padding:8px; border:1px solid #ccc; border-radius:4px;">
                    </div>

                    <div style="margin-top:30px; display:flex; gap:10px; justify-content:flex-end;">
                        <button type="button" id="btn-save" class="btn-primary" style="flex:1; padding:12px; background:#28a745; color:white; border:none; border-radius:4px; cursor:pointer;">저장</button>
                        <button type="button" id="btn-close-bottom" class="btn-secondary" style="flex:1; padding:12px; background:#6c757d; color:white; border:none; border-radius:4px; cursor:pointer;">닫기</button>
                    </div>
                </form>
            </div>
        </div>
    </div>
    `;
}