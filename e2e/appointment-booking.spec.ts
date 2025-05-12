import { test, expect } from '@playwright/test';

test.describe('Appointment Booking Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the appointment booking page
    await page.goto('/appointments/new');
  });

  test('should book an appointment and show confirmation toast', async ({ page }) => {
    // Fill in patient details
    await page.fill('[name="patientName"]', 'John Doe');
    await page.selectOption('[name="month"]', '6');
    await page.selectOption('[name="day"]', '15');
    await page.selectOption('[name="year"]', '1990');
    await page.fill('[name="phone"]', '123-456-7890');
    await page.fill('[name="email"]', 'john@example.com');

    // Select appointment type
    await page.selectOption('[name="appointmentType"]', 'checkup');

    // Select date and time
    await page.click('[name="appointmentDate"]');
    await page.click('text=15'); // Select 15th of current month
    await page.selectOption('[name="appointmentTime"]', '10:00');

    // Submit the form
    await page.click('button[type="submit"]');

    // Wait for confirmation toast
    const toast = await page.waitForSelector('.toast-success');
    expect(toast).toBeTruthy();

    // Verify toast content
    const toastText = await toast.textContent();
    expect(toastText).toContain('Appointment Booked!');

    // Click "View in Archive" button
    await page.click('text=View in Archive');

    // Verify navigation to archive page
    await expect(page).toHaveURL(/.*patients-archive/);

    // Verify appointment is visible in archive
    const appointmentCard = await page.waitForSelector('text=John Doe');
    expect(appointmentCard).toBeTruthy();
  });

  test('should handle form validation', async ({ page }) => {
    // Try to submit without filling required fields
    await page.click('button[type="submit"]');

    // Verify error messages
    await expect(page.locator('text=Name is required')).toBeVisible();
    await expect(page.locator('text=Date of birth is required')).toBeVisible();
    await expect(page.locator('text=Phone number is required')).toBeVisible();
    await expect(page.locator('text=Appointment type is required')).toBeVisible();
  });

  test('should handle voice input for symptoms', async ({ page }) => {
    // Click voice input button
    await page.click('[aria-label="Start voice input"]');

    // Mock speech recognition
    await page.evaluate(() => {
      const mockEvent = {
        resultIndex: 0,
        results: [[{ transcript: 'I have a headache and fever' }]],
      };
      window.SpeechRecognition.prototype.onresult(mockEvent);
    });

    // Verify transcript is populated
    const symptomsInput = await page.locator('[name="symptoms"]');
    await expect(symptomsInput).toHaveValue('I have a headache and fever');
  });

  test('should work offline', async ({ page }) => {
    // Enable offline mode
    await page.route('**/*', (route) => route.continue());

    // Fill in appointment details
    await page.fill('[name="patientName"]', 'Jane Doe');
    await page.selectOption('[name="appointmentType"]', 'checkup');
    await page.selectOption('[name="appointmentTime"]', '14:00');

    // Submit form
    await page.click('button[type="submit"]');

    // Verify offline indicator
    const offlineIndicator = await page.waitForSelector('text=Working offline');
    expect(offlineIndicator).toBeTruthy();

    // Verify form data is stored in IndexedDB
    const storedData = await page.evaluate(() => {
      return new Promise((resolve) => {
        const request = indexedDB.open('smartmedi-offline');
        request.onsuccess = (event) => {
          const db = event.target.result;
          const transaction = db.transaction(['appointments'], 'readonly');
          const store = transaction.objectStore('appointments');
          const getAllRequest = store.getAll();
          getAllRequest.onsuccess = () => resolve(getAllRequest.result);
        };
      });
    });

    expect(storedData).toContainEqual(
      expect.objectContaining({
        patientName: 'Jane Doe',
        appointmentType: 'checkup',
        appointmentTime: '14:00',
      })
    );
  });
}); 