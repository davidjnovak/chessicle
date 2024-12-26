import React, { useEffect, useState } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import { useParams } from 'react-router-dom';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Box, Button, Text, VStack, HStack, useToast } from '@chakra-ui/react';
import { isCenterSquare, getPieceValue } from '../utils/chess';

const ChessGame = () => {
  const [game, setGame] = useState(new Chess());
  const [playerColor, setPlayerColor] = useState('white');
  const [score, setScore] = useState({ white: 0, black: 0 });
  const [centerPieces, setCenterPieces] = useState({});
  const { gameId } = useParams();
  const toast = useToast();

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'games', gameId), (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        game.load(data.position);
        setScore(data.score || { white: 0, black: 0 });
        setCenterPieces(data.centerPieces || {});
      }
    });

    return () => unsubscribe();
  }, [gameId]);

  const calculateScoreForCenterPieces = () => {
    let newScore = { ...score };
    
    // Check each center square
    ['d4', 'd5', 'e4', 'e5'].forEach(square => {
      const piece = game.get(square);
      console.log("color, piece", piece.color, piece);
      console.log("turn", game.turn());
      if (piece && game.turn() === piece.color) {
        // Award points to the piece owner
        const color = piece.color === 'w' ? 'white' : 'black';
        newScore[color] += getPieceValue(piece.type);
      }
    });

    return newScore;
  };

  const onDrop = (sourceSquare, targetSquare) => {
    try {
      const move = game.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q'
      });

      if (move === null) return false;

      // Get the new game position
      const newPosition = game.fen();
      
      // Calculate scores based on center pieces
      const newScore = calculateScoreForCenterPieces();

      // Update Firebase with new game state
      updateDoc(doc(db, 'games', gameId), {
        position: newPosition,
        score: newScore,
        lastMove: {
          from: sourceSquare,
          to: targetSquare,
          piece: game.get(targetSquare),
          timestamp: Date.now()
        }
      });

      // Show toast for points earned
      const piecesInCenter = ['d4', 'd5', 'e4', 'e5'].filter(square => game.get(square));
      if (piecesInCenter.length > 0) {
        // toast({
        //   title: 'Center Square Bonus!',
        //   description: `Points awarded for pieces in center squares`,
        //   status: 'success',
        //   duration: 2000,
        //   isClosable: true,
        // });
      }

      return true;
    } catch (error) {
      // toast({
      //   title: 'Error',
      //   description: 'Invalid move',
      //   status: 'error',
      //   duration: 2000,
      //   isClosable: true,
      // });
      return false;
    }
  };

  const switchSides = () => {
    setPlayerColor(playerColor === 'white' ? 'black' : 'white');
  };

  return (
    <VStack spacing={4} align="center" p={4}>
      <HStack spacing={4} w="full" justify="space-between">
        <Text fontSize="xl" fontWeight="bold">
          White Score: {score.white}
        </Text>
        <Button onClick={switchSides} colorScheme="blue">
          Switch Sides
        </Button>
        <Text fontSize="xl" fontWeight="bold">
          Black Score: {score.black}
        </Text>
      </HStack>
      
      <Box w="600px" h="600px">
        <Chessboard
          position={game.fen()}
          onPieceDrop={onDrop}
          boardOrientation={playerColor}
        />
      </Box>
      
      <Text fontSize="lg" fontWeight="bold">
        {game.turn() === 'w' ? "White" : "Black"}'s turn
      </Text>
    </VStack>
  );
};

export default ChessGame;