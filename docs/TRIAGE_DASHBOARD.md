# Triage Nurse Dashboard

The Triage Nurse Dashboard is a real-time interface for managing patient triage cases, providing tools for monitoring, managing, and responding to patient needs efficiently.

## Features

### Real-Time Queue
- Auto-refreshing patient queue via Supabase subscriptions
- Filtering by severity, age group, and department
- Visual indicators for case status and priority
- Wait time tracking

### Actionable Cards
- One-click override functionality for triage severity
- Staff notes with templates
- Escalation buttons for critical cases
- Real-time status updates

### Analytics Widgets
- Average triage time tracking
- Accuracy rate vs. gold standard
- Throughput metrics
- Real-time KPI updates

### Status Validation System
- Visual indicators for patient status
- Audit logs for all status changes
- Dashboard counters for total and unseen patients
- Real-time status updates

## Setup

1. **Database Setup**
   Run the Supabase migration to create the necessary tables:
   ```bash
   supabase db push
   ```

2. **Environment Variables**
   Add the following to your `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

3. **Installation**
   ```bash
   npm install
   npm run dev
   ```

## Usage

### Managing the Queue
1. Use the filters at the top to sort cases by severity, age group, or department
2. Click the menu icon on any case card to:
   - Override triage severity
   - Escalate the case
   - Add staff notes

### Analytics
- Monitor real-time KPIs in the analytics widgets
- Track accuracy and throughput metrics
- View historical performance data

### Status Validation
- Monitor total and unseen patient counts
- Review audit logs for all status changes
- Track case escalations and overrides

## Database Schema

### triage_cases
- `id`: UUID (Primary Key)
- `patient_name`: TEXT
- `age`: INTEGER
- `age_group`: TEXT
- `department`: TEXT
- `severity`: TEXT
- `symptoms`: TEXT
- `wait_time`: INTEGER
- `is_escalated`: BOOLEAN
- `seen_by_staff`: BOOLEAN
- `staff_notes`: TEXT
- `override_reason`: TEXT
- `gold_standard_severity`: TEXT
- `created_at`: TIMESTAMPTZ
- `updated_at`: TIMESTAMPTZ

### triage_analytics
- `id`: UUID (Primary Key)
- `timestamp`: TIMESTAMPTZ
- `avg_triage_time`: DECIMAL
- `accuracy_rate`: DECIMAL
- `throughput`: DECIMAL
- `total_cases`: INTEGER
- `critical_cases`: INTEGER
- `urgent_cases`: INTEGER
- `moderate_cases`: INTEGER
- `stable_cases`: INTEGER

### triage_audit_logs
- `id`: UUID (Primary Key)
- `timestamp`: TIMESTAMPTZ
- `action`: TEXT
- `details`: TEXT
- `status`: TEXT
- `case_id`: UUID (Foreign Key)
- `staff_id`: UUID (Foreign Key)
- `previous_status`: TEXT
- `new_status`: TEXT

## Security

- All database operations are protected by Supabase Row Level Security (RLS)
- Staff actions are logged in the audit trail
- Sensitive operations require confirmation

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details. 