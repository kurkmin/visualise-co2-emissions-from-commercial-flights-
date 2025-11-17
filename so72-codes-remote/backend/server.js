/**
 * VisCO2Fly Backend Server:
 * express.js server that provides flight search and CO2 emissions data to the frontend.
 * This server acts as a middleware layer between the frontend application and multiple external APIs,
 * handling authentication, data processing, and CO2 calculations.
 */

// Initial setup
// load environment variables from .env file for secure API credentials management
require('dotenv').config();

// import dependencies
const express = require("express");
// cors for frontend communication
const cors = require('cors'); 
// http client for external API calls
const axios = require('axios'); 
// Amadeus API SDK
const Amadeus = require("amadeus"); 
// Duffel API SDK
const { Duffel } = require('@duffel/api'); 

// initialise express 
const app = express(); 

// enable to parse JSON requests from frontend
app.use(express.json()); 
// enable cors  
app.use(cors()); 

// initialize Amadeus SDK with API credentials 
// The code below was taken from a post by Amadeus: https://github.com/amadeus4dev/amadeus-node (last accessed 2025 07-27)
// BEGIN Copied Code 
const amadeus = new Amadeus({
  clientId: process.env.AMADEUS_CLIENT_ID,
  clientSecret: process.env.AMADEUS_CLIENT_SECRET,
  hostname: 'production' 
});
// END Copied Code 

// initialize Duffel SDK with API credentials 
// The code below was taken from a post by Duffel: https://github.com/duffelhq/duffel-api-javascript/blob/main/README.md (last accessed 2025 07-27)
// BEGIN Copied Code 
const duffel = new Duffel({
  token: process.env.DUFFEL_API_KEY,
});
// END Copied Code 

// deduplication setup
// simple request deduplication cache
const requestCache = new Map();
// 30 seconds
const CACHE_DURATION = 30000; 
// mutex for flight search endpoint - prevents sending duplicated requests
let flightSearchInProgress = false;
// request counter for debugging
let requestCounter = 0;

// transform Duffel data structure to match Amadeus's one
function transformDuffelToAmadeus(duffelOffer) {
  return {
    id: duffelOffer.id,
    // transform itineraries
    itineraries: duffelOffer.slices.map(slice => ({
      duration: slice.duration,
      segments: slice.segments.map(segment => ({
        departure: {
          iataCode: segment.origin.iata_code,
          at: segment.departing_at
        },
        arrival: {
          iataCode: segment.destination.iata_code,
          at: segment.arriving_at
        },
        carrierCode: segment.marketing_carrier.iata_code,
        number: segment.marketing_carrier_flight_number,
        aircraft: {
          code: segment.aircraft?.iata_code || ''
        },
        duration: segment.duration
      }))
    })),
    // transform price 
    price: {
      total: duffelOffer.total_amount,
      currency: duffelOffer.total_currency
    },
    // keep emissions data as is 
    emissionsGramsPerPax: duffelOffer.emissionsGramsPerPax,
    availableCabinClasses: duffelOffer.availableCabinClasses,
    emissionsCompleteness: duffelOffer.emissionsCompleteness
  };
}

