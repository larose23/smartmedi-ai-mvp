import { supabase } from '@/lib/supabase/client';
import { hipaaAuditLogger, PHICategory } from '../security/hipaa/audit';
import { Configuration, OpenAIApi } from 'openai';
import { createClient } from '@supabase/supabase-js';

interface SearchResult {
    id: string;
    type: 'note' | 'media' | 'encounter' | 'prescription' | 'lab';
    title: string;
    content: string;
    relevance: number;
    metadata: Record<string, any>;
    createdAt: Date;
}

interface SearchSuggestion {
    text: string;
    type: 'query' | 'filter';
    relevance: number;
}

export class PatientSearchService {
    private static openai: OpenAIApi;
    private static searchClient: any; // Type for your vector search client

    static async initialize() {
        // Initialize OpenAI for semantic search
        const configuration = new Configuration({
            apiKey: process.env.OPENAI_API_KEY,
        });
        this.openai = new OpenAIApi(configuration);

        // Initialize vector search client
        this.searchClient = createClient(
            process.env.SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_KEY!
        );
    }

    static async semanticSearch(
        patientId: string,
        query: string,
        filters?: {
            type?: string[];
            dateRange?: { start: Date; end: Date };
            categories?: string[];
        }
    ): Promise<SearchResult[]> {
        try {
            // Generate embeddings for the search query
            const embedding = await this.generateEmbedding(query);

            // Perform vector similarity search
            const { data: searchResults, error } = await this.searchClient
                .rpc('match_documents', {
                    query_embedding: embedding,
                    match_threshold: 0.7,
                    match_count: 10,
                    patient_id: patientId,
                    ...filters
                });

            if (error) throw error;

            // Log the search
            await hipaaAuditLogger.logAccess(
                'system',
                'provider',
                PHICategory.PHI,
                'patient_search',
                { patientId, query },
                '127.0.0.1',
                'PatientSearchService'
            );

            return this.processSearchResults(searchResults);
        } catch (error) {
            console.error('Error performing semantic search:', error);
            throw error;
        }
    }

    static async naturalLanguageQuery(
        patientId: string,
        query: string
    ): Promise<SearchResult[]> {
        try {
            // Parse the natural language query
            const parsedQuery = await this.parseNaturalLanguageQuery(query);

            // Perform the search using the parsed query
            return this.semanticSearch(patientId, parsedQuery.query, parsedQuery.filters);
        } catch (error) {
            console.error('Error processing natural language query:', error);
            throw error;
        }
    }

    static async getSearchSuggestions(
        patientId: string,
        partialQuery: string
    ): Promise<SearchSuggestion[]> {
        try {
            // Get recent searches for this patient
            const { data: recentSearches, error: recentError } = await supabase
                .from('search_history')
                .select('query')
                .eq('patient_id', patientId)
                .order('created_at', { ascending: false })
                .limit(10);

            if (recentError) throw recentError;

            // Get common medical terms and filters
            const { data: commonTerms, error: termsError } = await supabase
                .from('search_suggestions')
                .select('*')
                .ilike('term', `%${partialQuery}%`)
                .limit(5);

            if (termsError) throw termsError;

            // Combine and rank suggestions
            const suggestions: SearchSuggestion[] = [
                ...recentSearches.map(search => ({
                    text: search.query,
                    type: 'query' as const,
                    relevance: 0.8
                })),
                ...commonTerms.map(term => ({
                    text: term.term,
                    type: term.type as 'query' | 'filter',
                    relevance: term.relevance
                }))
            ];

            // Sort by relevance
            return suggestions.sort((a, b) => b.relevance - a.relevance);
        } catch (error) {
            console.error('Error getting search suggestions:', error);
            throw error;
        }
    }

    private static async generateEmbedding(text: string): Promise<number[]> {
        try {
            const response = await this.openai.createEmbedding({
                model: "text-embedding-ada-002",
                input: text,
            });

            return response.data.data[0].embedding;
        } catch (error) {
            console.error('Error generating embedding:', error);
            throw error;
        }
    }

    private static async parseNaturalLanguageQuery(
        query: string
    ): Promise<{ query: string; filters: any }> {
        try {
            const response = await this.openai.createCompletion({
                model: "text-davinci-003",
                prompt: `Parse the following medical query into a structured format:
                Query: "${query}"
                Extract:
                1. Main search terms
                2. Date ranges
                3. Document types
                4. Categories
                Format as JSON.`,
                max_tokens: 150,
                temperature: 0.3,
            });

            const parsed = JSON.parse(response.data.choices[0].text!);
            return {
                query: parsed.mainSearchTerms.join(' '),
                filters: {
                    dateRange: parsed.dateRanges,
                    type: parsed.documentTypes,
                    categories: parsed.categories
                }
            };
        } catch (error) {
            console.error('Error parsing natural language query:', error);
            throw error;
        }
    }

    private static processSearchResults(results: any[]): SearchResult[] {
        return results.map(result => ({
            id: result.id,
            type: result.type,
            title: result.title,
            content: result.content,
            relevance: result.similarity,
            metadata: result.metadata,
            createdAt: new Date(result.created_at)
        }));
    }

    static async saveSearchHistory(
        patientId: string,
        userId: string,
        query: string,
        filters?: {
            type?: string[];
            dateRange?: { start: Date; end: Date };
            categories?: string[];
        }
    ): Promise<void> {
        try {
            const { error } = await supabase
                .from('search_history')
                .insert({
                    patient_id: patientId,
                    user_id: userId,
                    query,
                    filters: filters || {}
                });

            if (error) throw error;

            // Update search suggestion usage count
            const terms = query.toLowerCase().split(/\s+/);
            for (const term of terms) {
                if (term.length > 2) { // Only update for terms longer than 2 characters
                    await supabase
                        .from('search_suggestions')
                        .upsert({
                            term,
                            type: 'query',
                            usage_count: supabase.rpc('increment_usage_count')
                        }, {
                            onConflict: 'term'
                        });
                }
            }
        } catch (error) {
            console.error('Error saving search history:', error);
            throw error;
        }
    }
} 