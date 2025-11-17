// SearchHistory component - shows a a list of the user's recent flight searches
import React from 'react';

// history is an array of previous search objects from localStorage
// onSearchAgain - callback function to trigger a new search
const SearchHistory = ({ history, onSearchAgain }) => {
  // not show anything if there is no recent search history
  if (!history || history.length === 0) {
    return null;
  }

  return (
    <section className="history-section">
      <h2 className="section-title">Recent Searches</h2>

      {/* recent search history*/}
      <div className="history-list">
        {history.map((item, index) => (
          <div
            key={index}
            className="history-item"
            // trigger new search
            onClick={() => onSearchAgain(item)} 
          >
            {/* show origin to destination */}
            <div className="history-route">
              <span className="iata-code">{item.locationDeparture}</span>
              <span className="arrow">→</span>
              <span className="iata-code">{item.locationArrival}</span>
            </div>

            
            <div className="history-details">
              {/* show departure dates */}
              <span>{new Date(item.departure).toLocaleDateString()}</span>

              {/* shop the number of travelers */}
              <span>{item.adults} Traveller(s)</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default SearchHistory;