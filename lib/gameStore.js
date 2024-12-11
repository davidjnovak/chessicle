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
