-- Create notification_templates table
CREATE TABLE notification_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    title_template TEXT NOT NULL,
    message_template TEXT NOT NULL,
    priority TEXT NOT NULL,
    default_channels TEXT[] NOT NULL,
    variables TEXT[] NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create role_notification_settings table
CREATE TABLE role_notification_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    role_id UUID NOT NULL REFERENCES auth.roles(id) ON DELETE CASCADE,
    notification_type TEXT NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT true,
    allowed_channels TEXT[] NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(role_id, notification_type)
);

-- Create time_sensitive_rules table
CREATE TABLE time_sensitive_rules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    role_id UUID NOT NULL REFERENCES auth.roles(id) ON DELETE CASCADE,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    days_of_week INTEGER[] NOT NULL,
    channels TEXT[] NOT NULL,
    priority_override TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create notifications table (if it doesn't exist)
CREATE TABLE IF NOT EXISTS notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    priority TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    channels TEXT[] NOT NULL,
    data JSONB,
    acknowledged BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ
);

-- Create indexes
CREATE INDEX idx_notification_templates_type ON notification_templates(type);
CREATE INDEX idx_role_notification_settings_role_id ON role_notification_settings(role_id);
CREATE INDEX idx_time_sensitive_rules_role_id ON time_sensitive_rules(role_id);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);
CREATE INDEX idx_notifications_acknowledged ON notifications(acknowledged);

-- Create RLS policies
ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_sensitive_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Notification templates policies
CREATE POLICY "Allow admins to manage notification templates"
    ON notification_templates
    FOR ALL
    TO authenticated
    USING (auth.jwt() ->> 'role' = 'admin');

-- Role notification settings policies
CREATE POLICY "Allow admins to manage role notification settings"
    ON role_notification_settings
    FOR ALL
    TO authenticated
    USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Allow users to view their role's notification settings"
    ON role_notification_settings
    FOR SELECT
    TO authenticated
    USING (role_id = (auth.jwt() ->> 'role_id')::uuid);

-- Time sensitive rules policies
CREATE POLICY "Allow admins to manage time sensitive rules"
    ON time_sensitive_rules
    FOR ALL
    TO authenticated
    USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Allow users to view their role's time sensitive rules"
    ON time_sensitive_rules
    FOR SELECT
    TO authenticated
    USING (role_id = (auth.jwt() ->> 'role_id')::uuid);

-- Notifications policies
CREATE POLICY "Allow users to view their own notifications"
    ON notifications
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Allow users to update their own notifications"
    ON notifications
    FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid());

-- Create functions
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers
CREATE TRIGGER update_notification_templates_updated_at
    BEFORE UPDATE ON notification_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_role_notification_settings_updated_at
    BEFORE UPDATE ON role_notification_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_time_sensitive_rules_updated_at
    BEFORE UPDATE ON time_sensitive_rules
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 