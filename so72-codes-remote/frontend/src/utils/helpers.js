// helpers for flight data formatting and calculations

// format time string to hh:mm format
export const formatTime = (dateTimeString) => {
  if (!dateTimeString) return '';
  return new Date(dateTimeString).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
     // use 24-hour format
    hour12: false
  });
};

// format flight duration from minutes to hours and minutes 
export const formatDuration = (minutes) => {
  const hours = Math.floor(minutes / 60);
  const mins = Math.floor(minutes % 60);
  return `${hours}h ${mins}m`;
};

// format number of stops into human-readable string
export const formatStops = (stops) => {
  if (stops === 0) return 'Direct';
  if (stops === 1) return '1 stop';
  return `${stops} stops`;
};

// get CO2 emissions for a chosen cabin class 
export const getCO2EmissionForClass = (flight, selectedClass) => {
  // check if flight has valid co2 emissions 
  if (!flight.emissionsGramsPerPax) return null;

  // convert cabin class format
  const classKey = selectedClass.toLowerCase().replace('_', '');
  const emission = flight.emissionsGramsPerPax[classKey];

  // validate emission value 
  if (typeof emission === 'number' && !isNaN(emission) && emission > 0) {
    // if so, convert grams to kg with 1 d.p
    return (emission / 1000).toFixed(1); 
  }
  return null;
};

// get price for a chosen cabin class 
export const getPriceForClass = (flight, selectedClass) => {
  // check for cabin-specific pricing 
  if (flight.allCabinPrices && flight.allCabinPrices[selectedClass]) {
    const price = flight.allCabinPrices[selectedClass].price;
    if (price && !isNaN(parseFloat(price))) return parseFloat(price);
  }

  // search through pricings for matching cabin class
  // there are different pricings, depending on the conditions of the flight option 
  if (flight.travelerPricings?.length > 0) {
    const pricing = flight.travelerPricings.find(tp =>
      tp.fareDetailsBySegment?.some(fd => fd.cabin === selectedClass)
    );
    if (pricing?.price?.total) {
      // get total price
      const price = parseFloat(pricing.price.total);
      if (!isNaN(price)) return price;
    }
  }

  // use general flight price as fallback 
  if (flight.price?.total) {
    const price = parseFloat(flight.price.total);
    if (!isNaN(price)) return price;
  }

  // return 0 if no valid price found
  return 0;
};

// calculate total flight duration from departure to arrival
export const getFlightDuration = (flight) => {
  try {
    let totalDuration = 0;

    for (const itinerary of flight.itineraries || []) {
      if (!itinerary?.segments?.length) continue;

      // default option: use duration, provided API itself
      if (itinerary.duration) {
        totalDuration += parseDuration(itinerary.duration);
        continue;
      }

      // fallback option: calculate duration if default api does not provide 
      const firstSegment = itinerary.segments[0];
      const lastSegment = itinerary.segments[itinerary.segments.length - 1];
      
      if (!firstSegment?.departure?.at || !lastSegment?.arrival?.at) continue;
      
      const departureTime = new Date(firstSegment.departure.at);
      const arrivalTime = new Date(lastSegment.arrival.at);
      
      if (isNaN(departureTime.getTime()) || isNaN(arrivalTime.getTime())) continue;
      
      // calculate duration
      const itineraryDurationMs = arrivalTime - departureTime;
      if (itineraryDurationMs > 0) {
        totalDuration += itineraryDurationMs / (1000 * 60);
      }
    }

    return totalDuration;
  } catch (error) {
    // return 0 if there is any error
    return 0;
  }
};

// generate a unique identifier for a flight   
// this is to do display only one itinerary although one itinerary can have multiple pricings
export const getFlightKey = (flight) => {
  // generate key from all itineraries to ensure uniqueness for round trips
  const itineraryKeys = flight.itineraries.map((itinerary, index) => {
    const firstSegment = itinerary.segments[0];
    const lastSegment = itinerary.segments[itinerary.segments.length - 1];
    
    // normalise datetime strings to remove milliseconds 
    const departureAtNormalized = new Date(firstSegment.departure.at).toISOString().slice(0, 19);
    const arrivalAtNormalized = new Date(lastSegment.arrival.at).toISOString().slice(0, 19);
    
    // get key for this itinerary
    return `${firstSegment.carrierCode}${firstSegment.number}-${departureAtNormalized}-${arrivalAtNormalized}`;
  });
  
  // join all keys to create unique flight key
  return itineraryKeys.join('|');
};

// parse duration from flight API response 
export const parseDuration = (duration) => {
  // return 0 if null or undefined
  if (!duration) return 0;

  // if duration is already in minutes
  if (typeof duration === 'number') {
    // convert from seconds if > 1000 
    return duration > 1000 ? Math.round(duration / 60) : duration;
  }

  // handle ISO 8601 duration format (e.g., "PT2H30M" or "P1DT2H30M")
  try {
    // regex part of the code below was taken from a post by Wiktor Stribiżew 
    // https://stackoverflow.com/questions/32044846/regex-for-iso-8601-durations (last accessed 2025-08-01) 
    const matches = duration.match(/P(?:(\d+)D)?T(?:(\d+)H)?(?:(\d+)M)?/);
    if (!matches) return 0;

    const days = parseInt(matches[1] || '0', 10);
    const hours = parseInt(matches[2] || '0', 10);
    const minutes = parseInt(matches[3] || '0', 10);

    // convert duration to minutes
    return (days * 24 * 60) + (hours * 60) + minutes;
  } catch (error) {z
    return 0;
  }
};