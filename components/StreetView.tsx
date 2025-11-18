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
         throw new Error(`Backend connection failed (${res.status}). Is main.py running?`);
      }
      
      const data = await res.json();
      
      if (data.found && data.id) {
        return data.id;
      } else {
        setStatus('no-coverage');
        return null;
      }
    } catch (e: any) {
      console.error("Backend Fetch Error", e);
      setStatus('error');
      setErrorMsg(e.message || "Failed to connect to Backend");
      return null;
    }
  };

  // 2. Initialize or Move Viewer
  useEffect(() => {
    let isMounted = true;

    const loadScene = async () => {
      // Step A: Wait for Mapillary Script to load from CDN
      let attempts = 0;
      while (!window.mapillary && attempts < 50) {
        await new Promise(r => setTimeout(r, 100));
        attempts++;
      }

      if (!window.mapillary) {
        if (isMounted) {
            setStatus('error');
            setErrorMsg("Mapillary JS library failed to load. Check internet connection.");
        }
        return;
      }

      // Step B: Get Image ID from Backend
      const imageId = await findNearestImage(position);
      
      if (!isMounted) return;
      if (!imageId) return; // findNearestImage handles status updates for no-coverage/error

      // Step C: Initialize or Move Viewer
      // If viewer exists, just move
      if (viewerRef.current) {
        try {
          await viewerRef.current.moveToKey(imageId);
          setStatus('ready');
        } catch (e) {
          console.warn("Move failed, recreating viewer...", e);
          // If move fails, we might need to re-init, fall through to creation
          viewerRef.current.remove();
          viewerRef.current = null;
        }
      }

      // Initialize Viewer if it doesn't exist
      if (!viewerRef.current && mlyContainerRef.current) {
        setStatus('loading-viewer');
        
        try {
          const { Viewer } = window.mapillary;
          const viewer = new Viewer({
            accessToken: MAPILLARY_CLIENT_TOKEN,
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
          
          // AGGRESSIVE RESIZE STRATEGY
          // Fixes black screen caused by container resizing animations
          setTimeout(() => { if(isMounted) viewer.resize(); }, 200);
          setTimeout(() => { if(isMounted) viewer.resize(); }, 500);
          setTimeout(() => { if(isMounted) viewer.resize(); }, 1000);

        } catch (e) {
          console.error("Viewer Init Error", e);
          if (isMounted) {
            setStatus('error');
            setErrorMsg("Could not start Mapillary Viewer");
          }
        }
      }
    };

    loadScene();

    return () => {
      isMounted = false;
      // We generally want to keep the viewer instance alive during re-renders unless component unmounts entirely
      // but for safety in this simplified version, we cleanup on unmount
      if (viewerRef.current) {
        viewerRef.current.remove();
        viewerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [position.lat, position.lng]); 

  // Handle Container Resize
  useEffect(() => {
      if (!mlyContainerRef.current || !viewerRef.current) return;
      
      const resizeObserver = new ResizeObserver(() => {
          if (viewerRef.current) viewerRef.current.resize();
      });
      
      resizeObserver.observe(mlyContainerRef.current);
      
      return () => resizeObserver.disconnect();
  }, []);

  const handleRetry = () => {
    // Force a reload of the effect by toggling a dummy state or just reloading page
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
      
      {/* Mapillary Container */}
      <div 
        ref={mlyContainerRef} 
        id="mly" 
        className="w-full h-full relative z-10"
        style={{ minHeight: '100px' }} // Ensure it has height
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
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-gray-900/90 backdrop-blur-sm text-white p-6 text-center">
          
          {(status === 'searching' || status === 'loading-viewer') && (
            <div className="animate-fadeIn flex flex-col items-center">
              <Loader2 className="w-10 h-10 animate-spin text-emerald-500 mb-4" />
              <p className="text-lg font-medium">
                 {status === 'searching' ? 'Searching nearby imagery...' : 'Loading Street View...'}
              </p>
            </div>
          )}

          {status === 'no-coverage' && (
            <div className="animate-fadeIn max-w-md">
              <AlertTriangle className="w-12 h-12 text-orange-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">No Street View Here</h3>
              <p className="text-gray-400 mb-6">
                Our backend found no Mapillary imagery within 100m of this point. Try clicking a major road.
              </p>
            </div>
          )}

          {status === 'error' && (
            <div className="animate-fadeIn max-w-md">
              <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">Connection Error</h3>
              <p className="text-gray-400 mb-6">{errorMsg || "Something went wrong"}</p>
              <div className="flex gap-2 justify-center">
                <button 
                    onClick={() => setStatus('searching')}
                    className="bg-gray-700 hover:bg-gray-600 px-6 py-2 rounded-lg font-bold transition-colors"
                >
                    Dismiss
                </button>
                <button 
                    onClick={handleRetry}
                    className="bg-emerald-600 hover:bg-emerald-700 px-6 py-2 rounded-lg font-bold flex items-center gap-2"
                >
                    <RefreshCw className="w-4 h-4" /> Retry
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};