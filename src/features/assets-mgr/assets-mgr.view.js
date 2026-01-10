// src/features/assets-mgr/assets-mgr.view.js

export async function render() {
    return `
    <div class="container">
        <div class="card">
            <div class="page-title-area">
                <h3>
                    <i class='bx bx-list-ul'></i> 전체 기기 목록 
                    <span id="total-asset-count" class="badge blue" style="font-size:0.8rem; margin-left:5px;">0</span>
                </h3>
                <button id="btn-open-modal" class="btn-primary">
                    <i class='bx bx-plus'></i> 기기 입고/등록
                </button>
            </div>

            <div class="search-container" style="display:flex; gap:10px; margin-bottom:15px; background:#f8f9fa; padding:10px; border-radius:6px;">
                <select id="search-filter" class="form-input" style="width:120px;">
                    <option value="all">전체</option>
                    <option value="serial">S/N</option>
                    <option value="model">모델명</option>
                    <option value="client">고객사</option>
                </select>
                <div style="position:relative; flex:1;">
                    <i class='bx bx-search' style="position:absolute; left:10px; top:10px; color:#999;"></i>
                    <input type="text" id="search-input" class="form-input" placeholder="검색어 입력..." style="padding-left:30px; width:100%;">
                </div>
            </div>

            <div style="overflow-x:auto;">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>모델명 (제조사)</th>
                            <th>S/N</th>
                            <th>상태</th>
                            <th>설치 장소</th>
                            <th style="width: 80px;">관리</th>
                        </tr>
                    </thead>
                    <tbody id="asset-list-tbody">
                        <tr><td colspan="5" style="text-align:center; padding:40px;">데이터 로딩 중...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>

        <div id="asset-modal" class="modal-overlay" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); z-index:999; justify-content:center; align-items:center;">
            
            <div class="card" style="width:500px; max-width:90%; max-height:90vh; overflow-y:auto; margin:0; animation: slideDown 0.3s ease;">
                
                <div class="page-title-area">
                    <h3 id="form-title"><i class='bx bx-edit'></i> 기기 정보 입력</h3>
                </div>
                
                <form id="asset-form" onsubmit="return false;">
                    <input type="hidden" id="asset-id">
                    
                    <div class="form-group" style="background:#f9fafb; padding:15px; border-radius:8px; border:1px solid #eee; margin-bottom: 20px; display:flex; flex-direction:column;">
                        <label style="margin-bottom:8px; font-weight:bold;">① 모델 선택 <span style="color:red">*</span></label>
                        
                        <div style="display:flex; gap:5px; margin-bottom:5px;">
                            <select id="select-model" class="form-input" style="flex:1;">
                                <option value="">로딩 중...</option>
                            </select>
                            <button id="btn-new-model-mode" class="btn-secondary" style="white-space:nowrap; font-size:0.8rem;">✨ 새 모델</button>
                        </div>
                        
                        <div id="new-model-inputs" class="hidden" style="margin-top:10px; border-top:1px dashed #ccc; padding-top:10px;">
                            <p style="font-size:0.8rem; color:#2563eb; margin-bottom:10px; font-weight:bold;">🆕 신규 모델 정보 입력</p>
                            
                            <div style="margin-bottom: 10px; width: 100%;">
                                <input type="text" id="input-new-brand" class="form-input" style="width:100%; box-sizing:border-box;" placeholder="제조사 (예: 신도리코)">
                            </div>
                            <div style="margin-bottom: 10px; width: 100%;">
                                <input type="text" id="input-new-model" class="form-input" style="width:100%; box-sizing:border-box;" placeholder="모델명 (예: N600)">
                            </div>
                            <div style="width: 100%;">
                                <select id="input-new-type" class="form-input" style="width:100%; box-sizing:border-box;">
                                    <option value="컬러">컬러</option>
                                    <option value="흑백">흑백</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div class="form-group" style="margin-bottom: 20px; display:flex; flex-direction:column;">
                        <label style="margin-bottom:5px;">② 시리얼 번호 (S/N) <span style="color:red">*</span></label>
                        <input type="text" id="input-serial" class="form-input" placeholder="S/N 입력" required style="width:100%; box-sizing:border-box;">
                    </div>

                    <div class="form-group" style="margin-bottom: 20px; display:flex; flex-direction:column;">
                        <label style="margin-bottom:5px;">③ 현재 상태 (자동 변경됨)</label>
                        <select id="input-status" class="form-input" style="width:100%; box-sizing:border-box;">
                            <option value="재고">📦 재고 (창고)</option>
                            <option value="사용중">✅ 사용중 (설치됨)</option>
                            <option value="수리중">🔧 수리중</option>
                            <option value="폐기">🗑️ 폐기</option>
                        </select>
                    </div>

                    <div class="form-group" style="margin-bottom: 20px; display:flex; flex-direction:column;">
                        <label style="margin-bottom:5px;">④ 설치 장소 (고객사)</label>
                        
                        <select id="select-client" class="form-input" style="width:100%; box-sizing:border-box;">
                            <option value="">(미지정 - 창고 보관)</option>
                        </select>
                        
                        <div style="margin-top:5px;">
                            <p style="font-size:0.75rem; color:#666; margin:0;">
                                ※ 고객사를 선택하면 상태가 '사용중'으로 바뀝니다.
                            </p>
                        </div>
                    </div>

                    <div style="margin-top:30px; display:flex; gap:10px;">
                        <button type="button" id="btn-save" class="btn-primary" style="flex:1; padding:12px;">저장</button>
                        <button type="button" id="btn-close-modal" class="btn-secondary" style="flex:1; padding:12px;">닫기</button>
                    </div>

                </form>
            </div>
        </div>
    </div>
    `;
}