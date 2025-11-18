import React, { useEffect, useRef, useState } from 'react';
import { MapLocation } from '../types';
import { MousePointerClick, Crosshair, AlertTriangle, Loader2, RefreshCw } from 'lucide-react';
import { MAPILLARY_CLIENT_TOKEN } from '../constants';

// Declare Mapillary on Window interface
declare global {
  interface Window {
    mapillary: any;
  }
}

interface StreetViewProps {
  position: MapLocation;
  onPositionChange: (pos: MapLocation) => void;
  onAnnotate: (pos: MapLocation) => void;
}

type Status = 'idle' | 'searching' | 'loading-viewer' | 'ready' | 'error' | 'no-coverage';

export const StreetView: React.FC<StreetViewProps> = ({ position, onPositionChange, onAnnotate }) => {
  const mlyContainerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<any>(null);
  
  const [status, setStatus] = useState<Status>('searching');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLabeling, setIsLabeling] = useState(false);
  const [currentImageLoc, setCurrentImageLoc] = useState<MapLocation | null>(null);

  // 1. Search for Image ID via Python Backend (streetlevel)
  const findNearestImage = async (loc: MapLocation) => {
    try {
      setStatus('searching');
      
      // Call local backend
      const url = `http://localhost:8000/api/streetview?lat=${loc.lat}&lng=${loc.lng}`;
      
      const res = await fetch(url);
      if (!res.ok) {
         throw new Error(`Backend Error: ${res.status}`);
      }
      
      const data = await res.json();
      
      if (data.found && data.id) {
        return data.id;
      } else {
        setStatus('no-coverage');
        return null;
      }
    } catch (e) {
      console.error("Backend Fetch Error", e);
      setStatus('error');
      setErrorMsg("Failed to connect to Backend (Is python main.py running?)");
      return null;
    }
  };

  // 2. Initialize or Move Viewer
  useEffect(() => {
    let isMounted = true;

    const loadScene = async () => {
      const imageId = await findNearestImage(position);
      
      if (!isMounted) return;
      if (!imageId) return; 

      // If viewer exists, just move
      if (viewerRef.current) {
        try {
          await viewerRef.current.moveToKey(imageId);
          setStatus('ready');
        } catch (e) {
          console.warn("Move failed, might need re-init", e);
          // Don't fail hard, try to let the viewer recover
        }
        return;
      }

      // Initialize Viewer if it doesn't exist
      if (mlyContainerRef.current && window.mapillary) {
        setStatus('loading-viewer');
        
        // CRITICAL FIX: Small timeout to ensure container has dimensions in DOM
        setTimeout(() => {
            if (!isMounted) return;
            
            try {
              const { Viewer } = window.mapillary;
              const viewer = new Viewer({
                accessToken: MAPILLARY_CLIENT_TOKEN, // Still needed for the client-side viewer
                container: mlyContainerRef.current,
                imageId: imageId,
                component: {
                  cover: false,
                  marker: true,
                  popup: false, 
                  attribution: true,
                },
              });
    
              viewerRef.current = viewer;
    
              // Event Listeners
              viewer.on('image', (node: any) => {
                if (!isMounted) return;
                if (node && node.image) {
                  const loc = { lat: node.image.originalLat, lng: node.image.originalLng };
                  setCurrentImageLoc(loc);
                  onPositionChange(loc);
                  setStatus('ready');
                }
              });
              
              // Force resize on load to prevent black screen
              viewer.on('load', () => {
                 if(isMounted) {
                     setStatus('ready');
                     viewer.resize(); 
                 }
              });
    
            } catch (e) {
              console.error("Viewer Init Error", e);
              setStatus('error');
              setErrorMsg("Could not start Mapillary Viewer");
            }
        }, 100);
      }
    };

    loadScene();

    return () => {
      isMounted = false;
      if (viewerRef.current) {
        viewerRef.current.remove();
        viewerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [position.lat, position.lng]); 

  // Handle Resize observer to keep viewer sized correctly
  useEffect(() => {
      if (!mlyContainerRef.current || !viewerRef.current) return;
      
      const resizeObserver = new ResizeObserver(() => {
          viewerRef.current?.resize();
      });
      
      resizeObserver.observe(mlyContainerRef.current);
      
      return () => resizeObserver.disconnect();
  }, []);

  const handleRetry = () => {
    window.location.reload(); 
  };

  const toggleLabelMode = () => setIsLabeling(!isLabeling);

  const handleOverlayClick = () => {
    if (isLabeling && currentImageLoc) {
      onAnnotate(currentImageLoc);
      setIsLabeling(false);
    }
  };

  return (
    <div className="relative w-full h-full bg-gray-900 group overflow-hidden">
      
      {/* Mapillary Container - Always visible to ensure rendering context */}
      <div 
        ref={mlyContainerRef} 
        id="mly" 
        className="w-full h-full relative z-10"
      />

      {/* Annotation Overlay */}
      {isLabeling && status === 'ready' && (
        <div 
          onClick={handleOverlayClick}
          className="absolute inset-0 z-20 cursor-crosshair flex items-center justify-center bg-emerald-500/10 hover:bg-emerald-500/20 transition-colors"
        >
          <div className="bg-white/90 px-4 py-2 rounded-full shadow-lg text-sm font-bold text-emerald-800 transform translate-y-12 pointer-events-none animate-bounce">
            Tap anywhere to place tree label
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="absolute top-4 left-4 z-30 flex flex-col gap-2">
         {status === 'ready' && (
          <button
            onClick={toggleLabelMode}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg shadow-lg font-bold transition-all transform active:scale-95 ${
              isLabeling 
                ? 'bg-emerald-500 text-white ring-2 ring-offset-2 ring-emerald-500' 
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            {isLabeling ? (
              <>
                <Crosshair className="w-5 h-5 animate-spin-slow" />
                <span>Labeling Active</span>
              </>
            ) : (
              <>
                <MousePointerClick className="w-5 h-5" />
                <span>Label Tree</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Loading / Error States (Overlaid on top) */}
      {status !== 'ready' && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-gray-900/80 backdrop-blur-sm text-white p-6 text-center">
          
          {(status === 'searching' || status === 'loading-viewer') && (
            <div className="animate-fadeIn flex flex-col items-center">
              <Loader2 className="w-10 h-10 animate-spin text-emerald-500 mb-4" />
              <p className="text-lg font-medium">Contacting Backend...</p>
            </div>
          )}

          {status === 'no-coverage' && (
            <div className="animate-fadeIn max-w-md">
              <AlertTriangle className="w-12 h-12 text-orange-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">No Street View Here</h3>
              <p className="text-gray-400 mb-6">
                The backend could not find imagery near this location.
              </p>
            </div>
          )}

          {status === 'error' && (
            <div className="animate-fadeIn max-w-md">
              <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">Connection Error</h3>
              <p className="text-gray-400 mb-6">{errorMsg || "Something went wrong"}</p>
              <button 
                onClick={handleRetry}
                className="bg-emerald-600 hover:bg-emerald-700 px-6 py-2 rounded-lg font-bold flex items-center gap-2 mx-auto"
              >
                <RefreshCw className="w-4 h-4" /> Retry
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
