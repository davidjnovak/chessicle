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
