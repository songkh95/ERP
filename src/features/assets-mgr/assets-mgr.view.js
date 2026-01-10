export async function render() {
    return `
    <section class="assets-page">
            
        <div class="container">
            <div class="tab-navigation" style="display:flex; gap:5px; margin-bottom: 0;">
                <button class="tab-btn active" data-tab="machines">🖨️ 복합기/프린터</button>
                <button class="tab-btn" data-tab="consumables">🧪 소모품</button>
                <button class="tab-btn" data-tab="parts">⚙️ 부품</button>
            </div>

            <div id="tab-content-area" style="border-top-left-radius: 0;">
                </div>
        </div>
    </section>
    `;
}