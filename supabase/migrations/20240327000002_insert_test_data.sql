-- Insert test patient with high priority
INSERT INTO public.check_ins (
    full_name,
    date_of_birth,
    contact_info,
    primary_symptom,
    additional_symptoms,
    priority_level,
    department,
    triage_score,
    status
) VALUES (
    'John Emergency',
    '1990-01-01',
    '555-0123',
    'Severe Chest Pain',
    'Shortness of breath',
    'high',
    'Emergency',
    1,
    'waiting'
);

-- Insert test patient with medium priority
INSERT INTO public.check_ins (
    full_name,
    date_of_birth,
    contact_info,
    primary_symptom,
    additional_symptoms,
    priority_level,
    department,
    triage_score,
    status
) VALUES (
    'Jane Regular',
    '1985-05-15',
    '555-0124',
    'Broken Arm',
    'Swelling',
    'medium',
    'Orthopedics',
    2,
    'waiting'
);

-- Insert test patient with low priority
INSERT INTO public.check_ins (
    full_name,
    date_of_birth,
    contact_info,
    primary_symptom,
    additional_symptoms,
    priority_level,
    department,
    triage_score,
    status
) VALUES (
    'Bob Routine',
    '1995-12-25',
    '555-0125',
    'Regular Checkup',
    'None',
    'low',
    'General',
    3,
    'waiting'
); 