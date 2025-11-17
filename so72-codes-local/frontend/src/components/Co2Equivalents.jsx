// Co2Equivalents component - translates CO2 emissions raw data into more relatable, everyday equivalents 

import React from 'react';

const Co2Equivalents = ({ co2_min, co2_max, isTypical = false, route = '' }) => {
  // no render if CO2 data not available
  if (co2_min == null || co2_max == null) return null;

  // constants for CO2 equivalent calculations 
  // UK electricity grid carbon intensity
  // the intensity figure is derived from the UK government's website: 
  // https://www.gov.uk/government/publications/greenhouse-gas-reporting-conversion-factors-2024 (last accessed 2025-08-02)
  const UK_KGCO2_PER_KWH = 0.23; 
  // 100W light bulb energy consumption
  const LIGHT_BULB_KWH_PER_HOUR = 0.1;
  // average washing machine energy per cycle
  // https://www.theguardian.com/environment/green-living-blog/2010/nov/25/carbon-footprint-load-laundry (last accessed 2025-08-03)
  const LAUNDRY_KWH_PER_CYCLE = 0.6; 
  // average car CO2 emissions per kilometer
  // https://www.nimblefins.co.uk/average-co2-emissions-car-uk#nogo (last accessed 2025-08-02)
  const CAR_KGCO2_PER_KM = 0.132; 

  // calculate equivalent activities for a given CO2 amount 
  const calculateEquivalents = (co2) => {
    if (co2 == null || co2 <= 0) return { lightBulbHours: 0, laundryWashes: 0, drivingKms: 0 };
    
    // calculate equivalents based on energy consumption and carbon intensity
    const lightBulbHours = co2 / (LIGHT_BULB_KWH_PER_HOUR * UK_KGCO2_PER_KWH);
    const laundryWashes = co2 / (LAUNDRY_KWH_PER_CYCLE * UK_KGCO2_PER_KWH);
    const drivingKms = co2 / CAR_KGCO2_PER_KM;
    
    return { lightBulbHours, laundryWashes, drivingKms };
  };

  // calculate equivalents for both min and max values
  const minEquivalents = calculateEquivalents(co2_min);
  const maxEquivalents = calculateEquivalents(co2_max);
  // check if we need to show a range
  const isRange = co2_min !== co2_max; 

  // format numbers with thousands separators 
  const formatNumber = (num) => Math.round(num).toLocaleString();

  return (
    <div className="infographics-container">
      <h3>
        {isTypical && route ? (
          <div style={{ fontSize: '0.75rem', color: '#666', marginBottom: '4px', fontWeight: 'normal' }}>
            Typical for {route}
          </div>
        ) : !isTypical && (co2_min || co2_max) ? (
          <div style={{ fontSize: '0.75rem', color: '#007bff', marginBottom: '4px', fontWeight: 'normal' }}>
            Your chosen flight option produces
          </div>
        ) : null}
        {isRange ? `${co2_min.toFixed(0)} - ${co2_max.toFixed(0)} kg` : `${co2_min.toFixed(0)} kg`} of CO₂ is equivalent to...
      </h3>
      <div className="infographic-item">
        <span className="icon">💡</span>
        <span>Using a 100W light bulb for <strong>{isRange ? `${formatNumber(minEquivalents.lightBulbHours)} - ${formatNumber(maxEquivalents.lightBulbHours)}` : formatNumber(minEquivalents.lightBulbHours)}</strong> hours</span>
      </div>
      <div className="infographic-item">
        <span className="icon">🧺</span>
        <span><strong>{isRange ? `${formatNumber(minEquivalents.laundryWashes)} - ${formatNumber(maxEquivalents.laundryWashes)}` : formatNumber(minEquivalents.laundryWashes)}</strong> laundry washes</span>
      </div>
      <div className="infographic-item">
        <span className="icon">🚗</span>
        <span>Driving for <strong>{isRange ? `${formatNumber(minEquivalents.drivingKms)} - ${formatNumber(maxEquivalents.drivingKms)}` : formatNumber(minEquivalents.drivingKms)}</strong> km</span>
      </div>
    </div>
  );
};

export default Co2Equivalents;