-- Enable the pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create searchable documents table
CREATE TABLE IF NOT EXISTS searchable_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('note', 'media', 'encounter', 'prescription', 'lab')),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    embedding vector(1536),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create search history table
CREATE TABLE IF NOT EXISTS search_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    query TEXT NOT NULL,
    filters JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create search suggestions table
CREATE TABLE IF NOT EXISTS search_suggestions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    term TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('query', 'filter')),
    category TEXT,
    relevance FLOAT NOT NULL DEFAULT 1.0,
    usage_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_searchable_documents_patient_id ON searchable_documents(patient_id);
CREATE INDEX IF NOT EXISTS idx_searchable_documents_type ON searchable_documents(type);
CREATE INDEX IF NOT EXISTS idx_search_history_patient_id ON search_history(patient_id);
CREATE INDEX IF NOT EXISTS idx_search_history_user_id ON search_history(user_id);
CREATE INDEX IF NOT EXISTS idx_search_suggestions_term ON search_suggestions(term);
CREATE INDEX IF NOT EXISTS idx_search_suggestions_category ON search_suggestions(category);

-- Add RLS policies
ALTER TABLE searchable_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_suggestions ENABLE ROW LEVEL SECURITY;

-- Document access policies
CREATE POLICY "Users can view their patients' documents"
    ON searchable_documents
    FOR SELECT
    USING (
        patient_id IN (
            SELECT id FROM patients
            WHERE provider_id = auth.uid()
        )
    );

-- Search history policies
CREATE POLICY "Users can view their own search history"
    ON search_history
    FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can add to their search history"
    ON search_history
    FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- Search suggestions policies
CREATE POLICY "Users can view search suggestions"
    ON search_suggestions
    FOR SELECT
    USING (true);

-- Create function to match documents by similarity
CREATE OR REPLACE FUNCTION match_documents(
    query_embedding vector(1536),
    match_threshold float,
    match_count int,
    patient_id uuid,
    p_type text[] DEFAULT NULL,
    p_date_start timestamp DEFAULT NULL,
    p_date_end timestamp DEFAULT NULL,
    p_categories text[] DEFAULT NULL
)
RETURNS TABLE (
    id uuid,
    type text,
    title text,
    content text,
    similarity float,
    metadata jsonb,
    created_at timestamp with time zone
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        d.id,
        d.type,
        d.title,
        d.content,
        1 - (d.embedding <=> query_embedding) as similarity,
        d.metadata,
        d.created_at
    FROM searchable_documents d
    WHERE
        d.patient_id = match_documents.patient_id
        AND (p_type IS NULL OR d.type = ANY(p_type))
        AND (p_date_start IS NULL OR d.created_at >= p_date_start)
        AND (p_date_end IS NULL OR d.created_at <= p_date_end)
        AND (p_categories IS NULL OR d.metadata->>'category' = ANY(p_categories))
        AND 1 - (d.embedding <=> query_embedding) > match_threshold
    ORDER BY similarity DESC
    LIMIT match_count;
END;
$$;

-- Create function to update document embeddings
CREATE OR REPLACE FUNCTION update_document_embedding()
RETURNS TRIGGER AS $$
BEGIN
    -- This function would be called by a background job to update embeddings
    -- when documents are created or updated
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updating embeddings
CREATE TRIGGER update_document_embedding_trigger
    AFTER INSERT OR UPDATE ON searchable_documents
    FOR EACH ROW
    EXECUTE FUNCTION update_document_embedding();

-- Create function to update search suggestion relevance
CREATE OR REPLACE FUNCTION update_suggestion_relevance()
RETURNS TRIGGER AS $$
BEGIN
    -- Update relevance based on usage count and recency
    NEW.relevance = NEW.usage_count * (1 + EXTRACT(EPOCH FROM (NOW() - NEW.created_at)) / 86400);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updating suggestion relevance
CREATE TRIGGER update_suggestion_relevance_trigger
    BEFORE UPDATE ON search_suggestions
    FOR EACH ROW
    EXECUTE FUNCTION update_suggestion_relevance();

-- Create function to increment usage count
CREATE OR REPLACE FUNCTION increment_usage_count()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN COALESCE(usage_count, 0) + 1;
END;
$$; 