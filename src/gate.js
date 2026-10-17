// 사이트 잠금 (점검 중): 들어오면 막힌 화면만 보이고 게임은 불러오지 않는다
// 막힌 화면에서 F5를 누르면 비밀번호 창이 뜨고, 맞히면 이 브라우저에서는 계속 열린다
// 비밀번호는 코드에 그대로 두지 않고 SHA-256 값만 둔다
const HASH = '621ada3b6c99e503f8fabf10e1e20dbf6397f02f8571a3065003bfa7f799643f';
const KEY = 'engpit_gate';
const sha = async t => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t)))].map(b => b.toString(16).padStart(2, '0')).join('');
const unlocked = () => { try { return localStorage.getItem(KEY) === HASH; } catch (e) { return false; } };

if (unlocked()) import('./main.js');
else lock();

function lock() {
  const css = document.createElement('style');
  css.textContent = `body>*:not(#siteLock){display:none!important}
#siteLock{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;padding:16px;background:var(--bg);z-index:999}
#siteLock .box{width:min(380px,100%);text-align:center;line-height:1.6}
#siteLock h1{font-size:24px;margin-bottom:8px}#siteLock p{color:var(--muted)}
#siteLock form{display:none;margin-top:24px;gap:8px;flex-direction:column}#siteLock form.show{display:flex}
#siteLock input{background:var(--bg2);border:1px solid var(--line);color:var(--text);border-radius:10px;padding:12px;font-size:16px;font-family:inherit}
#siteLock small{color:var(--red);min-height:1.4em}`;
  const el = document.createElement('div');
  el.id = 'siteLock';
  el.innerHTML = `<div class="box"><h1>점검 중이에요</h1><p>더 좋은 게임을 위해 점검하고 있어요.<br>잠시 후 다시 들어와 주세요.</p>
    <form><input type="password" placeholder="비밀번호" autocomplete="current-password"><button class="btn primary">들어가기</button><small></small></form></div>`;
  document.head.append(css); document.body.append(el);
  const form = el.querySelector('form'), input = form.querySelector('input'), msg = form.querySelector('small');
  addEventListener('keydown', e => {
    if (e.key !== 'F5' || !document.getElementById('siteLock')) return;
    e.preventDefault(); form.classList.add('show'); input.focus();
  });
  form.onsubmit = async e => {
    e.preventDefault();
    if (await sha(input.value) !== HASH) { msg.textContent = '비밀번호가 맞지 않아요.'; input.select(); return; }
    try { localStorage.setItem(KEY, HASH); } catch (x) {}
    el.remove(); css.remove();
    import('./main.js');
  };
}
