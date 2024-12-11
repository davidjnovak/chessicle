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
