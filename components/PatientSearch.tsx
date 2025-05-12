import React, { useState, useEffect, useCallback } from 'react';
import {
    Box,
    TextField,
    Autocomplete,
    Chip,
    Paper,
    Typography,
    CircularProgress,
    IconButton,
    Stack,
    Divider,
    List,
    ListItem,
    ListItemText,
    ListItemIcon,
    Tooltip,
} from '@mui/material';
import {
    Search as SearchIcon,
    FilterList as FilterIcon,
    History as HistoryIcon,
    Description as NoteIcon,
    Image as MediaIcon,
    Event as EncounterIcon,
    LocalPharmacy as PrescriptionIcon,
    Science as LabIcon,
    Clear as ClearIcon,
} from '@mui/icons-material';
import { useDebounce } from '@/hooks/useDebounce';
import { PatientSearchService, SearchResult, SearchSuggestion } from '@/lib/services/PatientSearchService';
import { format } from 'date-fns';
import { useSession } from 'next-auth/react';

interface PatientSearchProps {
    patientId: string;
    onResultSelect?: (result: SearchResult) => void;
}

export const PatientSearch: React.FC<PatientSearchProps> = ({
    patientId,
    onResultSelect,
}) => {
    const { data: session } = useSession();
    const [query, setQuery] = useState('');
    const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
    const [results, setResults] = useState<SearchResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
    const [dateRange, setDateRange] = useState<{ start: Date | null; end: Date | null }>({
        start: null,
        end: null,
    });
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

    const debouncedQuery = useDebounce(query, 300);

    useEffect(() => {
        if (debouncedQuery) {
            loadSuggestions();
        } else {
            setSuggestions([]);
        }
    }, [debouncedQuery]);

    // Add effect to trigger search when filters change
    useEffect(() => {
        if (query) {
            handleSearch();
        }
    }, [selectedTypes, dateRange, selectedCategories]);

    const loadSuggestions = async () => {
        try {
            const newSuggestions = await PatientSearchService.getSearchSuggestions(
                patientId,
                debouncedQuery
            );
            setSuggestions(newSuggestions);
        } catch (error) {
            console.error('Error loading suggestions:', error);
        }
    };

    const handleSearch = async () => {
        if (!query) return;

        try {
            setLoading(true);
            const searchResults = await PatientSearchService.semanticSearch(
                patientId,
                query,
                {
                    type: selectedTypes.length > 0 ? selectedTypes : undefined,
                    dateRange: dateRange.start && dateRange.end
                        ? { start: dateRange.start, end: dateRange.end }
                        : undefined,
                    categories: selectedCategories.length > 0 ? selectedCategories : undefined,
                }
            );
            setResults(searchResults);

            // Save search history
            if (session?.user?.id) {
                await PatientSearchService.saveSearchHistory(
                    patientId,
                    session.user.id,
                    query,
                    {
                        type: selectedTypes.length > 0 ? selectedTypes : undefined,
                        dateRange: dateRange.start && dateRange.end
                            ? { start: dateRange.start, end: dateRange.end }
                            : undefined,
                        categories: selectedCategories.length > 0 ? selectedCategories : undefined,
                    }
                );
            }
        } catch (error) {
            console.error('Error performing search:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleNaturalLanguageSearch = async () => {
        if (!query) return;

        try {
            setLoading(true);
            const searchResults = await PatientSearchService.naturalLanguageQuery(
                patientId,
                query
            );
            setResults(searchResults);
        } catch (error) {
            console.error('Error performing natural language search:', error);
        } finally {
            setLoading(false);
        }
    };

    const getResultIcon = (type: string) => {
        switch (type) {
            case 'note':
                return <NoteIcon />;
            case 'media':
                return <MediaIcon />;
            case 'encounter':
                return <EncounterIcon />;
            case 'prescription':
                return <PrescriptionIcon />;
            case 'lab':
                return <LabIcon />;
            default:
                return <DescriptionIcon />;
        }
    };

    return (
        <Box sx={{ width: '100%', maxWidth: 800, mx: 'auto' }}>
            <Paper sx={{ p: 2, mb: 2 }}>
                <Stack direction="row" spacing={1} alignItems="center">
                    <TextField
                        fullWidth
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search patient records..."
                        variant="outlined"
                        size="small"
                        InputProps={{
                            startAdornment: <SearchIcon color="action" />,
                            endAdornment: loading && <CircularProgress size={20} />,
                        }}
                    />
                    <Tooltip title="Toggle Filters">
                        <IconButton
                            onClick={() => setShowFilters(!showFilters)}
                            color={showFilters ? 'primary' : 'default'}
                        >
                            <FilterIcon />
                        </IconButton>
                    </Tooltip>
                </Stack>

                {showFilters && (
                    <Box sx={{ mt: 2 }}>
                        <Stack spacing={2}>
                            <Autocomplete
                                multiple
                                options={['note', 'media', 'encounter', 'prescription', 'lab']}
                                value={selectedTypes}
                                onChange={(_, newValue) => setSelectedTypes(newValue)}
                                renderInput={(params) => (
                                    <TextField
                                        {...params}
                                        label="Document Types"
                                        size="small"
                                    />
                                )}
                                renderTags={(value, getTagProps) =>
                                    value.map((option, index) => (
                                        <Chip
                                            label={option}
                                            size="small"
                                            {...getTagProps({ index })}
                                        />
                                    ))
                                }
                            />

                            <Stack direction="row" spacing={2}>
                                <TextField
                                    label="Start Date"
                                    type="date"
                                    size="small"
                                    value={dateRange.start ? format(dateRange.start, 'yyyy-MM-dd') : ''}
                                    onChange={(e) => setDateRange(prev => ({
                                        ...prev,
                                        start: e.target.value ? new Date(e.target.value) : null
                                    }))}
                                    InputLabelProps={{ shrink: true }}
                                />
                                <TextField
                                    label="End Date"
                                    type="date"
                                    size="small"
                                    value={dateRange.end ? format(dateRange.end, 'yyyy-MM-dd') : ''}
                                    onChange={(e) => setDateRange(prev => ({
                                        ...prev,
                                        end: e.target.value ? new Date(e.target.value) : null
                                    }))}
                                    InputLabelProps={{ shrink: true }}
                                />
                            </Stack>
                        </Stack>
                    </Box>
                )}

                {suggestions.length > 0 && (
                    <Paper
                        sx={{
                            mt: 1,
                            maxHeight: 200,
                            overflow: 'auto',
                            position: 'absolute',
                            width: '100%',
                            zIndex: 1,
                        }}
                    >
                        <List>
                            {suggestions.map((suggestion, index) => (
                                <ListItem
                                    key={index}
                                    button
                                    onClick={() => {
                                        setQuery(suggestion.text);
                                        setSuggestions([]);
                                    }}
                                >
                                    <ListItemIcon>
                                        {suggestion.type === 'query' ? (
                                            <HistoryIcon />
                                        ) : (
                                            <FilterIcon />
                                        )}
                                    </ListItemIcon>
                                    <ListItemText
                                        primary={suggestion.text}
                                        secondary={suggestion.type}
                                    />
                                </ListItem>
                            ))}
                        </List>
                    </Paper>
                )}
            </Paper>

            {results.length > 0 && (
                <Paper sx={{ p: 2 }}>
                    <Typography variant="h6" gutterBottom>
                        Search Results
                    </Typography>
                    <List>
                        {results.map((result) => (
                            <React.Fragment key={result.id}>
                                <ListItem
                                    button
                                    onClick={() => onResultSelect?.(result)}
                                >
                                    <ListItemIcon>
                                        {getResultIcon(result.type)}
                                    </ListItemIcon>
                                    <ListItemText
                                        primary={result.title}
                                        secondary={
                                            <>
                                                <Typography
                                                    component="span"
                                                    variant="body2"
                                                    color="text.primary"
                                                >
                                                    {result.type.charAt(0).toUpperCase() + result.type.slice(1)}
                                                </Typography>
                                                {' — '}
                                                {format(result.createdAt, 'MMM d, yyyy')}
                                                {' — '}
                                                {Math.round(result.relevance * 100)}% match
                                            </>
                                        }
                                    />
                                </ListItem>
                                <Divider />
                            </React.Fragment>
                        ))}
                    </List>
                </Paper>
            )}
        </Box>
    );
}; 