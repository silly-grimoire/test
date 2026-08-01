import React, { useState, useEffect, useCallback } from 'react';
import imageUrls from './image_urls';

function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

const DURATION_SECONDS = 120;

export default function RandomPic() {
  const [playlist, setPlaylist] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(DURATION_SECONDS);

  // Initialize playlist
  useEffect(() => {
    if (imageUrls && imageUrls.length > 0) {
      setPlaylist(shuffleArray(imageUrls));
    }
  }, []);

  const navigateNext = useCallback(() => {
    if (playlist.length === 0) return;
    setCurrentIndex((idx) => (idx + 1) % playlist.length);
    setTimeRemaining(DURATION_SECONDS);
  }, [playlist]);

  const navigatePrevious = useCallback(() => {
    if (playlist.length === 0) return;
    setCurrentIndex((idx) => (idx - 1 + playlist.length) % playlist.length);
    setTimeRemaining(DURATION_SECONDS);
  }, [playlist]);

  // Timer effect
  useEffect(() => {
    if (playlist.length === 0) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          // Go to next image
          setCurrentIndex((idx) => (idx + 1) % playlist.length);
          return DURATION_SECONDS;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [playlist]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (playlist.length === 0) return;
      if (event.key === 'ArrowRight') {
        navigateNext();
      } else if (event.key === 'ArrowLeft') {
        navigatePrevious();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [playlist, navigateNext, navigatePrevious]);


  if (playlist.length === 0) {
    return <div className="random-pic-loading">No images found.</div>;
  }

  const currentImage = playlist[currentIndex];
  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;
  const formattedTime =
    String(minutes).padStart(2, '0') + ':' +
    String(seconds).padStart(2, '0');

  return (
    <div className="random-pic-wrapper">
      <div className="image-container-fullscreen">
        <img id="randomImage" src={currentImage} alt={`Random visual ${currentIndex + 1}`} />
      </div>

      <div className="controls-overlay-widget">
        <div className="timer-text-widget">
          Next image in: <strong>{formattedTime}</strong>
        </div>
        <div className="button-group-widget">
          <button className="widget-btn" onClick={navigatePrevious}>← Prev</button>
          <button className="widget-btn" onClick={navigateNext}>Next →</button>
        </div>
      </div>
    </div>
  );
}
