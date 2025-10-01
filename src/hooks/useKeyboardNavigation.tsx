import { useEffect } from 'react';

interface UseKeyboardNavigationProps {
  enabled: boolean;
  onNext?: () => void;
  onPrevious?: () => void;
  onClose?: () => void;
  onEnhance?: () => void;
}

export const useKeyboardNavigation = ({
  enabled,
  onNext,
  onPrevious,
  onClose,
  onEnhance,
}: UseKeyboardNavigationProps) => {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowRight':
          e.preventDefault();
          onNext?.();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          onPrevious?.();
          break;
        case 'Escape':
          e.preventDefault();
          onClose?.();
          break;
        case 'e':
        case 'E':
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            onEnhance?.();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, onNext, onPrevious, onClose, onEnhance]);
};
