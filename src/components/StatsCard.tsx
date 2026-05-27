import { TrendingUp, TrendingDown, AlertTriangle, Clock, CheckCircle } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: number;
  change?: number;
  changeLabel?: string;
  subtitle?: string;
  icon: 'scan' | 'alert' | 'clock' | 'check' | 'users' | 'file';
  color: 'blue' | 'red' | 'orange' | 'green' | 'purple';
  highlight?: boolean;
}

export function StatsCard({
  title,
  value,
  change,
  changeLabel,
  subtitle,
  icon,
  color,
  highlight,
}: StatsCardProps) {
  const colorClasses = {
    blue: {
      bg: 'bg-blue-50',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      border: highlight ? 'border-blue-300 border-2' : 'border-blue-100',
    },
    red: {
      bg: 'bg-red-50',
      iconBg: 'bg-red-100',
      iconColor: 'text-red-600',
      border: highlight ? 'border-red-300 border-2' : 'border-red-100',
    },
    orange: {
      bg: 'bg-orange-50',
      iconBg: 'bg-orange-100',
      iconColor: 'text-orange-600',
      border: highlight ? 'border-orange-300 border-2' : 'border-orange-100',
    },
    green: {
      bg: 'bg-green-50',
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
      border: highlight ? 'border-green-300 border-2' : 'border-green-100',
    },
    purple: {
      bg: 'bg-purple-50',
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-600',
      border: highlight ? 'border-purple-300 border-2' : 'border-purple-100',
    },
  };

  const iconComponents = {
    scan: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"
        />
      </svg>
    ),
    alert: <AlertTriangle className="w-6 h-6" />,
    clock: <Clock className="w-6 h-6" />,
    check: <CheckCircle className="w-6 h-6" />,
    users: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
        />
      </svg>
    ),
    file: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
    ),
  };

  const classes = colorClasses[color];

  return (
    <div
      className={`bg-white rounded-xl shadow-sm border ${classes.border} p-5 transition-all hover:shadow-md`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-3 rounded-lg ${classes.iconBg}`}>
            <div className={classes.iconColor}>{iconComponents[icon]}</div>
          </div>
        </div>
      </div>

      <div className="mt-4">
        <h3 className="text-sm font-medium text-gray-500">{title}</h3>
        <p className="text-3xl font-bold text-gray-800 mt-1">{value}</p>

        {change !== undefined && (
          <div className="flex items-center gap-1 mt-2">
            {change >= 0 ? (
              <TrendingUp className="w-4 h-4 text-green-500" />
            ) : (
              <TrendingDown className="w-4 h-4 text-red-500" />
            )}
            <span className={`text-sm font-medium ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {change >= 0 ? '+' : ''}
              {change}%
            </span>
            {changeLabel && <span className="text-xs text-gray-500">{changeLabel}</span>}
          </div>
        )}

        {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
      </div>
    </div>
  );
}
