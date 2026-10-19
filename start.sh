#!/bin/bash
# start Ledger emulator (Nano X + Ethereum app) if not running
cd "$(dirname "$0")"
which qemu-arm-static >/dev/null || (sudo apt-get update -qq && sudo apt-get install -y -qq qemu-user-static)
pgrep -f "speculos --model" >/dev/null || (. venv/bin/activate && nohup speculos --model nanox --display headless --api-port 5000 --apdu-port 9999 apps/eth.elf > speculos.log 2>&1 &)
sleep 6; curl -s "localhost:5000/events?currentscreenonly=true"; echo
