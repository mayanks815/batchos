import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({ children, className = '', ...props }) => {
  return (
    <div 
      className={`bg-slate-900/50 border border-slate-800 rounded-2xl p-5 backdrop-blur-sm transition-all duration-250 ${className}`} 
      {...props}
    >
      {children}
    </div>
  );
};
