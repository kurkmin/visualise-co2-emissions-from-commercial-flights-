// FilterControls component - enables users to filter their search based on multiple criteria


import React from 'react';

// change from minutes to hours 
const formatDuration = (minutes) => {
  const hours = Math.floor(minutes / 60);
  const mins = Math.floor(minutes % 60);
  return `${hours}h ${mins}m`;
};

const FilterControls = ({
  priceRange, setPriceRange, minPrice, maxPrice,
  durationRange, setDurationRange, minDuration, maxDuration,
  co2Range, setCo2Range, minCo2, maxCo2,
  stopsFilter, setStopsFilter
}) => {
  return (
    <div className="filter-controls-container">
      {/* price filter */}
      <div className="dual-slider-group">
        <div className="dual-slider-label">
          Price: €{Number(priceRange[0]).toFixed(0)} - €{Number(priceRange[1]).toFixed(0)}
        </div>
        <div className="dual-slider-track">
          {/* lower bound slider */}
          <input 
            type="range" 
            min={minPrice} 
            max={maxPrice} 
            value={priceRange[0]} 
            onChange={e => { 
              const val = Math.min(Number(e.target.value), priceRange[1] - 1); 
              setPriceRange([val, priceRange[1]]); 
            }} 
          />
          {/* upper bound slider */}
          <input 
            type="range" 
            min={minPrice} 
            max={maxPrice} 
            value={priceRange[1]} 
            onChange={e => { 
              const val = Math.max(Number(e.target.value), priceRange[0] + 1); 
              setPriceRange([priceRange[0], val]); 
            }} 
          />
        </div>
      </div>

      {/* duration filter */}
      <div className="dual-slider-group">
        <div className="dual-slider-label">
          Duration: {formatDuration(durationRange[0])} - {formatDuration(durationRange[1])}
        </div>
        <div className="dual-slider-track">
          {/* lower bound slider */}
          <input 
            type="range" 
            min={minDuration} 
            max={maxDuration} 
            value={durationRange[0]} 
            onChange={e => { 
              const val = Math.min(Number(e.target.value), durationRange[1] - 1); 
              setDurationRange([val, durationRange[1]]); 
            }} 
          />
          {/* upper bound slider */}
          <input 
            type="range" 
            min={minDuration} 
            max={maxDuration} 
            value={durationRange[1]} 
            onChange={e => { 
              const val = Math.max(Number(e.target.value), durationRange[0] + 1); 
              setDurationRange([durationRange[0], val]); 
            }} 
          />
        </div>
      </div>

      {/* CO2 emissions filter */}
      <div className="dual-slider-group">
        <div className="dual-slider-label">
          CO₂: {Number(co2Range[0]).toFixed(1)}kg - {Number(co2Range[1]).toFixed(1)}kg
        </div>
        <div className="dual-slider-track">
          {/* lower bound slider */}
          <input 
            type="range" 
            min={minCo2} 
            max={maxCo2} 
            step="0.1" 
            value={co2Range[0]} 
            onChange={e => { 
              const val = Math.min(Number(e.target.value), co2Range[1] - 0.1); 
              setCo2Range([val, co2Range[1]]); 
            }} 
          />
          {/* upper bound slider */}
          <input 
            type="range" 
            min={minCo2} 
            max={maxCo2} 
            step="0.1" 
            value={co2Range[1]} 
            onChange={e => { 
              const val = Math.max(Number(e.target.value), co2Range[0] + 0.1); 
              setCo2Range([co2Range[0], val]); 
            }} 
          />
        </div>
      </div>

      {/* num of stops filter */}
      <div className="dual-slider-group">
        <div className="dual-slider-label">Stops</div>
        <select 
          className="sort-select filter-select-aligned" 
          value={stopsFilter} 
          onChange={e => setStopsFilter(e.target.value)}
        >
          <option value="any">Any</option>
          <option value="0">Direct</option>
          <option value="1">1 Stop</option>
          <option value="2">2+ Stops</option>
        </select>
      </div>
    </div>
  );
};

export default FilterControls;