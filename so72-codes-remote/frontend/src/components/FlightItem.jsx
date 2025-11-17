// FlightItem component - shows information for a single flight option 

import React, { useState } from 'react';
import { getCO2EmissionForClass, getPriceForClass, getFlightKey, formatTime, formatStops, formatDuration, parseDuration } from '../utils/helpers';

const FlightItem = ({ flight, searchedCabinClass, isHighlighted, isSelected, onMouseEnter, onMouseLeave }) => {
  // state for managing booking area 
  const [showBookingButtons, setShowBookingButtons] = useState(false);
  // state for managing detailed flight info 
  const [showDetailedSegments, setShowDetailedSegments] = useState(false);
  // true for round-trip, false for one-way flights
  const isRoundTrip = flight.itineraries.length > 1; 
  // CO2 emissions string for user chosen cabin class
  const co2Emission = getCO2EmissionForClass(flight, searchedCabinClass); 
  // price (EURO)
  const price = getPriceForClass(flight, searchedCabinClass); 
  // unique identifier 
  const flightKey = getFlightKey(flight); 
  
  // format cabin class string for human undersanable one 
  const cabinLabel = searchedCabinClass.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());

  // generate Skyscanner booking URL with flight details
  const generateSkyscannerUrl = () => {
    const firstItinerary = flight.itineraries[0];
    const origin = firstItinerary.segments[0].departure.iataCode;
    const destination = firstItinerary.segments[firstItinerary.segments.length - 1].arrival.iataCode;
    // YYYY-MM-DD format
    const departureDate = firstItinerary.segments[0].departure.at.split('T')[0]; 
    
    let url = `https://www.skyscanner.com/transport/flights/${origin}/${destination}/${departureDate.replace(/-/g, '')}`;
    
    // add return date for round trips
    if (flight.itineraries.length > 1) {
      const returnItinerary = flight.itineraries[1];
      const returnDate = returnItinerary.segments[0].departure.at.split('T')[0];
      url += `/${returnDate.replace(/-/g, '')}`;
    }
    
    // add passengers and cabin class
    url += `/?adults=1&cabinclass=${searchedCabinClass.toLowerCase()}`;
    
    return url;
  };

  // generate Kayak booking URL with flight details
  const generateKayakUrl = () => {
    const firstItinerary = flight.itineraries[0];
    const origin = firstItinerary.segments[0].departure.iataCode;
    const destination = firstItinerary.segments[firstItinerary.segments.length - 1].arrival.iataCode;
    // YYYY-MM-DD format
    const departureDate = firstItinerary.segments[0].departure.at.split('T')[0]; 
    
    let url = `https://www.kayak.com/flights/${origin}-${destination}/${departureDate}`;
    
    // for round trips, add return date
    if (flight.itineraries.length > 1) {
      const returnItinerary = flight.itineraries[1];
      const returnDate = returnItinerary.segments[0].departure.at.split('T')[0];
      url += `/${returnDate}`;
    }
    
    // add passengers and cabin class parameters
    url += `?sort=bestflight_a&passengers=1`;
    
    // add cabin class if not economy
    if (searchedCabinClass !== 'ECONOMY') {
      const cabinMap = {
        'PREMIUM_ECONOMY': 'premium',
        'BUSINESS': 'business',
        'FIRST': 'first'
      };
      url += `&cabin=${cabinMap[searchedCabinClass] || 'economy'}`;
    }
    
    return url;
  };

  // select button click for toggling the display of booking buttons
  const handleSelectClick = () => {
    setShowBookingButtons(!showBookingButtons);
  };

  // booking button click for opening booking website in new tab
  const handleBookingClick = (url) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // flight item click for showing detailed segments
  const handleFlightClick = () => {
    setShowDetailedSegments(!showDetailedSegments);
  };

  return (
    <>
      <li
        className={`flight-item ${isHighlighted ? 'highlighted' : ''} ${isSelected ? 'flight-selected' : ''} ${isRoundTrip ? 'round-trip' : ''} ${showDetailedSegments ? 'expanded' : ''}`}
        data-flight-id={flightKey} 
        // trigger hover effects in charts
        onMouseEnter={() => onMouseEnter(flight, flightKey, co2Emission)}
        // clear hover effects
        onMouseLeave={onMouseLeave}
        // click to expand the details
        onClick={handleFlightClick}
        style={{ cursor: 'pointer' }}
      >
      {/* flight segments part */}
      <div className="flight-segments">
        {flight.itineraries.map((itinerary, index) => {
          // segment information for this itinerary
          // first flight segment
          const firstSegment = itinerary.segments[0]; 
          // last one
          const lastSegment = itinerary.segments.at(-1); 
          // num of stops 
          const stops = itinerary.segments.length - 1; 
          // unique airlines
          const uniqueCarrierCodes = [...new Set(itinerary.segments.map(s => s.carrierCode))]; 
          // duration (in minutes)
          const segmentDuration = itinerary.duration ? parseDuration(itinerary.duration) : 
          (new Date(lastSegment.arrival.at) - new Date(firstSegment.departure.at)) / (1000 * 60); 

          return (
            <div key={index} className="flight-segment">
              {/* show return for round trips */}
              {index === 1 && <div className="segment-separator">Return Flight</div>}
              
              <div className="flight-details">
                {/* airline info */}
                <div className="airline-info">
                  {/* airline logo */}
                  <div className="airline-logos-container">
                    {uniqueCarrierCodes.map(code => (
                      <img 
                        key={code} 
                        // the partial part of code below was taken from a post by Daisycon.io 
                        // this is to do show airline logos in the flight item
                        // https://www.daisycon.com/en/developers/productfeeds/product-images/airline-logos/ (last accessed 2025-08-09)
                        src={`https://images.daisycon.io/airline/?width=160&height=160&iata=${code}`} 
                        alt={code} 
                        className="airline-logo" 
                      />
                    ))}
                  </div>
                  
                  {/* flight numbers for each segment */}
                  <div className="airline-meta-list">
                    {itinerary.segments.map((seg, idx) => (
                      <div className="airline-meta" key={idx}>
                        {seg.carrierCode} {seg.number}
                      </div>
                    ))}
                  </div>
                </div>

                {/* time and airport info */}
                <div className="time-info">
                  {/* departure time and airport */}
                  <div className="time-details">
                    <div className="time">{formatTime(firstSegment.departure.at)}</div>
                    <div className="airport-code">{firstSegment.departure.iataCode}</div>
                  </div>
                  
                  {/* arrow sign for jorney */}
                  <div className="journey-line">→</div>
                  
                  {/* arrival time and airport */}
                  <div className="time-details">
                    <div className="time">{formatTime(lastSegment.arrival.at)}</div>
                    <div className="airport-code">{lastSegment.arrival.iataCode}</div>
                  </div>
                </div>

                {/* stops and duration info */}
                <div className="stops-info">
                  <div className="stops-text">{formatStops(stops)}</div>
                  <div className="duration-text">⏱️ {formatDuration(segmentDuration)}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/*  details are shown when flight is clicked */}
      {showDetailedSegments && (
        <div className="detailed-segments">
          <div className="detailed-segments-header">
            <h4>Flight Details</h4>
            <span className="expand-indicator">Click to collapse</span>
          </div>
          
          {flight.itineraries.map((itinerary, itineraryIndex) => (
            <div key={itineraryIndex} className="detailed-itinerary">
              {itinerary.segments.length > 1 && (
                <h5>{itineraryIndex === 0 ? 'Outbound Journey' : 'Return Journey'}</h5>
              )}
              
              {itinerary.segments.map((segment, segmentIndex) => (
                <div key={segmentIndex} className="detailed-segment">
                  <div className="segment-header">
                    <div className="flight-number">
                      {/* // the partial part of code below was taken from a post by Daisycon.io 
                        // this is to do show airline logos in the flight item
                        // https://www.daisycon.com/en/developers/productfeeds/product-images/airline-logos/ (last accessed 2025-08-09) */}
                      <img 
                        src={`https://images.daisycon.io/airline/?width=160&height=160&iata=${segment.carrierCode}`} 
                        alt={segment.carrierCode} 
                        className="small-airline-logo" 
                      />
                      {segment.carrierCode} {segment.number}
                    </div>
                    <div className="aircraft-info">{segment.aircraft?.code || 'N/A'}</div>
                  </div>
                  
                  <div className="segment-times">
                    <div className="departure-info">
                      <div className="time-large">{formatTime(segment.departure.at)}</div>
                      <div className="airport-info">
                        <span className="airport-code">{segment.departure.iataCode}</span>
                        <span className="terminal">{segment.departure.terminal ? `Terminal ${segment.departure.terminal}` : ''}</span>
                      </div>
                    </div>
                    
                    <div className="flight-duration">
                      <div className="duration-line"></div>
                      <div className="duration-text">
                        {formatDuration(
                          segment.duration 
                            ? parseDuration(segment.duration)
                            : (new Date(segment.arrival.at) - new Date(segment.departure.at)) / (1000 * 60)
                        )}
                      </div>
                    </div>
                    
                    <div className="arrival-info">
                      <div className="time-large">{formatTime(segment.arrival.at)}</div>
                      <div className="airport-info">
                        <span className="airport-code">{segment.arrival.iataCode}</span>
                        <span className="terminal">{segment.arrival.terminal ? `Terminal ${segment.arrival.terminal}` : ''}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* show layover info if it is not the last segment */}
                  {segmentIndex < itinerary.segments.length - 1 && (
                    <div className="layover-info">
                      <div className="layover-duration">
                        Layover: {formatDuration(
                          (new Date(itinerary.segments[segmentIndex + 1].departure.at) - new Date(segment.arrival.at)) / (1000 * 60)
                        )} in {segment.arrival.iataCode}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* CO2 and pricing part */}
      <div className="co2-section">
        {/* main CO2 info */}
        <div className="co2-main-info">
          <div className="co2-amount">
            <span className="co2-text-label">CO₂</span> {co2Emission} kg
          </div>
          {/* . */}
        </div>
        
        {/* price display */}
        <div className="price-display">€{price.toFixed(2)}</div>
        
        {/* cabin class information */}
        <div className="cabin-class-info">{cabinLabel}</div>
        
        {/* selection button */}
        <button className="select-button" onClick={handleSelectClick}>
          Select
        </button>
      </div>
    </li>

    {/* booking options panel pop ups below the flight item */}
    {showBookingButtons && (
      <li className="booking-panel">
        <div className="booking-panel-content">
          <div className="booking-panel-header">
            <h4>Choose Your Booking Platform</h4>
            <button 
              className="booking-close-button" 
              onClick={() => setShowBookingButtons(false)}
            >
              ×
            </button>
          </div>
          
          <div className="booking-options-inline">
            <button 
              className="booking-button skyscanner-button" 
              onClick={() => handleBookingClick(generateSkyscannerUrl())}
            >
              🌐 Buy on Skyscanner
            </button>
            <button 
              className="booking-button kayak-button" 
              onClick={() => handleBookingClick(generateKayakUrl())}
            >
              🛫 Buy on Kayak
            </button>
          </div>
          
          <div className="booking-disclaimer-inline">
            <p>
              <strong>Please note:</strong> Flight prices may vary on the external booking site.
            </p>
          </div>
        </div>
      </li>
    )}
  </>
  );
};

export default FlightItem;