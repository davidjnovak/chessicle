import React, { useEffect, useState } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import { useParams } from 'react-router-dom';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Box, Button, Text, VStack, HStack } from '@chakra-ui/react';
import { isCenterSquare, getPieceValue } from '../utils/chess';

const ChessGame = () => {
  const [game, setGame] = useState(new Chess());
  const [position, setPosition] = useState('');
  const [playerColor, setPlayerColor] = useState('white');
  const [score, setScore] = useState({ white: 0, black: 0 });
  const [centerPieces, setCenterPieces] = useState({});
  const { gameId } = useParams();

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'games', gameId), (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setPosition(data.position);
        game.load(data.position);
        setScore(data.score || { white: 0, black: 0 });
        setCenterPieces(data.centerPieces || {});
      }
    });

    return () => unsubscribe();
  }, [gameId]);

  const onDrop = (sourceSquare, targetSquare) => {
    const move = game.move({
      from: sourceSquare,
      to: targetSquare,
      promotion: 'q'
    });

    if (move === null) return false;

    const newPosition = game.fen();
    const isCenter = isCenterSquare(targetSquare);
    let newCenterPieces = { ...centerPieces };
    let newScore = { ...score };

    if (isCenter) {
      const piece = game.get(targetSquare);
      newCenterPieces[targetSquare] = {
        piece: piece.type,
        color: piece.color,
        moveNumber: game.moveNumber()
      };
    }

    // Check if any pieces from the previous move survived
    Object.entries(centerPieces).forEach(([square, { piece, color, moveNumber }]) => {
      if (game.moveNumber() - moveNumber === 2) {
        const currentPiece = game.get(square);
        if (currentPiece && currentPiece.color === color && currentPiece.type === piece) {
          newScore[color === 'w' ? 'white' : 'black'] += getPieceValue(piece);
        }
        delete newCenterPieces[square];
      }
    });

    updateDoc(doc(db, 'games', gameId), {
      position: newPosition,
      score: newScore,
      centerPieces: newCenterPieces
    });

    return true;
  };

  const switchSides = () => {
    setPlayerColor(playerColor === 'white' ? 'black' : 'white');
  };

  return (
    <VStack spacing={4} align="center" p={4}>
      <HStack spacing={4} w="full" justify="space-between">
        <Text fontSize="xl">White Score: {score.white}</Text>
        <Button onClick={switchSides}>Switch Sides</Button>
        <Text fontSize="xl">Black Score: {score.black}</Text>
      </HStack>
      
      <Box w="600px" h="600px">
        <Chessboard
          position={position || game.fen()}
          onPieceDrop={onDrop}
          boardOrientation={playerColor}
        />
      </Box>
      
      <Text fontSize="lg">
        {game.turn() === 'w' ? "White" : "Black"}'s turn
      </Text>
    </VStack>
  );
};

export default ChessGame;