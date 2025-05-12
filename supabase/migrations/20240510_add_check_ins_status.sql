-- Migration to ensure check_ins table has a status column
DO $$
BEGIN
  -- Check if the status column exists in check_ins
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'check_ins' 
    AND column_name = 'status'
  ) THEN
    -- Add the status column with default 'pending'
    ALTER TABLE check_ins ADD COLUMN status TEXT DEFAULT 'pending';
    RAISE NOTICE 'Added status column to check_ins table';
  ELSE
    RAISE NOTICE 'Status column already exists in check_ins table';
  END IF;
END $$;

-- Create an index on the status column for faster queries
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_indexes 
    WHERE schemaname = 'public' 
    AND tablename = 'check_ins' 
    AND indexname = 'idx_check_ins_status'
  ) THEN
    CREATE INDEX idx_check_ins_status ON check_ins(status);
    RAISE NOTICE 'Created index on status column';
  ELSE
    RAISE NOTICE 'Index on status column already exists';
  END IF;
END $$; 