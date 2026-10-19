#!/usr/bin/env node
// Tiny Ledger CLI for the Ethereum app: Speculos emulator by default, a real Ledger over USB with --usb.
// usage: node ledger-sim.mjs address | sign-message "<text>" | sign-tx <to> <ethAmount> [--approve] [--usb]
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const SpeculosTransport = require("@ledgerhq/hw-transport-node-speculos").default;
const AppEth = require("@ledgerhq/hw-app-eth").default;
const { ethers } = require("ethers");

const API = process.env.SPECULOS_API || "http://127.0.0.1:5000";
const APDU_PORT = Number(process.env.SPECULOS_APDU_PORT || 9999);
const PATH = "44'/60'/0'/0/0";
const useUsb = process.argv.includes("--usb") || process.env.LEDGER_TRANSPORT === "usb";
const autoApprove = !useUsb && process.argv.includes("--approve");
const args = process.argv.slice(2).filter(a => a !== "--approve" && a !== "--usb");
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function screen() {
  const r = await fetch(`${API}/events?currentscreenonly=true`);
  return ((await r.json()).events || []).map(e => e.text).join(" | ");
}
async function press(btn) {
  await fetch(`${API}/button/${btn}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "press-and-release" }) });
  await sleep(250);
}
// Walk the review screens, print them, press both buttons on the approve screen.
async function reviewAndApprove() {
  if (useUsb) { console.log("  review the transaction on your Ledger and approve or reject it there"); return; }
  await sleep(800);
  let last = "";
  for (let i = 0; i < 40; i++) {
    const s = await screen();
    if (s && s !== last) { console.log("  device:", s); last = s; }
    if (/^(approve|accept|sign)/i.test(s) || /\b(sign transaction|sign message|accept and send)\b/i.test(s)) {
      if (!autoApprove) { console.log("  waiting for approval: press both buttons in the emulator UI"); return; }
      await press("both");
      console.log("  ✔ approved on device");
      return;
    }
    await press("right");
  }
}

// Real device: unlock it and open the Ethereum app first. The private key never leaves the device.
const transport = useUsb
  ? await require("@ledgerhq/hw-transport-node-hid").default.create()
  : await SpeculosTransport.open({ apduPort: APDU_PORT });
console.log(useUsb ? "transport: real Ledger over USB" : "transport: Speculos emulator");
const eth = new AppEth(transport);
try {
  const cmd = args[0];
  if (cmd === "address") {
    const { address } = await eth.getAddress(PATH);
    console.log(address);
  } else if (cmd === "sign-message") {
    const msg = args[1] || "hello ledger";
    const p = eth.signPersonalMessage(PATH, Buffer.from(msg).toString("hex"));
    await reviewAndApprove();
    const s = await p;
    const sig = ethers.Signature.from({ r: "0x" + s.r, s: "0x" + s.s, v: s.v }).serialized;
    console.log("signature:", sig);
    console.log("recovered:", ethers.verifyMessage(msg, sig));
  } else if (cmd === "sign-tx") {
    const [to, amount] = [args[1], args[2] || "0.01"];
    const tx = ethers.Transaction.from({ type: 2, chainId: 11155111, nonce: 0, to, value: ethers.parseEther(amount),
      gasLimit: 21000n, maxFeePerGas: ethers.parseUnits("20", "gwei"), maxPriorityFeePerGas: ethers.parseUnits("1", "gwei") });
    const raw = tx.unsignedSerialized.slice(2);
    const p = eth.signTransaction(PATH, raw, null);
    await reviewAndApprove();
    const s = await p;
    tx.signature = { r: "0x" + s.r, s: "0x" + s.s, v: parseInt(s.v, 16) };
    console.log("signed (sepolia, not broadcast):", tx.serialized);
    console.log("from:", tx.from);
  } else {
    console.log("usage: address | sign-message <text> [--approve] | sign-tx <to> <eth> [--approve] [--usb]");
  }
} finally {
  await transport.close();
}
