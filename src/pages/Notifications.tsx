import { useState, useEffect } from 'react';
import { Bell, Check, Trash2, AlertTriangle, Clock, Info, CheckCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import type { Notification } from '../types/database';

export function Notifications() {
  const { profile } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  useEffect(() => {
    fetchNotifications();
  }, [profile, filter]);

  async function fetchNotifications() {
    if (!profile) return;

    try {
      let query = supabase
        .from('notifications')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false });

      if (filter === 'unread') {
        query = query.eq('is_read', false);
      }

      const { data } = await query;
      if (data) setNotifications(data);
      else {
        // Mock data
        setNotifications([
          {
            id: '1',
            user_id: profile.id,
            title: 'Critical Exam Alert',
            message: 'CT Chest showing possible pulmonary embolism requires immediate attention',
            type: 'critical',
            exam_id: '1',
            is_read: false,
            created_at: new Date().toISOString(),
          },
          {
            id: '2',
            user_id: profile.id,
            title: 'New Exam Assigned',
            message: 'MRI Brain has been assigned to you for review',
            type: 'assignment',
            exam_id: '2',
            is_read: false,
            created_at: new Date(Date.now() - 3600000).toISOString(),
          },
          {
            id: '3',
            user_id: profile.id,
            title: 'Report Signed',
            message: 'Your report for ACC-2024-001 has been successfully signed and delivered',
            type: 'success',
            exam_id: '1',
            is_read: true,
            created_at: new Date(Date.now() - 7200000).toISOString(),
          },
          {
            id: '4',
            user_id: profile.id,
            title: 'Urgent: Stat Exam',
            message: 'New STAT exam uploaded - Trauma CT needs immediate review',
            type: 'urgent',
            exam_id: '3',
            is_read: false,
            created_at: new Date(Date.now() - 10800000).toISOString(),
          },
        ]);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  }

  const markAsRead = async (id: string) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    setNotifications(
      notifications.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
  };

  const markAllAsRead = async () => {
    if (!profile) return;
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', profile.id)
      .eq('is_read', false);
    setNotifications(notifications.map((n) => ({ ...n, is_read: true })));
  };

  const deleteNotification = async (id: string) => {
    await supabase.from('notifications').delete().eq('id', id);
    setNotifications(notifications.filter((n) => n.id !== id));
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'critical':
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      case 'urgent':
        return <Clock className="w-5 h-5 text-orange-500" />;
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      default:
        return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  const getNotificationBg = (type: string, isRead: boolean) => {
    if (isRead) return 'bg-gray-50';
    switch (type) {
      case 'critical':
        return 'bg-red-50 border-l-4 border-l-red-500';
      case 'urgent':
        return 'bg-orange-50 border-l-4 border-l-orange-500';
      default:
        return 'bg-blue-50 border-l-4 border-l-blue-500';
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Notifications</h1>
          <p className="text-gray-500 mt-1">
            {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            className="px-4 py-2 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
            value={filter}
            onChange={(e) => setFilter(e.target.value as typeof filter)}
          >
            <option value="all">All Notifications</option>
            <option value="unread">Unread Only</option>
          </select>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors text-sm"
            >
              <Check className="w-4 h-4" />
              Mark All Read
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600"></div>
        </div>
      ) : notifications.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <Bell className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-800">No notifications</h3>
          <p className="text-gray-500 mt-1">You're all caught up!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`${getNotificationBg(
                notification.type,
                notification.is_read
              )} rounded-xl shadow-sm border border-gray-100 overflow-hidden transition-all hover:shadow-md`}
            >
              <div className="p-5">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 pt-1">
                    {getNotificationIcon(notification.type)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-base font-semibold text-gray-800">
                          {notification.title}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                        <p className="text-xs text-gray-400 mt-2">
                          {new Date(notification.created_at).toLocaleString()}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        {!notification.is_read && (
                          <button
                            onClick={() => markAsRead(notification.id)}
                            className="p-2 hover:bg-white rounded-lg transition-colors text-gray-600 hover:text-gray-800"
                            title="Mark as read"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => deleteNotification(notification.id)}
                          className="p-2 hover:bg-white rounded-lg transition-colors text-gray-600 hover:text-red-600"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {notification.exam_id && (
                      <button
                        onClick={() => window.open(`/exam/${notification.exam_id}`, '_self')}
                        className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm text-cyan-600 hover:text-cyan-700 hover:bg-cyan-50 transition-colors"
                      >
                        View Exam
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
