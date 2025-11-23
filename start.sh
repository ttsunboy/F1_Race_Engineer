#!/bin/bash

# F1 24 Telemetry Dashboard - Start Script
# Starts both backend and frontend in tmux sessions

echo "Starting F1 24 Telemetry Dashboard..."

# Check if tmux is installed
if ! command -v tmux &> /dev/null; then
    echo "tmux is not installed. Starting processes normally..."
    echo "Starting backend..."
    cd backend
    source venv/bin/activate
    python -m app.main &
    BACKEND_PID=$!
    cd ..

    echo "Starting frontend..."
    cd frontend
    npm run dev &
    FRONTEND_PID=$!
    cd ..

    echo ""
    echo "Backend PID: $BACKEND_PID"
    echo "Frontend PID: $FRONTEND_PID"
    echo ""
    echo "To stop, run: kill $BACKEND_PID $FRONTEND_PID"

    wait
else
    # Create new tmux session with backend
    tmux new-session -d -s f1-telemetry -n backend "cd backend && source venv/bin/activate && python -m app.main"

    # Create new window for frontend
    tmux new-window -t f1-telemetry:1 -n frontend "cd frontend && npm run dev"

    # Attach to the session
    tmux attach-session -t f1-telemetry
fi
