// Placeholder for a ChessBoardWrapper component with logging.

'use client';

import { Chessboard } from 'react-chessboard';

export default function ChessBoardWrapper({ fen, onDrop }) {
  console.log("[ChessBoardWrapper.js] Rendering with fen:", fen);
  return (
    <Chessboard position={fen} onPieceDrop={onDrop} />
  );
}
