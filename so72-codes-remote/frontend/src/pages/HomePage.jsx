// HomePage component - the main page that users can search flights 

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import FlightSearchForm from '../components/FlightSearchForm';
import SearchHistory from '../components/SearchHistory';
import './HomePage.css';

const HomePage = () => {
  // state to store user's recent searches 
  const [history, setHistory] = useState([]);
  // react router navigation hook
  const navigate = useNavigate();
  // load search history from localStorage
  useEffect(() => {
    // retrieve a string from the browser's localStorage
    const storedHistory = JSON.parse(localStorage.getItem('flightSearchHistory')) || [];
    // update state with the retrieved history
    setHistory(storedHistory); 
  }, []);

  // this function is called when user submits a flight search
  // searchData are basically parameters from the search form
  const handleSearch = (searchData) => {
    // add new search to the front of recent search history
    const newHistory = [
      searchData, 
      ...history.filter(h => 
        h.locationDeparture !== searchData.locationDeparture || 
        h.locationArrival !== searchData.locationArrival
      )
      // limit to only 5 most recent searches
    ].slice(0, 5);
    // update state and add to localStorage
    setHistory(newHistory);
    localStorage.setItem('flightSearchHistory', JSON.stringify(newHistory));
    // save current search data to sessionStorage 
    sessionStorage.setItem('currentFlightSearch', JSON.stringify(searchData));
    // navigate to flightSearchPage, which will read the search data from sessionStroage 
    navigate('/flights');
  };

  return (
    <main className="home-page-main">
      {/* main search part*/}
      <div className="search-container">
        <header>
          <h1>VisCO2Fly</h1>
          <p>Find flights with the lowest CO₂ emissions!
            {/* link to the external website for users to check how co2 is calculatsed */}
            <a
            href="https://github.com/google/travel-impact-model"
            target="_blank"
            rel="noopener noreferrer"
            className="info-link"
            title="Learn more about CO₂ calculations"
          >
            ℹ️
          </a>
          </p>
        </header>
        {/* flight search form part*/}
        <FlightSearchForm onSearch={handleSearch} loading={false} />
      </div>
      {/* recent search history part*/}
      <SearchHistory history={history} onSearchAgain={handleSearch} />
    </main>
  );
};

export default HomePage;