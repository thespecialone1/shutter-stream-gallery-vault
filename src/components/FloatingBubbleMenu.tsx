import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { User, Calendar, MessageCircle, Grid, ChevronRight, ChevronLeft } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

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
  
  // Don't show for own posts
  if (isOwnPost) return null;

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

  const ArrowIcon = side === 'left' ? ChevronLeft : ChevronRight;

  // Calculate bubble positions in an arc
  const getBubbleStyle = (index: number, total: number) => {
    const baseAngle = side === 'left' ? -60 : 240; // Start angle
    const angleSpread = 120; // Total spread
    const angle = baseAngle + (index / (total - 1)) * angleSpread;
    const radians = (angle * Math.PI) / 180;
    const distance = 70; // Distance from center
    
    const x = Math.cos(radians) * distance;
    const y = Math.sin(radians) * distance;
    
    return {
      transform: isOpen 
        ? `translate(${side === 'left' ? x : -x}px, ${y}px) scale(1)` 
        : 'translate(0, 0) scale(0)',
      opacity: isOpen ? 1 : 0,
      transitionDelay: isOpen ? `${index * 50}ms` : `${(total - index - 1) * 30}ms`,
    };
  };

  return (
    <div
      ref={containerRef}
      className={`fixed ${side === 'left' ? 'left-3 sm:left-6' : 'right-3 sm:right-6'} top-1/2 -translate-y-1/2 z-30`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Main Arrow Button */}
      <button
        onClick={() => setIsPinned(!isPinned)}
        className={`relative w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center
          transition-all duration-300 ease-out
          ${isOpen
            ? 'bg-primary text-primary-foreground shadow-xl scale-110' 
            : 'bg-muted/40 text-muted-foreground/60 hover:bg-muted/70 hover:text-muted-foreground'
          }
          backdrop-blur-md border border-border/30
        `}
        aria-label={`Photographer options`}
      >
        <ArrowIcon 
          className={`h-5 w-5 sm:h-6 sm:w-6 transition-all duration-300 ${
            isOpen ? 'opacity-0 scale-50' : 'opacity-100 scale-100'
          }`} 
        />
        
        {/* X icon when open */}
        <span 
          className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ${
            isOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-50'
          }`}
        >
          ✕
        </span>
      </button>

      {/* Floating Bubbles */}
      {bubbleActions.map((action, index) => {
        const Icon = action.icon;
        const style = getBubbleStyle(index, bubbleActions.length);
        
        const bubbleContent = (
          <div
            className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
              w-12 h-12 sm:w-14 sm:h-14 rounded-full
              bg-card/95 backdrop-blur-lg border border-border shadow-lg
              flex flex-col items-center justify-center gap-0.5
              transition-all duration-300 ease-out
              hover:bg-primary hover:text-primary-foreground hover:scale-110 hover:shadow-xl
              cursor-pointer group
            `}
            style={style}
          >
            <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
            
            {/* Tooltip */}
            <div 
              className={`absolute ${side === 'left' ? 'left-full ml-2' : 'right-full mr-2'} 
                whitespace-nowrap px-2 py-1 bg-foreground text-background text-xs rounded
                opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none
              `}
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

      {/* Photographer name badge - shows when hovering */}
      <div 
        className={`absolute ${side === 'left' ? 'left-14' : 'right-14'} top-1/2 -translate-y-1/2
          whitespace-nowrap px-3 py-1.5 bg-card/95 backdrop-blur-lg rounded-full
          border border-border shadow-lg text-sm font-medium
          transition-all duration-300 ease-out
          ${isOpen ? 'opacity-100 translate-x-0' : 'opacity-0 ' + (side === 'left' ? '-translate-x-2' : 'translate-x-2')}
        `}
      >
        {userName}
      </div>
    </div>
  );
};

export default FloatingBubbleMenu;
