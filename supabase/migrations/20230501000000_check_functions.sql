-- Create a function to check if a table exists
CREATE OR REPLACE FUNCTION public.check_table_exists(table_name text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  table_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public'
    AND table_name = $1
  ) INTO table_exists;
  
  RETURN table_exists;
END;
$$;

-- Create a function to check if a column exists in a table
CREATE OR REPLACE FUNCTION public.check_column_exists(table_name text, column_name text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  column_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public'
    AND table_name = $1
    AND column_name = $2
  ) INTO column_exists;
  
  RETURN column_exists;
END;
$$;

-- Create a function to execute arbitrary SQL
CREATE OR REPLACE FUNCTION public.execute_sql(sql_query text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE sql_query;
END;
$$;

-- Create a function to clear the schema cache
CREATE OR REPLACE FUNCTION public.clear_schema_cache()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- PostgreSQL doesn't have a direct way to clear schema cache
  -- This is a placeholder function that will be used by the application
  -- The actual cache clearing happens at the application level
  RETURN;
END;
$$; 