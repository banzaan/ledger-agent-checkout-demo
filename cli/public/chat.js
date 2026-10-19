// Floating AI agent chat for SkyAgent. Scripted, alternates the safety verdict on every check.
(function () {
  const css = `
  #ag-fab{position:fixed;right:24px;bottom:24px;width:62px;height:62px;border-radius:50%;border:0;cursor:pointer;z-index:9999;
    background:linear-gradient(135deg,#ff5300,#ffb800);box-shadow:0 10px 30px #0b2a5b55;font-weight:800;font-size:18px;color:#000}
  #ag-fab .badge{position:absolute;top:-2px;right:-2px;background:#e63946;color:#fff;border-radius:99px;font-size:11px;padding:2px 6px}
  #ag-box{position:fixed;right:24px;bottom:98px;width:380px;max-width:calc(100vw - 32px);height:540px;max-height:calc(100vh - 130px);
    background:#fff;border-radius:18px;box-shadow:0 20px 50px #0b2a5b44;display:none;flex-direction:column;overflow:hidden;z-index:9999;font-family:Inter,system-ui,sans-serif}
  #ag-box.open{display:flex}
  .ag-head{background:#0b2a5b;color:#fff;padding:14px 16px;display:flex;align-items:center;gap:10px}
  .ag-head .av{width:34px;height:34px;border-radius:50%;background:linear-gradient(135deg,#ff5300,#ffb800);color:#000;font-weight:800;display:grid;place-items:center}
  .ag-head small{display:block;opacity:.7;font-size:11px}.ag-head .x{margin-left:auto;cursor:pointer;opacity:.8;font-size:20px;background:none;border:0;color:#fff}
  .ag-msgs{flex:1;overflow-y:auto;padding:14px;background:#f3f5f9;display:flex;flex-direction:column;gap:10px}
  .ag-m{max-width:85%;padding:10px 13px;border-radius:14px;font-size:14px;line-height:1.45;white-space:pre-wrap}
  .ag-m.bot{background:#fff;color:#14213d;border-bottom-left-radius:4px;align-self:flex-start;box-shadow:0 1px 2px #0001}
  .ag-m.me{background:#0b2a5b;color:#fff;border-bottom-right-radius:4px;align-self:flex-end}
  .ag-m.warn{background:#fff1f0;border:1px solid #ffb3ad}.ag-m.good{background:#effaf3;border:1px solid #9fe0b8}
  .ag-think{font-size:12px;color:#7a869a;align-self:flex-start;padding:2px 4px}
  .ag-think span{display:block;animation:agf .3s ease}
  @keyframes agf{from{opacity:0;transform:translateY(4px)}to{opacity:1}}
  .ag-dots{display:inline-flex;gap:3px;margin-left:4px}.ag-dots i{width:5px;height:5px;border-radius:50%;background:#7a869a;animation:agb 1s infinite}
  .ag-dots i:nth-child(2){animation-delay:.15s}.ag-dots i:nth-child(3){animation-delay:.3s}
  @keyframes agb{0%,100%{opacity:.25}50%{opacity:1}}
  .ag-chips{display:flex;gap:6px;flex-wrap:wrap;padding:8px 12px 0;background:#fff}
  .ag-chips button{border:1px solid #dde3ee;background:#fff;border-radius:99px;padding:6px 10px;font-size:12px;cursor:pointer;color:#0b2a5b}
  .ag-in{display:flex;gap:8px;padding:12px;background:#fff;border-top:1px solid #eef1f6}
  .ag-in input{flex:1;border:1px solid #dde3ee;border-radius:10px;padding:10px 12px;font-size:14px;outline:none}
  .ag-in button{background:#0b2a5b;color:#fff;border:0;border-radius:10px;padding:0 14px;cursor:pointer;font-weight:700}`;
  const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);

  const fab = document.createElement("button"); fab.id = "ag-fab"; fab.innerHTML = 'AI<span class="badge">1</span>';
  const box = document.createElement("div"); box.id = "ag-box";
  box.innerHTML = `<div class="ag-head"><div class="av">AI</div><div><b>Your agent</b><small>Booking assistant · online</small></div><button class="x">×</button></div>
    <div class="ag-msgs" id="ag-msgs"></div>
    <div class="ag-chips"><button data-q="Check if this transaction is safe or a scam">Is this safe or a scam?</button><button data-q="Why is it so cheap?">Why so cheap?</button><button data-q="Book it">Book it</button></div>
    <form class="ag-in"><input id="ag-text" placeholder="Message your agent…" autocomplete="off"><button>Send</button></form>`;
  document.body.append(fab, box);
  const msgs = box.querySelector("#ag-msgs"), input = box.querySelector("#ag-text");

  const KEY = "skyagent-chat-v2";
  let hist = [];
  const save = () => {};
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  function render(m) {
    const d = document.createElement("div");
    d.className = "ag-m " + m.who + (m.tone ? " " + m.tone : "");
    d.textContent = m.text; msgs.appendChild(d); msgs.scrollTop = msgs.scrollHeight;
  }
  function add(who, text, tone) { const m = { who, text, tone }; hist.push(m); save(); render(m); }

  const OPENING = "I found the same flight you were about to book for 40% less on another platform.\n\nSingapore Airlines SQ 335 · Paris → Singapore · Oct 20\nWas $1,500 → now $900\n\nMay I spend $900 from your wallet to complete the booking? You'll sign the final payment on your Ledger.";
  if (!hist.length) add("bot", OPENING); else hist.forEach(render);

  async function think(steps) {
    const t = document.createElement("div"); t.className = "ag-think";
    t.innerHTML = '<span>Thinking<span class="ag-dots"><i></i><i></i><i></i></span></span>';
    msgs.appendChild(t); msgs.scrollTop = msgs.scrollHeight;
    await sleep(900);
    for (const s of steps) { const e = document.createElement("span"); e.textContent = "• " + s; t.appendChild(e); msgs.scrollTop = msgs.scrollHeight; await sleep(900 + Math.random() * 500); }
    await sleep(500); t.remove();
  }

  const reCheck = /safe|scam|fraud|legit|check|verify|trust/i;
  const reCheap = /cheap|why|discount/i;
  const reBook = /book|buy|pay|approve|go ahead/i;

  async function reply(q) {
    if (reCheck.test(q)) {
      await think(["Comparing both listings…", "Checking the merchant and wallet address…", "Checking currency and fare rules…"]);
      const r = await (await fetch("/api/check", { method: "POST" })).json();
      if (r.verdict === "promo") {
        add("bot", "I checked ✅\nThe discount is real. This platform gives a 40% welcome discount on your first booking, and this fare qualifies. Same flight, same seat, flexible fare. The merchant is verified and the payment address matches their published one.\n\nWant me to book it? You'll sign the final payment on your Ledger.", "good");
      } else {
        add("bot", "I checked ⚠️\nThis isn't a 40% discount. The $1,500 on the other site was in Canadian dollars, and the $900 here is in US dollars. CA$1,500 is about US$1,080, so the real saving is roughly 17%, not 40%.\n\nNot a scam, but my comparison was wrong. It's still cheaper. Do you want to continue?", "warn");
      }
      return;
    }
    await think(["Reading your message…"]);
    if (reBook.test(q)) {
      add("bot", "Okay. Opening checkout. Nothing moves until you sign on your Ledger.");
      await sleep(1200); if (location.pathname !== "/checkout") location.href = "/checkout"; return;
    }
    if (reCheap.test(q)) {
      add("bot", "The same Singapore Airlines flight is listed lower on another platform. Want me to check whether the deal is safe before you pay?");
      return;
    }
    add("bot", "I'm here to help with this booking. I can check whether the transaction is safe, or take you to checkout.");
  }

  let busy = false;
  async function sendQ(q) {
    if (!q.trim() || busy) return; busy = true;
    add("me", q); input.value = "";
    try { await reply(q); } finally { busy = false; }
  }
  box.querySelector("form").onsubmit = e => { e.preventDefault(); sendQ(input.value); };
  box.querySelectorAll(".ag-chips button").forEach(b => b.onclick = () => sendQ(b.dataset.q));
  const open = () => { box.classList.add("open"); fab.querySelector(".badge")?.remove(); input.focus(); };
  fab.onclick = () => box.classList.contains("open") ? box.classList.remove("open") : open();
  box.querySelector(".x").onclick = () => box.classList.remove("open");
  if (location.pathname === "/") setTimeout(open, 1200);
})();
