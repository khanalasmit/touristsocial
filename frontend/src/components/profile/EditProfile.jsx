import { useEffect, useMemo, useState } from 'react';
import api from '../../api/axios';
import './EditProfile.css';

export default function EditProfile() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [profile, setProfile] = useState(null);
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [form, setForm] = useState({
    bio: '',
    travel_style: '',
    budget_category: '',
  });

  useEffect(() => {
    let ignore = false;

    async function loadProfile() {
      try {
        const response = await api.get('/users/me/');
        if (ignore) return;

        setProfile(response.data);
        setForm({
          bio: response.data.bio || '',
          travel_style: response.data.travel_style || '',
          budget_category: response.data.budget_category || '',
        });
        setPhotoPreview(response.data.profile_picture || '');
      } catch (loadError) {
        if (!ignore) {
          setError(loadError.response?.data?.detail || 'Failed to load profile.');
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    loadProfile();
    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    if (!profilePhoto) {
      return undefined;
    }

    const previewUrl = URL.createObjectURL(profilePhoto);
    setPhotoPreview(previewUrl);

    return () => URL.revokeObjectURL(previewUrl);
  }, [profilePhoto]);

  const avatarLabel = useMemo(() => {
    return profile?.username?.[0]?.toUpperCase() || 'U';
  }, [profile]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (event) => {
    applySelectedFile(event.target.files?.[0] || null);
  };

  const applySelectedFile = (file) => {
    if (!file) {
      return;
    }
    setProfilePhoto(file);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragging(false);
    applySelectedFile(event.dataTransfer.files?.[0] || null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const payload = new FormData();
      payload.append('bio', form.bio);
      payload.append('travel_style', form.travel_style);
      payload.append('budget_category', form.budget_category);

      if (profilePhoto) {
        payload.append('profile_picture', profilePhoto);
      }

      const response = await api.put('/users/me/', payload, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const mergedProfile = {
        ...response.data,
        profile_picture: response.data.profile_picture || profile?.profile_picture || '',
      };

      setProfile(mergedProfile);
      setPhotoPreview(mergedProfile.profile_picture || '');
      localStorage.setItem('authProfile', JSON.stringify(mergedProfile));
      window.dispatchEvent(new Event('auth-change'));
      setSuccess('Profile updated.');
      setProfilePhoto(null);
    } catch (saveError) {
      setError(saveError.response?.data?.detail || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="edit-profile__status">Loading profile...</p>;
  }

  return (
    <div className="glass-panel edit-profile">
      <div className="edit-profile__summary">
        <div className="edit-profile__avatar">
          {photoPreview ? (
            <img src={photoPreview} alt="Profile preview" className="edit-profile__avatar-image" />
          ) : (
            <span>{avatarLabel}</span>
          )}
        </div>
        <div className="edit-profile__summary-copy">
          <h3 className="edit-profile__name">{profile?.username || 'User profile'}</h3>
          <p className="edit-profile__email">{profile?.email}</p>
          <p className="edit-profile__hint">Update your travel identity and photo here.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="edit-profile__form">
        <div className="edit-profile__layout">
          <section className="edit-profile__panel">
            <h4 className="edit-profile__panel-title">Profile Photo</h4>
            <div
              className={`edit-profile__uploader ${isDragging ? 'edit-profile__uploader--active' : ''}`}
              onDragOver={(event) => {
                event.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
            >
              <div className="edit-profile__upload-preview">
                {photoPreview ? (
                  <img src={photoPreview} alt="Selected profile" className="edit-profile__upload-image" />
                ) : (
                  <span>{avatarLabel}</span>
                )}
              </div>

              <div className="edit-profile__upload-copy">
                <p className="edit-profile__upload-title">Drop a new profile photo</p>

                <label htmlFor="edit_profile_photo" className="edit-profile__upload-button">
                  Choose Photo
                </label>
                <input
                  id="edit_profile_photo"
                  type="file"
                  accept="image/*"
                  className="edit-profile__file-input"
                  onChange={handleFileChange}
                />

                {profilePhoto && (
                  <p className="edit-profile__selected-file">{profilePhoto.name}</p>
                )}
              </div>
            </div>
          </section>

          <section className="edit-profile__panel">
            <h4 className="edit-profile__panel-title">Travel Details</h4>

            <div className="edit-profile__field">
              <label className="edit-profile__label" htmlFor="bio">Bio</label>
              <textarea
                id="bio"
                name="bio"
                value={form.bio}
                onChange={handleChange}
                className="ts-input edit-profile__bio"
                placeholder="Tell people about your travel style"
                rows={4}
              />
            </div>

            <div className="edit-profile__field">
              <label className="edit-profile__label" htmlFor="travel_style">Travel style</label>
              <select
                id="travel_style"
                name="travel_style"
                value={form.travel_style}
                onChange={handleChange}
                className="ts-input edit-profile__select"
              >
                <option value="">Select Travel Style</option>
                <option value="adventure">Adventure Traveler</option>
                <option value="cultural">Cultural Explorer</option>
                <option value="food">Food Enthusiast</option>
                <option value="backpacker">Backpacker</option>
                <option value="luxury">Luxury Traveler</option>
                <option value="solo">Solo Traveler</option>
                <option value="family">Family Traveler</option>
              </select>
            </div>

            <div className="edit-profile__field">
              <label className="edit-profile__label" htmlFor="budget_category">Budget</label>
              <select
                id="budget_category"
                name="budget_category"
                value={form.budget_category}
                onChange={handleChange}
                className="ts-input edit-profile__select"
              >
                <option value="">Select Budget</option>
                <option value="budget">Budget</option>
                <option value="mid">Mid-range</option>
                <option value="luxury">Luxury</option>
              </select>
            </div>
          </section>
        </div>

        {error && <p className="edit-profile__error">{error}</p>}
        {success && <p className="edit-profile__success">{success}</p>}

        <div className="edit-profile__actions">
          <button type="submit" className="ts-btn ts-btn-primary edit-profile__save" disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
