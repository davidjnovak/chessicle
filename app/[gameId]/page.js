'use client';

import { useEffect, useState } from 'react';
import { Chessboard } from 'react-chessboard';
import Cookies from 'js-cookie';
import { useParams } from 'next/navigation';

export default function GamePage() {
  console.log("[[gameId]/page.js] Rendering GamePage component...");
  const params = useParams();
  const gameId = params?.gameId;
  const [fen, setFen] = useState('');
  const [whiteScore, setWhiteScore] = useState(0);
  const [blackScore, setBlackScore] = useState(0);
  const [orientation, setOrientation] = useState('white');

  // Log whenever fen changes
  useEffect(() => {
    console.log("[[gameId]/page.js] fen state changed:", fen);
  }, [fen]);

  useEffect(() => {
    if (!gameId) {
      console.log("[[gameId]/page.js] No gameId found in params");
      return;
    }
    console.log("[[gameId]/page.js] Loading gameId:", gameId);

    Cookies.set('chess_game_id', gameId, { expires: 7 });

    // Initial fetch of game state
    console.log("[[gameId]/page.js] Fetching initial game state...");
    fetch(`/api/state?gameId=${gameId}`)
      .then((res) => {
        console.log("[[gameId]/page.js] /api/state response status:", res.status);
        return res.json();
      })
      .then((data) => {
        console.log("[[gameId]/page.js] Received state data:", data);
        if (data.fen) {
          // const initialFen = data.fen.split(' ')[0]; // only piece placement
          console.log("[[gameId]/page.js] Initial FEN (raw):", data.fen);
          console.log("[[gameId]/page.js] Initial FEN (truncated):", initialFen);
          setFen(data.fen);
        } else {
          console.warn("[[gameId]/page.js] No FEN returned from /api/state");
        }

        if (typeof data.whiteScore === 'number') {
          console.log("[[gameId]/page.js] Setting whiteScore to:", data.whiteScore);
          setWhiteScore(data.whiteScore);
        }
        if (typeof data.blackScore === 'number') {
          console.log("[[gameId]/page.js] Setting blackScore to:", data.blackScore);
          setBlackScore(data.blackScore);
        }
      })
      .catch(err => {
        console.error("[[gameId]/page.js] Error fetching /api/state:", err);
      });

    // Setup SSE event listener for real-time updates
    console.log("[[gameId]/page.js] Setting up SSE for gameId:", gameId);
    const es = new EventSource(`/api/events?gameId=${gameId}`);
    es.addEventListener('message', (e) => {
      console.log("[[gameId]/page.js] SSE message received:", e.data);
      try {
        const update = JSON.parse(e.data);
        if (update.fen) {
          // const sseFen = update.fen.split(' ')[0];
          console.log("[[gameId]/page.js] SSE Update Fen (raw):", update.fen);
          console.log("[[gameId]/page.js] SSE Update Fen (truncated):", sseFen);
          setFen(sseFen);
        }
        if (typeof update.whiteScore === 'number') {
          console.log("[[gameId]/page.js] SSE Update whiteScore:", update.whiteScore);
          setWhiteScore(update.whiteScore);
        }
        if (typeof update.blackScore === 'number') {
          console.log("[[gameId]/page.js] SSE Update blackScore:", update.blackScore);
          setBlackScore(update.blackScore);
        }
      } catch (parseError) {
        console.error("[[gameId]/page.js] Error parsing SSE data:", parseError);
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

  function handleMove(sourceSquare, targetSquare) {
    console.log("[[gameId]/page.js] handleMove called:", sourceSquare, "->", targetSquare);

    // For now, return true immediately to confirm that pieces don't vanish.
    // This ensures react-chessboard doesn't revert pieces.
    // We'll do the fetch afterwards:
    const returnVal = true;

    // Make the API call to /api/move in the background
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
        if (data.error) {
          console.error("Move error:", data.error);
          // If move was invalid, you may revert fen here by resetting fen to the last known good fen
        } else {
          console.log("Move successful, new fen (raw):", data.fen);
          const moveFen = data.fen.split(' ')[0];
          console.log("Move successful, new fen (truncated):", moveFen);
          setFen(moveFen);
        }
      })
      .catch((err) => {
        console.error("Fetch error during move:", err);
      });

    console.log("[[gameId]/page.js] handleMove returning:", returnVal);
    return returnVal;
  }

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
        <Chessboard
          boardWidth={500}
          position={fen}
          onPieceDrop={handleMove}
          boardOrientation={orientation}
        />
      </div>
      <div style={{ fontSize: '12px', marginTop: '10px', color: '#666' }}>Game ID: {gameId}</div>
    </div>
  );
}
