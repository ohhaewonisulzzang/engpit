import { createClient } from '@supabase/supabase-js';
import { RANKING } from '../config.js';

/* =========================================================
   경쟁전 연결
   - 매칭: Supabase Realtime 채널의 presence로 기다리는 사람을 보고 둘씩 짝을 짓는다
     (빠른 대전은 전체 대기열, 친구 대전은 방 코드별 채널)
   - 매치: 두 사람이 매치 채널에 들어오면 WebRTC로 기기끼리 직접 연결(P2P)해서 게임 데이터를 주고받고,
     직접 연결이 안 되면 Realtime 채널로 대신 보낸다. 밴픽 같은 중요한 메시지는 항상 채널로 보낸다
   ========================================================= */
let sb = null;
const client = () => sb || (sb = createClient(RANKING.url, RANKING.key, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  realtime: { params: { eventsPerSecond: 30 } },
}));
const drop = ch => { try { ch.untrack(); } catch (e) {} client().removeChannel(ch); };

/* ---------- 매칭 ----------
   me: { uid, name, pts }, room: null(빠른 대전) 또는 { code, creator }
   createMatch(상대 uid) → 매치 id (호스트만), joinMatch(매치 id) (게스트만)
   onFound({ role: 'host'|'guest', matchId, opp: { uid, name, pts } }) */
export function findMatch({ me, room, createMatch, joinMatch, onFound, onError }) {
  const name = room ? `pvp-room-${room.code}` : 'pvp-queue';
  const ch = client().channel(name, { config: { presence: { key: me.uid }, broadcast: { self: false } } });
  const since = Date.now();
  let done = false, pending = null, retryT = 0;

  const people = () => Object.entries(ch.presenceState())
    .map(([uid, metas]) => ({ uid, ...metas[0] }))
    .filter(p => p.ts)
    .sort((a, b) => a.ts - b.ts || (a.uid < b.uid ? -1 : 1));
  const finish = r => { if (done) return; done = true; clearTimeout(retryT); drop(ch); onFound(r); };

  // 내가 호스트면 상대를 정해서 초대한다
  function tryPair() {
    if (done || pending) return;
    const list = people(), i = list.findIndex(p => p.uid === me.uid);
    if (i < 0) return;
    let partner, host;
    if (room) { // 방 코드: 방을 만든 사람이 호스트, 먼저 들어온 다른 사람이 상대
      if (!room.creator) return;
      partner = list.find(p => p.uid !== me.uid); host = true;
    } else {    // 빠른 대전: 먼저 온 순서로 둘씩 짝, uid가 작은 쪽이 호스트
      partner = list[i % 2 === 0 ? i + 1 : i - 1]; host = partner && me.uid < partner.uid;
    }
    if (!partner || !host) return;
    pending = { partner };
    createMatch(partner.uid).then(matchId => {
      if (done) return;
      pending.matchId = matchId;
      ch.send({ type: 'broadcast', event: 'invite', payload: { to: partner.uid, from: me.uid, matchId } });
      // 5초 안에 수락이 없으면 다시 짝을 찾음
      retryT = setTimeout(() => { if (!done) { pending = null; tryPair(); } }, 5000);
    }).catch(e => { pending = null; onError?.(e); });
  }
  ch.on('presence', { event: 'sync' }, tryPair);
  ch.on('broadcast', { event: 'invite' }, ({ payload: p }) => {
    if (done || p.to !== me.uid) return;
    const opp = people().find(x => x.uid === p.from) || { uid: p.from, name: '상대', pts: 0 };
    joinMatch(p.matchId).then(() => {
      ch.send({ type: 'broadcast', event: 'accept', payload: { to: p.from, matchId: p.matchId } });
      finish({ role: 'guest', matchId: p.matchId, opp: { uid: opp.uid, name: opp.name, pts: opp.pts } });
    }).catch(e => onError?.(e));
  });
  ch.on('broadcast', { event: 'accept' }, ({ payload: p }) => {
    if (done || p.to !== me.uid || !pending || p.matchId !== pending.matchId) return;
    const o = pending.partner;
    finish({ role: 'host', matchId: p.matchId, opp: { uid: o.uid, name: o.name, pts: o.pts } });
  });
  ch.subscribe(st => {
    if (st === 'SUBSCRIBED') ch.track({ name: me.name, pts: me.pts, ts: since });
    else if (st === 'CHANNEL_ERROR' || st === 'TIMED_OUT') onError?.(new Error(st));
  });
  return { cancel() { if (done) return; done = true; clearTimeout(retryT); drop(ch); } };
}

