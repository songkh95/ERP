// src/features/clients/clients.js
import { supabase } from '../../common/db.js';

export function render() {
    return `
        <section>
            <h1>📋 고객 관리</h1>
            <p>여기에 고객 리스트가 나옵니다.</p>
            <ul id="client-list-ul">데이터 로딩 중...</ul>
        </section>
    `;
}

export async function init() {
    // Supabase에서 데이터 가져오기
    const { data, error } = await supabase.from('clients').select('*');
    
    if (error) {
        console.error('에러 발생:', error);
        return;
    }

    // 화면에 뿌리기
    const ul = document.getElementById('client-list-ul');
    if(data.length === 0) {
        ul.innerHTML = '<li>데이터가 없습니다.</li>';
    } else {
        ul.innerHTML = data.map(client => `<li>${client.name} (${client.contact_person})</li>`).join('');
    }
}