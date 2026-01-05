import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { User, Calendar, MessageCircle, Grid, ChevronRight } from "lucide-react";

interface FloatingBubbleMenuProps {
  side: 'left' | 'right';
  userId: string;
  userName: string;
  isOwnPost: boolean;
  postElement?: HTMLDivElement | null;
  onMessageClick?: (userId: string, userName: string) => void;
}

interface BubbleAction {
  icon: React.ElementType;
  label: string;
  href?: string;
  onClick?: () => void;
}

export const FloatingBubbleMenu = ({ side, userId, userName, isOwnPost, postElement, onMessageClick }: FloatingBubbleMenuProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Only show on right side, not on own posts
  if (isOwnPost || side === 'left') return null;

  const isOpen = isHovered || isPinned;

  const bubbleActions: BubbleAction[] = [
    { icon: User, label: "View Profile", href: `/profile/${userId}` },
    { icon: Calendar, label: "Book Session", onClick: () => console.log('Book session') },
    { icon: MessageCircle, label: "Message", onClick: () => onMessageClick?.(userId, userName) },
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

  // Curved arc animation - bubbles fan out to the RIGHT (outside the image)
  const getBubbleStyle = (index: number) => {
    const totalBubbles = bubbleActions.length;
    // Arc from top-right to bottom-right (quarter circle fanning outward)
    const startAngle = -60; // Start angle in degrees (top)
    const endAngle = 60; // End angle in degrees (bottom)
    const angleRange = endAngle - startAngle;
    const angle = startAngle + (angleRange / (totalBubbles - 1)) * index;
    const angleRad = (angle * Math.PI) / 180;
    
    const radius = 65; // Distance from center
    const xOffset = Math.cos(angleRad) * radius; // Positive for right side (outward)
    const yOffset = Math.sin(angleRad) * radius;
    
    return {
      transform: isOpen 
        ? `translate(${xOffset}px, ${yOffset}px) scale(1)` 
        : 'translate(0, 0) scale(0)',
      opacity: isOpen ? 1 : 0,
      transitionDelay: isOpen ? `${index * 50}ms` : `${(totalBubbles - index - 1) * 30}ms`,
    };
  };

  return (
    <div
      ref={containerRef}
      className="absolute -right-12 top-1/2 -translate-y-1/2 z-30"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Main Arrow Button - positioned outside the image */}
      <button
        onClick={() => setIsPinned(!isPinned)}
        className={`relative w-9 h-9 rounded-full flex items-center justify-center
          transition-all duration-300 ease-out
          ${isOpen
            ? 'bg-primary text-primary-foreground shadow-lg scale-110' 
            : 'bg-background/80 text-muted-foreground hover:bg-background hover:text-foreground'
          }
          backdrop-blur-md border border-border/30 shadow-md
        `}
        aria-label="Photographer options"
      >
        <ChevronRight 
          className={`h-4 w-4 transition-all duration-300 ${
            isOpen ? 'rotate-180' : ''
          }`} 
        />
      </button>

      {/* Floating Bubbles - curved arc fanning outward to the right */}
      {bubbleActions.map((action, index) => {
        const Icon = action.icon;
        const style = getBubbleStyle(index);
        
        const bubbleContent = (
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
              w-10 h-10 rounded-full
              bg-card/95 backdrop-blur-xl border border-border/40 shadow-lg
              flex items-center justify-center
              transition-all duration-300 ease-out
              hover:bg-primary hover:text-primary-foreground hover:scale-110 hover:shadow-xl
              cursor-pointer group
            "
            style={style}
          >
            <Icon className="h-4 w-4" />
            
            {/* Tooltip on right */}
            <div 
              className="absolute left-full ml-2 whitespace-nowrap px-2 py-1 
                bg-foreground/90 text-background text-xs font-medium rounded-md
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