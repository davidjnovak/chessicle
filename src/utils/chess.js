export const isCenterSquare = (square) => {
  const centerSquares = ['d4', 'd5', 'e4', 'e5'];
  return centerSquares.includes(square);
};

export const getPieceValue = (piece) => {
  const values = {
    p: 1,
    n: 3,
    b: 3,
    r: 5,
    q: 9,
    k: 10
  };
  return values[piece.toLowerCase()];
};
