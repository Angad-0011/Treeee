import React, { useState, useEffect, useCallback } from 'react';
import { TreeMap } from './components/TreeMap';
import { MissionControl } from './components/MissionControl';
import { AnnotationModal } from './components/AnnotationModal';
import { StreetView } from './components/StreetView';
import { TreeRecord, MapLocation, TreeSpecies, TreeHealth } from './types';
import { saveTreesToStorage, loadTreesFromStorage } from './utils/storage';
import { DEFAULT_CENTER } from './constants';
import { Map as MapIcon, Eye, X } from 'lucide-react';

type ViewMode = 'map' | 'street';

const App: React.FC = () => {
  const [trees, setTrees] = useState<TreeRecord[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [tempLocation, setTempLocation] = useState<MapLocation | null>(null);
  const [userLocation, setUserLocation] = useState<MapLocation | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  
  // Street View State
  const [viewMode, setViewMode] = useState<ViewMode>('map');
  const [streetViewPos, setStreetViewPos] = useState<MapLocation>(DEFAULT_CENTER);

  // Load initial data
  useEffect(() => {
    const loaded = loadTreesFromStorage();
    setTrees(loaded);
  }, []);

  // Get User Geolocation
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const loc = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setUserLocation(loc);
          // If it's the first load, maybe set SV position close to user?
          // We keep default center for now to ensure data visibility in NYC demo
        },
        (error) => console.error('Error getting location', error),
        { enableHighAccuracy: true }
      );
    }
  }, []);

  // Auto-save whenever trees change
  useEffect(() => {
    saveTreesToStorage(trees);
  }, [trees]);

  const handleMapClick = useCallback((loc: MapLocation) => {
    if (viewMode === 'street') {
      // In split mode, clicking map moves the street view
      setStreetViewPos(loc);
    } else {
      // In map mode, clicking opens annotation
      setTempLocation(loc);
      setIsModalOpen(true);
    }
  }, [viewMode]);

  const handleStreetViewAnnotate = useCallback((loc: MapLocation) => {
    setTempLocation(loc);
    setIsModalOpen(true);
  }, []);

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setTempLocation(null);
  };

  const handleSaveTree = (data: { species: TreeSpecies; condition: TreeHealth; notes: string }) => {
    if (!tempLocation) return;

    const newTree: TreeRecord = {
      id: crypto.randomUUID(),
      lat: tempLocation.lat,
      lng: tempLocation.lng,
      species: data.species,
      condition: data.condition,
      dateAdded: new Date().toLocaleDateString(),
      notes: data.notes,
    };

    setTrees((prev) => [...prev, newTree]);
    handleCloseModal();
    showNotification("Tree labelled successfully!");
  };

  const handleImport = (importedTrees: TreeRecord[]) => {
    if (importedTrees.length === 0) {
      showNotification("No valid records found in CSV.");
      return;
    }
    setTrees((prev) => {
      const existingIds = new Set(prev.map(t => t.id));
      const uniqueNew = importedTrees.filter(t => !existingIds.has(t.id));
      return [...prev, ...uniqueNew];
    });
    showNotification(`Imported ${importedTrees.length} trees.`);
  };

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const toggleViewMode = () => {
    if (viewMode === 'map') {
      setViewMode('street');
      // Center street view on current map center preference (user loc or default)
      setStreetViewPos(userLocation || DEFAULT_CENTER);
    } else {
      setViewMode('map');
    }
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-gray-100 font-sans flex flex-col md:flex-row">
      
      {/* Street View Panel (Visible only in street mode) */}
      {viewMode === 'street' && (
        <div className="w-full h-1/2 md:h-full md:w-3/5 relative border-b-4 md:border-b-0 md:border-r-4 border-emerald-600 z-10">
           <StreetView 
             position={streetViewPos}
             onPositionChange={setStreetViewPos}
             onAnnotate={handleStreetViewAnnotate}
           />
           <button 
             onClick={toggleViewMode}
             className="absolute top-4 right-4 bg-white/90 p-2 rounded-full shadow-md hover:bg-white transition-colors z-20"
             title="Exit Street View"
           >
             <X className="w-6 h-6 text-gray-700" />
           </button>
        </div>
      )}

      {/* Map Panel (Always visible, but changes size) */}
      <div className={`relative transition-all duration-300 ${viewMode === 'street' ? 'w-full h-1/2 md:h-full md:w-2/5' : 'w-full h-full'}`}>
        <TreeMap 
          trees={trees} 
          onMapClick={handleMapClick} 
          userLocation={userLocation}
          streetViewLocation={viewMode === 'street' ? streetViewPos : null}
        />

        {/* View Toggle Button (Only visible in Map Mode) */}
        {viewMode === 'map' && (
          <button
            onClick={toggleViewMode}
            className="absolute bottom-6 left-6 z-[1000] bg-white text-gray-800 px-4 py-3 rounded-xl shadow-xl font-bold flex items-center gap-2 hover:bg-gray-50 active:scale-95 transition-all border border-gray-200"
          >
            <Eye className="w-5 h-5 text-emerald-600" />
            Start Exploring
          </button>
        )}
      </div>

      {/* Top Overlay: Instructions / Toast */}
      <div className="absolute top-0 left-0 w-full p-4 pointer-events-none z-[2000] flex flex-col items-center">
        {notification && (
          <div className="animate-bounce bg-emerald-600 text-white px-6 py-2 rounded-full shadow-lg text-sm font-bold transition-opacity">
            {notification}
          </div>
        )}
      </div>

      {/* Mission Control (Floating Sidebar) */}
      <MissionControl trees={trees} onImport={handleImport} />

      {/* Annotation Modal */}
      <AnnotationModal
        isOpen={isModalOpen}
        location={tempLocation}
        onClose={handleCloseModal}
        onSave={handleSaveTree}
      />
    </div>
  );
};

export default App;