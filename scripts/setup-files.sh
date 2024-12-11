#!/usr/bin/env bash

# Exit on error
set -e

echo "Setting up Chessicle with styling, scoring, and flip board feature..."

# Ensure directories exist or create them
mkdir -p app/[gameId]
mkdir -p pages/api
mkdir -p pages/api/utils
mkdir -p lib
mkdir -p public
mkdir -p scripts

##########################
# Create app/layout.js
##########################
cat > app/layout.js << 'EOF'
export const metadata = {
  title: 'Chessicle',
  description: 'A simple chess game in Next.js with SSE, logging, and scoring.',
};

export default function RootLayout({ children }) {
  console.log("[layout.js] Rendering RootLayout...");
  return (
    <html lang="en">
      <body>
        <main style={{ padding: '20px', fontFamily: 'Arial, Helvetica, sans-serif' }}>
          {children}
        </main>
      </body>
    </html>
  );
}
EOF

##########################
# Create app/page.js (Home)
##########################
cat > app/page.js << 'EOF'
'use client';

import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';

export default function HomePage() {
  console.log("[page.js] Rendering HomePage component...");
  const router = useRouter();

  const startNewGame = async () => {
    console.log("[page.js] startNewGame() called...");
    const res = await fetch('/api/new-game');
    if (!res.ok) {
      console.error("[page.js] Failed to create new game, response not ok");
      return;
    }
    const data = await res.json();
    console.log("[page.js] New game created with ID:", data.gameId);
    Cookies.set('chess_game_id', data.gameId, { expires: 7 });
    router.push(`/${data.gameId}`);
  };

  return (
    <div style={{ textAlign: 'center', marginTop: '50px' }}>
      <h1>Welcome to Chessicle</h1>
      <button onClick={startNewGame}>Start a new game</button>
    </div>
  );
}
EOF

##########################
# Create app/[gameId]/page.js
##########################
cat > app/[gameId]/page.js << 'EOF'
'use client';

import { useEffect, useState } from 'react';
import { Chessboard } from 'react-chessboard';
import Cookies from 'js-cookie';
import { useParams } from 'next/navigation';

