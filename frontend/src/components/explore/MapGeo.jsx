import { useEffect, useState, Fragment } from "react";
import { useNavigate } from "react-router-dom";
import {
  Circle,
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap
} from "react-leaflet";
import L from "leaflet";

import api from "../../api/axios";
import "./MapGeo.css";
import "leaflet/dist/leaflet.css";

// ── Custom marker icons ──────────────────────────────────────────
// "You" marker — green pulsing dot
const selfIcon = L.divIcon({
  className: "",
  html: `
    <div style="
      width:18px; height:18px;
      background:#34c759;
      border:3px solid #fff;
      border-radius:50%;
      box-shadow:0 0 0 4px rgba(52,199,89,0.35);
      animation: pulse-green 1.8s ease-in-out infinite;
    "></div>
    <style>
      @keyframes pulse-green {
        0%,100% { box-shadow:0 0 0 4px rgba(52,199,89,0.35); }
        50%      { box-shadow:0 0 0 10px rgba(52,199,89,0.08); }
      }
    </style>
  `,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
  popupAnchor: [0, -12],
});

// Friend marker factory — orange pin with initials
function friendIcon(username) {
  const initial = (username?.[0] || "?").toUpperCase();
  return L.divIcon({
    className: "",
    html: `
      <div style="
        display:flex; align-items:center; justify-content:center;
        width:34px; height:34px;
        background:linear-gradient(135deg,#ff9500,#ff6b00);
        border:2.5px solid #fff;
        border-radius:50% 50% 50% 0;
        transform:rotate(-45deg);
        box-shadow:0 3px 10px rgba(255,106,0,0.45);
      ">
        <span style="
          transform:rotate(45deg);
          color:#fff;
          font-size:13px;
          font-weight:700;
          font-family:system-ui,sans-serif;
          line-height:1;
        ">${initial}</span>
      </div>
    `,
    iconSize: [34, 34],
    iconAnchor: [17, 34],
    popupAnchor: [0, -36],
  });
}

// Anonymous friend marker
function anonymousFriendIcon(username) {
  const initial = (username?.[0] || "?").toUpperCase();
  return L.divIcon({
    className: "",
    html: `
      <div style="
        display:flex; align-items:center; justify-content:center;
        width:30px; height:30px;
        background:linear-gradient(135deg,#999,#666);
        border:2px solid #fff;
        border-radius:50%;
        box-shadow:0 2px 5px rgba(0,0,0,0.3);
      ">
        <span style="
          color:#fff;
          font-size:12px;
          font-weight:700;
          font-family:system-ui,sans-serif;
          line-height:1;
        ">${initial}</span>
      </div>
    `,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -15],
  });
}

const DEFAULT_CENTER = [27.7172, 85.324];
const SEARCH_CONTEXTS = {
  city: {
    label: "City",
    radiusKm: 5
  },
  remote: {
    label: "Remote",
    radiusKm: 15
  }
};

function ChangeMapView({ center }) {
  const map = useMap();

  useEffect(() => {
    if (center) {
      map.setView(center, 15);
    }
  }, [center, map]);

  return null;
}

