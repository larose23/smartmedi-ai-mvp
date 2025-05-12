import React, { useState, useEffect } from 'react';
import { NotificationTemplateService, NotificationTemplate, RoleNotificationSettings, TimeSensitiveRule } from '@/lib/services/NotificationTemplateService';
import { NotificationType, NotificationPriority, NotificationChannel } from '@/lib/services/NotificationService';
import { toast } from 'react-hot-toast';

interface NotificationSettingsProps {
  roleId: string;
}

const NotificationSettings: React.FC<NotificationSettingsProps> = ({ roleId }) => {
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [roleSettings, setRoleSettings] = useState<RoleNotificationSettings[]>([]);
  const [timeRules, setTimeRules] = useState<TimeSensitiveRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<NotificationTemplate | null>(null);
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [showTimeRuleForm, setShowTimeRuleForm] = useState(false);

  useEffect(() => {
    loadData();
  }, [roleId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [templatesData, settingsData, rulesData] = await Promise.all([
        NotificationTemplateService.getTemplate(roleId),
        NotificationTemplateService.getRoleNotificationSettings(roleId),
        NotificationTemplateService.getTimeSensitiveRules(roleId)
      ]);

      setTemplates(templatesData);
      setRoleSettings(settingsData);
      setTimeRules(rulesData);
    } catch (err) {
      setError('Failed to load notification settings');
      console.error('Error loading notification settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTemplateSubmit = async (template: Omit<NotificationTemplate, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      if (selectedTemplate) {
        await NotificationTemplateService.updateTemplate(selectedTemplate.id, template);
        toast.success('Template updated successfully');
      } else {
        await NotificationTemplateService.createTemplate(template);
        toast.success('Template created successfully');
      }
      await loadData();
      setShowTemplateForm(false);
      setSelectedTemplate(null);
    } catch (err) {
      console.error('Error saving template:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to save template');
    }
  };

  const handleRoleSettingsUpdate = async (settings: Omit<RoleNotificationSettings, 'role_id'>[]) => {
    try {
      await NotificationTemplateService.updateRoleNotificationSettings(roleId, settings);
      toast.success('Role settings updated successfully');
      await loadData();
    } catch (err) {
      console.error('Error updating role settings:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to update role settings');
    }
  };

  const handleTimeRuleSubmit = async (rule: Omit<TimeSensitiveRule, 'id'>) => {
    try {
      await NotificationTemplateService.updateTimeSensitiveRules(roleId, [...timeRules, rule]);
      toast.success('Time-sensitive rule added successfully');
      await loadData();
      setShowTimeRuleForm(false);
    } catch (err) {
      console.error('Error saving time rule:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to save time rule');
    }
  };

  const handleDeleteTimeRule = async (ruleId: string) => {
    try {
      const newRules = timeRules.filter(r => r.id !== ruleId);
      await NotificationTemplateService.updateTimeSensitiveRules(roleId, newRules);
      toast.success('Time-sensitive rule deleted successfully');
      await loadData();
    } catch (err) {
      console.error('Error deleting time rule:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to delete time rule');
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    try {
      await NotificationTemplateService.deleteTemplate(templateId);
      toast.success('Template deleted successfully');
      await loadData();
    } catch (err) {
      console.error('Error deleting template:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to delete template');
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  if (error) {
    return <div className="text-red-600">{error}</div>;
  }

  return (
    <div className="space-y-8">
      {/* Templates Section */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Notification Templates</h2>
          <button
            onClick={() => setShowTemplateForm(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Create Template
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map(template => (
            <div
              key={template.id}
              className="p-4 border rounded-lg hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-medium">{template.name}</h3>
                  <p className="text-sm text-gray-600">{template.type}</p>
                  <div className="mt-2">
                    <span className="inline-block px-2 py-1 text-xs rounded-full bg-gray-100">
                      {template.priority}
                    </span>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => {
                      setSelectedTemplate(template);
                      setShowTemplateForm(true);
                    }}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteTemplate(template.id)}
                    className="text-red-600 hover:text-red-800"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Role Settings Section */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Role Notification Settings</h2>
        <div className="space-y-4">
          {Object.values(NotificationType).map(type => {
            const setting = roleSettings.find(s => s.notification_type === type);
            return (
              <div key={type} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">{type}</h3>
                    <div className="mt-2 space-x-2">
                      {Object.values(NotificationChannel).map(channel => (
                        <label key={channel} className="inline-flex items-center">
                          <input
                            type="checkbox"
                            checked={setting?.allowed_channels.includes(channel) || false}
                            onChange={e => {
                              const newSettings = [...roleSettings];
                              const index = newSettings.findIndex(s => s.notification_type === type);
                              if (index >= 0) {
                                newSettings[index] = {
                                  ...newSettings[index],
                                  allowed_channels: e.target.checked
                                    ? [...newSettings[index].allowed_channels, channel]
                                    : newSettings[index].allowed_channels.filter(c => c !== channel)
                                };
                              } else {
                                newSettings.push({
                                  role_id: roleId,
                                  notification_type: type,
                                  enabled: true,
                                  allowed_channels: [channel],
                                  time_sensitive_rules: []
                                });
                              }
                              handleRoleSettingsUpdate(newSettings);
                            }}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="ml-2 text-sm">{channel}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <label className="inline-flex items-center">
                    <input
                      type="checkbox"
                      checked={setting?.enabled || false}
                      onChange={e => {
                        const newSettings = [...roleSettings];
                        const index = newSettings.findIndex(s => s.notification_type === type);
                        if (index >= 0) {
                          newSettings[index] = {
                            ...newSettings[index],
                            enabled: e.target.checked
                          };
                        } else {
                          newSettings.push({
                            role_id: roleId,
                            notification_type: type,
                            enabled: e.target.checked,
                            allowed_channels: [],
                            time_sensitive_rules: []
                          });
                        }
                        handleRoleSettingsUpdate(newSettings);
                      }}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2">Enabled</span>
                  </label>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Time-Sensitive Rules Section */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Time-Sensitive Rules</h2>
          <button
            onClick={() => setShowTimeRuleForm(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Add Rule
          </button>
        </div>

        <div className="space-y-4">
          {timeRules.map(rule => (
            <div key={rule.id} className="p-4 border rounded-lg">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium">
                    {rule.start_time} - {rule.end_time}
                  </p>
                  <p className="text-sm text-gray-600">
                    Days: {rule.days_of_week.map(d => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d]).join(', ')}
                  </p>
                  <div className="mt-2 space-x-2">
                    {rule.channels.map(channel => (
                      <span
                        key={channel}
                        className="inline-block px-2 py-1 text-xs rounded-full bg-gray-100"
                      >
                        {channel}
                      </span>
                    ))}
                  </div>
                  {rule.priority_override && (
                    <span className="mt-2 inline-block px-2 py-1 text-xs rounded-full bg-blue-100">
                      Priority: {rule.priority_override}
                    </span>
                  )}
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => {
                      setSelectedTemplate(rule);
                      setShowTemplateForm(true);
                    }}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteTimeRule(rule.id)}
                    className="text-red-600 hover:text-red-800"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Template Form Modal */}
      {showTemplateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg w-full max-w-2xl">
            <h3 className="text-lg font-semibold mb-4">
              {selectedTemplate ? 'Edit Template' : 'Create Template'}
            </h3>
            <form onSubmit={e => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              handleTemplateSubmit({
                name: formData.get('name') as string,
                type: formData.get('type') as NotificationType,
                title_template: formData.get('title_template') as string,
                message_template: formData.get('message_template') as string,
                priority: formData.get('priority') as NotificationPriority,
                default_channels: Array.from(formData.getAll('channels')) as NotificationChannel[],
                variables: (formData.get('variables') as string).split(',').map(v => v.trim())
              });
            }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name</label>
                  <input
                    type="text"
                    name="name"
                    defaultValue={selectedTemplate?.name}
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Type</label>
                  <select
                    name="type"
                    defaultValue={selectedTemplate?.type}
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    {Object.values(NotificationType).map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Title Template</label>
                  <input
                    type="text"
                    name="title_template"
                    defaultValue={selectedTemplate?.title_template}
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Message Template</label>
                  <textarea
                    name="message_template"
                    defaultValue={selectedTemplate?.message_template}
                    required
                    rows={3}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Priority</label>
                  <select
                    name="priority"
                    defaultValue={selectedTemplate?.priority}
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    {Object.values(NotificationPriority).map(priority => (
                      <option key={priority} value={priority}>{priority}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Default Channels</label>
                  <div className="mt-2 space-x-4">
                    {Object.values(NotificationChannel).map(channel => (
                      <label key={channel} className="inline-flex items-center">
                        <input
                          type="checkbox"
                          name="channels"
                          value={channel}
                          defaultChecked={selectedTemplate?.default_channels.includes(channel)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="ml-2">{channel}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Variables (comma-separated)</label>
                  <input
                    type="text"
                    name="variables"
                    defaultValue={selectedTemplate?.variables.join(', ')}
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowTemplateForm(false);
                    setSelectedTemplate(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Time Rule Form Modal */}
      {showTimeRuleForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg w-full max-w-2xl">
            <h3 className="text-lg font-semibold mb-4">Add Time-Sensitive Rule</h3>
            <form onSubmit={e => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              handleTimeRuleSubmit({
                start_time: formData.get('start_time') as string,
                end_time: formData.get('end_time') as string,
                days_of_week: Array.from(formData.getAll('days')).map(d => parseInt(d as string)),
                channels: Array.from(formData.getAll('channels')) as NotificationChannel[],
                priority_override: formData.get('priority_override') as NotificationPriority || undefined
              });
            }}>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Start Time</label>
                    <input
                      type="time"
                      name="start_time"
                      required
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">End Time</label>
                    <input
                      type="time"
                      name="end_time"
                      required
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Days of Week</label>
                  <div className="mt-2 grid grid-cols-7 gap-2">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
                      <label key={day} className="inline-flex items-center">
                        <input
                          type="checkbox"
                          name="days"
                          value={index}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm">{day}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Channels</label>
                  <div className="mt-2 space-x-4">
                    {Object.values(NotificationChannel).map(channel => (
                      <label key={channel} className="inline-flex items-center">
                        <input
                          type="checkbox"
                          name="channels"
                          value={channel}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="ml-2">{channel}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Priority Override (Optional)</label>
                  <select
                    name="priority_override"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="">No Override</option>
                    {Object.values(NotificationPriority).map(priority => (
                      <option key={priority} value={priority}>{priority}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowTimeRuleForm(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationSettings; 