// Airport autocomplete search - dual API integration
// Duffel API will be used as fallback if Amadeus API fails
// primary: Amadeus Airport Search API; secondary: Duffel Suggestion API
app.get("/airport-search", async (req, res) => {
  const { keyword } = req.query;
  // validate input - require at least 2 characters to avoid too many results
  if (!keyword || keyword.length < 2) {
    return res.json({ data: [] });
  }
  // try Amadeus first, fallback to Duffel if it fails
  try {
    console.log("trying Amadeus airport search...");
    // call Amadeus API to search for airports matching the keyword
    // The code below was taken from a post by Amadeus: https://developers.amadeus.com/blog/airport-autocomplete-jquery-ajax (last accessed 2025 07-27)
    // BEGIN Copied Code 
    const response = await amadeus.referenceData.locations.get({
      keyword: keyword,
      subType: 'AIRPORT',
    });
    // END Copied Code 

    // format the Amadeus data for communication with frontend 
    const formattedData = response.data.map(location => ({
      // 3-letter airport code 
      iataCode: location.iataCode, 
      // airport name
      name: location.name, 
      // airport's city
      cityName: location.address?.cityName || '', 
      // airport's country
      countryName: location.address?.countryName || '', 
      // what user can see from drop-down menu
      displayName: `${location.iataCode} - ${location.name}${location.address?.cityName ? ', ' + location.address.cityName : ''}${location.address?.countryName ? ', ' + location.address.countryName : ''}`
    }));

    console.log(`Amadeus airport search successful: ${formattedData.length} results`);
    res.json({ data: formattedData });

  } catch (amadeusError) {
    console.log("Amadeus airport search failed, trying Duffel fallback...");
    // fallback (Duffel) api 
    // The code below was taken from a post by Duffel: https://duffel.com/docs/api/places/get-place-suggestions?ref=duffel.ghost.io (last accessed 2025 07-27)
    // BEGIN Copied Code 
    try {
      const response = await duffel.suggestions.list({
        query: keyword,
      });
    // END Copied Code 

      // format the Duffel response data for communication with frontend 
      const formattedData = response.data
      // only include airports
        .filter(suggestion => suggestion.type === 'airport') 
        .map(airport => ({
          // 3-letter airport code 
          iataCode: airport.iata_code, 
          // airport name
          name: airport.name, 
          // airport's city 
          cityName: airport.city?.name || '', 
          // airport's country 
          countryName: airport.city?.country?.name || '', 
          // what user can see from drop-down menu
          displayName: `${airport.iata_code} - ${airport.name}${airport.city?.name ? ', ' + airport.city.name : ''}${airport.city?.country?.name ? ', ' + airport.city.country.name : ''}`
        }));

      console.log(`Duffel airport search fallback successful: ${formattedData.length} results`);
      res.json({ data: formattedData });

    } catch (duffelError) {
      console.error("Both Amadeus and Duffel airport search failed");
      console.error("Duffel error:", duffelError.response ? duffelError.response.data : duffelError.message);
      // Return error response with empty data array to prevent frontend crashes
      res.status(500).json({ error: 'Failed to search airports with both APIs', data: [] });
    }
  }
});


// Flight Search - dual API integration 
// Duffel API will be used as fallback if Amadeus API fails
// primary: Amadeus Flight Offers Search API; secondary: Duffel Offers Requests API
// For CO2 emission, Google Travel Impact Model API is used to calculate 
// 1. the typical CO2 emission for a given route    
// 2. the CO2 emission of each journey 
app.post("/date", async (req, res) => {
  // counter for debugging purpose 
  requestCounter++;
  const currentRequestNumber = requestCounter;
  console.log(`Request #${currentRequestNumber} - Attempting to acquire mutex (current status: ${flightSearchInProgress})`);
  const wasAlreadyInProgress = flightSearchInProgress;
  flightSearchInProgress = true;

  // reject duplicated request 
  if (wasAlreadyInProgress) {
    console.log(`Request #${currentRequestNumber} - Flight search already in progress, rejecting duplicate request`);
    return res.status(200).json({ error: 'Flight search already in progress' });
  }
  console.log(`Request #${currentRequestNumber} - Mutex acquired successfully, processing flight search`);

  try {
    // extract and destructure search parameters from request body for flight search API calls
    const { departure, arrival, locationDeparture, locationArrival, adults, cabinClass } = req.body;
    // create cache key for request deduplication
    const cacheKey = JSON.stringify({ departure, arrival, locationDeparture, locationArrival, adults, cabinClass });
    // check if it has a recent cached response
    if (requestCache.has(cacheKey)) {
      const cached = requestCache.get(cacheKey);
      if (Date.now() - cached.timestamp < CACHE_DURATION) {
        console.log("Returning cached flight search result");
        return res.json(cached.data);
      } else {
        // remove expired cache
        requestCache.delete(cacheKey); 
      }
    }
    // generate unique request ID for tracking
    const requestId = Math.random().toString(36).substring(2, 11);
    // log for debugging and monitoring usage patterns
    console.log(`[${requestId}] Searching for flights:`, { locationDeparture, locationArrival, departure, adults });
    const result = await processFlightSearch({ departure, arrival, locationDeparture, locationArrival, adults, cabinClass, cacheKey, requestId });
    return res.json(result);
  } catch (error) {
    const errorMessage = error.message || 'Flight search failed';
    return res.status(500).json({ error: errorMessage });
  } finally {
    // always release mutex when done
    flightSearchInProgress = false;
  }
});

