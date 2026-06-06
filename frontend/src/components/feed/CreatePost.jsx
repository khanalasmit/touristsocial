/**
 * Create-post form — modal dialog for writing a new experience post.
 */

import { useState } from 'react';
import api from '../../api/axios';
import './CreatePost.css';

export default function CreatePost({ show, onHide, onCreated }) {
  const [form, setForm] = useState({
    content: '',
    place_name: '',
    rating: '',
    latitude: '',
    longitude: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const payload = {
        content: form.content,
        place_name: form.place_name || undefined,
        rating: form.rating ? Number(form.rating) : undefined,
      };
      const res = await api.post('/posts/', payload);
      onCreated(res.data);
      setForm({ content: '', place_name: '', rating: '', latitude: '', longitude: '' });
      onHide();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create post. Are you logged in?');
    } finally {
      setLoading(false);
    }
  };

  if (!show) return null;

  return (
    <div
      className="ts-modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onHide();
        }
      }}
    >
      <div className="ts-modal create-post-modal">
        {/* Modal Header */}
        <div className="ts-modal-header create-post-modal__header">
          <h3 className="create-post-modal__title">
            <i className="bi bi-pencil-square"></i>
            Share Experience
          </h3>
          <button
            onClick={onHide}
            className="create-post-modal__close"
          >
            <i className="bi bi-x"></i>
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit}>
          <div className="ts-modal-body">
            {/* Error message */}
            {error && (
              <div className="create-post-modal__error">
                {error}
              </div>
            )}

            {/* Content textarea */}
            <div className="create-post-modal__field">
              <label className="ts-input-label">
                What did you experience?
              </label>
              <textarea
                name="content"
                value={form.content}
                onChange={handleChange}
                placeholder="Share your travel story..."
                required
                className="ts-textarea create-post-modal__textarea"
              />
            </div>

            {/* Place and Rating row */}
            <div className="create-post-modal__place-rating">
              <div>
                <label className="ts-input-label">
                  <i className="bi bi-geo-alt create-post-modal__label-icon"></i>
                  Place Name
                </label>
                <input
                  type="text"
                  name="place_name"
                  value={form.place_name}
                  onChange={handleChange}
                  placeholder="e.g. Pokhara Lakeside"
                  className="ts-input create-post-modal__control"
                />
              </div>
              <div>
                <label className="ts-input-label">
                  <i className="bi bi-star create-post-modal__label-icon"></i>
                  Rating
                </label>
                <select
                  name="rating"
                  value={form.rating}
                  onChange={handleChange}
                  className="ts-select create-post-modal__control"
                >
                  <option value="">—</option>
                  {[5, 4, 3, 2, 1].map((r) => (
                    <option key={r} value={r}>
                      {'★'.repeat(r)}{'☆'.repeat(5 - r)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="ts-modal-footer">
            <button
              type="button"
              onClick={onHide}
              disabled={loading}
              className="ts-btn ts-btn-outline create-post-modal__footer-button"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="ts-btn ts-btn-primary create-post-modal__footer-button"
            >
              {loading ? (
                <>
                  <span className="ts-spinner create-post-modal__spinner"></span>
                  Posting...
                </>
              ) : (
                'Post'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
