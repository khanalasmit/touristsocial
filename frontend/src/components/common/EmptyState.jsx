/**
 * Reusable empty-state placeholder.
 */

import './EmptyState.css';

export default function EmptyState({ icon = 'bi-inbox', title, message }) {
  return (
    <div className="ts-empty-state">
      <i className={`bi ${icon} ts-empty-state-icon`}></i>
      <h5 className="ts-empty-state-title">{title}</h5>
      {message && <p className="ts-empty-state-message">{message}</p>}
    </div>
  );
}