// extract the flight search logic into a separate function
async function processFlightSearch({ departure, arrival, locationDeparture, locationArrival, adults, cabinClass, cacheKey, requestId }) {
  // initialize Google Travel Impact Model API credentials 
  const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY; 
  // typical CO2 emissions data 
  let typicalEmissions = null; 

  // fetch typical CO2 emissions for a given route
  // The code below was taken from a post by Google: https://developers.google.com/travel/impact-model (last accessed 2025 07-27)
  // BEGIN Copied Code  
  try {
    const typicalResponse = await axios.post(
      `https://travelimpactmodel.googleapis.com/v1/flights:computeTypicalFlightEmissions?key=${GOOGLE_API_KEY}`,
      {
        markets: [{
          origin: locationDeparture,
          destination: locationArrival
        }]
      }
    );
  // END Copied Code 

    // extract typical emissions data if available
    if (typicalResponse.data?.typicalFlightEmissions?.[0]?.emissionsGramsPerPax) {
      typicalEmissions = typicalResponse.data.typicalFlightEmissions[0].emissionsGramsPerPax;
    }
  } catch (typicalError) {
    // log error 
    const errorMessage = typicalError.response?.data || typicalError.message || 'Unknown error occurred';
    console.error("Typical Emissions API Error:", errorMessage);
  }

  // primary: Amadeus Flight Offers Search API; secondary: Duffel Offers Requests API
  let allFlightOffers = [];
  let usingDuffel = false;

  // try Amadeus API
  try {
    console.log("Trying Amadeus flight search...");

    // search parameters for Amadeus API
    const amadeusSearchParams = {
      // origin airport code
      originLocationCode: locationDeparture,
      // destination airport code 
      destinationLocationCode: locationArrival, 
      // departure date 
      departureDate: departure, 
      // number of adult passengers
      adults: adults, 
    };

    // optional parameters 
    // cabin class 
    if (cabinClass) amadeusSearchParams.travelClass = cabinClass; 
    // return date for round trips
    if (arrival) amadeusSearchParams.returnDate = arrival; 

    // call Amadeus Flight Offers Search API
    // The code below was taken from a post by Amadeus: https://developers.amadeus.com/self-service/category/flights/api-doc/flight-offers-search (last accessed 2025 07-27)  
    // BEGIN Copied Code 
    const amadeusResponse = await amadeus.shopping.flightOffersSearch.get(amadeusSearchParams);
    // END Copied Code 
    allFlightOffers = amadeusResponse.data;
    console.log(`Amadeus flight search successful: ${allFlightOffers.length} offers`);

  } catch (amadeusError) {
    console.log("Amadeus flight search failed, trying Duffel fallback...");
    console.error("Amadeus error:", amadeusError.response ? amadeusError.response.data : amadeusError.message);

    try {
      // fallback to Duffel API
      console.log(`Using Duffel API as fallback... [${requestId}]`);
      usingDuffel = true;

      // parameters transfomred for requesting to Duffel's API 
      // build passengers array for Duffel API
      const passengers = Array.from({ length: adults }, (_, i) => ({
        type: 'adult'
      }));

      // build slices array for Duffel API
      const slices = [{
        origin: locationDeparture,
        destination: locationArrival,
        departure_date: departure
      }];

      // add return to slice if round trip
      if (arrival) {
        slices.push({
          origin: locationArrival,
          destination: locationDeparture,
          departure_date: arrival
        });
      }

      // search parameters for Duffel API
      const duffelSearchParams = {
        slices: slices,
        passengers: passengers,
        max_connections: 2 
      };

      // add cabin class
      if (cabinClass) {
        duffelSearchParams.cabin_class = cabinClass.toLowerCase();
      }

      // create Duffel's flight offer request
      console.log("Creating Duffel offer request...");
      // The code below was taken from a post by Duffel: https://duffel.com/docs/api/v2/offer-requests (last accessed 2025 07-27)
      // BEGIN Copied Code
      const offerRequest = await duffel.offerRequests.create(duffelSearchParams);
      // END Copied Code

      // get offers from the request
      console.log(`Fetching offers from Duffel... [${requestId}]`);
      const offersResponse = await duffel.offers.list({
        offer_request_id: offerRequest.data.id,
        // limit to 40 offers due to the limit of 120 requests per minute
        limit: 40 
      });

      allFlightOffers = offersResponse.data;
      console.log(`Duffel flight search fallback successful: ${allFlightOffers.length} offers [${requestId}]`);

      // deduplicate Duffel offers 
      const flightRouteMap = new Map();
      const duplicateCount = allFlightOffers.length;

      allFlightOffers.forEach(offer => {
        // generate unique flight route key
        const flightKey = offer.slices.map(slice =>
          slice.segments.map(segment =>
            `${segment.marketing_carrier.iata_code}${segment.marketing_carrier_flight_number}@${segment.departing_at}`
          ).join('|')
        ).join('||');

        // keep only unique flight route
        if (!flightRouteMap.has(flightKey)) {
          flightRouteMap.set(flightKey, offer);
        }
      });
      // convert back to array with only unique flight routes
      allFlightOffers = Array.from(flightRouteMap.values());

      const removedDuplicates = duplicateCount - allFlightOffers.length;
      if (removedDuplicates > 0) {
        // for debugging purpose
        console.log(`[${requestId}] Removed ${removedDuplicates} duplicate flight routes, keeping ${allFlightOffers.length} unique offers`);
      }

    } catch (duffelError) {
      console.error("Both Amadeus and Duffel flight search failed");
      console.error("Duffel error:", duffelError.response ? duffelError.response.data : duffelError.message);
      throw new Error('Failed to fetch flight offers from both APIs.');
    }
  }

  // group flight offers by unique itinerary to avoid duplicated CO2 calculations for identical flights
  try {
    if (allFlightOffers.length > 0) {
      const groupedOffers = {};
      allFlightOffers.forEach(offer => {
        let flightKey;
        if (usingDuffel) {
          // Duffel data structure
          flightKey = offer.slices.map(slice =>
            slice.segments.map(segment =>
              `${segment.marketing_carrier.iata_code}${segment.marketing_carrier_flight_number}@${segment.departing_at}`
            ).join('|')
          ).join('||');
        } else {
          // Amadeus data structure
          flightKey = offer.itineraries.map(itinerary =>
            itinerary.segments.map(segment =>
              `${segment.carrierCode}${segment.number}@${segment.departure.at}`
            ).join('|')
          ).join('||');
        }
        // group offers with the same flight itinerary
        if (!groupedOffers[flightKey]) groupedOffers[flightKey] = [];
        groupedOffers[flightKey].push(offer);
      });

      // fetch CO2 emissions for each unique flight journey
      await Promise.all(
        Object.values(groupedOffers).map(async (offersInGroup) => {
          // use first offer in group as representative 
          const representativeOffer = offersInGroup[0];

          // transform flight segments from Duffel data structure into Google Travel Impact Model API format 
          // in this case a segment means one leg of the journey
          let flightsToCalculate;
          if (usingDuffel) {
            flightsToCalculate = representativeOffer.slices.flatMap(slice =>
              slice.segments.map(segment => ({
                // departure airport code
                origin: segment.origin.iata_code, 
                // arrival airport code
                destination: segment.destination.iata_code, 
                // airline code 
                operatingCarrierCode: segment.operating_carrier.iata_code, 
                // flight number
                flightNumber: parseInt(segment.operating_carrier_flight_number), 
                departureDate: {
                  year: new Date(segment.departing_at).getFullYear(),
                  // since no 0 month, we add 1 here
                  month: new Date(segment.departing_at).getMonth() + 1, 
                  day: new Date(segment.departing_at).getDate()
                }
              }))
            );
          } else {
            // transform from Amadeus data structure into Google Travel Impact Model API format 
            flightsToCalculate = representativeOffer.itineraries.flatMap(itinerary =>
              itinerary.segments.map(segment => ({
                // departure airport code
                origin: segment.departure.iataCode, 
                // arrival airport code
                destination: segment.arrival.iataCode, 
                // airline code 
                operatingCarrierCode: segment.carrierCode, 
                // flight number
                flightNumber: parseInt(segment.number), 
                departureDate: {
                  year: new Date(segment.departure.at).getFullYear(),
                  month: new Date(segment.departure.at).getMonth() + 1,
                  day: new Date(segment.departure.at).getDate()
                }
              }))
            );
          }

          // initialise variables to store emissions calculation results
          let emissionsData = null, availableCabins = [], completeness = false;

          // call Google Travel Impact Model API to calculate CO2 emissions
          // , which will provide emissions data for different cabin classes
          try {
            const googleResponse = await axios.post(
              `https://travelimpactmodel.googleapis.com/v1/flights:computeFlightEmissions?key=${GOOGLE_API_KEY}`,
              { flights: flightsToCalculate }
            );

            if (googleResponse.data.flightEmissions?.length > 0) {
              // initialise for each cabin class
              const totalEmissions = { economy: 0, premiumEconomy: 0, business: 0, first: 0 };
              const availableCabinsFromGoogle = new Set();
              let isDataComplete = true;

              // sum up emissions from all flight segments
              googleResponse.data.flightEmissions.forEach(flightEmission => {
                if (flightEmission.emissionsGramsPerPax) {
                  Object.keys(totalEmissions).forEach(key => {
                    const emissionValue = flightEmission.emissionsGramsPerPax[key];
                    if (typeof emissionValue === 'number' && emissionValue > 0) {
                      // sum emissions across segments
                      totalEmissions[key] += emissionValue; 
                      availableCabinsFromGoogle.add(key.replace('premiumEconomy', 'premium_economy').toUpperCase());
                    }
                  });
                } else {
                  // mark as incomplete if any segment does not have CO2 emissions data
                  isDataComplete = false;
                }
              });

              // filter out cabin classes that have zero emissions
              emissionsData = Object.fromEntries(Object.entries(totalEmissions).filter(([, val]) => val > 0));
              availableCabins = Array.from(availableCabinsFromGoogle);
              completeness = isDataComplete;
            }
          } catch (googleError) {
            // show Google API errors 
            const errorMessage = googleError.response?.data || googleError.message || 'Unknown Google API error occurred';
            console.error(`Google API Error for itinerary ${representativeOffer.id}:`, errorMessage);
          }


          // attach calculated emissions data to all offers in this group
          offersInGroup.forEach(offer => {
            // CO2 emissions per passenger by cabin class
            offer.emissionsGramsPerPax = emissionsData; 
            // list of cabin classes with emissions data
            offer.availableCabinClasses = availableCabins; 
            // if all segments have complete data
            offer.emissionsCompleteness = completeness; 
          });
        })
      );
      // transform Duffel data to Amadeus format if needed, and return to frontend
      if (usingDuffel) {
        allFlightOffers = allFlightOffers.map(offer => transformDuffelToAmadeus(offer));
        console.log(`Transformed ${allFlightOffers.length} Duffel offers to Amadeus format [${requestId}]`);
      }

      const responseData = {
        // flight offers CO2 emissions
        offers: allFlightOffers, 
        // typical emissions for a given route 
        typicalEmissions 
      };

      // cache the response to prevent duplicate requests
      requestCache.set(cacheKey, {
        data: responseData,
        timestamp: Date.now()
      });

      return responseData;
    } else {
      // no flights found for that search
      const responseData = { offers: [], typicalEmissions };

      // cache the response to prevent duplicate requests
      requestCache.set(cacheKey, {
        data: responseData,
        timestamp: Date.now()
      });

      return responseData;
    }
  } catch (error) {
    // handle any errors during flight search or processing
    const errorMessage = error.response?.data || error.message || 'Flight search processing error';
    console.error("General API Error:", errorMessage);
    throw new Error('Failed to process flight search.');
  }
}

// server configuration
// environment variable for port, otherwise to 2800 for development
const PORT = process.env.PORT || 2800;

// start the server
const server = app.listen(PORT, () => {
  console.log(`VisCO2Fly Backend Server running at PORT ${PORT}`);
});

// handlers that ensure the server shuts down
// ctrl+C (SIGINT) - interrupt signal
process.on('SIGINT', () => {
  console.log("\nReceived SIGINT. Shutting down...");
  server.close(() => {
    console.log("Server closed.");
    process.exit(0);
  });
});

// ctrl+Z (SIGTSTP) - terminal stop signal
process.on('SIGTSTP', () => {
  console.log("\nReceived SIGTSTP signal. Shutting down...");
  server.close(() => {
    console.log("Server closed.");
    process.exit(0);
  });
});