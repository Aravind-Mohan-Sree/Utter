'use client';

interface StatusBadgeProps {
  status: string;
  variant?: 'default' | 'yellow' | 'blue' | 'green';
  className?: string;
}

export const StatusBadge = ({
  status,
  variant = 'default',
  className = '',
}: StatusBadgeProps) => {
  const getStatusStyles = () => {
    switch (variant) {
      case 'yellow':
        return 'bg-yellow-100 text-yellow-600';
      case 'blue':
        return 'bg-blue-100 text-blue-600';
      case 'green':
        return 'bg-green-100 text-green-600';
      default:
        // Completed, Active and Available sessions are shown with green status badges
        if (status === 'Active' || status === 'Available' || status === 'Completed') {
          return 'bg-green-100 text-green-600';
        }
        // Booked (upcoming) or Incomplete sessions are shown with blue status badges
        if (status === 'Booked' || status === 'Incomplete') {
          return 'bg-blue-100 text-blue-600';
        }
        // Cancelled or Blocked sessions default to red status badges
        return 'bg-red-100 text-red-600';
    }
  };

  return (
    <span
      className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0 transition-all ${getStatusStyles()} ${className}`}
    >
      {status}
    </span>
  );
};
