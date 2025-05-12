import { createClient } from '@supabase/supabase-js';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { trackError } from '../monitoring/config';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

async function backupTable(tableName: string): Promise<void> {
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('*');

    if (error) {
      throw error;
    }

    const timestamp = new Date().toISOString();
    const backupKey = `backups/${tableName}/${timestamp}.json`;

    await s3Client.send(
      new PutObjectCommand({
        Bucket: process.env.AWS_BACKUP_BUCKET!,
        Key: backupKey,
        Body: JSON.stringify(data),
        ServerSideEncryption: 'AES256',
      })
    );

    console.log(`Successfully backed up ${tableName} to ${backupKey}`);
  } catch (error) {
    trackError(error as Error, {
      table: tableName,
      operation: 'backup',
    });
    throw error;
  }
}

async function main() {
  const tables = [
    'patients',
    'appointments',
    'status_transitions',
    'archive_logs',
    // Add other tables as needed
  ];

  for (const table of tables) {
    try {
      await backupTable(table);
    } catch (error) {
      console.error(`Failed to backup ${table}:`, error);
      // Continue with other tables even if one fails
    }
  }
}

// Run backup daily
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Backup failed:', error);
      process.exit(1);
    });
} 