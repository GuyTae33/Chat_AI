/* ================================================================
   UI 조작 — 메시지 렌더링, 타이핑 인디케이터, 퀵버튼, 배너, 로딩
================================================================ */
import { esc, nowStr } from './utils.js';

/* ── DOM 참조 (DOMContentLoaded 이후에 초기화) ── */
let $msgs, $inp, $sendBtn, $quickArea, $banner, $statusTxt;
let isLoading = false;

export function initUI() {
  $msgs      = document.getElementById('messages');
  $inp       = document.getElementById('inp');
  $sendBtn   = document.getElementById('sendBtn');
  $quickArea = document.getElementById('quickArea');
  $banner    = document.getElementById('banner');
  $statusTxt = document.getElementById('statusText');
}

/* ── 로딩 상태 ── */
export function getIsLoading() { return isLoading; }

export function setLoading(val) {
  isLoading = val;
  $inp.disabled = val;
  $sendBtn.disabled = val || !$inp.value.trim();
  if (val) showTyping(); else hideTyping();
}

/* ── 입력창 자동 높이 조정 ── */
export function autoResize() {
  $inp.style.height = 'auto';
  $inp.style.height = Math.min($inp.scrollHeight, 120) + 'px';
}

export function getInputValue() { return $inp.value.trim(); }
export function clearInput() { $inp.value = ''; }

/* ── 이벤트 리스너 등록 (chat.js에서 send 콜백 주입) ── */
export function initInputListeners(onSend) {
  $inp.addEventListener('input', () => {
    autoResize();
    $sendBtn.disabled = isLoading || !$inp.value.trim();
  });
  $inp.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend(); }
  });
  $sendBtn.addEventListener('click', onSend);
}

/* ── 스크롤 ── */
export function scrollBottom() { $msgs.scrollTop = $msgs.scrollHeight; }

/* ── 메시지 추가 ── */
export function addMsg(role, text) {
  const clean = text.replace(/```json[\s\S]*?```/g, '').trim();

  const row = document.createElement('div');
  row.className = `row ${role}`;

  if (role === 'bot') {
    row.innerHTML = `<div class="av">👩‍💼</div>
      <div class="bubble bot">${esc(clean)}</div>`;
  } else {
    row.innerHTML = `<div class="bubble user">${esc(clean)}</div>`;
  }

  const time = document.createElement('div');
  time.className = `msg-time ${role}`;
  time.textContent = nowStr();

  $msgs.appendChild(row);
  $msgs.appendChild(time);
  scrollBottom();
}

/* ── 예시 이미지 메시지 추가 ── */
export function addImageMsg(imgUrl, label) {
  const row = document.createElement('div');
  row.className = 'row bot';

  const av = document.createElement('div');
  av.className = 'av';
  av.textContent = '👩‍💼';
  row.appendChild(av);

  const wrap = document.createElement('div');
  wrap.style.display = 'flex';
  wrap.style.flexDirection = 'column';

  const img = document.createElement('img');
  img.src = imgUrl;
  img.className = 'img-example';
  img.alt = label || '드레스룸 예시 이미지';
  img.onclick = () => window.open(imgUrl, '_blank', 'noopener,noreferrer');
  img.onerror = () => { wrap.remove(); };

  const lbl = document.createElement('div');
  lbl.className = 'img-example-label';
  lbl.textContent = label || '📐 고객님 구성과 유사한 예시입니다';

  wrap.appendChild(img);
  wrap.appendChild(lbl);
  row.appendChild(wrap);

  $msgs.appendChild(row);
  const time = document.createElement('div');
  time.className = 'msg-time bot';
  time.textContent = nowStr();
  $msgs.appendChild(time);
  scrollBottom();
}

/* ── 타이핑 인디케이터 ── */
export function showTyping() {
  const el = document.createElement('div');
  el.className = 'typing';
  el.id = 'typing';
  el.innerHTML = `<div class="av">👩‍💼</div>
    <div class="typing-bubble">
      <div class="td"></div><div class="td"></div><div class="td"></div>
    </div>`;
  $msgs.appendChild(el);
  scrollBottom();
}

export function hideTyping() {
  document.getElementById('typing')?.remove();
}

/* ── 퀵 버튼 ── */
export function setQuick(labels, isChoice = false) {
  $quickArea.innerHTML = '';
  if (!labels || labels.length === 0) return;

  const hint = document.createElement('div');
  hint.className = 'quick-hint-label';
  hint.textContent = isChoice
    ? '아래 버튼을 눌러 선택해 주세요'
    : '💡 예시 — 직접 입력해도 됩니다';
  $quickArea.appendChild(hint);

  const wrap = document.createElement('div');
  wrap.className = 'quick-btns';

  labels.forEach(label => {
    const b = document.createElement('button');
    b.className = isChoice ? 'qbtn choice' : 'qbtn';
    b.textContent = label;
    b.onclick = () => {
      $inp.value = label;
      // chat.js에서 등록한 send를 호출하기 위해 sendBtn click 이벤트 발생
      $sendBtn.click();
    };
    wrap.appendChild(b);
  });

  $quickArea.appendChild(wrap);
}

/* ── AI 응답에서 퀵 버튼 힌트 자동 감지 ── */
export function updateQuickFromText(text) {
  if (/(드레스룸\s*형태|형태.*어떻게|1자형|ㄱ자형|ㄷ자형|11자형)/.test(text)) {
    setQuick(['1자형', 'ㄱ자형', 'ㄷ자형', '11자형'], true); return;
  }
  if (/(개인정보\s*수집|동의해\s*주시겠어요)/.test(text)) {
    setQuick(['동의합니다', '동의하지 않습니다'], true); return;
  }
  if (/(맞으신가요|확인해\s*주시면\s*접수)/.test(text)) {
    setQuick(['네, 맞아요! 접수해주세요', '수정할 내용이 있어요'], true); return;
  }
  setQuick([]);
}

/* ── 서버 상태 배너 ── */
export function setBanner(type, msg = '') {
  $banner.className = 'banner' + (type ? ' ' + type : '');
  $banner.textContent = msg;
}

/* ── 헤더 상태 텍스트 ── */
export function setStatusText(text) {
  $statusTxt.textContent = text;
  const $pcStatus = document.getElementById('pcStatusText');
  if ($pcStatus) $pcStatus.textContent = text;
}

/* ── 날짜 구분선 초기화 ── */
export function initDateSep(text) {
  const el = document.getElementById('dateSep');
  if (el) el.textContent = text;
}

/* ── 새 날짜 구분선 삽입 ── */
export function appendDateSep(text) {
  const sep = document.createElement('div');
  sep.className = 'date-sep';
  sep.textContent = text;
  $msgs.appendChild(sep);
}

/* ── 메시지 목록 초기화 ── */
export function clearMessages() {
  $msgs.innerHTML = '';
}
