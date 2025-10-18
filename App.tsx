import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Note } from './types';
import { InteractionZone } from './components/InteractionZone';
import { NoteList } from './components/NoteList';
import { OnboardingScreen } from './components/OnboardingScreen';
import { db } from './storage';
import { HamburgerIcon, XCircleIcon } from './components/icons';

function App() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [isNotesVisible, setIsNotesVisible] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(() => {
    // Check if user has completed onboarding
    return !localStorage.getItem('onboarding_completed');
  });

  // State for swipe-to-close gesture
  const [isDraggingSidebar, setIsDraggingSidebar] = useState(false);
  const dragStartX = useRef(0);
  const sidebarRef = useRef<HTMLDivElement>(null);


  useEffect(() => {
    const loadNotes = async () => {
      const storedNotes = await db.notes.orderBy('timestamp').reverse().toArray();
      setNotes(storedNotes);
    };
    loadNotes();
  }, []);

  const addNote = useCallback(async (newNote: Omit<Note, 'id' | 'timestamp'>) => {
    const noteWithMetadata: Note = {
      ...newNote,
      id: new Date().toISOString() + Math.random(),
      timestamp: new Date(),
    };
    await db.notes.add(noteWithMetadata);
    setNotes(prevNotes => [noteWithMetadata, ...prevNotes]);
  }, []);

  const deleteNote = useCallback(async (id: string) => {
    await db.notes.delete(id);
    setNotes(prevNotes => prevNotes.filter(note => note.id !== id));
  }, []);

  const handleSidebarDragStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (!isNotesVisible) return;
    dragStartX.current = e.touches[0].clientX;
    setIsDraggingSidebar(true);
  }, [isNotesVisible]);

  const handleSidebarDragMove = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (!isDraggingSidebar) return;
    const currentX = e.touches[0].clientX;
    const deltaX = currentX - dragStartX.current;

    // Only allow dragging left (closing)
    if (deltaX < 0 && sidebarRef.current) {
        sidebarRef.current.style.transform = `translateX(${deltaX}px)`;
    }
  }, [isDraggingSidebar]);

  const handleSidebarDragEnd = useCallback(() => {
    if (!isDraggingSidebar || !sidebarRef.current) return;
    
    const style = window.getComputedStyle(sidebarRef.current);
    const matrix = new DOMMatrix(style.transform);
    const currentTranslateX = matrix.m41;

    // Must remove inline style to let CSS classes take over for animation
    sidebarRef.current.style.transform = '';
    setIsDraggingSidebar(false);

    // If dragged more than 1/3 of the width, close it
    if (currentTranslateX < -sidebarRef.current.offsetWidth / 3) {
      setIsNotesVisible(false);
    }
    // Otherwise, the CSS classes will animate it back to open
  }, [isDraggingSidebar]);
  
  const sidebarClasses = [
    'fixed', 'top-0', 'left-0', 'h-full', 'w-full', 'max-w-md', 'bg-gray-800',
    'shadow-2xl', 'z-40', 'transform',
    isNotesVisible ? 'translate-x-0' : '-translate-x-full',
    // Disable CSS transitions during drag for instant feedback
    !isDraggingSidebar ? 'transition-transform duration-300 ease-in-out' : ''
  ].filter(Boolean).join(' ');

  const handleOnboardingComplete = useCallback(() => {
    localStorage.setItem('onboarding_completed', 'true');
    setShowOnboarding(false);
  }, []);

  if (showOnboarding) {
    return <OnboardingScreen onComplete={handleOnboardingComplete} />;
  }

  return (
    <div className="h-screen w-screen flex flex-col font-sans antialiased relative overflow-hidden bg-gray-900">
      <header className="p-4 bg-gray-900/80 backdrop-blur-sm fixed top-0 left-0 right-0 z-20 flex items-center justify-between">
        <button onClick={() => setIsNotesVisible(true)} className="text-white p-2">
          <HamburgerIcon className="w-7 h-7" />
        </button>
        {/* Empty div for spacing balance */}
        <div className="w-7 h-7 p-2"></div>
      </header>
      
      {/* Sidebar for Notes */}
      <div
        ref={sidebarRef}
        className={sidebarClasses}
        onTouchStart={handleSidebarDragStart}
        onTouchMove={handleSidebarDragMove}
        onTouchEnd={handleSidebarDragEnd}
        // This is the key to prevent browser's back navigation while allowing vertical scroll
        style={{ touchAction: 'pan-y' }}
      >
        <div className="flex justify-between items-center p-4 border-b border-gray-700">
          <h2 className="text-xl font-semibold">Saved Notes</h2>
          <button onClick={() => setIsNotesVisible(false)} className="text-gray-400 hover:text-white">
            <XCircleIcon className="w-8 h-8" />
          </button>
        </div>
        <div className="h-[calc(100%-65px)]">
             <NoteList notes={notes} onDelete={deleteNote} />
        </div>
      </div>
      {/* Backdrop */}
      {isNotesVisible && (
          <div
              onClick={() => setIsNotesVisible(false)}
              className="fixed inset-0 bg-black/60 z-30"
          />
      )}

      <main className="flex-1 pt-16">
        {/* InteractionZone is positioned absolutely and will center itself */}
      </main>
      
      <InteractionZone addNote={addNote} />
    </div>
  );
}

export default App;