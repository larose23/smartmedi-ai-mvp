import { test, expect } from '@playwright/test';

test.describe('Archive Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the archive page
    await page.goto('/archive');
  });

  test('should complete full archive workflow', async ({ page }) => {
    // 1. Initial Archive Verification
    await expect(page.getByText('Archive Verification')).toBeVisible();
    await expect(page.getByText('Verifying archive integrity...')).toBeVisible();
    
    // Wait for verification to complete
    await expect(page.getByText('Archive verification complete')).toBeVisible();
    
    // 2. Archive Confirmation
    await expect(page.getByText('Archive Confirmation')).toBeVisible();
    await expect(page.getByText('Processing archive...')).toBeVisible();
    
    // Wait for archive to complete
    await expect(page.getByText('Archive completed successfully')).toBeVisible();
    
    // 3. Verify Archive Status
    await expect(page.getByText('Archive Status')).toBeVisible();
    await expect(page.getByText('Status: Archived')).toBeVisible();
  });

  test('should handle archive verification failure', async ({ page }) => {
    // Mock verification failure
    await page.route('**/api/archive/verify', async (route) => {
      await route.fulfill({
        status: 400,
        body: JSON.stringify({ error: 'Verification failed' }),
      });
    });

    // Trigger verification
    await page.getByText('Verify Archive').click();
    
    // Check error message
    await expect(page.getByText('Archive verification failed')).toBeVisible();
    await expect(page.getByText('Error: Verification failed')).toBeVisible();
  });

  test('should handle archive processing failure', async ({ page }) => {
    // Mock archive processing failure
    await page.route('**/api/archive/process', async (route) => {
      await route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Processing failed' }),
      });
    });

    // Trigger archive
    await page.getByText('Archive Now').click();
    
    // Check error message
    await expect(page.getByText('Archive processing failed')).toBeVisible();
    await expect(page.getByText('Error: Processing failed')).toBeVisible();
  });

  test('should handle offline mode', async ({ page }) => {
    // Simulate offline mode
    await page.route('**/*', async (route) => {
      await route.abort('failed');
    });

    // Try to verify archive
    await page.getByText('Verify Archive').click();
    
    // Check offline message
    await expect(page.getByText('You are currently offline')).toBeVisible();
    await expect(page.getByText('Please check your internet connection')).toBeVisible();
  });

  test('should handle clinician override', async ({ page }) => {
    // 1. Start archive process
    await page.getByText('Archive Now').click();
    
    // 2. Simulate clinician override
    await page.getByText('Override Archive').click();
    
    // 3. Enter override reason
    await page.getByLabel('Override Reason').fill('Emergency situation requires immediate attention');
    
    // 4. Confirm override
    await page.getByText('Confirm Override').click();
    
    // 5. Verify override status
    await expect(page.getByText('Archive Overridden')).toBeVisible();
    await expect(page.getByText('Reason: Emergency situation requires immediate attention')).toBeVisible();
  });

  test('should handle edge cases', async ({ page }) => {
    // 1. Test with empty archive
    await page.route('**/api/archive/verify', async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ status: 'success', message: 'No records to archive' }),
      });
    });

    await page.getByText('Verify Archive').click();
    await expect(page.getByText('No records to archive')).toBeVisible();

    // 2. Test with large archive
    await page.route('**/api/archive/verify', async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ 
          status: 'success', 
          message: 'Large archive detected',
          recordCount: 10000,
        }),
      });
    });

    await page.getByText('Verify Archive').click();
    await expect(page.getByText('Large archive detected')).toBeVisible();
    await expect(page.getByText('10,000 records')).toBeVisible();
  });

  test('should maintain data integrity during archive', async ({ page }) => {
    // 1. Start archive process
    await page.getByText('Archive Now').click();
    
    // 2. Verify data integrity checks
    await expect(page.getByText('Checking data integrity...')).toBeVisible();
    
    // 3. Wait for integrity check completion
    await expect(page.getByText('Data integrity verified')).toBeVisible();
    
    // 4. Verify record counts match
    const sourceCount = await page.getByText(/Source records:/).textContent();
    const archiveCount = await page.getByText(/Archived records:/).textContent();
    expect(sourceCount).toBe(archiveCount);
  });

  test('should handle concurrent archive requests', async ({ page }) => {
    // 1. Start first archive
    await page.getByText('Archive Now').click();
    
    // 2. Try to start second archive
    await page.getByText('Archive Now').click();
    
    // 3. Verify warning message
    await expect(page.getByText('Archive already in progress')).toBeVisible();
    await expect(page.getByText('Please wait for the current archive to complete')).toBeVisible();
  });

  test('should provide detailed archive report', async ({ page }) => {
    // 1. Complete archive process
    await page.getByText('Archive Now').click();
    await expect(page.getByText('Archive completed successfully')).toBeVisible();
    
    // 2. View archive report
    await page.getByText('View Report').click();
    
    // 3. Verify report details
    await expect(page.getByText('Archive Report')).toBeVisible();
    await expect(page.getByText('Total Records:')).toBeVisible();
    await expect(page.getByText('Successfully Archived:')).toBeVisible();
    await expect(page.getByText('Failed Records:')).toBeVisible();
    await expect(page.getByText('Processing Time:')).toBeVisible();
  });
}); 