import { useState, useEffect } from 'react';
import { User, Bell, Shield, Palette, Save, Check, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface SettingsState {
  full_name: string;
  email: string;
  crm_number: string;
  specialization: string;
  notifications_email: boolean;
  notifications_push: boolean;
  notifications_critical: boolean;
  theme: 'light' | 'dark' | 'system';
  language: string;
}

export function Settings() {
  const { profile, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [settings, setSettings] = useState<SettingsState>({
    full_name: '',
    email: '',
    crm_number: '',
    specialization: '',
    notifications_email: true,
    notifications_push: true,
    notifications_critical: true,
    theme: 'light',
    language: 'pt-BR',
  });

  useEffect(() => {
    if (profile && user) {
      setSettings({
        full_name: profile.full_name || '',
        email: user.email || '',
        crm_number: profile.crm_number || '',
        specialization: profile.specialization || '',
        notifications_email: true,
        notifications_push: true,
        notifications_critical: true,
        theme: 'light',
        language: 'pt-BR',
      });
    } else {
      // Mock data
      setSettings({
        full_name: 'Dr. Carlos Eduardo',
        email: 'carlos.eduardo@hospital.com',
        crm_number: 'CRM-SP 123456',
        specialization: 'Radiologia Diagnóstica',
        notifications_email: true,
        notifications_push: true,
        notifications_critical: true,
        theme: 'light',
        language: 'pt-BR',
      });
    }
  }, [profile, user]);

  const handleSave = async () => {
    setSaving(true);
    try {
      // Update profile in database
      if (profile) {
        await supabase
          .from('profiles')
          .update({
            full_name: settings.full_name,
            crm_number: settings.crm_number || null,
            specialization: settings.specialization || null,
          })
          .eq('id', profile.id);
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'appearance', label: 'Appearance', icon: Palette },
  ];

  const [activeTab, setActiveTab] = useState('profile');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Settings</h1>
          <p className="text-gray-500 mt-1">
            Manage your account preferences
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors disabled:opacity-50"
        >
          {saving ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          ) : saved ? (
            <Check className="w-4 h-4" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
        </button>
      </div>

      <div className="flex gap-6">
        {/* Sidebar */}
        <div className="w-64 flex-shrink-0">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <nav className="divide-y divide-gray-100">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                    activeTab === tab.id
                      ? 'bg-cyan-50 text-cyan-700 border-l-4 border-cyan-600'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <tab.icon className="w-5 h-5" />
                  <span className="font-medium">{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1">
          {activeTab === 'profile' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-6">Profile Information</h2>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={settings.full_name}
                    onChange={(e) => setSettings({ ...settings, full_name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={settings.email}
                    disabled
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Email cannot be changed directly
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      CRM Number
                    </label>
                    <input
                      type="text"
                      value={settings.crm_number}
                      onChange={(e) => setSettings({ ...settings, crm_number: e.target.value })}
                      placeholder="e.g., CRM-SP 123456"
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Specialization
                    </label>
                    <select
                      value={settings.specialization}
                      onChange={(e) => setSettings({ ...settings, specialization: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    >
                      <option value="">Select specialization</option>
                      <option value="Radiologia Diagnóstica">Radiologia Diagnóstica</option>
                      <option value="Neurorradiologia">Neurorradiologia</option>
                      <option value="Radiologia Intervencionista">
                        Radiologia Intervencionista
                      </option>
                      <option value="Radiologia Pediátrica">Radiologia Pediátrica</option>
                      <option value="Radiologia Mamária">Radiologia Mamária</option>
                    </select>
                  </div>
                </div>

                {profile?.role && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                    <div className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-500 capitalize">
                      {profile.role}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-6">
                Notification Preferences
              </h2>

              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-800">Email Notifications</p>
                    <p className="text-sm text-gray-500">
                      Receive notifications via email
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={settings.notifications_email}
                      onChange={(e) =>
                        setSettings({ ...settings, notifications_email: e.target.checked })
                      }
                    />
                    <div className="relative bg-gray-200 peer-focus:outline-none rounded-full peer h-6 w-11 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600"></div>
                  </label>
                </div>

                <hr className="border-gray-200" />

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-800">Push Notifications</p>
                    <p className="text-sm text-gray-500">
                      Receive push notifications in browser
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={settings.notifications_push}
                      onChange={(e) =>
                        setSettings({ ...settings, notifications_push: e.target.checked })
                      }
                    />
                    <div className="relative bg-gray-200 peer-focus:outline-none rounded-full peer h-6 w-11 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600"></div>
                  </label>
                </div>

                <hr className="border-gray-200" />

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-800">Critical Alerts</p>
                    <p className="text-sm text-gray-500">
                      Immediate alerts for STAT and critical exams
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={settings.notifications_critical}
                      onChange={(e) =>
                        setSettings({ ...settings, notifications_critical: e.target.checked })
                      }
                    />
                    <div className="relative bg-gray-200 peer-focus:outline-none rounded-full peer h-6 w-11 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600"></div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-6">Security Settings</h2>

              <div className="space-y-6">
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-blue-800">Password Security</p>
                      <p className="text-sm text-blue-600 mt-1">
                        For security reasons, password changes must be done through the
                        authentication portal.
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-medium text-gray-800 mb-4">Change Password</h3>
                  <button
                    onClick={async () => {
                      await supabase.auth.resetPasswordForEmail(settings.email);
                      alert('Password reset email sent');
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Send Password Reset Email
                  </button>
                </div>

                <hr className="border-gray-200" />

                <div>
                  <h3 className="font-medium text-gray-800 mb-4">Two-Factor Authentication</h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Add an extra layer of security to your account
                  </p>
                  <button className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors">
                    Enable 2FA
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'appearance' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-6">Appearance</h2>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">Theme</label>
                  <div className="flex gap-3">
                    {[
                      { value: 'light', label: 'Light' },
                      { value: 'dark', label: 'Dark' },
                      { value: 'system', label: 'System' },
                    ].map((option) => (
                      <button
                        key={option.value}
                        onClick={() =>
                          setSettings({
                            ...settings,
                            theme: option.value as SettingsState['theme'],
                          })
                        }
                        className={`px-4 py-2 rounded-lg border-2 transition-all ${
                          settings.theme === option.value
                            ? 'border-cyan-600 bg-cyan-50 text-cyan-700'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Language</label>
                  <select
                    value={settings.language}
                    onChange={(e) => setSettings({ ...settings, language: e.target.value })}
                    className="w-full max-w-xs px-4 py-2 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  >
                    <option value="pt-BR">Portuguese (Brazil)</option>
                    <option value="en-US">English (US)</option>
                    <option value="es">Spanish</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
