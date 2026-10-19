// Checkout demo: AI agent proposes a $900 flight, user signs on the Ledger emulator.
import http from "http";
import fs from "fs";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const SpeculosTransport = require("@ledgerhq/hw-transport-node-speculos").default;
const AppEth = require("@ledgerhq/hw-app-eth").default;
const { ethers } = require("ethers");

const API = "http://127.0.0.1:5000";
const PORT = Number(process.env.PORT || 8080);
const PATH = "44'/60'/0'/0/0";
const MERCHANT = "0x9A1e2B3c4D5e6F708192a3B4c5D6e7F8091a2B3C";
const AMOUNT_ETH = "0.36"; // $900 shown as test ETH on Sepolia

let state = { status: "idle" }; // idle | waiting | signed | rejected | error
let nonce = 0;
let checks = 0; // alternates: promo, currency, promo, ...

async function sign() {
  const transport = await SpeculosTransport.open({ apduPort: 9999 });
  try {
    const eth = new AppEth(transport);
    const tx = ethers.Transaction.from({
      type: 2, chainId: 11155111, nonce: nonce++, to: ethers.getAddress(MERCHANT.toLowerCase()),
      value: ethers.parseEther(AMOUNT_ETH), gasLimit: 21000n,
      maxFeePerGas: ethers.parseUnits("20", "gwei"), maxPriorityFeePerGas: ethers.parseUnits("1", "gwei"),
    });
    const s = await eth.signTransaction(PATH, tx.unsignedSerialized.slice(2), null);
    tx.signature = { r: "0x" + s.r, s: "0x" + s.s, v: parseInt(s.v, 16) };
    state = { status: "signed", from: tx.from, to: tx.to, hash: tx.hash, raw: tx.serialized };
  } catch (e) {
    state = /6985|denied|reject/i.test(String(e?.message || e))
      ? { status: "rejected" } : { status: "error", error: String(e?.message || e) };
  } finally {
    await transport.close().catch(() => {});
  }
}

const send = (res, code, body, type = "application/json") => {
  res.writeHead(code, { "content-type": type, "cache-control": "no-store" });
  res.end(typeof body === "string" || Buffer.isBuffer(body) ? body : JSON.stringify(body));
};

http.createServer(async (req, res) => {
  try {
    const pages = { "/": "index.html", "/checkout": "checkout.html", "/signer": "signer.html", "/confirmation": "confirmation.html" };
    const pth = req.url.split("?")[0];
    if (pages[pth]) return send(res, 200, fs.readFileSync(new URL("./public/" + pages[pth], import.meta.url)), "text/html; charset=utf-8");
    if (pth === "/chat.js") return send(res, 200, fs.readFileSync(new URL("./public/chat.js", import.meta.url)), "text/javascript");
    if (pth === "/api/check" && req.method === "POST") return send(res, 200, { verdict: (checks++ % 2 === 0) ? "promo" : "currency" });
    if (pth === "/style.css") return send(res, 200, fs.readFileSync(new URL("./public/style.css", import.meta.url)), "text/css");
    if (req.url === "/api/pay" && req.method === "POST") {
      if (state.status === "waiting") return send(res, 409, state);
      state = { status: "waiting" };
      sign();
      return send(res, 200, state);
    }
    if (req.url === "/api/status") return send(res, 200, state);
    if (req.url.startsWith("/api/screen")) {
      const r = await fetch(`${API}/screenshot`);
      return send(res, 200, Buffer.from(await r.arrayBuffer()), "image/png");
    }
    const m = req.url.match(/^\/api\/button\/(left|right|both)$/);
    if (m && req.method === "POST") {
      await fetch(`${API}/button/${m[1]}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "press-and-release" }) });
      return send(res, 200, { ok: true });
    }
    send(res, 404, { error: "not found" });
  } catch (e) { send(res, 500, { error: String(e) }); }
}).listen(PORT, () => console.log("checkout on :" + PORT));
