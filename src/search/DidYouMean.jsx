'use client';

// "আপনি কি বোঝাতে চেয়েছেন: <spelling>?" Each suggestion is a button that runs the corrected search.
// The suggestions are only spellings already checked to return hadis (see searchIndex's suggest).
export default function DidYouMean({ suggestions, onPick }) {
  if (suggestions.length === 0) return null;
  return (
    <p className="search-dym">
      <span>আপনি কি বোঝাতে চেয়েছেন:</span>
      {suggestions.map((suggestion, index) => (
        <span key={suggestion.query} className="search-dym-item">
          {index > 0 && <span aria-hidden="true">বা</span>}
          <button type="button" className="ui-chip" onClick={() => onPick(suggestion.query)}>
            {suggestion.query}
          </button>
        </span>
      ))}
      <span aria-hidden="true">?</span>
    </p>
  );
}