/* ---------- 매치 연결 ----------
   돌려주는 conn:
   - ctl(msg): 중요한 메시지 (채널로, 순서대로)
   - send(msg): 게임 데이터 (P2P가 열려 있으면 직접, 아니면 채널로)
   - conn.p2p: 직접 연결 여부
   - on(fn): 받은 메시지 (ctl과 게임 데이터 모두)
   - onState(fn): 'ready'(둘 다 들어옴) | 'p2p'(직접 연결됨) | 'left'(상대 나감) | 'back'(상대 돌아옴) */
const ICE = { iceServers: [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }] };
// 매치 채널은 비공개(private): 로그인 토큰으로 들어가고, 서버 규칙(pvp.sql의 realtime 정책)이
// 그 매치의 두 사람만 읽고 쓸 수 있게 막는다. 매치 id를 알아도 남은 끼어들 수 없음
export function connectMatch({ matchId, role, me, opp, token }) {
  client().realtime.setAuth(token);
  const ch = client().channel(`pvp-m-${matchId}`, { config: { private: true, presence: { key: me.uid }, broadcast: { self: false } } });
  const subs = new Set(), states = new Set();
  const emit = m => subs.forEach(f => f(m)), state = s => states.forEach(f => f(s));
  let ready = false, here = false, pc = null, dc = null, ice = [], closed = false;
  const conn = {
    p2p: false,
    on: f => subs.add(f), onState: f => states.add(f),
    ctl: m => ch.send({ type: 'broadcast', event: 'c', payload: m }),
    send(m) {
      if (dc?.readyState === 'open') { try { dc.send(JSON.stringify(m)); return; } catch (e) {} }
      ch.send({ type: 'broadcast', event: 'g', payload: m });
    },
    close() {
      if (closed) return; closed = true;
      try { dc?.close(); pc?.close(); } catch (e) {}
      drop(ch); subs.clear(); states.clear();
    },
  };

  /* WebRTC: 호스트가 제안(offer)을 만들고, 신호는 채널로 주고받는다 */
  function setupDC(c) {
    dc = c;
    dc.onopen = () => { conn.p2p = true; state('p2p'); };
    dc.onclose = () => { conn.p2p = false; };
    dc.onmessage = e => { try { emit(JSON.parse(e.data)); } catch (er) {} };
  }
  function makePC() {
    pc = new RTCPeerConnection(ICE);
    pc.onicecandidate = e => { if (e.candidate) conn.ctl({ k: 'ice', c: e.candidate.toJSON() }); };
    pc.ondatachannel = e => setupDC(e.channel);
    return pc;
  }
  async function startP2P() {
    if (typeof RTCPeerConnection === 'undefined') return;
    makePC();
    setupDC(pc.createDataChannel('g', { ordered: false, maxRetransmits: 0 }));
    await pc.setLocalDescription(await pc.createOffer());
    conn.ctl({ k: 'sdp', d: pc.localDescription.toJSON() });
  }
  async function onSignal(m) {
    try {
      if (m.k === 'sdp') {
        if (m.d.type === 'offer') {
          if (pc) { try { pc.close(); } catch (e) {} }
          makePC();
          await pc.setRemoteDescription(m.d);
          await pc.setLocalDescription(await pc.createAnswer());
          conn.ctl({ k: 'sdp', d: pc.localDescription.toJSON() });
        } else if (pc) await pc.setRemoteDescription(m.d);
        for (const c of ice.splice(0)) await pc.addIceCandidate(c);
      } else if (m.k === 'ice') {
        if (pc?.remoteDescription) await pc.addIceCandidate(m.c); else ice.push(m.c);
      }
    } catch (e) { /* 직접 연결이 안 되면 채널로 계속 주고받음 */ }
  }

  ch.on('broadcast', { event: 'c' }, ({ payload: m }) => {
    if (m.k === 'sdp' || m.k === 'ice') return onSignal(m);
    emit(m);
  });
  ch.on('broadcast', { event: 'g' }, ({ payload: m }) => emit(m));
  ch.on('presence', { event: 'sync' }, () => {
    const oppHere = !!ch.presenceState()[opp.uid];
    if (oppHere && !ready) {
      ready = true; here = true; state('ready');
      if (role === 'host') setTimeout(() => startP2P().catch(() => {}), 300);
    } else if (ready && oppHere !== here) { here = oppHere; state(here ? 'back' : 'left'); }
  });
  ch.subscribe(st => {
    if (st === 'SUBSCRIBED') ch.track({ name: me.name, at: Date.now() });
    else if (st === 'CHANNEL_ERROR' || st === 'TIMED_OUT') state('error');
  });
  return conn;
}