export default function GamePage() {
  console.log("[[gameId]/page.js] Rendering GamePage...");
  const params = useParams();
  const gameId = params?.gameId;
  const [fen, setFen] = useState('');
  const [whiteScore, setWhiteScore] = useState(0);
  const [blackScore, setBlackScore] = useState(0);
  const [orientation, setOrientation] = useState('white');

  useEffect(() => {
    if (!gameId) {
      console.log("[[gameId]/page.js] No gameId found in params");
      return;
    }
    console.log("[[gameId]/page.js] Loading gameId:", gameId);

    Cookies.set('chess_game_id', gameId, { expires: 7 });

    // Initial fetch of game state
    fetch(`/api/state?gameId=${gameId}`)
      .then((res) => {
        console.log("[[gameId]/page.js] /api/state response status:", res.status);
        return res.json();
      })
      .then((data) => {
        if (data.fen) {
          console.log("[[gameId]/page.js] Initial FEN loaded:", data.fen);
          setFen(data.fen);
        } else {
          console.warn("[[gameId]/page.js] No FEN returned from /api/state");
        }
        if (typeof data.whiteScore === 'number') {
          setWhiteScore(data.whiteScore);
        }
        if (typeof data.blackScore === 'number') {
          setBlackScore(data.blackScore);
        }
      });

    // Setup SSE event listener for real-time updates
    const es = new EventSource(`/api/events?gameId=${gameId}`);
    es.addEventListener('message', (e) => {
      console.log("[[gameId]/page.js] SSE message received:", e.data);
      const update = JSON.parse(e.data);
      if (update.fen) {
        setFen(update.fen);
      }
      if (typeof update.whiteScore === 'number') {
        setWhiteScore(update.whiteScore);
      }
      if (typeof update.blackScore === 'number') {
        setBlackScore(update.blackScore);
      }
    });
    es.addEventListener('error', (err) => {
      console.error("[[gameId]/page.js] SSE error:", err);
    });

    return () => {
      console.log("[[gameId]/page.js] Closing EventSource...");
      if (es) es.close();
    };
  }, [gameId]);

  const handleMove = (sourceSquare, targetSquare) => {
    console.log("[[gameId]/page.js] handleMove called:", sourceSquare, "->", targetSquare);
    fetch(`/api/move?gameId=${gameId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: sourceSquare, to: targetSquare }),
    })
      .then((res) => {
        console.log("[[gameId]/page.js] /api/move response status:", res.status);
        return res.json();
      })
      .then((data) => {
        if (data.fen) {
          console.log("[[gameId]/page.js] Move successful, new fen:", data.fen);
          setFen(data.fen);
        } else if (data.error) {
          console.error("[[gameId]/page.js] Move error:", data.error);
        }
      });
  };

  const flipBoard = () => {
    console.log("[[gameId]/page.js] flipBoard called. Current orientation:", orientation);
    setOrientation((prev) => (prev === 'white' ? 'black' : 'white'));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <h1>Chessicle</h1>
      <div style={{ width: '500px', margin: '20px auto', textAlign: 'center' }}>
        <button onClick={flipBoard} style={{ marginBottom: '10px' }}>Flip Board</button>
        <div style={{ border: '1px solid #333', borderRadius: '5px', padding: '10px', background: '#f4f4f4' }}>
          <div style={{ fontWeight: 'bold', marginBottom: '10px' }}>Scores</div>
          <div>White: {whiteScore}</div>
          <div>Black: {blackScore}</div>
        </div>
      </div>
      <div style={{ maxWidth: '500px', margin: '20px auto' }}>
        <Chessboard position={fen} onPieceDrop={handleMove} boardOrientation={orientation} />
      </div>
      <div style={{ fontSize: '12px', marginTop: '10px', color: '#666' }}>Game ID: {gameId}</div>
    </div>
  );
}
EOF

##########################
# Create lib/gameStore.js with scoring logic
##########################
cat > lib/gameStore.js << 'EOF'
console.log("[gameStore.js] Initializing game store...");
const { pieceValues } = require('./pieceValues');
const games = {};

function createGame(id) {
  console.log("[gameStore.js] createGame called with id:", id);
  const engine = require('js-chess-engine');
  const game = new engine.Game();
  // Store scores and last fen for tracking center occupancy
  const whiteScore = 0;
  const blackScore = 0;
  const fen = game.exportFEN();
  // We'll store the last fen to check occupancy after the next move
  games[id] = { game, fen, lastFen: fen, whiteScore, blackScore };
  console.log("[gameStore.js] Game created and stored in-memory for id:", id);
  return games[id];
}

function getGameObj(id) {
  console.log("[gameStore.js] getGameObj called with id:", id);
  const gameObj = games[id];
  if (!gameObj) {
    console.warn("[gameStore.js] getGameObj - No game found for id:", id);
  }
  return gameObj;
}

function updateGameFen(id) {
  const gameObj = getGameObj(id);
  if (!gameObj) return;
  gameObj.fen = gameObj.game.exportFEN();
}

function scoreCenterOccupancy(id) {
  console.log("[gameStore.js] scoreCenterOccupancy called for id:", id);
  const gameObj = getGameObj(id);
  if (!gameObj) return;

  const centerSquares = ['d4', 'd5', 'e4', 'e5'];
  const lastPosition = parseFEN(gameObj.lastFen);
  const currentPosition = parseFEN(gameObj.fen);

  // Check pieces that were in center after last move and remain in center now
  for (const sq of centerSquares) {
    const lastPiece = lastPosition[sq];
    const currentPiece = currentPosition[sq];
    if (lastPiece && currentPiece && lastPiece === currentPiece) {
      // The piece remained in center for a full turn
      const color = isWhitePiece(lastPiece) ? 'white' : 'black';
      const pieceType = lastPiece.toUpperCase();
      const points = pieceValues[pieceType] || 0;
      console.log("[gameStore.js] Awarding points. Piece:", lastPiece, "Color:", color, "Points:", points);
      if (color === 'white') {
        gameObj.whiteScore += points;
      } else {
        gameObj.blackScore += points;
      }
    }
  }
}

function afterMoveUpdate(id) {
  // After a move, we have now completed a turn. Let's score occupancy:
  const gameObj = getGameObj(id);
  if (!gameObj) return;

  // Update fen first
  updateGameFen(id);

  // Score center occupancy based on lastFen and fen
  scoreCenterOccupancy(id);

  // Now update lastFen for the next turn check
  gameObj.lastFen = gameObj.fen;
}

function parseFEN(fen) {
  // Simple fen parser for piece placement
  // fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR ..."
  const [position] = fen.split(' ');
  const rows = position.split('/');
  const boardMap = {};
  // Rows from fen start at 8 down to 1
  // We'll map a-h for columns
  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

  for (let rank = 8; rank >= 1; rank--) {
    const rowData = rows[8 - rank];
    let fileIndex = 0;
    for (const char of rowData) {
      if (isDigit(char)) {
        const emptyCount = parseInt(char, 10);
        for (let i = 0; i < emptyCount; i++) {
          fileIndex++;
        }
      } else {
        const sq = files[fileIndex] + rank;
        boardMap[sq] = char;
        fileIndex++;
      }
    }
  }
  return boardMap;
}

function isDigit(c) {
  return c >= '0' && c <= '9';
}

function isWhitePiece(piece) {
  // Uppercase in chess notation usually means White piece
  return piece === piece.toUpperCase();
}

module.exports = { createGame, getGameObj, afterMoveUpdate };
EOF

##########################
# Create lib/pieceValues.js for piece values
##########################
cat > lib/pieceValues.js << 'EOF'
module.exports.pieceValues = {
  'P': 1,  // Pawn
  'N': 3,  // Knight
  'B': 3,  // Bishop
  'R': 5,  // Rook
  'Q': 9,  // Queen
  'K': 20  // King
};
EOF

##########################
# Update pages/api/new-game.js
##########################
cat > pages/api/new-game.js << 'EOF'
import { createGame } from '../../lib/gameStore';
import { v4 as uuidv4 } from 'uuid';

export default function handler(req, res) {
  console.log("[new-game.js] Handler called");
  const gameId = uuidv4();
  console.log("[new-game.js] Generated gameId:", gameId);
  createGame(gameId);
  res.status(200).json({ gameId });
}
EOF

##########################
# Update pages/api/state.js
##########################
cat > pages/api/state.js << 'EOF'
import { getGameObj } from '../../lib/gameStore';

export default function handler(req, res) {
  console.log("[state.js] Handler called, query:", req.query);
  const { gameId } = req.query;
  const gameObj = getGameObj(gameId);
  if (!gameObj) {
    console.warn("[state.js] No game found for id:", gameId);
    return res.status(404).json({ error: 'Game not found.' });
  }
  const fen = gameObj.fen;
  console.log("[state.js] Returning fen:", fen, "for gameId:", gameId);
  res.status(200).json({ fen, whiteScore: gameObj.whiteScore, blackScore: gameObj.blackScore });
}
EOF

##########################
# Update pages/api/move.js
##########################
cat > pages/api/move.js << 'EOF'
import { getGameObj, afterMoveUpdate } from '../../lib/gameStore';
import { broadcastGameUpdate } from './utils/broadcast';

export default function handler(req, res) {
  console.log("[move.js] Handler called, query:", req.query, "body:", req.body);
  const { gameId } = req.query;
  const { from, to } = req.body;

  const gameObj = getGameObj(gameId);
  if (!gameObj) {
    console.warn("[move.js] No game found for id:", gameId);
    return res.status(404).json({ error: 'Game not found.' });
  }

  try {
    console.log("[move.js] Making a move:", from, "->", to);
    gameObj.game.move(from, to);
    afterMoveUpdate(gameId);
    const fen = gameObj.fen;
    console.log("[move.js] Move successful, fen now:", fen, "Scores: White:", gameObj.whiteScore, "Black:", gameObj.blackScore);
    broadcastGameUpdate(gameId, fen, gameObj.whiteScore, gameObj.blackScore);
    return res.status(200).json({ fen, whiteScore: gameObj.whiteScore, blackScore: gameObj.blackScore });
  } catch (error) {
    console.error("[move.js] Error making move:", error.message);
    return res.status(400).json({ error: error.message });
  }
}
EOF

##########################
# Update pages/api/events.js (SSE)
##########################
cat > pages/api/events.js << 'EOF'
console.log("[events.js] Loading SSE events handler...");

let clientsByGame = {};

function addClient(gameId, res) {
  if (!clientsByGame[gameId]) {
    clientsByGame[gameId] = [];
  }
  clientsByGame[gameId].push(res);
  console.log("[events.js] Client added for gameId:", gameId, "Total clients:", clientsByGame[gameId].length);
}

function removeClient(gameId, res) {
  if (!clientsByGame[gameId]) return;
  clientsByGame[gameId] = clientsByGame[gameId].filter(client => client !== res);
  console.log("[events.js] Client removed for gameId:", gameId, "Total clients:", clientsByGame[gameId].length);
}

export default function handler(req, res) {
  console.log("[events.js] Handler called, query:", req.query);
  const { gameId } = req.query;
  if (!gameId) {
    console.warn("[events.js] No gameId provided in query");
    return res.status(400).send("gameId query parameter is required.");
  }

  console.log("[events.js] Setting up SSE response headers...");
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
  });
  res.flushHeaders();

  addClient(gameId, res);

  req.on('close', () => {
    console.log("[events.js] Client connection closed for gameId:", gameId);
    removeClient(gameId, res);
  });
}

export function broadcastGameUpdate(gameId, fen, whiteScore, blackScore) {
  console.log("[events.js] broadcastGameUpdate called for gameId:", gameId, "fen:", fen);
  const clients = clientsByGame[gameId];
  if (!clients || clients.length === 0) {
    console.log("[events.js] No clients to broadcast to for gameId:", gameId);
    return;
  }
  const data = JSON.stringify({ fen, whiteScore, blackScore });
  for (const client of clients) {
    console.log("[events.js] Broadcasting fen and scores to client for gameId:", gameId);
    client.write(`data: ${data}\n\n`);
  }
}
EOF

##########################
# pages/api/utils/broadcast.js
##########################
cat > pages/api/utils/broadcast.js << 'EOF'
import { broadcastGameUpdate } from '../events';

export { broadcastGameUpdate };
EOF

##########################
# Create a basic global css
##########################
cat > app/globals.css << 'EOF'
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --background: #ffffff;
  --foreground: #171717;
}

@media (prefers-color-scheme: dark) {
  :root {
    --background: #0a0a0a;
    --foreground: #ededed;
  }
}

body {
  color: var(--foreground);
  background: var(--background);
  font-family: Arial, Helvetica, sans-serif;
}
EOF

##########################
# Optional: Create placeholder SVG if needed
##########################
cat > public/file.svg << 'EOF'
<svg fill="none" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><path d="M14.5 13.5V5.41a1 1 0 0 0-.3-.7L9.8.29A1 1 0 0 0 9.08 0H1.5v13.5A2.5 2.5 0 0 0 4 16h8a2.5 2.5 0 0 0 2.5-2.5m-1.5 0v-7H8v-5H3v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1M9.5 5V2.12L12.38 5zM5.13 5h-.62v1.25h2.12V5zm-.62 3h7.12v1.25H4.5zm.62 3h-.62v1.25h7.12V11z" clip-rule="evenodd" fill="#666" fill-rule="evenodd"/></svg>
EOF

##########################
# Create .gitignore
##########################
cat > .gitignore << 'EOF'
# See https://help.github.com/articles/ignoring-files/ for more about ignoring files.

/node_modules
/.next
/out
/build
.DS_Store
.env*
npm-debug.log*
yarn-debug.log*
yarn-error.log*
EOF

##########################
# Create jsconfig.json
##########################
cat > jsconfig.json << 'EOF'
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./*"]
    }
  }
}
EOF

##########################
# Create next.config.mjs
##########################
cat > next.config.mjs << 'EOF'
/** @type {import('next').NextConfig} */
const nextConfig = {};

export default nextConfig;
EOF

##########################
# Create package.json
##########################
cat > package.json << 'EOF'
{
  "name": "chessicle",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  },
  "dependencies": {
    "js-chess-engine": "^1.0.2",
    "js-cookie": "^3.0.5",
    "next": "latest",
    "react": "latest",
    "react-chessboard": "^4.7.2",
    "react-dom": "latest",
    "uuid": "^11.0.3"
  },
  "devDependencies": {
    "postcss": "^8",
    "tailwindcss": "^3.4.1"
  }
}
EOF

##########################
# Create postcss.config.mjs
##########################
cat > postcss.config.mjs << 'EOF'
/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    tailwindcss: {},
  },
};

export default config;
EOF
