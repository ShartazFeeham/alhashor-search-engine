#!/bin/bash
# Usage: scripts/with-server.sh <port> "<start command>" <command...>
# Starts a server, waits until it answers, runs the command, then stops the server.
set -u
PORT="$1"; START="$2"; shift 2
bash -c "exec $START" >/dev/null 2>&1 &
cleanup() { lsof -ti "tcp:$PORT" | xargs kill 2>/dev/null; }
trap cleanup EXIT
for _ in $(seq 1 90); do
  curl -s -o /dev/null "http://localhost:$PORT/" && break
  sleep 1
done
"$@"
