import { createGame } from '../../lib/gameStore';
import { v4 as uuidv4 } from 'uuid';

export default function handler(req, res) {
  console.log("[new-game.js] Handler called");
  const gameId = uuidv4();
  console.log("[new-game.js] Generated gameId:", gameId);
  createGame(gameId);
  res.status(200).json({ gameId });
}