function cssVar(name, fallback) {
  if (typeof window === "undefined") {
    return fallback;
  }
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

export default function MapGeo() {
  const navigate = useNavigate();
  const [userLocation, setUserLocation] = useState(null);
  const [nearbyFriends, setNearbyFriends] = useState([]);
  const [searchContext, setSearchContext] = useState("city");
  const [nearbyRadiusKm, setNearbyRadiusKm] = useState(SEARCH_CONTEXTS.city.radiusKm);
  const [nearbyStatus, setNearbyStatus] = useState("");
  const [chatLoading, setChatLoading] = useState(null); // user_id being loaded
  const [locationError, setLocationError] = useState(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      return "Geolocation is not supported by this browser.";
    }
    return "";
  });

  const startChat = async (friend) => {
    setChatLoading(friend.user_id);
    try {
      const res = await api.post("/chat/rooms/", {
        member_ids: [friend.user_id],
        room_type: "direct",
      });
      navigate(`/chat/${res.data.id}`);
    } catch (err) {
      console.error("Failed to start chat:", err);
    } finally {
      setChatLoading(null);
    }
  };

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation([
          position.coords.latitude,
          position.coords.longitude
        ]);
        setLocationError("");
      },
      (error) => {
        setLocationError(error.message || "Unable to get your location.");
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  }, []);
  

  useEffect(() => {
    if (!userLocation) {
      return;
    }

    let ignore = false;

    async function syncNearbyFriends() {
      setNearbyStatus("Finding nearby friends...");

      try {
        const [latitude, longitude] = userLocation;

        await api.post("/location/update/", {
          latitude,
          longitude,
          is_sharing: true
        });

        const response = await api.get("/users/nearby/", {
          params: {
            context: searchContext
          }
        });

        if (ignore) {
          return;
        }

        setNearbyFriends(response.data.results || []);
        setNearbyRadiusKm(response.data.radius_km || SEARCH_CONTEXTS[searchContext].radiusKm);
        setNearbyStatus("");
      } catch (error) {
        if (ignore) {
          return;
        }

        const message =
          error.response?.data?.detail ||
          "Log in to share your location and find nearby friends.";

        setNearbyFriends([]);
        setNearbyRadiusKm(SEARCH_CONTEXTS[searchContext].radiusKm);
        setNearbyStatus(message);
      }
    }

    syncNearbyFriends();

    return () => {
      ignore = true;
    };
  }, [userLocation, searchContext]);

  const mapCenter = userLocation || DEFAULT_CENTER;
  const radiusMeters = nearbyRadiusKm * 1000;
  const circleColor = cssVar("--primary", "#0a84ff");
  const circleFillColor = cssVar("--primary", "#0a84ff");

  return (
    <div className="map-geo">
      <div className="map-geo__context-switcher">
        {Object.entries(SEARCH_CONTEXTS).map(([value, context]) => (
          <button
            key={value}
            type="button"
            className={`map-geo__context-button ${searchContext === value ? "map-geo__context-button--active" : ""}`}
            onClick={() => setSearchContext(value)}
          >
            {context.label}
          </button>
        ))}
      </div>

      {locationError && (
        <div className="map-geo__notice map-geo__notice--error">
          {locationError}
        </div>
      )}

      {nearbyStatus && !locationError && (
        <div className="map-geo__notice map-geo__notice--status">
          {nearbyStatus}
        </div>
      )}

      <MapContainer center={mapCenter} zoom={userLocation ? 15 : 13} className="map-geo__map">
        <ChangeMapView center={userLocation} />

        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {userLocation && (
          <>
            <Circle
              center={userLocation}
              radius={radiusMeters}
              pathOptions={{
                color: circleColor,
                fillColor: circleFillColor,
                fillOpacity: 0.12,
                weight: 2
              }}
            />

            <Marker position={userLocation} icon={selfIcon}>
              <Popup>
                <strong>📍 Your location</strong>
                <br />
                Sharing within {nearbyRadiusKm}km
              </Popup>
            </Marker>
          </>
        )}

        {nearbyFriends.map((friend) => {
          const isAnonymous = friend.is_exact === false;
          const pos = [friend.latitude, friend.longitude];

          return (
            <Fragment key={friend.user_id}>
              {isAnonymous && (
                <Circle
                  center={pos}
                  radius={5000}
                  pathOptions={{
                    color: '#666',
                    fillColor: '#999',
                    fillOpacity: 0.15,
                    weight: 1,
                    dashArray: '4'
                  }}
                />
              )}
              <Marker
                position={pos}
                icon={isAnonymous ? anonymousFriendIcon(friend.username) : friendIcon(friend.username)}
              >
                <Popup>
                  <div style={{ minWidth: 150 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <div style={{ position: 'relative', flexShrink: 0 }}>
                        <div style={{
                          width: 32, height: 32,
                          background: isAnonymous ? 'linear-gradient(135deg,#999,#666)' : 'linear-gradient(135deg,#ff9500,#ff6b00)',
                          borderRadius: '50%',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: '#fff', fontWeight: 700, fontSize: 13,
                        }}>
                          {(friend.username?.[0] || '?').toUpperCase()}
                        </div>
                        <span style={{
                          position: 'absolute', bottom: 0, right: 0,
                          width: 10, height: 10,
                          background: '#34c759',
                          borderRadius: '50%',
                          border: '2px solid #fff',
                          display: 'block',
                        }} title="Online" />
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>{friend.username}</div>
                        <div style={{ fontSize: '0.75rem', color: '#34c759', fontWeight: 600 }}>🟢 Online</div>
                      </div>
                    </div>
                    {isAnonymous && (
                      <div style={{ fontSize: '0.8rem', color: '#555', marginBottom: '8px', fontStyle: 'italic' }}>
                        📍 Exact location hidden. Request access via chat.
                      </div>
                    )}
                    <button
                      onClick={() => startChat(friend)}
                      disabled={chatLoading === friend.user_id}
                      style={{
                        padding: '7px 14px',
                        background: 'linear-gradient(135deg,#ff9500,#ff6b00)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 8,
                        cursor: 'pointer',
                        fontWeight: 600,
                        fontSize: '0.85rem',
                        width: '100%',
                      }}
                    >
                      {chatLoading === friend.user_id ? 'Opening...' : '💬 Start Chat'}
                    </button>
                  </div>
                </Popup>
              </Marker>
            </Fragment>
          );
        })}
      </MapContainer>
    </div>
  );
}
