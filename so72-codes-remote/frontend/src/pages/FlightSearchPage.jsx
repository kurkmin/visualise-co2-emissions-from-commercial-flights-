// FlightSearchPage component - display visualisations, including charts and infogrphiacs, and flight options 

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import * as d3 from 'd3';
import './FlightSearchPage.css';

// import components needed to compose the flight search page 
import FilterControls from '../components/FilterControls';
import FlightList from '../components/FlightList';
import OverviewChart from '../components/OverviewChart';
import DistributionChart from '../components/DistributionChart';
import Co2Equivalents from '../components/Co2Equivalents';
import Co2SavingsInfographics from '../components/Co2SavingsInfographics';
import PersonalCarbonBudget from '../components/PersonalCarbonBudget';
import FlightSearchForm from '../components/FlightSearchForm'; 
// import util constatns and util helpers 
import { cabinClassOptions } from '../utils/constants';
import { getCO2EmissionForClass, getPriceForClass, getFlightDuration, getFlightKey, formatDuration } from '../utils/helpers';

const FlightSearchPage = () => {
  // flight states:
  // all flights from Amadeus or Duffel flight search offers API
  const [flights, setFlights] = useState([]);
  // loading 
  const [loading, setLoading] = useState(false);
  // error message 
  const [error, setError] = useState('');
  // to see if search performed 
  const [searchPerformed, setSearchPerformed] = useState(false);
  // user's chosen cabin class
  const [searchedCabinClass, setSearchedCabinClass] = useState('ECONOMY');
  // typical CO2 data from Google TIM API
  const [typicalEmissions, setTypicalEmissions] = useState(null);
  // to display title for search route
  const [searchTitle, setSearchTitle] = useState('');
  // origin airport for searching 
  const [searchedOrigin, setSearchedOrigin] = useState('');
  // destination airport for searching 
  const [searchedDestination, setSearchedDestination] = useState('');

  // filter and sort states
  // sort by 
  const [sortBy, setSortBy] = useState('co2_lowest');
  // price filter range
  const [priceRange, setPriceRange] = useState([0, 10000]);
  // duration filter range (in minutes)
  const [durationRange, setDurationRange] = useState([0, 1440]);
  // CO2 filter range 
  const [co2Range, setCo2Range] = useState([0, 1000]);
  // num of stops filter
  const [stopsFilter, setStopsFilter] = useState('any');

  // interaction states
  // current chart view, which is either overview or distribution
  const [activeView, setActiveView] = useState('overview');
  // chart tooltip
  const [tooltip, setTooltip] = useState({ visible: false, content: null, x: 0, y: 0 });
  // hovered flight IDs
  const [hoveredFlightIds, setHoveredFlightIds] = useState([]);
  // hovered flight data
  const [hoveredFlightData, setHoveredFlightData] = useState(null);
  // data for infographics
  const [infographicData, setInfographicData] = useState(null);
  // selected flight from chart click
  const [selectedFlightId, setSelectedFlightId] = useState(null);
  // to track hovered flight card  
  const [isFlightCardHovered, setIsFlightCardHovered] = useState(false);
  // to track scroll-to-top button
  const [showScrollTop, setShowScrollTop] = useState(false);
  // to track expandable search form 
  const [showSearchForm, setShowSearchForm] = useState(false);

  // prevent multiple search initialisations
  const searchInitialized = useRef(false);

  // scroll event listener for scroll-to-top button visibility
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      // show button after scrolling 300px
      setShowScrollTop(scrollTop > 300); 
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // scroll to top function
  const scrollToTop = () => {
    window.scrollTo({ 
      top: 0,
      behavior: 'smooth'
    });
  };

  // initialise search on component by reading data from sessionStorage
  useEffect(() => {
    // prevent multiple initialisations
    if (searchInitialized.current) return;

    // get search parameters from HomePage
    const searchDataString = sessionStorage.getItem('currentFlightSearch');
    if (searchDataString) {
      const searchData = JSON.parse(searchDataString);
      // set display title and route info for infographics
      setSearchTitle(`${searchData.locationDeparture} → ${searchData.locationArrival}`);
      setSearchedOrigin(searchData.locationDeparture);
      setSearchedDestination(searchData.locationArrival);
      searchInitialized.current = true;
      // trigger the actual flight search
      handleSearch(searchData);
    }
  }, []);

  // function to search for flights 
  const handleSearch = async (searchData) => {
    // reset state for new search
    setLoading(true);
    setError('');
    setFlights([]);
    setSearchPerformed(true);

    try {
      // call backend flight search endpoint
      const response = await fetch('/api/date', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(searchData)
      });

      // handle API errors if there is any 
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Server error.');
      }

      // process response
      const data = await response.json();
      const flights = data.offers || [];

      // update state with flight data
      setFlights(flights);
      // CO2 data from Google TIM API
      setTypicalEmissions(data.typicalEmissions || null);
      setSearchedCabinClass(searchData.cabinClass);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // filter flights to include only the ones with valid CO2 emissions 
  const flightsWithCO2 = useMemo(() =>
    flights.filter(f =>
      // has complete emissions?
      f.emissionsCompleteness &&
      // has emissions per passenger?
      f.emissionsGramsPerPax &&
      // can extract CO2 for chosen cabin class?
      getCO2EmissionForClass(f, searchedCabinClass) !== null
    ),
    [flights, searchedCabinClass]
  );

  // calculate min/max values for filter ranges based on flight data
  const { minPrice, maxPrice, minDuration, maxDuration, minCo2, maxCo2 } = useMemo(() => {
    // return default ranges if no flights available
    if (flightsWithCO2.length === 0) return { minPrice: 0, maxPrice: 10000, minDuration: 0, maxDuration: 1440, minCo2: 0, maxCo2: 1000 };

    // extract valid values for each filter 
    const prices = flightsWithCO2.map(f => getPriceForClass(f, searchedCabinClass)).filter(p => p > 0);
    const durations = flightsWithCO2.map(f => getFlightDuration(f)).filter(d => d > 0);
    const co2s = flightsWithCO2.map(f => parseFloat(getCO2EmissionForClass(f, searchedCabinClass))).filter(c => c > 0);

    // fallback to defaults if there is no valid data
    if (prices.length === 0 || durations.length === 0 || co2s.length === 0) {
      return { minPrice: 0, maxPrice: 10000, minDuration: 0, maxDuration: 1440, minCo2: 0, maxCo2: 1000 };
    }

    // calculate min/max values from flight data
    return {
      minPrice: Math.floor(Math.min(...prices)),
      maxPrice: Math.ceil(Math.max(...prices)),
      minDuration: Math.floor(Math.min(...durations)),
      maxDuration: Math.ceil(Math.max(...durations)),
      minCo2: Math.floor(Math.min(...co2s)),
      maxCo2: Math.ceil(Math.max(...co2s))
    };
  }, [flightsWithCO2, searchedCabinClass]);

  // update filter ranges when flight data changes
  useEffect(() => {
    if (flightsWithCO2.length > 0) {
      // set filter ranges to have available flight data
      setPriceRange([minPrice, maxPrice]);
      setDurationRange([minDuration, maxDuration]);
      setCo2Range([minCo2, maxCo2]);
    }
  }, [minPrice, maxPrice, minDuration, maxDuration, minCo2, maxCo2, flightsWithCO2.length]);

  // sort flights by CO2, price, or duration
  const sortedFlights = useMemo(() => {
    return [...flightsWithCO2].sort((a, b) => {
      switch (sortBy) {
        case 'co2_lowest': return (parseFloat(getCO2EmissionForClass(a, searchedCabinClass)) || 0) - (parseFloat(getCO2EmissionForClass(b, searchedCabinClass)) || 0);
        case 'co2_highest': return (parseFloat(getCO2EmissionForClass(b, searchedCabinClass)) || 0) - (parseFloat(getCO2EmissionForClass(a, searchedCabinClass)) || 0);
        case 'price_lowest': return (getPriceForClass(a, searchedCabinClass) || 0) - (getPriceForClass(b, searchedCabinClass) || 0);
        case 'price_highest': return (getPriceForClass(b, searchedCabinClass) || 0) - (getPriceForClass(a, searchedCabinClass) || 0);
        case 'duration_shortest': return (getFlightDuration(a) || 0) - (getFlightDuration(b) || 0);
        case 'duration_longest': return (getFlightDuration(b) || 0) - (getFlightDuration(a) || 0);
        default: return 0;
      }
    });
  }, [flightsWithCO2, searchedCabinClass, sortBy]);

  // apply user-selected filters to sorted flights
  const filteredFlights = useMemo(() => sortedFlights.filter(f => {
    // extract flight data for filtering
    const price = getPriceForClass(f, searchedCabinClass);
    const duration = getFlightDuration(f);
    const co2 = parseFloat(getCO2EmissionForClass(f, searchedCabinClass));
    // number of stops = segments - 1
    const stops = f.itineraries[0].segments.length - 1;

    // check stops filter, which is any, 0, 1, 2+
    let stopsPass = stopsFilter === 'any' || (stopsFilter === '2' ? stops >= 2 : stops === parseInt(stopsFilter));

    // apply all filters 
    return price >= priceRange[0] && price <= priceRange[1] &&
      duration >= durationRange[0] && duration <= durationRange[1] &&
      co2 >= co2Range[0] && co2 <= co2Range[1] &&
      stopsPass;
  }), [sortedFlights, searchedCabinClass, priceRange, durationRange, co2Range, stopsFilter]);

  // calculate CO2 differences between cabin classes for CO2 savings infographics
  const { businessCo2Difference, firstCo2Difference } = useMemo(() => {
    if (!hoveredFlightData) return { businessCo2Difference: null, firstCo2Difference: null };

    // get CO2 emissions for each cabin class
    const ecoCO2 = parseFloat(getCO2EmissionForClass(hoveredFlightData, 'ECONOMY'));
    const busCO2 = parseFloat(getCO2EmissionForClass(hoveredFlightData, 'BUSINESS'));
    const firCO2 = parseFloat(getCO2EmissionForClass(hoveredFlightData, 'FIRST'));

    // calculate differences from economy class for savings display
    const businessDiff = (ecoCO2 && busCO2) ? busCO2 - ecoCO2 : null;
    const firstDiff = (ecoCO2 && firCO2 && firCO2 !== busCO2) ? firCO2 - ecoCO2 : null;

    // only return when they have higher emissions than economy
    return {
      businessCo2Difference: businessDiff > 0 ? businessDiff : null,
      firstCo2Difference: firstDiff > 0 ? firstDiff : null
    };
  }, [hoveredFlightData]);

  // handle hover events on dots on chart 
  const handlePointHover = (event, data) => {
    // calculate CO2 range for grouped flights at same coordinates
    const [minCo2Val, maxCo2Val] = d3.extent(data.co2Values);

    
    // show tooltip with flight information
    setTooltip({
      visible: true,
      // position tooltip near cursor
      x: event.pageX + 15,
      y: event.pageY + 15,
      content: { ...data, co2Range: [minCo2Val.toFixed(1), maxCo2Val.toFixed(1)] }
    });

    // highlight corresponding flights 
    setHoveredFlightIds(data.ids);

    // update infographics with CO2 emissions
    setInfographicData({ co2_min: minCo2Val, co2_max: maxCo2Val });
  };

  // handle mouse leave events on dots on chart 
  const handlePointLeave = () => {
    // hide tooltip
    setTooltip(t => ({ ...t, visible: false }));
    // clear flight highlighting
    setHoveredFlightIds([]);
    // reset infographics to default
    setInfographicData(null);
  };

  // handle hover events on flight cards in the list
  const handleFlightCardEnter = (flight, flightKey, co2) => {
    // highlight this flight
    setHoveredFlightIds([flightKey]);
    // store flight data for infographics
    setHoveredFlightData(flight);
    // track that a flight card is being hovered
    setIsFlightCardHovered(true);

    // update infographics with specific flight CO2 data
    const co2Value = parseFloat(co2);
    if (!isNaN(co2Value)) setInfographicData({ co2_min: co2Value, co2_max: co2Value });
  };

  // handle mouse leave events on flight cards
  const handleFlightCardLeave = () => {
    // clear flight highlighting
    setHoveredFlightIds([]);
    // clear flight data
    setHoveredFlightData(null);
    // reset infographics
    setInfographicData(null);
    // track that no flight card is hovered
    setIsFlightCardHovered(false);
  };

  // handle click events on chart dots when scrolling to corresponding flight 
  const handleDotClick = (flightId) => {
    // prevent duplicated selections
    if (selectedFlightId === flightId) return;

    setSelectedFlightId(flightId);

    
    // delay to allow state update before DOM manipulation
    setTimeout(() => {
      try {
        // find the flight element in the list using data attribute
        const flightElement = document.querySelector(`[data-flight-id="${flightId}"]`);
        if (flightElement) {
          // check if flight is already visible in viewport
          const rect = flightElement.getBoundingClientRect();
          const isInView = rect.top >= 0 && rect.bottom <= window.innerHeight;

          // scroll to flight if not visible
          if (!isInView) {
            flightElement.scrollIntoView({
              behavior: 'smooth',
              block: 'center',
              inline: 'nearest'
            });
          }

          // add temporary highlighting animation
          flightElement.classList.add('flight-selected');
          setTimeout(() => {
            flightElement.classList.remove('flight-selected');
            setSelectedFlightId(null);
          }, 2000); // remove highlight after 2 seconds
        } else {
          setSelectedFlightId(null);
        }
      } catch (error) {
        setSelectedFlightId(null);
      }
    }, 150);
  };

  // calculate the number of flights being excluded due to lack of g CO2 data
  const flightsWithoutCO2Count = flights.length - flightsWithCO2.length;

  return (
    <main>
      {/* navigation and title header */}
      <div className="results-header-bar">
        <div className="header-left">
          <Link to="/" className="back-link">←</Link>
          {/* search icon that can expand to show the search form */}
          <button
            className="search-expand-btn"
            onClick={() => setShowSearchForm(!showSearchForm)}
            title={showSearchForm ? "Hide search form" : "Show search form"}
          >
            🔍
          </button>
        </div>
        <div className="header-title">VisCO2Fly</div>
        <h1>Flight Results for {searchTitle}</h1>
      </div>

      {/* search form when expanded */}
      {showSearchForm && (
        <div className="expandable-search-form">
          <div className="search-form-header">
            <h3>Search New Flights</h3>
            <button
              className="close-search-btn"
              onClick={() => setShowSearchForm(false)}
            >
              ×
            </button>
          </div>
          <FlightSearchForm onSearch={handleSearch} loading={loading} />
        </div>
      )}

      {/* floating tooltip for chart hover information */}
      <div className={`d3-tooltip ${tooltip.visible ? 'visible' : ''}`} style={{ left: tooltip.x, top: tooltip.y }}>
        {tooltip.content && <>
          <div><strong>Flights: </strong>{tooltip.content.flightNumbers}</div>
          <div><strong>Price:</strong> €{tooltip.content.price.toFixed(2)}</div>
          <div><strong>Duration:</strong> {formatDuration(tooltip.content.duration)}</div>
          <div><strong>CO₂: </strong>{tooltip.content.co2Range[0] === tooltip.content.co2Range[1] ? `${tooltip.content.co2Range[0]} kg` : `${tooltip.content.co2Range[0]} - ${tooltip.content.co2Range[1]} kg`}</div>
        </>}
      </div>

      {/* loading state display */}
      {loading && (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p className="loading-text">Searching for flights...</p>
          <p className="loading-subtext">Finding the best CO₂ options for you</p>
        </div>
      )}

      {/* error message display */}
      {error && <p className="error-message">Error: {error}</p>}

      {/* main content that can only shown after search is complete and not loading */}
      {!loading && searchPerformed && (
        <>
          {/* no flights found message */}
          {flights.length === 0 ? (
            <div className="no-results-message">
              <h3>No Flights Found</h3>
              <p>Your search returned no results. Please check your inputs or try different dates.</p>
            </div>
          ) : flightsWithCO2.length === 0 ? (
            /* no flights with CO2 data message */
            <div className="no-results-message">
              <h3>No Flights with CO₂ Data Found</h3>
              <p>We found {flights.length} flights, but none had emissions data. Try another route or cabin class.</p>
            </div>
          ) : (
            /* main results layout with charts and flight list */
            <div className="main-content-area">
              {/* left column: charts and infographics */}
              <div className="left-column">
                <div className="charts-container">
                  {/* tab navigation for chart views */}
                  <div className={`view-tabs ${activeView === 'distribution' && isFlightCardHovered ? 'hidden' : ''}`}>
                    <button className={`view-tab ${activeView === 'overview' ? 'active' : ''}`} onClick={() => setActiveView('overview')}>Overview</button>
                    <button className={`view-tab ${activeView === 'distribution' ? 'active' : ''}`} onClick={() => setActiveView('distribution')}>Emissions by Class</button>
                  </div>

                  {/* distribution bar chart view - shows  comparison accoss cabin classes*/}
                  {activeView === 'distribution' && (
                    <div className={`left-column-content-wrapper ${isFlightCardHovered ? 'tabs-hidden' : ''}`}>
                      <DistributionChart hoveredFlight={hoveredFlightData} typicalEmissions={typicalEmissions} selectedCabinClass={searchedCabinClass} />
                      {(() => {
                        // show typical cabin class savings when nothing is hovered
                        if (!hoveredFlightData && typicalEmissions) {
                          // calculate typical savings between cabin classes from Google IIM API 
                          const economyEmissions = typicalEmissions.economy ? typicalEmissions.economy / 1000 : null;
                          const businessEmissions = typicalEmissions.business ? typicalEmissions.business / 1000 : null;
                          const firstEmissions = typicalEmissions.first ? typicalEmissions.first / 1000 : null;

                          const typicalBusinessDiff = (economyEmissions && businessEmissions) ? businessEmissions - economyEmissions : null;
                          const typicalFirstDiff = (economyEmissions && firstEmissions && firstEmissions !== businessEmissions) ? firstEmissions - economyEmissions : null;

                          return <Co2SavingsInfographics businessDifference={typicalBusinessDiff} firstDifference={typicalFirstDiff} />;
                        }
                        // show user chosen flight cabin class savings when flight is hovered
                        return <Co2SavingsInfographics businessDifference={businessCo2Difference} firstDifference={firstCo2Difference} />;
                      })()}
                    </div>
                  )}

                  {/* overview chart view - shows scatterplot with infographics */}
                  {activeView === 'overview' && (
                    <div className='left-column-content-wrapper correlation-tab'>
                      <OverviewChart flights={filteredFlights} cabinClass={searchedCabinClass} hoveredFlightIds={hoveredFlightIds} onDotClick={handleDotClick} onHover={handlePointHover} onLeave={handlePointLeave} />
                      {(() => {
                        // determine what data to show in infographics 
                        // hovered flight vs typical (default)
                        let defaultData = infographicData;

                        // use typical emissions data given user chosen flight is not hovered
                        if (!infographicData && typicalEmissions) {
                          const typicalCO2Grams = typicalEmissions[searchedCabinClass.toLowerCase()];
                          if (typicalCO2Grams) {
                            // convert grams to kg
                            const typicalCO2Kg = typicalCO2Grams / 1000;
                            defaultData = {
                              co2_min: typicalCO2Kg,
                              co2_max: typicalCO2Kg,
                              isTypical: true
                            };
                          }
                        }

                        // fallback to default values if data not available
                        if (!defaultData) {
                          defaultData = { co2_min: 250, co2_max: 350, isTypical: true };
                        }

                        // use specific flight data if available from hovering
                        if (infographicData) {
                          defaultData = {
                            ...infographicData,
                            isTypical: false
                          };
                        }

                        // render infographics layout
                        return (
                          <div className="infographics-integrated">
                            {/* left side: CO2 equivalents in other consumptions */}
                            <div className="co2-equivalents-section">
                              <Co2Equivalents
                                co2_min={defaultData.co2_min}
                                co2_max={defaultData.co2_max}
                                isTypical={defaultData.isTypical}
                                route={`${searchedOrigin} → ${searchedDestination}`}
                              />
                            </div>
                            <div className="dotted-divider"></div>
                            {/* right side: personal carbon budget  */}
                            <div className="personal-budget-section">
                              <PersonalCarbonBudget
                                co2_min={defaultData.co2_min}
                                co2_max={defaultData.co2_max}
                                hoveredFlight={hoveredFlightData}
                                cabinClass={searchedCabinClass}
                                isTypical={defaultData.isTypical}
                                route={`${searchedOrigin} → ${searchedDestination}`}
                              />
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
                {/* user guidance hint */}
                <div className="hover-hint">
                  💡 Hover over flight options to see detailed environmental impact
                </div>
              </div>

              {/* right column: filters and flight results */}
              <div className="right-column">
                {/* filter controls */}
                <FilterControls {...{ priceRange, setPriceRange, minPrice, maxPrice, durationRange, setDurationRange, minDuration, maxDuration, co2Range, setCo2Range, minCo2, maxCo2, stopsFilter, setStopsFilter }} />

                {/* flight results list with sort by option */}
                <FlightList {...{ flights: filteredFlights, sortBy, setSortBy, searchedCabinClass, hoveredFlightIds, handleFlightCardEnter, handleFlightCardLeave, flightsWithCO2Count: flightsWithCO2.length, flightsWithoutCO2Count, selectedFlightId }} />
              </div>
            </div>
          )}
        </>
      )}

      {/* floating scroll-to-top button */}
      {showScrollTop && (
        <button
          className="scroll-to-top-btn"
          onClick={scrollToTop}
          title="Scroll to top"
          aria-label="Scroll to top"
        >
          ↑
        </button>
      )}
    </main>
  );
};

export default FlightSearchPage;
