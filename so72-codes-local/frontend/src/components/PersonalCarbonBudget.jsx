// PersonalCarbonBudget component - displays how a flight impacts the user's annual personal carbon budget
import React from 'react';

const PersonalCarbonBudget = ({ co2_min, co2_max, hoveredFlight, cabinClass, isTypical = false, route = '' }) => {
  // annual carbon budget per person
  const annualBudgetKg = 2300; 
  // use average if range provided, otherwise use single value
  const flightCO2 = co2_max ? (co2_min + co2_max) / 2 : co2_min;
  // calculate budget impact
  const budgetPercentage = (flightCO2 / annualBudgetKg) * 100;
  const remainingBudgetKg = annualBudgetKg - flightCO2;
  const remainingBudgetTonnes = remainingBudgetKg / 1000;
  const monthsEquivalent = (flightCO2 / annualBudgetKg) * 12;
  // determine impact level 
  const getImpactLevel = (percentage) => {
    if (percentage < 5) return 'low';
    if (percentage < 15) return 'medium';
    return 'high';
  };
  // the level of impact based on budget percentage
  const impactLevel = getImpactLevel(budgetPercentage);
  return (
    <div className="personal-carbon-budget">
      <h3>🎯 Personal Carbon Budget</h3>
      
      {/* main budget impact visualization */}
      <div className="budget-impact">
        <div className="budget-layout">
          <div className={`percentage-circle ${impactLevel}`}>
            <span className="percentage">{budgetPercentage.toFixed(1)}%</span>
            <span className="label">of annual budget</span>
          </div>
          
          {/* detailed budget breakdown */}
          <div className="budget-details">
            <div className="budget-line">
              <span className="label">Annual target:</span>
              <span className="value">2.3 tonnes CO₂
                <a 
                  href="https://www.bbc.co.uk/future/article/20230504-the-people-living-ultra-low-carbon-lifestyles"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="info-link"
                  onClick={(e) => e.stopPropagation()}
                >
                  ℹ️
                </a>
              </span>
              
            </div>
            <div className="budget-line">
              <span className="label">This flight:</span>
              <span className="value">
                {co2_max ? 
                  `${co2_min.toFixed(0)}-${co2_max.toFixed(0)} kg` : 
                  `${co2_min.toFixed(0)} kg`
                } CO₂
              </span>
            </div>
            <div className="budget-line remaining">
              <span className="label">Remaining budget:</span>
              <span className="value">{remainingBudgetTonnes.toFixed(2)} tonnes</span>
            </div>
          </div>
        </div>
        
        {/* bar showing budget consumption */}
        <div className="budget-progress">
          <div 
            className={`progress-fill ${impactLevel}`}
            style={{ width: `${Math.min(budgetPercentage, 100)}%` }}
          >
            <span className="progress-impact-text">
              {impactLevel === 'low' && "✅ Low impact"}
              {impactLevel === 'medium' && "⚠️ Moderate"}
              {impactLevel === 'high' && "🚨 High impact"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PersonalCarbonBudget;