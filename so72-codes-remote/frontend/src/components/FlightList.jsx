// FlightList component - shows a list of flight search results along with sort controls, flight count info  

import React from 'react';
import FlightItem from './FlightItem';

const FlightList = ({
  flights,
  sortBy,
  setSortBy,
  searchedCabinClass,
  hoveredFlightIds,
  handleFlightCardEnter,
  handleFlightCardLeave,
  flightsWithCO2Count,
  flightsWithoutCO2Count,
  selectedFlightId,
}) => {
  return (
    <div className="results-container">
      {/* header with flight count and sort by option */}
      <div className="results-header">
        {/* flight count */}
        <div className="flight-count">
          Showing {flights.length} of {flightsWithCO2Count} flights
          {/* show count of excluded ones due to missing CO2 data */}
          {/* {flightsWithoutCO2Count > 0 && (
            <span className="excluded-count">
              ({flightsWithoutCO2Count} excluded)
            </span>
          )} */}
        </div>
        
        {/* sort options */}
        <div className="sort-controls">
          <label htmlFor="sort-select">Sort by </label>
          <select 
            id="sort-select" 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value)} 
            className="sort-select"
          >
            {/* co2 sort by options */}
            <option value="co2_lowest">CO₂ (Lowest first)</option>
            <option value="co2_highest">CO₂ (Highest first)</option>
            
            {/* price sort by options */}
            <option value="price_lowest">Price (Lowest first)</option>
            <option value="price_highest">Price (Highest first)</option>
            
            {/* duration sort by options */}
            <option value="duration_shortest">Duration (Shortest first)</option>
            <option value="duration_longest">Duration (Longest first)</option>
          </select>
        </div>
      </div>
      
      {/* flight list */}
      <ul>
        {flights.map((flight) => {
          // generate unique key for each flight item
          const flightKey = `${flight.id}-${flight.itineraries[0].segments[0].departure.at}`;
          
          return (
            <FlightItem
              key={flightKey}
              flight={flight}
              searchedCabinClass={searchedCabinClass}
              // highlight if hovered in charts
              isHighlighted={hoveredFlightIds.includes(flightKey)} 
              // highlight if selected from chart
              isSelected={selectedFlightId === flightKey} 
              // sync hover with charts
              onMouseEnter={handleFlightCardEnter} 
              // clear hover state
              onMouseLeave={handleFlightCardLeave} 
            />
          );
        })}
      </ul>
    </div>
  );
};

export default FlightList;
