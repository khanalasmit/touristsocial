/**
 * Single post card for the experience-sharing feed.
 */

import './PostCard.css';

function timeAgo(dateStr) {
  const seconds = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (seconds < 60) return 'just now';
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function renderStars(rating) {
  if (!rating) return null;
  return (
    <span className="post-card__stars">
      {[1, 2, 3, 4, 5].map((star) => (
        <i
          key={star}
          className={`bi ${star <= rating ? 'bi-star-fill post-card__star--filled' : 'bi-star post-card__star--empty'} post-card__star`}
        ></i>
      ))}
    </span>
  );
}

export default function PostCard({ post }) {
  return (
    <div className="ts-card post-card">
      <div className="post-card__body">
        {/* Author header */}
        <div className="post-card__author">
          <div className="ts-avatar">
            {post.author?.username?.[0]?.toUpperCase() || '?'}
          </div>
          <div>
            <h6 className="post-card__author-name">
              {post.author?.username || 'Anonymous'}
            </h6>
            <small className="post-card__time">
              {timeAgo(post.created_at)}
            </small>
          </div>
        </div>

        {/* Content */}
        <p className="post-card__content">
          {post.content}
        </p>

        {/* Image */}
        {post.image && (
          <img
            src={post.image}
            alt="Post"
            className="post-card__image"
          />
        )}

        {/* Place & Rating */}
        <div className="post-card__meta">
          {post.place_name && (
            <div className="ts-badge post-card__place">
              <i className="bi bi-geo-alt-fill"></i>
              {post.place_name}
            </div>
          )}
          {post.rating && renderStars(post.rating)}
        </div>
      </div>
    </div>
  );
}
