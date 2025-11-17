// FlightSearchForm component - flight search form 

import React, { useState, useEffect, useRef } from 'react';
import { cabinClassOptions } from '../utils/constants';

const FlightSearchForm = ({ onSearch, loading }) => {
  // 'return' for default but it can be 'oneway'  
  const [tripType, setTripType] = useState('return'); 
  // origin/destination states: frankfurt (FRA) and Oslo (OSL) as default 
  // since Germans and Norweigens  are the target users of this app 
  const [origin, setOrigin] = useState('FRA'); 
  const [destination, setDestination] = useState('OSL'); 
  const [departureDate, setDepartureDate] = useState('');
  const [arrivalDate, setArrivalDate] = useState(''); 
  // 1 passenger as default 
  const [adults, setAdults] = useState(1);
  // economy class as default 
  const [cabinClass, setCabinClass] = useState('ECONOMY');

  // airport autocomplete states
  const [originSuggestions, setOriginSuggestions] = useState([]); 
  const [destinationSuggestions, setDestinationSuggestions] = useState([]); 
  const [activeInput, setActiveInput] = useState(null);
  
  // react ref - timeout for debouncing API calls to prevent numerous requests
  const debounceTimeout = useRef(null); 
  // react ref - form DOM reference for implementing click-outside detection to close dropdowns
  const formRef = useRef(null); 
  
  // get today's date with preventing users from selecting past dates
  const getTodayDate = () => {
    const today = new Date();
    // return YYYY-MM-DD format
    return today.toISOString().split('T')[0];
  };

  // get minimum return date 
  // it is to do prevent users from selecting return dates before departure date
  const getMinReturnDate = () => {
    if (!departureDate) return getTodayDate();
    return departureDate >= getTodayDate() ? departureDate : getTodayDate();
  };
  // handle airport input field changes with debounced API calls
  // value: the current input
  // type: origin or destination to identify which field is updated 
  const handleAirportInputChange = (value, type) => {
    // update the state based on input 
    if (type === 'origin') setOrigin(value);
    else setDestination(value);

    // clear any existing timeout to implement debouncing
    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    
    // no search if input is less than 2 characters 
    if (value.length < 2) {
      if (type === 'origin') setOriginSuggestions([]);
      else setDestinationSuggestions([]);
      return;
    }

    // debounced API call to fetch airport suggestions by waiting 300ms after user stops typing 
    // helps to prevent excessive API calls while user is still typing
    debounceTimeout.current = setTimeout(async () => {
      try {
        const response = await fetch(`/api/airport-search?keyword=${value}`);
        const data = await response.json();
        // update suggestions based on what typed in the input field 
        if (type === 'origin') setOriginSuggestions(data.data || []);
        else setDestinationSuggestions(data.data || []);
      } catch (error) {
        console.error("Failed to fetch airport suggestions:", error);
        // clear suggestions on error to prevent showing stale data
        if (type === 'origin') setOriginSuggestions([]);
        else setDestinationSuggestions([]);
      }
    }, 300);
  };

  // handle airport suggestion selection from dropdown menu 
  // suggestion - the selected airport suggestion 
  // iatacode - the IATA code of the selected airport
  // type - origin or destination 
  const handleSuggestionClick = (suggestion, type) => {
    if (type === 'origin') {
      // set origin to selected airport iata code 
      setOrigin(suggestion.iataCode); 
      // clear suggestions dropdown
      setOriginSuggestions([]); 
    } else {
      // set destination to selected airport iata code
      setDestination(suggestion.iataCode); 
      // clear suggestions dropdown
      setDestinationSuggestions([]); 
    }
    // hide all suggestions 
    setActiveInput(null); 
  };

  // effect to handle clicks outside the form to close suggestions dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      // check if click was done outside the form
      if (formRef.current && !formRef.current.contains(event.target)) {
        // close all suggestions dropdown
        setActiveInput(null); 
      }
    };
    
    // add event listener when user clicks anywhere in the page
    document.addEventListener("mousedown", handleClickOutside);
    
    // stop event listening for clicks done outside if the component is removed or ref changes
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [formRef]);

  // handle trip type change, which clears arrival date when switching to one-way 
  const handleTripTypeChange = (newTripType) => {
    setTripType(newTripType);
    if (newTripType === 'oneway') {
      // clear arrival date for one-way trips
      setArrivalDate(''); 
    }
  };
  // handle form submission - validate form data and calls the onSearch callback with search parameters
  // e - form submission event
  const handleSubmit = (e) => {
    // prevent default behaviour, which is reloading the page, form submission behavior
    e.preventDefault(); 
    
    // call parent component's search handler with formatted search data
    onSearch({
      // origin airport iata code
      locationDeparture: origin, 
      // destination airport iata code
      locationArrival: destination, 
      // departure date in YYYY-MM-DD format
      departure: departureDate, 
      // return date only for round trips
      arrival: tripType === 'return' ? arrivalDate : '', 
      // num of passengers 
      adults: adults.toString(), 
      // selected cabin class 
      cabinClass: cabinClass 
    });
  };

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="flight-search-form">
      {/* return or oneway selection */}
      <div className="form-group">
        <label>✈️ Trip Type</label>
        <div className="select-wrapper">
          <select value={tripType} onChange={(e) => handleTripTypeChange(e.target.value)}>
            <option value="return">Return</option>
            <option value="oneway">One Way</option>
          </select>
        </div>
      </div>

      {/* origin airport input */}
      <div className="form-group autocomplete-container">
        <label>◉ Origin</label>
        <input 
          type="text" 
          value={origin} 
          onChange={(e) => handleAirportInputChange(e.target.value, 'origin')} 
          onFocus={() => setActiveInput('origin')} 
          required 
          // disable browser autocomplete 
          autoComplete="off" 
        />
        {/* show airport suggestions dropdown given origin input is seleced */}
        {activeInput === 'origin' && originSuggestions.length > 0 && (
          <ul className="suggestions-list">
            {originSuggestions.map((s) => (
              <li 
                key={`${s.iataCode}-${s.name}`} 
                onClick={() => handleSuggestionClick(s, 'origin')}
              >
                {s.displayName}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* destination airport input*/}
      <div className="form-group autocomplete-container">
        <label>⚲ Destination</label>
        <input 
          type="text" 
          value={destination} 
          onChange={(e) => handleAirportInputChange(e.target.value, 'destination')} 
          onFocus={() => setActiveInput('destination')} 
          required 
          // disable browser autocomplete
          autoComplete="off" 
        />
        {/* show airport suggestions given destination input is active */}
        {activeInput === 'destination' && destinationSuggestions.length > 0 && (
          <ul className="suggestions-list">
            {destinationSuggestions.map((s) => (
              <li 
                key={`${s.iataCode}-${s.name}`} 
                onClick={() => handleSuggestionClick(s, 'destination')}
              >
                {s.displayName}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* departure date */}
      <div className="form-group">
        <label>🛫 Departure Date</label>
        <div className="date-input-container">
          <input 
            type="date" 
            value={departureDate} 
            onChange={(e) => setDepartureDate(e.target.value)} 
            // prevent selecting dates before today
            min={getTodayDate()} 
            required 
          />
          {/* clear button for departure date */}
          {departureDate && (
            <button 
              type="button" 
              className="clear-date-btn"
              onClick={() => setDepartureDate('')}
              title="Clear departure date"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* return date */}
      {tripType === 'return' && (
        <div className="form-group">
          <label>🛬 Return Date</label>
          <div className="date-input-container">
            <input 
              type="date" 
              value={arrivalDate} 
              onChange={(e) => setArrivalDate(e.target.value)} 
              // prevent selecting return date before departure date
              min={getMinReturnDate()} 
              // enabled only when return trip type is selected
              required={tripType === 'return'} 
            />
            {/* clear button for arrival date */}
            {arrivalDate && (
              <button 
                type="button" 
                className="clear-date-btn"
                onClick={() => setArrivalDate('')}
                title="Clear arrival date"
              >
                ×
              </button>
            )}
          </div>
        </div>
      )}

      {/* num of travellers (adults) */}
      <div className="form-group">
        <label>👤 Travellers</label>
        <input 
          type="number" 
          value={adults} 
          onChange={(e) => setAdults(e.target.value)} 
          min="1" 
          max="4"
          required 
        />
      </div>

      {/* cabin class selection */}
      <div className="form-group">
        <label>💺 Cabin Class</label>
        <div className="select-wrapper">
          <select value={cabinClass} onChange={(e) => setCabinClass(e.target.value)}>
            {cabinClassOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* submit button and show loading state */}
      <button type="submit" disabled={loading}>
        {loading ? 'Searching...' : 'Search Flights'}
      </button>
    </form>
  );
};

export default FlightSearchForm;
