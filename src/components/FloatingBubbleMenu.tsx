import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { User, Calendar, MessageCircle, Grid, ChevronRight } from "lucide-react";

interface FloatingBubbleMenuProps {
  side: 'left' | 'right';
  userId: string;
  userName: string;
  isOwnPost: boolean;
}

interface BubbleAction {
  icon: React.ElementType;
  label: string;
  href?: string;
  onClick?: () => void;
}

export const FloatingBubbleMenu = ({ side, userId, userName, isOwnPost }: FloatingBubbleMenuProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Only show on right side, not on own posts
  if (isOwnPost || side === 'left') return null;

  const isOpen = isHovered || isPinned;

  const bubbleActions: BubbleAction[] = [
    { icon: User, label: "View Profile", href: `/profile/${userId}` },
    { icon: Calendar, label: "Book Session", onClick: () => console.log('Book session') },
    { icon: MessageCircle, label: "Message", onClick: () => console.log('Send message') },
    { icon: Grid, label: "Galleries", href: `/profile/${userId}` },
  ];

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsPinned(false);
      }
    };

    if (isPinned) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isPinned]);

  // Vertical stacked bubbles - positioned closer to center
  const getBubbleStyle = (index: number) => {
    const yOffset = (index + 1) * 52; // Stack vertically with spacing
    
    return {
      transform: isOpen 
        ? `translateY(${yOffset}px) scale(1)` 
        : 'translateY(0) scale(0)',
      opacity: isOpen ? 1 : 0,
      transitionDelay: isOpen ? `${index * 60}ms` : `${(bubbleActions.length - index - 1) * 40}ms`,
    };
  };

  return (
    <div
      ref={containerRef}
      className="fixed right-4 sm:right-8 top-1/2 -translate-y-1/2 z-30"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Main Arrow Button - subtle, close to edge */}
      <button
        onClick={() => setIsPinned(!isPinned)}
        className={`relative w-10 h-10 rounded-full flex items-center justify-center
          transition-all duration-300 ease-out
          ${isOpen
            ? 'bg-primary text-primary-foreground shadow-lg scale-105' 
            : 'bg-background/60 text-muted-foreground/50 hover:bg-background/80 hover:text-muted-foreground'
          }
          backdrop-blur-md border border-border/20
        `}
        aria-label="Photographer options"
      >
        <ChevronRight 
          className={`h-5 w-5 transition-all duration-300 ${
            isOpen ? 'rotate-90 opacity-80' : 'opacity-60'
          }`} 
        />
      </button>

      {/* Floating Bubbles - vertical stack */}
      {bubbleActions.map((action, index) => {
        const Icon = action.icon;
        const style = getBubbleStyle(index);
        
        const bubbleContent = (
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2
              w-11 h-11 rounded-full
              bg-card/90 backdrop-blur-xl border border-border/40 shadow-lg
              flex items-center justify-center
              transition-all duration-300 ease-out
              hover:bg-primary hover:text-primary-foreground hover:scale-110 hover:shadow-xl
              cursor-pointer group
            "
            style={style}
          >
            <Icon className="h-4 w-4" />
            
            {/* Tooltip on left */}
            <div 
              className="absolute right-full mr-3 whitespace-nowrap px-2.5 py-1.5 
                bg-foreground/90 text-background text-xs font-medium rounded-lg
                opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none
                shadow-lg
              "
            >
              {action.label}
            </div>
          </div>
        );
        
        return action.href ? (
          <Link key={action.label} to={action.href}>
            {bubbleContent}
          </Link>
        ) : (
          <div key={action.label} onClick={action.onClick}>
            {bubbleContent}
          </div>
        );
      })}
    </div>
  );
};

export default FloatingBubbleMenu;