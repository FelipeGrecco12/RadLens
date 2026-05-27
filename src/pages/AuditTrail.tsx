import { useState, useEffect } from 'react';
import { Activity, Search, Filter, User, FileText, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { AuditLog } from '../types/database';

interface AuditLogWithUser extends AuditLog {
  profile?: {
    full_name: string;
    role: string;
  };
}

export function AuditTrail() {
  const [logs, setLogs] = useState<AuditLogWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [resourceFilter, setResourceFilter] = useState('all');

  useEffect(() => {
    fetchLogs();
  }, [resourceFilter]);

  async function fetchLogs() {
    try {
      let query = supabase
        .from('audit_logs')
        .select('*, profile:profiles!user_id(full_name, role)')
        .order('created_at', { ascending: false })
        .limit(100);

      if (resourceFilter !== 'all') {
        query = query.eq('resource_type', resourceFilter);
      }

      const { data } = await query;
      if (data) setLogs(data);
      else {
        // Mock data
        setLogs([
          {
            id: '1',
            user_id: '1',
            action: 'VIEW_EXAM',
            resource_type: 'exam',
            resource_id: '1',
            created_at: new Date().toISOString(),
            profile: {
              full_name: 'Dr. Carlos Eduardo',
              role: 'radiologist',
            },
          },
          {
            id: '2',
            user_id: '1',
            action: 'CREATE_REPORT',
            resource_type: 'report',
            resource_id: '1',
            new_values: { exam_id: '1', status: 'reported' },
            created_at: new Date(Date.now() - 3600000).toISOString(),
            profile: {
              full_name: 'Dr. Carlos Eduardo',
              role: 'radiologist',
            },
          },
          {
            id: '3',
            user_id: '2',
            action: 'UPLOAD_IMAGES',
            resource_type: 'exam',
            resource_id: '2',
            created_at: new Date(Date.now() - 7200000).toISOString(),
            profile: {
              full_name: 'Técnico João',
              role: 'technician',
            },
          },
          {
            id: '4',
            user_id: '1',
            action: 'SIGN_REPORT',
            resource_type: 'report',
            resource_id: '1',
            new_values: { is_signed: true },
            created_at: new Date(Date.now() - 10800000).toISOString(),
            profile: {
              full_name: 'Dr. Carlos Eduardo',
              role: 'radiologist',
            },
          },
          {
            id: '5',
            user_id: '3',
            action: 'LOGIN',
            resource_type: 'session',
            created_at: new Date(Date.now() - 14400000).toISOString(),
            profile: {
              full_name: 'Admin Maria',
              role: 'admin',
            },
          },
        ]);
      }
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    } finally {
      setLoading(false);
    }
  }

  const filteredLogs = logs.filter((log) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      log.action.toLowerCase().includes(searchLower) ||
      log.resource_type.toLowerCase().includes(searchLower) ||
      log.profile?.full_name.toLowerCase().includes(searchLower)
    );
  });

  const getActionColor = (action: string) => {
    if (action.includes('DELETE') || action.includes('REMOVE')) {
      return 'bg-red-100 text-red-700';
    }
    if (action.includes('CREATE') || action.includes('UPLOAD')) {
      return 'bg-green-100 text-green-700';
    }
    if (action.includes('UPDATE') || action.includes('EDIT')) {
      return 'bg-yellow-100 text-yellow-700';
    }
    if (action.includes('SIGN') || action.includes('APPROVE')) {
      return 'bg-blue-100 text-blue-700';
    }
    return 'bg-gray-100 text-gray-700';
  };

  const getActionLabel = (action: string) => {
    return action.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const getResourceIcon = (type: string) => {
    switch (type) {
      case 'exam':
        return '📷';
      case 'report':
        return '📄';
      case 'patient':
        return '👤';
      case 'session':
        return '🔐';
      default:
        return '📋';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Audit Trail</h1>
          <p className="text-gray-500 mt-1">
            Complete history of all system activities
          </p>
        </div>
        <span className="text-sm text-gray-500">
          {filteredLogs.length} records
        </span>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by action, resource, or user..."
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="px-4 py-2 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
            value={resourceFilter}
            onChange={(e) => setResourceFilter(e.target.value)}
          >
            <option value="all">All Resources</option>
            <option value="exam">Exams</option>
            <option value="report">Reports</option>
            <option value="patient">Patients</option>
            <option value="session">Sessions</option>
          </select>
        </div>
      </div>

      {/* Logs List */}
      {loading ? (
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600"></div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Timestamp
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Resource
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <div>
                          <p className="text-sm text-gray-800">
                            {new Date(log.created_at).toLocaleDateString()}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(log.created_at).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      {log.profile ? (
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-600">
                            {log.profile.full_name
                              .split(' ')
                              .map((n) => n[0])
                              .join('')
                              .slice(0, 2)
                              .toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-800">
                              {log.profile.full_name}
                            </p>
                            <p className="text-xs text-gray-500 capitalize">
                              {log.profile.role}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">System</span>
                      )}
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getActionColor(
                          log.action
                        )}`}
                      >
                        {getActionLabel(log.action)}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{getResourceIcon(log.resource_type)}</span>
                        <div>
                          <p className="text-sm text-gray-800 capitalize">{log.resource_type}</p>
                          {log.resource_id && (
                            <p className="text-xs text-gray-400">{log.resource_id.slice(0, 8)}...</p>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="max-w-xs">
                        {log.old_values && (
                          <p className="text-xs text-gray-500">Old: {JSON.stringify(log.old_values).slice(0, 50)}...</p>
                        )}
                        {log.new_values && (
                          <p className="text-xs text-gray-500">New: {JSON.stringify(log.new_values).slice(0, 50)}...</p>
                        )}
                        {log.duration_ms && (
                          <p className="text-xs text-gray-400">{log.duration_ms}ms</p>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
