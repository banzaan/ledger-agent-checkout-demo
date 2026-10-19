#!/bin/bash
# starts emulator, checkout server :8080, quick tunnel (each in its own session so they outlive the shell); prints URL
cd "$(dirname "$0")"
which qemu-arm-static >/dev/null || (sudo apt-get update -qq && sudo apt-get install -y -qq qemu-user-static)
pgrep -x speculos >/dev/null || pgrep -f "bin/speculos --model" >/dev/null || (. venv/bin/activate; setsid nohup speculos --model nanox --display headless --api-port 5000 --apdu-port 9999 apps/eth.elf > speculos.log 2>&1 < /dev/null &)
curl -s -o /dev/null localhost:8080/ || (cd cli && setsid nohup node server.mjs > server.log 2>&1 < /dev/null &)
[ -x /tmp/cloudflared ] || (curl -sL -o /tmp/cloudflared https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64 && chmod +x /tmp/cloudflared)
pgrep -x cloudflared >/dev/null || (setsid nohup /tmp/cloudflared tunnel --no-autoupdate --url http://localhost:8080 > /tmp/cf.log 2>&1 < /dev/null &)
sleep 15; grep -o "https://[a-z0-9-]*\.trycloudflare\.com" /tmp/cf.log | tail -1
