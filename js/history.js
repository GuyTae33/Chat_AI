/* ================================================================
   이전 상담 이력 드로어 — 목록 렌더링, 채팅 원문 오버레이
================================================================ */
import { MOCK_PREV_HISTORY } from './config.js';
import { esc } from './utils.js';
import { addMsg } from './ui.js';

export function toggleHistory() {
  const drawer = document.getElementById('historyDrawer');
  const isOpen = drawer.classList.contains('open');

  // 이전상담 열 때 수집현황은 닫기
  if (!isOpen) {
    document.getElementById('collectDrawer').classList.remove('open');
  }
  drawer.classList.toggle('open');

  if (!isOpen) renderHistoryList();
}

function renderHistoryList() {
  const container = document.getElementById('historyList');
  const list = MOCK_PREV_HISTORY;

  document.getElementById('historyCountBadge').textContent = list.length + '건';

  if (list.length === 0) {
    container.innerHTML = `<div style="text-align:center;padding:24px;color:var(--gray-400);font-size:13px">이전 상담 내역이 없습니다</div>`;
    return;
  }

  container.innerHTML = list.map((s, i) => `
    <div class="history-session">
      <div class="history-session-head">
        <span class="hs-num">${i + 1}회차</span>
        <span class="hs-date">${esc(s.마지막상담일시)}</span>
        <span class="hs-sid">${esc(s.세션ID)}</span>
        ${s.재상담여부 ? '<span class="hs-rebadge">재상담</span>' : ''}
      </div>
      <div class="history-session-body">
        <div class="hs-summary">${esc(s.요약)}</div>
        <div class="hs-tags">
          ${Object.entries(s.주요항목 || {}).map(([k, v]) =>
            `<span class="hs-tag">${esc(k)}: ${esc(v)}</span>`
          ).join('')}
        </div>
        <div class="hs-last">
          <b>마지막 질문:</b> ${esc(s.마지막질문)}<br>
          <b>마지막 답변:</b> ${esc(s.마지막답변)}
        </div>
      </div>
      <div class="hs-btns">
        <button class="hs-btn outline" onclick="showTranscript(${i})">💬 원문 보기</button>
        <button class="hs-btn primary" onclick="continueFromHistory(${i})">이어서 상담하기 →</button>
      </div>
    </div>
  `).join('');
}

export function showTranscript(idx) {
  const s = MOCK_PREV_HISTORY[idx];
  if (!s) return;

  document.getElementById('tTitle').textContent = `채팅 원문 — ${s.세션ID}`;
  document.getElementById('tMeta').textContent =
    `${s.시작일시} ~ ${s.종료일시}  |  ${s.메시지목록.length}개 메시지`;

  const msgs = document.getElementById('tMsgs');
  msgs.innerHTML = s.메시지목록.map(m => `
    <div class="t-row ${m.role}">
      ${m.role === 'bot' ? '<div class="t-av">👩‍💼</div>' : ''}
      <div class="t-bubble ${m.role}">${esc(m.content)}</div>
    </div>
    <div class="t-time ${m.role}">${m.time || ''}</div>
  `).join('');

  document.getElementById('transcriptOverlay').classList.add('open');
  msgs.scrollTop = 0;
}

export function closeTranscript(e) {
  if (e && e.target !== document.getElementById('transcriptOverlay')) return;
  document.getElementById('transcriptOverlay').classList.remove('open');
}

export function continueFromHistory(idx) {
  const s = MOCK_PREV_HISTORY[idx];
  document.getElementById('historyDrawer').classList.remove('open');
  setTimeout(() => {
    addMsg('bot',
      `이전 상담 내역이 있습니다 😊\n\n` +
      `📅 마지막 상담: ${s.마지막상담일시}\n` +
      `📍 ${s.주요항목.지역 || '-'} · ${s.주요항목.형태 || '-'}\n\n` +
      `이전에 상담하셨던 내용을 바탕으로 이어서 진행할까요?\n변경하실 내용이 있으시면 말씀해 주세요!`
    );
  }, 400);
}
