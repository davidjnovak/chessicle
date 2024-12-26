import React from 'react';
import { ChakraProvider } from '@chakra-ui/react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './components/Home';
import GameRoom from './components/GameRoom';
import { GameProvider } from './context/GameContext';

const App = () => {
  return (
    <ChakraProvider>
      <GameProvider>
        <Router>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/game/:gameId" element={<GameRoom />} />
          </Routes>
        </Router>
      </GameProvider>
    </ChakraProvider>
  );
};

export default App;
