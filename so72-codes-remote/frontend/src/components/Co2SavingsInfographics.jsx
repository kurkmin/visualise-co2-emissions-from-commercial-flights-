// Co2SavingsInfographics component -shows CO2 savings comparisons for multiple cabin classes and the environmental benefits of choosing choosing Economy over Business/First class. 
import React from 'react';

const InfographicSavingsDetail = ({ baseClass, comparisonClass, co2Difference }) => {
  // no render if no meaningful savings
  if (!co2Difference || co2Difference <= 0) return null;

  // constants for CO2 savings calculations 
  // uK electricity grid carbon intensity
  // the intensity figure is derived from the UK government's website: 
  // https://www.gov.uk/government/publications/greenhouse-gas-reporting-conversion-factors-2024 (last accessed 2025-08-02)
  const UK_KGCO2_PER_KWH = 0.23; 
  // energy to charge a smartphone
  // https://www.bryceenergyservices.com/2024/10/03/the-total-energy-consumption-of-a-mobile-phone/ (last accessed 2025-08-03)
  const SMARTPHONE_CHARGE_KWH = 0.02; 
  // 350W solar panel output
  // https://www.theecoexperts.co.uk/solar-panels/output-calculator (last accessed 2025-08-03)
  const SOLAR_PANEL_KW = 0.35; 
  // average CO2 absorption per tree per years
  // https://ecotree.green/en/how-much-co2-does-a-tree-absorb (last accessed 2025-08-02)
  const TREE_ABSORPTION_PER_YEAR_KG = 25; 

  // calculate equivalent savings in relatable terms
  const co2_in_kwh_equivalent = co2Difference / UK_KGCO2_PER_KWH;
  const smartphoneCharges = Math.round(co2_in_kwh_equivalent / SMARTPHONE_CHARGE_KWH);
  const solarPanelHours = Math.round(co2_in_kwh_equivalent / SOLAR_PANEL_KW);
  const treesPerYear = Math.round(co2Difference / TREE_ABSORPTION_PER_YEAR_KG);

  // format numbers with thousands separators
  const formatNumber = (num) => num.toLocaleString();

  return (
    <div className="infographic-savings-detail">
      <h3>By choosing {baseClass} over {comparisonClass}, you can save {co2Difference.toFixed(0)} kg of CO₂, which is equivalent to...</h3>

      {/* smartphone charging equivalent */}
      <div className="infographic-item">
        <span className="icon">🔌</span>
        <span>Charging a smartphone <strong>{formatNumber(smartphoneCharges)}</strong> times</span>
      </div>

      {/* solar panel equivalent */}
      <div className="infographic-item">
        <span className="icon">☀️</span>
        <span>Powering a 300W solar panel for <strong>{formatNumber(solarPanelHours)}</strong> hours</span>
      </div>

      {/* tree absorption equivalent */}
      <div className="infographic-item">
        <span className="icon">🌳</span>
        <span>What <strong>{formatNumber(treesPerYear)}</strong> trees absorb in a year</span>
      </div>
    </div>
  );
};

const Co2SavingsInfographics = ({ businessDifference, firstDifference }) => {
  // determine which comparisons to show based on available data
  const showBusiness = businessDifference && businessDifference > 0;
  const showFirst = firstDifference && firstDifference > 0;

  // no render if no savings data available
  if (!showBusiness && !showFirst) return null;

  return (
    <div className="infographics-container co2-savings-container">
      {/* economy vs business*/}
      {showBusiness && (
        <InfographicSavingsDetail
          baseClass="Economy"
          comparisonClass="Business"
          co2Difference={businessDifference}
        />
      )}

      {/* separate between the upper infogrpahis and thew lower one */}
      {showBusiness && showFirst && <hr className="infographic-separator" />}

      {/* economy vs first */}
      {showFirst && (
        <InfographicSavingsDetail
          baseClass="Economy"
          comparisonClass="First"
          co2Difference={firstDifference}
        />
      )}
    </div>
  );
};

export default Co2SavingsInfographics;