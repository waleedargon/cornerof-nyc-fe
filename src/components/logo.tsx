
import * as React from 'react';
import Image from 'next/image';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'xxl';
}

export const Logo: React.FC<LogoProps> = ({ className = '', size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-32 h-16',
    md: 'w-48 h-24', 
    lg: 'w-64 h-32',
    xl: 'w-80 h-40',
    xxl: 'w-96 h-48',
  };

  const getImageDimensions = () => {
    switch (size) {
      case 'sm': return { width: 128, height: 64 };
      case 'md': return { width: 192, height: 96 };
      case 'lg': return { width: 256, height: 128 };
      case 'xl': return { width: 320, height: 160 };
      case 'xxl': return { width: 384, height: 192 };
      default: return { width: 192, height: 96 };
    }
  };

  const dimensions = getImageDimensions();

  return (
    <div className={`flex justify-center ${className.includes('mb-0') ? '' : 'mb-6'} ${className}`}>
      <Image
        src="/logo.png"
        alt="Corner of Logo"
        width={dimensions.width}
        height={dimensions.height}
        className={`${sizeClasses[size]} object-contain`}
        priority
      />
    </div>
  );
};
