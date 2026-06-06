/**
 * Post feed — fetches and displays all posts with infinite-style pagination.
 */

import { useState, useEffect, useCallback } from 'react';
import api from '../../api/axios';
import PostCard from './PostCard';
import LoadingSpinner from '../common/LoadingSpinner';
import EmptyState from '../common/EmptyState';
import './PostFeed.css';

export default function PostFeed({ refreshKey }) {
  const [posts, setPosts] = useState([]);
  const [nextPage, setNextPage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchPosts = useCallback(async (url = '/posts/feed/') => {
    try {
      const res = await api.get(url);
      return res.data;
    } catch {
      return null;
    }
  }, []);

  // Initial load + refresh when refreshKey changes
  useEffect(() => {
    setLoading(true);
    fetchPosts().then((data) => {
      if (data) {
        setPosts(data.results);
        setNextPage(data.next);
      }
      setLoading(false);
    });
  }, [fetchPosts, refreshKey]);

  const loadMore = async () => {
    if (!nextPage) return;
    setLoadingMore(true);
    // Extract path from full URL
    const url = new URL(nextPage);
    const data = await fetchPosts(url.pathname + url.search);
    if (data) {
      setPosts((prev) => [...prev, ...data.results]);
      setNextPage(data.next);
    }
    setLoadingMore(false);
  };

  if (loading) return <LoadingSpinner text="Loading feed..." />;

  if (posts.length === 0) {
    return (
      <EmptyState
        icon="bi-card-text"
        title="No posts yet"
        message="Be the first to share your travel experience!"
      />
    );
  }

  return (
    <div>
      {posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
      {nextPage && (
        <div className="post-feed__load-more">
          <button
            className="ts-btn ts-btn-outline post-feed__load-more-button"
            onClick={loadMore}
            disabled={loadingMore}
          >
            {loadingMore ? (
              <>
                <span className="ts-spinner post-feed__spinner"></span>
                Loading...
              </>
            ) : (
              'Load more'
            )}
          </button>
        </div>
      )}
    </div>
  );
}
