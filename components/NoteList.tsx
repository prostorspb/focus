import React from 'react';
import { Note } from '../types';
import { XCircleIcon } from './icons';

interface NoteListProps {
  notes: Note[];
  onDelete: (id: string) => void;
}

// Helper to convert data URL to Blob URL for audio playback
const dataURLtoBlobUrl = (dataUrl: string) => {
    const arr = dataUrl.split(',');
    if (arr.length < 2) return dataUrl; // Not a valid data url
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch) return dataUrl;
    const mime = mimeMatch[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    const blob = new Blob([u8arr], { type: mime });
    return URL.createObjectURL(blob);
}

const NoteItem: React.FC<{ note: Note; onDelete: (id: string) => void }> = ({ note, onDelete }) => {
  const renderContent = () => {
    switch (note.type) {
      case 'text':
        return <p className="text-gray-300 whitespace-pre-wrap break-words">{note.content}</p>;
      case 'image':
        return <img src={note.content} alt="Captured note" className="rounded-lg max-h-60 w-auto" />;
      case 'audio':
        // Using a key forces remount on note change, useful if blob URLs are reused
        return <audio controls src={dataURLtoBlobUrl(note.content)} className="w-full" key={note.id} />;
      default:
        return null;
    }
  };

  return (
    <div className="bg-gray-800 p-4 rounded-lg shadow-lg relative animate-fade-in">
      <button onClick={() => onDelete(note.id)} className="absolute top-2 right-2 text-gray-500 hover:text-white transition-colors">
        <XCircleIcon className="w-6 h-6" />
      </button>
      <div className="mt-2">
        {renderContent()}
      </div>
      <p className="text-xs text-gray-500 mt-2 text-right">{note.timestamp.toLocaleTimeString()}</p>
    </div>
  );
};

export const NoteList: React.FC<NoteListProps> = ({ notes, onDelete }) => {
  if (notes.length === 0) {
    return (
      <div className="text-center text-gray-500 p-4">
        Your captured thoughts will appear here.
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto p-4 space-y-3 overflow-y-auto h-full">
      {notes.map(note => (
        <NoteItem key={note.id} note={note} onDelete={onDelete} />
      ))}
    </div>
  );
};
