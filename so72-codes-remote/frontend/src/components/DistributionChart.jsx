// DistributionChart component - shows CO2 emissions distribution across different cabin classes 


import React, { useMemo } from 'react';
import * as d3 from 'd3';
import { getCO2EmissionForClass } from '../utils/helpers';

const DistributionChart = ({ hoveredFlight, typicalEmissions, selectedCabinClass }) => {
  // dynamic chart title 
  const chartTitle = hoveredFlight 
    ? `Emissions for your chosen flight option ${hoveredFlight.itineraries[0].segments[0].carrierCode}${hoveredFlight.itineraries[0].segments[0].number}` 
    : 'Typical Emissions by Cabin Class';

  // process chart data based on available data source
  // priority: hoveredFlight data > typicalEmissions data
  const chartData = useMemo(() => {
    if (hoveredFlight) {
      // use specific flight option data when available
      const businessCO2 = getCO2EmissionForClass(hoveredFlight, 'BUSINESS');
      const firstCO2 = getCO2EmissionForClass(hoveredFlight, 'FIRST');
      
      // exclude first class whose co2 emissions identical to business class's one
      const excludeFirstClass = businessCO2 !== null && firstCO2 !== null && 
                               parseFloat(businessCO2) === parseFloat(firstCO2);

      return (hoveredFlight.availableCabinClasses || [])
        .map(cabinClass => ({ 
          cabinClass, 
          // format for display
          displayClass: cabinClass.replace(/_/g, ' '), 
          co2: parseFloat(getCO2EmissionForClass(hoveredFlight, cabinClass)) || 0 
        }))
        .filter(d => d.co2 > 0 && !(excludeFirstClass && d.cabinClass === 'FIRST'));
    }
    
    if (typicalEmissions) {
      // use typical emissions data as fallback
      const rawData = Object.entries(typicalEmissions)
        .map(([key, value]) => ({ 
          cabinClass: key.toUpperCase().replace('PREMIUMECONOMY', 'PREMIUM_ECONOMY'), 
          displayClass: key.replace(/([A-Z])/g, ' $1').trim(), 
          // convert grams to kilograms
          co2: value / 1000 
        }))
        .filter(d => d.co2 > 0);

      // filter out redundant cabin classes
      const businessData = rawData.find(d => d.cabinClass === 'BUSINESS');
      const firstData = rawData.find(d => d.cabinClass === 'FIRST');
      const premiumEconomyData = rawData.find(d => d.cabinClass === 'PREMIUM_ECONOMY');
      const economyData = rawData.find(d => d.cabinClass === 'ECONOMY');

      let filteredData = rawData;

      // remove first Class if it has same emissions as business Class
      if (businessData && firstData && businessData.co2 === firstData.co2) {
        filteredData = filteredData.filter(d => d.cabinClass !== 'FIRST');
      }

      // remove premium Economy if it has same emissions as business Class 
      if (businessData && premiumEconomyData && businessData.co2 === premiumEconomyData.co2) {
        filteredData = filteredData.filter(d => d.cabinClass !== 'PREMIUM_ECONOMY');
      }

      // remove premium Economy if it has same emissions as economy Class
      if (economyData && premiumEconomyData && economyData.co2 === premiumEconomyData.co2) {
        filteredData = filteredData.filter(d => d.cabinClass !== 'PREMIUM_ECONOMY');
      }

      // sort cabin classes from economy to first Class
      const cabinOrder = ['ECONOMY', 'PREMIUM_ECONOMY', 'BUSINESS', 'FIRST'];
      return filteredData.sort((a, b) => {
        const indexA = cabinOrder.indexOf(a.cabinClass);
        const indexB = cabinOrder.indexOf(b.cabinClass);
        return indexA - indexB;
      });
    }
    // no data available
    return []; 
  }, [hoveredFlight, typicalEmissions]);

  // define chart size and margins
  const margin = { top: 40, right: 30, bottom: 40, left: 60 };
  const width = 500, height = 350;

  // calculate the maximum value, which dependson the maximum co2 value in the data
  // add extra 15% to add some padding area 
  const yMax = d3.max(chartData, d => d.co2) * 1.15 || 100;

  // create a band scale for x-axis, which is cabin classes (categorical)
  const xScale = d3.scaleBand()
  // set to the unique cabin classes from the data 
  .domain(chartData.map(d => d.displayClass))
  // leave margins for left and right sides
  .range([margin.left, width - margin.right])
  // padding added betwene bars 
  .padding(0.4);

  // create linear scale for y-axis, which is co2 emissions (quantitaive)
  const yScale = d3.scaleLinear()
  // domain is from 0 to the maximum y (co2) value 
  .domain([0, yMax])
  // leave margins for top and bottom sides
  .range([height - margin.bottom, margin.top]);

  // if there is no data, show the following messages:
  if (chartData.length === 0) {
    return (
      <div className="distribution-chart-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="no-results-message"><h4>{chartTitle}</h4><p>Data not available.</p></div>
      </div>
    );
  }

  // otherwise, render the chart: 
  return (
    <div className="distribution-chart-container">
      <div className="chart-header">
        <h4>{chartTitle}</h4>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`}>
        {/* render the horizontal (bottom) axis
        1. move the axis group to the bottom first
        2. pass React container to d3 so that it can draw the axis 
        the code below was taken from a post by D3.js was tweaked to fit the React component
        https://d3js.org/d3-axis (last accessed 2025-08-02) 
        */}
        <g transform={`translate(0, ${height - margin.bottom})`} ref={node => d3.select(node).call(d3.axisBottom(xScale))} />
        {/* add cabin class label */}
        <text transform={`translate(${width / 2}, ${height})`} style={{ textAnchor: 'middle', fontSize: '12px' }}>Cabin Class</text>
        {/* redner the vertical (left) axis 
        1. move the axis group left first 
        2. pass React container to d3 so that it can draw the axis
        the code below was taken from a post by D3.js was tweaked to fit the React component
        https://d3js.org/d3-axis (last accessed 2025-08-02)
        */}
        <g transform={`translate(${margin.left}, 0)`} ref={node => d3.select(node).call(d3.axisLeft(yScale))} />
        {/* rotate the label by 90 degrees so that it is displayed vertically */}
        <text transform="rotate(-90)" y={15} x={0 - (height / 2)} dy="1em" style={{ textAnchor: 'middle', fontSize: '12px' }}>CO₂ Emission (kg)</text>
        {/* draw all the bars */}
        {chartData.map(d => <rect key={d.cabinClass} x={xScale(d.displayClass)} y={yScale(d.co2)} width={xScale.bandwidth()} height={height - margin.bottom - yScale(d.co2)} fill={d.cabinClass === selectedCabinClass ? 'var(--highlight-color)' : 'var(--primary-color)'} />)}
        {/* write co2 value on the top of corresponding bar */}
        {chartData.map(d => <text key={`${d.cabinClass}-label`} x={xScale(d.displayClass) + xScale.bandwidth() / 2} y={yScale(d.co2) - 5} textAnchor="middle" fontSize="12px" fill="#333">{d.co2.toFixed(1)} kg</text>)}
      </svg>
    </div>
  );
};

export default DistributionChart;