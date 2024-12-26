import React from 'react';
import { Button, VStack, Text, useToast } from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Chess } from 'chess.js';

const Home = () => {
  const navigate = useNavigate();
  const toast = useToast();

  const createGame = async () => {
    try {
      const gameId = Math.random().toString(36).substring(2, 15);
      const game = new Chess();
      
      await setDoc(doc(db, 'games', gameId), {
        position: game.fen(),
        score: { white: 0, black: 0 },
        centerPieces: {}
      });

      // Copy game link to clipboard
      const gameLink = `${window.location.origin}/game/${gameId}`;
      await navigator.clipboard.writeText(gameLink);

      toast({
        title: 'Game created!',
        description: 'Game link copied to clipboard. Share it with your opponent!',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });

      navigate(`/game/${gameId}`);
    } catch (error) {
      toast({
        title: 'Error creating game',
        description: error.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  return (
    <VStack spacing={8} align="center" justify="center" h="100vh">
      <Text fontSize="4xl" fontWeight="bold">
        Welcome to Chess Game
      </Text>
      <Button
        colorScheme="blue"
        size="lg"
        onClick={createGame}
      >
        Create New Game
      </Button>
    </VStack>
  );
};

export default Home;