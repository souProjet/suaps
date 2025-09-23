'use client';

import React, { useState } from 'react';
import { Bot, Check, X } from 'lucide-react';

interface AutoReservationButtonProps {
  onClick: () => Promise<void>;
  disabled?: boolean;
  variant?: 'primary' | 'secondary';
  size?: 'sm' | 'md';
  children?: React.ReactNode;
}

export default function AutoReservationButton({
  onClick,
  disabled = false,
  variant = 'secondary',
  size = 'md',
  children
}: AutoReservationButtonProps) {
  const [state, setState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const handleClick = async () => {
    if (disabled || state === 'loading') return;

    setState('loading');
    
    try {
      await onClick();
      setState('success');
      
      // Retour à l'état normal après 2 secondes
      setTimeout(() => setState('idle'), 2000);
    } catch (error) {
      setState('error');
      
      // Retour à l'état normal après 3 secondes
      setTimeout(() => setState('idle'), 3000);
    }
  };

  const getVariantStyles = () => {
    const baseStyles = "transition-all duration-200 touch-manipulation flex items-center gap-1 font-medium rounded-lg";
    
    if (variant === 'primary') {
      switch (state) {
        case 'loading':
          return `${baseStyles} bg-purple-400 text-white cursor-wait`;
        case 'success':
          return `${baseStyles} bg-green-500 text-white`;
        case 'error':
          return `${baseStyles} bg-red-500 text-white`;
        default:
          return `${baseStyles} bg-purple-500 hover:bg-purple-600 active:bg-purple-700 text-white ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`;
      }
    } else {
      switch (state) {
        case 'loading':
          return `${baseStyles} bg-blue-400 text-white cursor-wait`;
        case 'success':
          return `${baseStyles} bg-green-500 text-white`;
        case 'error':
          return `${baseStyles} bg-red-500 text-white`;
        default:
          return `${baseStyles} bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`;
      }
    }
  };

  const getSizeStyles = () => {
    return size === 'sm' ? 'p-1.5 text-xs' : 'p-2 text-sm';
  };

  const getIcon = () => {
    const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4';
    
    switch (state) {
      case 'loading':
        return (
          <div className={`${iconSize} border border-white/30 border-t-white rounded-full animate-spin`} />
        );
      case 'success':
        return <Check className={iconSize} />;
      case 'error':
        return <X className={iconSize} />;
      default:
        return <Bot className={iconSize} />;
    }
  };

  const getText = () => {
    switch (state) {
      case 'loading':
        return 'Ajout...';
      case 'success':
        return 'Ajouté !';
      case 'error':
        return 'Erreur';
      default:
        return children || 'Auto';
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled || state === 'loading'}
      className={`${getVariantStyles()} ${getSizeStyles()}`}
      title="Ajouter à l'auto-réservation"
    >
      {getIcon()}
      <span className="hidden sm:inline">{getText()}</span>
    </button>
  );
}
