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
