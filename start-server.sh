#!/bin/bash

# Liepājas Ekskursija - Server Startup Script
# This script starts both the WebSocket server and a local PHP/web server

echo "🚀 Starting Liepājas Ekskursija servers..."
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed!"
    echo "Please install Node.js from: https://nodejs.org/"
    exit 1
fi

# Check if PHP is installed (needed for leaderboard)
if ! command -v php &> /dev/null; then
    echo "⚠️  WARNING: PHP is not installed!"
    echo "   Leaderboard functionality will not work without PHP"
    echo "   Install PHP from: https://www.php.net/downloads"
    echo ""
fi

# Check if npm packages are installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    echo ""
fi

# Create data directory if it doesn't exist
mkdir -p src/data
touch src/data/leaderboard.txt

# Start WebSocket server in background
echo "🔌 Starting WebSocket server on port 8080..."
node src/js/server.js &
WS_PID=$!
echo "   WebSocket server PID: $WS_PID"
echo ""

# Wait a moment for the WebSocket server to start
sleep 2

# Start web server
echo "🌐 Starting PHP web server on port 8000..."
echo "   Open in browser: http://localhost:8000/index.html"
echo ""
echo "📊 Features enabled:"
echo "   ✅ Multiplayer mode (WebSocket)"
echo "   ✅ Leaderboard (PHP)"
echo ""
echo "Press Ctrl+C to stop both servers"
echo ""

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Stopping servers..."
    kill $WS_PID 2>/dev/null
    echo "✅ Servers stopped"
    exit 0
}

# Trap Ctrl+C and cleanup
trap cleanup SIGINT SIGTERM

# Start PHP server (best option for this project due to leaderboard)
if command -v php &> /dev/null; then
    php -S localhost:8000
elif command -v python3 &> /dev/null; then
    echo "⚠️  Using Python server - PHP features (leaderboard) will not work!"
    python3 -m http.server 8000
elif command -v python &> /dev/null; then
    echo "⚠️  Using Python server - PHP features (leaderboard) will not work!"
    python -m http.server 8000
else
    echo "❌ No web server available!"
    echo "Please install PHP or Python to run the web server"
    kill $WS_PID
    exit 1
fi
