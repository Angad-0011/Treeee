import React, { useRef } from 'react';
import { Download, Upload, Trees, MapPin } from 'lucide-react';
import { TreeRecord } from '../types';
import { generateCSV, parseCSV, downloadFile } from '../utils/storage';

interface MissionControlProps {
  trees: TreeRecord[];
  onImport: (newTrees: TreeRecord[]) => void;
}

export const MissionControl: React.FC<MissionControlProps> = ({ trees, onImport }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDownload = () => {
    const csv = generateCSV(trees);
    const date = new Date().toISOString().split('T')[0];
    downloadFile(csv, `canopy-count-${date}.csv`, 'text/csv');
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (text) {
        const importedTrees = parseCSV(text);
        onImport(importedTrees);
      }
    };
    reader.readAsText(file);
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const triggerUpload = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="absolute bottom-6 right-6 z-[1000] max-w-xs w-full sm:w-auto">
      <div className="bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="bg-emerald-600 p-4 text-white flex items-center gap-3">
          <Trees className="w-6 h-6" />
          <div>
            <h2 className="font-bold text-lg leading-tight">Mission Control</h2>
            <p className="text-emerald-100 text-xs">Project Canopy</p>
          </div>
        </div>

        {/* Stats */}
        <div className="p-4 bg-gray-50 flex items-center justify-between border-b border-gray-100">
          <div className="flex items-center gap-2 text-gray-600">
            <MapPin className="w-4 h-4" />
            <span className="text-sm font-medium">Annotated</span>
          </div>
          <span className="text-2xl font-bold text-emerald-600">{trees.length}</span>
        </div>

        {/* Actions */}
        <div className="p-3 grid grid-cols-2 gap-2 bg-white">
          <button
            onClick={handleDownload}
            className="flex flex-col items-center justify-center p-3 rounded-lg hover:bg-gray-100 transition-colors text-gray-600 gap-1"
            title="Download CSV"
          >
            <Download className="w-5 h-5" />
            <span className="text-xs font-medium">Export</span>
          </button>
          
          <button
            onClick={triggerUpload}
            className="flex flex-col items-center justify-center p-3 rounded-lg hover:bg-gray-100 transition-colors text-gray-600 gap-1"
            title="Upload CSV"
          >
            <Upload className="w-5 h-5" />
            <span className="text-xs font-medium">Import</span>
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            accept=".csv" 
            className="hidden" 
          />
        </div>
      </div>
    </div>
  );
};