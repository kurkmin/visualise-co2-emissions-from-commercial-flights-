// frontend main component that sets up routing, using React Router, and renders pages

import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './App.css'; 
import HomePage from './pages/HomePage';
import FlightSearchPage from './pages/FlightSearchPage';

function App() {
  return (
    <BrowserRouter>
      <div className="App">
        <Routes>
          {/* "/" : HomePage - flight search form and search history */}
          <Route path="/" element={<HomePage />} />
          {/* "/flights" : FlightSearchPage - flight results with CO2 visualisations */}
          <Route path="/flights" element={<FlightSearchPage />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;