-- Create feedback table
CREATE TABLE feedback (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    feedback TEXT NOT NULL,
    category TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status TEXT DEFAULT 'new',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create satisfaction_surveys table
CREATE TABLE satisfaction_surveys (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    satisfaction INTEGER NOT NULL CHECK (satisfaction >= 1 AND satisfaction <= 5),
    comments TEXT,
    trigger TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create feature_requests table
CREATE TABLE feature_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_review', 'planned', 'implemented', 'rejected')),
    votes INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create RLS policies
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE satisfaction_surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_requests ENABLE ROW LEVEL SECURITY;

-- Feedback policies
CREATE POLICY "Users can insert feedback"
    ON feedback FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Users can view their own feedback"
    ON feedback FOR SELECT
    TO authenticated
    USING (true);

-- Satisfaction survey policies
CREATE POLICY "Users can insert satisfaction surveys"
    ON satisfaction_surveys FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Users can view satisfaction surveys"
    ON satisfaction_surveys FOR SELECT
    TO authenticated
    USING (true);

-- Feature request policies
CREATE POLICY "Users can insert feature requests"
    ON feature_requests FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Users can view feature requests"
    ON feature_requests FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Users can update feature request votes"
    ON feature_requests FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Create indexes
CREATE INDEX idx_feedback_timestamp ON feedback(timestamp);
CREATE INDEX idx_satisfaction_surveys_timestamp ON satisfaction_surveys(timestamp);
CREATE INDEX idx_feature_requests_votes ON feature_requests(votes);
CREATE INDEX idx_feature_requests_status ON feature_requests(status); 