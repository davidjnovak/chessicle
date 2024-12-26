import React, { createContext, useContext, useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import { Chess } from 'chess.js';
import { db } from '../firebase';
import { useToast } from '@chakra-ui/react';

const GameContext = createContext();

export const GameProvider = ({ children }) => {
  const [currentGame, setCurrentGame] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const toast = useToast();

  const createNewGame = async () => {
    try {
      const gameId = Math.random().toString(36).substring(2, 15);
      const game = new Chess();
      
      await setDoc(doc(db, 'games', gameId), {
        position: game.fen(),
        score: { white: 0, black: 0 },
        centerPieces: {},
        createdAt: new Date().toISOString(),
        lastMove: null
      });

      const gameLink = `${window.location.origin}/game/${gameId}`;
      await navigator.clipboard.writeText(gameLink);

      toast({
        title: 'Game created!',
        description: 'Game link copied to clipboard',
        status: 'success',
        duration: 3000,
      });

      return gameId;
    } catch (err) {
      setError(err.message);
      toast({
        title: 'Error creating game',
        description: err.message,
        status: 'error',
        duration: 3000,
      });
      return null;
    }
  };

  const joinGame = async (gameId) => {
    try {
      const unsubscribe = onSnapshot(doc(db, 'games', gameId), (docSnapshot) => {
        if (docSnapshot.exists()) {
          setCurrentGame(docSnapshot.data());
          setLoading(false);
        } else {
          setError('Game not found');
          setLoading(false);
        }
      });

      return unsubscribe;
    } catch (err) {
      setError(err.message);
      setLoading(false);
      return null;
    }
  };

  const updateGameState = async (gameId, newState) => {
    try {
      await updateDoc(doc(db, 'games', gameId), newState);
    } catch (err) {
      setError(err.message);
      toast({
        title: 'Error updating game',
        description: err.message,
        status: 'error',
        duration: 3000,
      });
    }
  };

  const value = {
    currentGame,
    loading,
    error,
    createNewGame,
    joinGame,
    updateGameState,
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};