import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import { createPickerIcon } from './mapIcons';
import { Navigation, MapPin, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '../common/Button';

function MapClickHandler({ onLocationSelect }) {
  useMapEvents({
    click(e) {
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function MapPanController({ target }) {
  const map = useMap();
  useEffect(() => {
    if (target && target.lat && target.lng) {
      map.flyTo([target.lat, target.lng], 15, { duration: 1.2 });
    }
  }, [target, map]);
  return null;
}

export function LocationPickerMap({
  latitude,
  longitude,
  onChange,
  height = '320px',
}) {
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState(null);
  const [geoSuccess, setGeoSuccess] = useState(false);
  const [flyTarget, setFlyTarget] = useState(null);

  const hasLocation =
    latitude !== null &&
    latitude !== undefined &&
    longitude !== null &&
    longitude !== undefined &&
    !isNaN(latitude) &&
    !isNaN(longitude);

  const centerLat = hasLocation ? latitude : 18.5204;
  const centerLng = hasLocation ? longitude : 73.8567;

  const handleLocationSelect = (lat, lng) => {
    onChange(Number(lat.toFixed(6)), Number(lng.toFixed(6)));
  };

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      setGeoError('Geolocation is not supported by your browser.');
      return;
    }
    setGeoLoading(true);
    setGeoError(null);
    setGeoSuccess(false);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGeoLoading(false);
        const lat = Number(position.coords.latitude.toFixed(6));
        const lng = Number(position.coords.longitude.toFixed(6));
        handleLocationSelect(lat, lng);
        setFlyTarget({ lat, lng, id: Date.now() });
        setGeoSuccess(true);
        setTimeout(() => setGeoSuccess(false), 3500);
      },
      (err) => {
        setGeoLoading(false);
        let errorMsg = 'Could not retrieve GPS coordinates. Please click on the map to set location.';
        if (err.code === 1) {
          errorMsg = 'Location permission was denied. Please click directly on the interactive map to set your report location.';
        } else if (err.code === 2) {
          errorMsg = 'GPS signal unavailable. Please click directly on the map.';
        } else if (err.code === 3) {
          errorMsg = 'GPS request timed out. Please click directly on the map to place your pin.';
        }
        setGeoError(errorMsg);
      },
      { timeout: 12000, enableHighAccuracy: true, maximumAge: 0 }
    );
  };

  const pickerIcon = createPickerIcon();

  return (
    <div className="space-y-2">
      <div className="relative rounded-xl overflow-hidden border border-sage-300 shadow-inner" style={{ height }}>
        <MapContainer
          center={[centerLat, centerLng]}
          zoom={hasLocation ? 15 : 13}
          scrollWheelZoom={true}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <MapClickHandler onLocationSelect={handleLocationSelect} />
          <MapPanController target={flyTarget} />

          {hasLocation && (
            <Marker
              position={[latitude, longitude]}
              icon={pickerIcon}
              draggable={true}
              eventHandlers={{
                dragend(e) {
                  const marker = e.target;
                  const position = marker.getLatLng();
                  handleLocationSelect(position.lat, position.lng);
                },
              }}
            />
          )}
        </MapContainer>

        {/* Floating Geo Button */}
        <div className="absolute top-3 right-3 z-[1000] flex items-center gap-2">
          {geoSuccess && (
            <span className="bg-[#092421] text-[#74D7CB] border border-[#74D7CB]/60 text-[11px] font-bold px-3 py-1 rounded-full shadow-md flex items-center gap-1.5 animate-fadeIn">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#74D7CB]" />
              <span>GPS Locked</span>
            </span>
          )}
          <Button
            type="button"
            variant="pista"
            size="sm"
            icon={Navigation}
            loading={geoLoading}
            onClick={handleGetCurrentLocation}
            className="shadow-md text-xs py-1.5 px-3.5 rounded-full font-black hover:scale-105 active:scale-95 transition-all"
          >
            Locate Me
          </Button>
        </div>

        {/* Instructions banner */}
        <div className="absolute bottom-3 left-3 right-3 z-[1000] bg-[#092421]/90 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-[#74D7CB]/30 text-xs text-white flex items-center justify-between shadow-soft">
          <div className="flex items-center gap-1.5 truncate">
            <MapPin className="w-3.5 h-3.5 text-[#74D7CB] shrink-0" />
            {hasLocation ? (
              <span className="text-white text-[11px] truncate">
                Pin placed. Drag pin or click map to correct location.
              </span>
            ) : (
              <span className="text-amber-300 font-bold text-[11px] truncate">
                Click map or tap 'Locate Me' to pin location
              </span>
            )}
          </div>
          <span className="font-mono text-[11px] font-bold text-[#74D7CB] shrink-0 ml-2">
            {hasLocation ? `${latitude.toFixed(4)}°, ${longitude.toFixed(4)}°` : 'No Pin Set'}
          </span>
        </div>
      </div>

      {geoError && (
        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-rose-50 text-rose-700 text-xs border border-rose-200 animate-fadeIn">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{geoError}</span>
        </div>
      )}
    </div>
  );
}

