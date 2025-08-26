import React from 'react';
import { motion } from 'framer-motion';

interface DashboardCardProps {
  title: string;
  icon?: string;
  color: string;
  children: React.ReactNode;
  className?: string;
  compact?: boolean;
}

export const DashboardCard: React.FC<DashboardCardProps> = ({
  title,
  icon,
  color,
  children,
  className = '',
  compact = false
}) => {
  return (
    <motion.div
      className={`bg-gray-900 border rounded-lg ${compact ? 'p-2' : 'p-4'} ${className}`}
      style={{ borderColor: color }}
      whileHover={{ scale: compact ? 1.05 : 1.02 }}
      animate={{ 
        boxShadow: [`0 0 5px ${color}40`, `0 0 15px ${color}60`, `0 0 5px ${color}40`]
      }}
      transition={{ 
        boxShadow: { duration: 2, repeat: Infinity },
        scale: { duration: 0.2 }
      }}
    >
      <div className={`${compact ? 'mb-1' : 'mb-3'}`}>
        <h3 
          className={`font-mono ${compact ? 'text-xs' : 'text-sm'} flex items-center gap-1`}
          style={{ color }}
        >
          {icon && <span className={compact ? 'text-xs' : 'text-sm'}>{icon}</span>}
          {title}
        </h3>
      </div>
      <div>
        {children}
      </div>
    </motion.div>
  );
};
