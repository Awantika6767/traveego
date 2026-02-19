import React from 'react';
import { Badge } from './ui/badge';
import { AlertCircle } from 'lucide-react';

const AlertBadge = ({ count, onClick }) => {
  if (!count || count === 0) return null;

  return (
    <button
      onClick={onClick}
      className="relative p-2 hover:bg-red-50 rounded-lg transition-colors"
      data-testid="alert-badge-button"
    >
      <AlertCircle className="w-5 h-5 text-red-600" />
      <Badge className="absolute -top-1 -right-1 h-5 min-w-5 px-1 flex items-center justify-center bg-red-600 text-white text-xs border-0">
        {count > 99 ? '99+' : count}
      </Badge>
    </button>
  );
};

export default AlertBadge;
