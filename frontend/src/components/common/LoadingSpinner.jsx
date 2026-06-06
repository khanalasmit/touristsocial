/**
 * Reusable loading spinner component.
 */

import './LoadingSpinner.css';

export default function LoadingSpinner({ text = 'Loading...' }) {
  return (
    <div className="ts-spinner-container">
      <div className="ts-spinner"></div>
      <span className="ts-spinner-text">{text}</span>
    </div>
  );
}
