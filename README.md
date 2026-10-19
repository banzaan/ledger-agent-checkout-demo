# Ledger agent checkout demo

A demo for #LedgerOp3n2026 Phase 1: *your agent wants to spend $900 on a flight that's 40% cheaper. Would you approve it?*

An agent finds a Paris → Singapore flight for $900 instead of $1,500 and asks for permission to pay. The user checks the deal with the agent first (the 40% can turn out to be CAD vs USD, about 17% real saving), then reviews and signs the payment on a Ledger Nano X emulator. The agent suggests. The human signs.

Built with [Hark](https://hark.com).

## Flow

1. `/`: flight results with the agent chat
2. `/checkout`: pay with Ledger signer
3. `/signer`: live Nano X screen with left, right and both buttons to review and sign or reject
4. `/confirmation`: boarding pass with the signed Sepolia transaction hash

## Stack

- [Speculos](https://github.com/LedgerHQ/speculos), Ledger's official emulator, running Nano X with the Ethereum app 1.22.3 (`apps/eth.elf`)
- `@ledgerhq/hw-app-eth` and `@ledgerhq/hw-transport-node-speculos`
- Node server (`cli/server.mjs`) and a small signing CLI (`cli/ledger-sim.mjs`)

## Run

```bash
python3 -m venv venv && . venv/bin/activate && pip install speculos
cd cli && npm install && cd ..
./start-checkout.sh   # emulator, server on :8080, Cloudflare quick tunnel
```

CLI:

```bash
node cli/ledger-sim.mjs address
node cli/ledger-sim.mjs sign-message "hello" --approve
node cli/ledger-sim.mjs sign-tx --approve
```

## Safety

- Sepolia testnet only. The emulator uses Speculos' public default seed. Never send real funds to its address.
- Transactions are signed but never broadcast. The merchant address is a dummy.
- Anyone with the public signer link can press the emulator buttons. Add auth before sharing widely.
