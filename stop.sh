#!/bin/bash

PID_FILE=".services.pids"

PORTS=(8000 3005 3007 3012 3013 3020 3021 5173 5174 5175 5176)

kill_port() {
  local port=$1
  local pids
  pids=$(lsof -t -i:$port 2>/dev/null || true)

  if [ -n "$pids" ]; then
    echo "Killing process(es) on port $port: $pids"
    kill -9 $pids || true
  else
    echo "Port $port already free"
  fi
}

echo "Stopping services..."

if [ -f "$PID_FILE" ]; then
  while read -r pid; do
    if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
      echo "Stopping PID $pid"
      kill -9 "$pid" || true
    fi
  done < "$PID_FILE"

  rm -f "$PID_FILE"
fi

echo "Cleaning ports..."
for port in "${PORTS[@]}"; do
  kill_port "$port"
done

echo "All services stopped"
