'use client';

import { useState, useCallback } from 'react';
import { useSwipeable } from 'react-swipeable';
import { Heart, X, Users, MapPin, Target } from 'lucide-react';
import Image from 'next/image';
import { Card } from '@/components/ui/card';
import type { Group, User as UserType } from '@/lib/types';

interface SwipeableMatchCardProps {
  match: Group;
  onInvite: (group: Group) => void;
  onPass: (groupId: string) => void;
}

export function SwipeableMatchCard({ match, onInvite, onPass }: SwipeableMatchCardProps) {
  // Safety check to prevent rendering invalid data
  if (!match || !match.id || !match.name) {
    console.warn('SwipeableMatchCard: Invalid match data', match);
    return null;
  }

  const [translateX, setTranslateX] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [hasActioned, setHasActioned] = useState(false);

  const formatIntent = (intent: string) => {
    switch (intent) {
      case 'all-boys': return 'All Guys';
      case 'all-girls': return 'All Girls';
      case 'mixed': return 'Mixed (Guys & Girls)';
      case 'any': return 'Any (Open to All)';
      default: return intent;
    }
  };

  const resetPosition = useCallback(() => {
    setTranslateX(0);
    setIsRevealed(false);
    setIsAnimating(true);
    // Use requestAnimationFrame to prevent stack overflow
    const animationId = requestAnimationFrame(() => {
      const timeoutId = setTimeout(() => {
        setIsAnimating(false);
      }, 300);
      
      // Cleanup function in case component unmounts
      return () => {
        clearTimeout(timeoutId);
        cancelAnimationFrame(animationId);
      };
    });
  }, []);

  const handleInvite = useCallback(() => {
    if (hasActioned) return; // Prevent multiple actions
    setHasActioned(true);
    onInvite(match);
    resetPosition();
  }, [hasActioned, match, onInvite, resetPosition]);

  const handlePass = useCallback(() => {
    if (hasActioned) return; // Prevent multiple actions
    setHasActioned(true);
    onPass(match.id);
    resetPosition();
  }, [hasActioned, match.id, onPass, resetPosition]);

  const handlers = useSwipeable({
    onSwipedLeft: (eventData) => {
      const swipeDistance = Math.abs(eventData.deltaX);
      
      if (swipeDistance > 100 && !hasActioned) {
        // Trigger pass action immediately
        handlePass();
      } else if (!hasActioned) {
        // Snap back if swipe was too weak
        resetPosition();
      }
    },
    onSwipedRight: (eventData) => {
      const swipeDistance = Math.abs(eventData.deltaX);
      
      if (swipeDistance > 100 && !hasActioned) {
        // Trigger invite action immediately
        handleInvite();
      } else if (!hasActioned) {
        // Snap back if swipe was too weak
        resetPosition();
      }
    },
    onSwiping: (eventData) => {
      // Follow the finger/mouse during swipe
      const deltaX = eventData.deltaX;
      if (!hasActioned) {
        // Limit the swipe distance and add resistance
        const maxSwipe = 120;
        const resistance = 0.6;
        let newTranslateX = deltaX * resistance;
        
        if (Math.abs(newTranslateX) > maxSwipe) {
          newTranslateX = deltaX > 0 ? maxSwipe : -maxSwipe;
        }
        
        setTranslateX(newTranslateX);
      }
    },
    onSwiped: (eventData) => {
      // Reset position if no action was taken
      if (!hasActioned) {
        const swipeDistance = Math.abs(eventData.deltaX);
        if (swipeDistance < 100) {
          resetPosition();
        }
      }
    },
    trackMouse: true, // Enable mouse support for desktop
    preventScrollOnSwipe: true,
    delta: 10, // Minimum distance to register swipe
  });

  return (
    <div className="relative overflow-hidden rounded-lg">
      {/* Main card content */}
      <Card 
        id={`card-${match.id}`}
        className={`w-full h-32 overflow-hidden shadow-md hover:shadow-lg cursor-pointer select-none relative z-10 ${
          isAnimating ? 'transition-transform duration-300 ease-out' : ''
        } ${
          Math.abs(translateX) > 60 && !hasActioned ? (translateX > 0 ? 'bg-green-50' : 'bg-red-50') : ''
        } ${
          hasActioned ? 'opacity-50 pointer-events-none' : ''
        }`}
        style={{
          transform: `translateX(${translateX}px)`,
          transition: isAnimating ? 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 0.3s ease-out' : 'none',
          touchAction: 'pan-y pinch-zoom', // Allow vertical scrolling but capture horizontal
          willChange: 'transform' // Optimize for animations
        }}
        {...handlers}
      >
        <div className="flex h-full bg-white">
          {/* Group Picture */}
          <div className="w-32 flex-shrink-0 relative bg-gradient-to-br from-blue-100 to-purple-100">
            {match.pictureUrl ? (
              <Image
                src={match.pictureUrl}
                alt={match.name}
                fill
                className="object-cover"
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <Users className="h-12 w-12 text-gray-400" />
              </div>
            )}
            
            {/* Group size badge */}
            <div className="absolute top-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-xs font-medium">
              <Users className="h-3 w-3 inline mr-1" />
              {Array.isArray(match.members) ? match.members.length : 0}/{match.size}
            </div>
          </div>

          {/* Card Content */}
          <div className="flex-1 p-4 flex flex-col justify-between">
            {/* Group Info */}
            <div>
              <h3 className="text-lg font-bold font-headline truncate">{match.name}</h3>
              <p className="text-sm text-muted-foreground mb-2">
                by {(match.creator as UserType)?.name || 'Unknown'}
              </p>
            </div>

            {/* Group Details & Members */}
            <div className="flex items-end justify-between">
              <div className="space-y-1 text-sm flex-1 mr-4">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="truncate">{match.neighborhood}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="truncate">{formatIntent(match.intent)}</span>
                </div>
              </div>

              {/* Members Preview */}
              <div className="flex items-center -space-x-1">
                {Array.isArray(match.members) && match.members.slice(0, 4).map((member) => {
                  if (!member || !member.id) return null;
                  
                  // Type guard to check if member is a User object (not DocumentReference)
                  const isUserObject = (member: any): member is UserType => {
                    return member && typeof member === 'object' && 'name' in member;
                  };
                  
                  if (!isUserObject(member)) return null;
                  
                  return member.avatarUrl ? (
                    <Image
                      key={member.id}
                      alt={member.name || 'Member'}
                      className="aspect-square rounded-full object-cover border-2 border-white"
                      height="24"
                      src={member.avatarUrl}
                      width="24"
                      title={member.name || 'Member'}
                    />
                  ) : (
                    <div
                      key={member.id}
                      title={member.name || 'Member'}
                      className="flex items-center justify-center h-6 w-6 rounded-full bg-muted border-2 border-white text-muted-foreground text-xs font-medium"
                    >
                      {(member.name || 'M').split(' ').map((n: string) => n[0] || 'M').join('').toUpperCase()}
                    </div>
                  );
                })}
                {Array.isArray(match.members) && match.members.length > 4 && (
                  <div className="flex items-center justify-center h-6 w-6 rounded-full bg-muted border-2 border-white text-muted-foreground text-xs font-medium">
                    +{match.members.length - 4}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Swipe hint overlay */}
        {translateX === 0 && !hasActioned && (
          <div className="absolute inset-0 bg-black/5 flex items-center justify-center pointer-events-none opacity-0 hover:opacity-100 transition-opacity duration-200">
            <div className="bg-white/90 px-3 py-1 rounded-full text-xs text-gray-600 font-medium">
              ← Swipe to Pass • Swipe to Invite →
            </div>
          </div>
        )}
        
        {/* Swipe direction indicators */}
        {Math.abs(translateX) > 60 && !hasActioned && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className={`px-4 py-2 rounded-full font-bold text-white text-sm transition-all duration-150 ${
              translateX > 0 ? 'bg-green-500' : 'bg-red-500'
            }`}>
              {translateX > 0 ? (
                <><Heart className="h-4 w-4 inline mr-2" />INVITE</>
              ) : (
                <><X className="h-4 w-4 inline mr-2" />PASS</>
              )}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
