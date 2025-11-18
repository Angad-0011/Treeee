import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Tooltip, useMapEvents, ZoomControl, Marker, useMap } from 'react-leaflet';
import { Icon } from 'leaflet';
import { TreeRecord, MapLocation } from '../types';
import { DEFAULT_CENTER, DEFAULT_ZOOM, HEALTH_COLORS } from '../constants';

// Helper to handle map clicks
const MapEvents = ({ onMapClick }: { onMapClick: (loc: MapLocation) => void }) => {
  useMapEvents({
    click(e) {
      onMapClick({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
};

// Helper to programmatically move map center
const MapController = ({ center }: { center?: MapLocation | null }) => {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.flyTo([center.lat, center.lng], map.getZoom(), { duration: 1 });
    }
  }, [center, map]);
  return null;
};

// Custom Pegman Icon for Street View location
const pegmanIcon = new Icon({
  iconUrl: 'https://maps.gstatic.com/mapfiles/ms2/micons/man.png',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

interface TreeMapProps {
  trees: TreeRecord[];
  onMapClick: (loc: MapLocation) => void;
  userLocation?: MapLocation | null;
  streetViewLocation?: MapLocation | null;
}

export const TreeMap: React.FC<TreeMapProps> = ({ trees, onMapClick, userLocation, streetViewLocation }) => {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) return <div className="w-full h-full bg-gray-100 animate-pulse" />;

  return (
    <MapContainer
      center={streetViewLocation || DEFAULT_CENTER}
      zoom={DEFAULT_ZOOM}
      style={{ height: '100%', width: '100%' }}
      zoomControl={false} // Custom placement
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
      />
      
      {/* Sync map view with Street View if active */}
      {streetViewLocation && <MapController center={streetViewLocation} />}

      <ZoomControl position="bottomleft" />

      <MapEvents onMapClick={onMapClick} />

      {/* Render Trees */}
      {trees.map((tree) => (
        <CircleMarker
          key={tree.id}
          center={[tree.lat, tree.lng]}
          pathOptions={{
            color: 'white',
            weight: 2,
            fillColor: HEALTH_COLORS[tree.condition],
            fillOpacity: 0.8,
          }}
          radius={8}
        >
          <Tooltip direction="top" offset={[0, -10]} opacity={1}>
            <div className="text-center">
              <strong className="block text-sm font-bold text-gray-800">{tree.species}</strong>
              <span 
                className="text-xs px-2 py-0.5 rounded-full text-white"
                style={{ backgroundColor: HEALTH_COLORS[tree.condition] }}
              >
                {tree.condition}
              </span>
              <div className="text-[10px] text-gray-500 mt-1">{tree.dateAdded}</div>
              {tree.notes && <div className="text-[10px] text-gray-600 italic mt-1 max-w-[150px] truncate">{tree.notes}</div>}
            </div>
          </Tooltip>
        </CircleMarker>
      ))}

      {/* User GPS Location Marker (Blue dot) */}
      {userLocation && (
        <CircleMarker
          center={[userLocation.lat, userLocation.lng]}
          pathOptions={{ color: '#3b82f6', fillColor: '#60a5fa', fillOpacity: 1, weight: 2 }}
          radius={6}
        >
           <Tooltip>You are here</Tooltip>
        </CircleMarker>
      )}

      {/* Street View Location Marker (Pegman) */}
      {streetViewLocation && (
        <Marker 
          position={[streetViewLocation.lat, streetViewLocation.lng]}
          icon={pegmanIcon}
          zIndexOffset={1000}
        />
      )}
    </MapContainer>
  );
};