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
