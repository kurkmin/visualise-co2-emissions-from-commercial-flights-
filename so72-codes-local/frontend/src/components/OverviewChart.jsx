// Overview component - displays the overview and correlations between CO2 emissions and price (or duration) 

import React, { useState, useMemo, useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { getCO2EmissionForClass, getPriceForClass, getFlightDuration, getFlightKey } from '../utils/helpers';

const CorrelationChart = ({ flights, cabinClass, hoveredFlightIds, onDotClick, onHover, onLeave }) => {
  // states for overview chart 
  // for switching between price and duration correlation
  const [correlationType, setCorrelationType] = useState('price');
  // to track which flight group was last clicked 
  const [groupClickIndex, setGroupClickIndex] = useState({});
  // for selected CO2 zone filter 
  const [selectedZone, setSelectedZone] = useState(null);
  // for clustering toggle 
  const [showClustering, setShowClustering] = useState(false);
  // chart size and margin 
  const margin = { top: 50, right: 120, bottom: 60, left: 80 };
  const width = 600, height = 400;

  // convert to hours for x labels
  const formatDurationForAxis = (minutes) => {
    const hours = minutes / 60;
    return hours <= 0.6 
      ? `${hours.toFixed(1)}h`
      : `${Math.round(hours)}h`;
  };

  // prepare data for overview chart 
  const data = useMemo(() => flights.map(f => ({
    co2: parseFloat(getCO2EmissionForClass(f, cabinClass)),
    price: getPriceForClass(f, cabinClass),
    duration: getFlightDuration(f),
    flight: f,
    id: getFlightKey(f),
    flightNumbers: (() => {
      const journeyStrings = f.itineraries.map(itinerary => {
        const journeyFlights = itinerary.segments.map(seg => `${seg.carrierCode}${seg.number}`);
        return `[${journeyFlights.join(', ')}]`;
      });
      return f.itineraries.length > 1
        ? `{${journeyStrings.join(', ')}}`
        : journeyStrings[0];
    })()
  })).filter(d => !isNaN(d.co2) && !isNaN(d.price) && !isNaN(d.duration)), [flights, cabinClass]);

  // group flights by same price/duration and CO2 
  const groupedData = useMemo(() => {
    const groups = {};

    data.forEach(d => {
      const xValue = Math.round(d[correlationType] * 100) / 100;
      const yValue = Math.round(d.co2 * 100) / 100;
      // create a key based on correlation type and CO2 
      const key = `${xValue}-${yValue}`;

      if (!groups[key]) {
        groups[key] = {
          [correlationType]: xValue,
          co2: yValue,
          price: correlationType === 'price' ? xValue : d.price,
          duration: correlationType === 'duration' ? xValue : d.duration,
          flights: [],
          ids: [],
          flightNumbers: [],
          count: 0
        };
      }
      groups[key].flights.push(d.flight);
      groups[key].ids.push(d.id);
      groups[key].flightNumbers.push(d.flightNumbers);
      groups[key].count++;
    });

    return Object.values(groups);
  }, [data, correlationType]);

  // size scale for dots depending on the number of flights at same coordinates, which means same price/duration and CO2)
  const sizeScale = useMemo(() => {
    const maxCount = Math.max(...groupedData.map(d => d.count));
    return d3.scaleLinear()
      .domain([1, maxCount])
      .range([6, 24]);
  }, [groupedData]);

  // calculate CO2 thresholds for clustering zones 
  const co2Thresholds = useMemo(() => {
    if (data.length < 3) return null;
    const co2Values = data.map(d => d.co2).sort((a, b) => a - b);
    // use 33 & 67 percentiles to divide into three zones
    const lowThreshold = d3.quantile(co2Values, 0.33);
    const highThreshold = d3.quantile(co2Values, 0.67);
    return { low: lowThreshold, high: highThreshold };
  }, [data]);

  // categorize flights by CO2 zones (below/typical/above typical co2)
  const getCO2Zone = (co2Value) => {
    if (!co2Thresholds) return 'typical';
    if (co2Value <= co2Thresholds.low) return 'below';
    if (co2Value >= co2Thresholds.high) return 'above';
    return 'typical';
  };

  // calculates x and y scales for overview chart
  const { xScale, yScale } = useMemo(() => {
    // if there is no enough data, return nothing
    if (data.length < 2) return { xScale: null, yScale: null, lineData: null, r2: 0 };
    // x-axis key (either price or duration) for dynamically selecting 
    const xKey = correlationType;
    // find the min and max values for x-axis data 
    const xExtent = d3.extent(data, d => d[xKey]);
    // find the min and max values for y-axis data 
    const yExtent = d3.extent(data, d => d.co2);

    // scales x-axis data 
    const xScale = d3.scaleLinear()
    .domain([xExtent[0] * 0.95, xExtent[1] * 1.05])
    .range([margin.left, width - margin.right]);
    const yScale = d3.scaleLinear()
    .domain([yExtent[0] * 0.95, yExtent[1] * 1.05])
    .range([height - margin.bottom, margin.top]);
    
    return { xScale, yScale };
  }, [data, correlationType, margin, width, height]);

  
  // draw the axes for overview chart  
  // draw x-axis
  const XAxis = ({ scale }) => { 
    const ref = useRef(); 
    useEffect(() => { 
      if (scale) d3.select(ref.current)
        // draw the bottom axis
      .call(d3.axisBottom(scale)
    // with format based on either price or duration
      .tickFormat(d => correlationType === 'price' ? `€${d}` : formatDurationForAxis(d))); 
    }, [scale]); 
    return <g ref={ref} transform={`translate(0, ${height - margin.bottom})`} />; };
  // draw y-axis
  const YAxis = ({ scale }) => 
    { const ref = useRef(); 
      useEffect(() => { 
        if (scale) d3.select(ref.current)
          // draw vertical (left) axis
        .call(d3.axisLeft(scale)
        // with format (kg) for co2 
        .tickFormat(d => `${d}kg`)); 
      }, [scale]); 
    return <g ref={ref} transform={`translate(${margin.left}, 0)`} />; };

    // if the num of dots is less than 2, show the message 
  if (data.length < 2) return <div className="correlation-chart-container no-results-message"><h3>Not enough data for correlation analysis</h3></div>;

  return (
    <div className="correlation-chart-container">
      <div className="chart-header">
        {/* co2 emission vs price or duration. depending on what user picks */}
        <h4>CO₂ Emissions vs {correlationType.charAt(0).toUpperCase() + correlationType.slice(1)}</h4>
        {/* correlation controls with clustering toggle */}
        <div className="correlation-controls" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div>
            <label>Correlate with: </label>
            <select value={correlationType} onChange={(e) => setCorrelationType(e.target.value)} className="correlation-select">
              <option value="price">Price</option>
              <option value="duration">Duration</option>
            </select>
          </div>
          {/* checkbox toggle for co2 clustring */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <input
              type="checkbox"
              id="clustering-toggle"
              checked={showClustering}
              onChange={(e) => {
                setShowClustering(e.target.checked);
                if (!e.target.checked) {
                  // clear zone filter when disabling clustering
                  setSelectedZone(null); 
                }
              }}
            />
            <label htmlFor="clustering-toggle" style={{ fontSize: '0.85rem', cursor: 'pointer' }}>
              Show CO₂ clustering
            </label>
          </div>
        </div>
      </div>
      {/* conditional legend and controls shown only if clustering is enabled) */}
      {showClustering && (
        <div className="chart-controls" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          {/* CO2 zone legend with background color indicators */}
          <div className="chart-legend" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '12px', height: '8px', backgroundColor: '#bbf7d0', border: '1px solid #16a34a', borderRadius: '2px' }}></div>
              <span style={{ fontSize: '0.7rem', color: '#666' }}>Below typical</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '12px', height: '8px', backgroundColor: '#fde68a', border: '1px solid #d97706', borderRadius: '2px' }}></div>
              <span style={{ fontSize: '0.7rem', color: '#666' }}>Typical</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '12px', height: '8px', backgroundColor: '#fecaca', border: '1px solid #dc2626', borderRadius: '2px' }}></div>
              <span style={{ fontSize: '0.7rem', color: '#666' }}>Above typical</span>
            </div>
          </div>

          {/* clear filter button shown only if a zone is selected */}
          {selectedZone && (
            <button
              onClick={() => setSelectedZone(null)}
              style={{
                padding: '4px 8px',
                fontSize: '0.7rem',
                background: '#f3f4f6',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Clear filter
            </button>
          )}
        </div>
      )}
      <svg viewBox={`0 0 ${width} ${height}`}>
        <g className="grid">
          {xScale && xScale.ticks(8).map(t => <line key={`x-${t}`} x1={xScale(t)} x2={xScale(t)} y1={margin.top} y2={height - margin.bottom} stroke="#e0e0e0" strokeDasharray="2,2" />)}
          {yScale && yScale.ticks(6).map(t => <line key={`y-${t}`} x1={margin.left} x2={width - margin.right} y1={yScale(t)} y2={yScale(t)} stroke="#e0e0e0" strokeDasharray="2,2" />)}
        </g>

        {/* CO2 Clustering Zones - only show when clustering is enabled */}
        {showClustering && co2Thresholds && yScale && (
          <g className="co2-zones">
            {/* below typical zone - green background */}
            <rect
              x={margin.left}
              y={yScale(co2Thresholds.low)}
              width={width - margin.left - margin.right}
              height={height - margin.bottom - yScale(co2Thresholds.low)}
              fill="#bbf7d0"
              opacity={selectedZone === 'below' ? 0.6 : 0.3}
              style={{ cursor: 'pointer' }}
              onClick={() => setSelectedZone(selectedZone === 'below' ? null : 'below')}
            />

            {/* typical zone - yellow background */}
            <rect
              x={margin.left}
              y={yScale(co2Thresholds.high)}
              width={width - margin.left - margin.right}
              height={yScale(co2Thresholds.low) - yScale(co2Thresholds.high)}
              fill="#fde68a"
              opacity={selectedZone === 'typical' ? 0.6 : 0.3}
              style={{ cursor: 'pointer' }}
              onClick={() => setSelectedZone(selectedZone === 'typical' ? null : 'typical')}
            />

            {/* above typical zone - red background */}
            <rect
              x={margin.left}
              y={margin.top}
              width={width - margin.left - margin.right}
              height={yScale(co2Thresholds.high) - margin.top}
              fill="#fecaca"
              opacity={selectedZone === 'above' ? 0.6 : 0.3}
              style={{ cursor: 'pointer' }}
              onClick={() => setSelectedZone(selectedZone === 'above' ? null : 'above')}
            />

            {/* lines to separate zones */}
            <line
              x1={margin.left}
              x2={width - margin.right}
              y1={yScale(co2Thresholds.low)}
              y2={yScale(co2Thresholds.low)}
              stroke="#16a34a"
              strokeWidth="2"
              strokeDasharray="5,5"
            />
            <line
              x1={margin.left}
              x2={width - margin.right}
              y1={yScale(co2Thresholds.high)}
              y2={yScale(co2Thresholds.high)}
              stroke="#dc2626"
              strokeWidth="2"
              strokeDasharray="5,5"
            />

            {/* labels on right side */}
            <text
              x={width - margin.right + 10}
              y={yScale(co2Thresholds.low / 2)}
              fontSize="11"
              fill="#16a34a"
              fontWeight="600"
            >
              Below Typical
            </text>
            <text
              x={width - margin.right + 10}
              y={yScale((co2Thresholds.low + co2Thresholds.high) / 2)}
              fontSize="11"
              fill="#d97706"
              fontWeight="600"
            >
              Typical
            </text>
            <text
              x={width - margin.right + 10}
              y={yScale(co2Thresholds.high + (yScale.domain()[1] - co2Thresholds.high) / 2)}
              fontSize="11"
              fill="#dc2626"
              fontWeight="600"
            >
              Above Typical
            </text>
          </g>
        )}

        {groupedData.map((d, i) => {
          const isHovered = hoveredFlightIds && d.ids.some(id => hoveredFlightIds.includes(id));
          const co2Zone = getCO2Zone(d.co2);

          // filter dots based on selected zone 
          const isVisible = !showClustering || !selectedZone || selectedZone === co2Zone;
          if (!isVisible) return null;

          // create tooltip data format 
          const handleHover = (event) => {
            if (onHover) {
              const tooltipData = {
                ids: d.ids,
                price: d.price,
                duration: d.duration,
                co2: d.co2,
                co2Values: [d.co2],
                flightNumbers: d.flightNumbers.join(', '),
                count: d.count,
                // include CO2 zone information in tooltip
                zone: co2Zone 
              };
              onHover(event, tooltipData);
            }
          };

          // handle click for grouped flights
          const handleClick = () => {
            if (onDotClick && d.ids.length > 0) {
              // create a unique key for this group based on coordinates
              const groupKey = `${d[correlationType]}-${d.co2}`;

              // get current index for this group 
              const currentIndex = groupClickIndex[groupKey] || 0;

              // calculate next index 
              const nextIndex = (currentIndex + 1) % d.ids.length;

              // update the click index for this group
              setGroupClickIndex(prev => ({
                ...prev,
                [groupKey]: nextIndex
              }));

              // scroll to the current flight 
              onDotClick(d.ids[currentIndex]);
            }
          };

          return (
            <g key={i}>
              <circle
                cx={xScale(d[correlationType])}
                cy={yScale(d.co2)}
                // size based on number of flights at this coordinate
                r={sizeScale(d.count)}
                fill="#3b82f6"
                opacity={isHovered ? 1 : (selectedZone ? 0.9 : 0.7)}
                stroke={isHovered ? '#333' : '#fff'}
                strokeWidth={isHovered ? 2 : 1}
                onClick={handleClick}
                onMouseOver={handleHover}
                onMouseOut={onLeave}
                style={{ cursor: 'pointer', transition: 'opacity 0.2s, stroke 0.2s' }}
              />
            </g>
          );
        })}
        {/* render horizontal axis */}
        <XAxis scale={xScale} />
        {/* render vertical axis */}
        <YAxis scale={yScale} />
        {/* label for horizontal axis */}
        <text transform={`translate(${width / 2}, ${height - 10})`} style={{ textAnchor: 'middle', fontSize: '12px', fontWeight: '600' }}>{correlationType === 'price' ? 'Price (EUR)' : 'Duration (hours)'}</text>
        {/* label for vertical axis */}
        <text transform="rotate(-90)" y={20} x={0 - (height / 2)} dy="1em" style={{ textAnchor: 'middle', fontSize: '12px', fontWeight: '600' }}>CO₂ Emission (kg)</text>
      </svg>
    </div>
  );
};

export default CorrelationChart;