const { app, BrowserWindow, BrowserView, ipcMain } = require('electron');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });

let chromium;
app.commandLine.appendSwitch('remote-debugging-port', '9222');

let mainWindow;
let browserView;
let page = null;
let browser = null;

// User data (in production, load from database)
const userData = {
  planType: 'Individual',
  name: 'John Doe',
  emailId: 'john.doe@example.com',
  insuranceCover: '5 Lakhs',
  dateOfBirth: '1990-05-15',
  gender: 'Male',
  pincode: '10001',
  mobileNo: '+919810375969',
  tenure: '1 Year',
};
const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1600,
    height: 1000,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
    },
  });

  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);

  if (!app.isPackaged) {
    mainWindow.webContents.openDevTools();
  }
};

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// START AI-POWERED AUTOMATION
ipcMain.handle('start-automation', async () => {
  try {
    console.log('🤖 Starting AI-powered automation...');

    // Create BrowserView
    browserView = new BrowserView({
      webPreferences: {
        nodeIntegulation: false,
        contextIsolation: true,
      },
    });

    mainWindow.setBrowserView(browserView);

    const bounds = mainWindow.getBounds();
    browserView.setBounds({
      x: 450,
      y: 0,
      width: bounds.width - 450,
      height: bounds.height,
    });

    mainWindow.on('resize', () => {
      if (browserView) {
        const newBounds = mainWindow.getBounds();
        browserView.setBounds({
          x: 450,
          y: 0,
          width: newBounds.width - 450,
          height: newBounds.height,
        });
      }
    });

    // Load target page
    sendStatus('Loading page...', 5);
    await browserView.webContents.loadURL(
      'https://testing.thepolicymall.com/health-insurance'
    );
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // Connect Playwright
    sendStatus('Connecting to browser...', 10);
    if (!chromium) {
      chromium = require('playwright-core').chromium;
    }

    browser = await chromium.connectOverCDP('http://localhost:9222');
    const context = browser.contexts()[0];
    const pages = context.pages();

    page = null;
    for (const p of pages) {
      if (p.url().includes('testing.thepolicymall.com/health-insurance')) {
        page = p;
        break;
      }
    }

    if (!page) {
      throw new Error('Could not find target page');
    }

    await page.waitForLoadState('domcontentloaded');
    sendStatus('Page loaded successfully', 15);

    // Start AI processing
    await processPageWithAI();
  } catch (error) {
    console.error('Automation error:', error);
    sendStatus(`Error: ${error.message}`, 0);
  }
});

// AI PROCESSING FUNCTION
async function processPageWithAI() {
  try {
    sendStatus('🤖 AI analyzing form structure...', 20);

    // Extract HTML structure
    const htmlStructure = await page.evaluate(() => {
      // Get form HTML
      const form = document.querySelector('form, .uagb-forms-main-form');
      if (!form) return { error: 'No form found' };

      // Extract all input fields
      const inputs = Array.from(
        form.querySelectorAll('input, textarea, select')
      );

      return {
        formHTML: form.outerHTML.substring(0, 10000), // Limit to 10k chars
        fields: inputs.map((el, idx) => ({
          index: idx,
          tagName: el.tagName.toLowerCase(),
          type: el.type || 'text',
          name: el.name,
          id: el.id,
          placeholder: el.placeholder,
          required: el.required,
          className: el.className,
          ariaLabel: el.getAttribute('aria-label'),
          labelText: getLabelText(el),
        })),
      };

      function getLabelText(element) {
        // Try to find associated label
        if (element.id) {
          const label = document.querySelector(`label[for="${element.id}"]`);
          if (label) return label.textContent.trim();
        }

        // Try parent label
        const parentLabel = element.closest('label');
        if (parentLabel) return parentLabel.textContent.trim();

        // Try preceding sibling
        const prevSibling = element.previousElementSibling;
        if (prevSibling && prevSibling.tagName === 'LABEL') {
          return prevSibling.textContent.trim();
        }

        // Try div with class containing 'label'
        const labelDiv = element.closest('[class*="label"]');
        if (labelDiv) return labelDiv.textContent.trim();

        return '';
      }
    });

    if (htmlStructure.error) {
      throw new Error(htmlStructure.error);
    }

    console.log('📋 Extracted form structure:', htmlStructure);
    sendStatus('🤖 Sending to Gemini AI...', 30);

    // Generate AI prompt
    const prompt = `You are a form-filling AI assistant. Analyze this HTML form and map user data to form fields.

**User Data:**
${JSON.stringify(userData, null, 2)}

**Form Structure:**
${JSON.stringify(htmlStructure.fields, null, 2)}

**Instructions:**
1. Match each form field to the most appropriate user data field
2. Use field name, placeholder, label, and type to infer meaning
3. Return ONLY valid JSON (no markdown, no explanations)
4. For fields with no matching data, use empty string
5. Identify the submit button

**Return this EXACT JSON structure:**
{
  "fields": [
    {
      "fieldIndex": 0,
      "fieldName": "name attribute or id",
      "fieldLabel": "human readable label",
      "selector": "most reliable CSS selector (prefer name, then id, then class)",
      "value": "the value to fill",
      "confidence": "high|medium|low",
      "reasoning": "why this mapping makes sense"
    }
  ],
  "submitButton": {
    "selector": "CSS selector for submit button",
    "text": "button text"
  }
}

Return ONLY the JSON, nothing else.`;

    // Call Gemini API
    const result = await model.generateContent(prompt);
    const response = await result.response;
    let aiResponse = response.text();

    console.log('🤖 Raw Gemini Response:', aiResponse);

    // Clean up response (remove markdown code blocks if present)
    aiResponse = aiResponse.replace(/``````\n?/g, '').trim();

    let formMapping;
    try {
      formMapping = JSON.parse(aiResponse);
    } catch (parseError) {
      console.error('Failed to parse AI response:', aiResponse);
      throw new Error('AI returned invalid JSON. Please try again.');
    }

    sendStatus('✅ AI analysis complete', 40);
    console.log('🎯 Form Mapping:', formMapping);

    // Send to renderer for user approval
    sendFormPreview(formMapping);
  } catch (error) {
    console.error('AI processing error:', error);
    sendStatus(`AI Error: ${error.message}`, 0);
  }
}

// Send form preview to renderer
function sendFormPreview(formMapping) {
  if (mainWindow && mainWindow.webContents) {
    mainWindow.webContents.send('form-preview', formMapping);
  }
  sendStatus('⏸️ Awaiting your approval...', 50);
}

// User approved - fill the form
ipcMain.handle('approve-and-fill', async (event, approvedMapping) => {
  try {
    console.log('✅ User approved, filling form...');
    sendStatus('Filling form fields...', 60);

    // Fill each field
    for (let i = 0; i < approvedMapping.fields.length; i++) {
      const field = approvedMapping.fields[i];

      if (!field.value || field.value === '') {
        console.log(`⏭️ Skipping empty field: ${field.fieldLabel}`);
        continue;
      }

      try {
        console.log(`📝 Filling: ${field.fieldLabel} = "${field.value}"`);

        // Wait for field to be visible
        await page.waitForSelector(field.selector, {
          state: 'visible',
          timeout: 5000,
        });

        // Scroll into view
        await page.evaluate((selector) => {
          const el = document.querySelector(selector);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, field.selector);

        await page.waitForTimeout(300);

        // Fill the field
        await page.fill(field.selector, field.value);

        const progress =
          60 + Math.round((i / approvedMapping.fields.length) * 30);
        sendStatus(`✅ Filled: ${field.fieldLabel}`, progress);

        await page.waitForTimeout(800);
      } catch (fieldError) {
        console.error(
          `❌ Error filling ${field.fieldLabel}:`,
          fieldError.message
        );
        sendStatus(`⚠️ Skipped: ${field.fieldLabel}`, 0);
      }
    }

    sendStatus('✅ Form filled! Ready to submit', 90, true);
  } catch (error) {
    console.error('Fill error:', error);
    sendStatus(`Fill Error: ${error.message}`, 0);
  }
});

// Final submit
ipcMain.handle('final-submit', async () => {
  try {
    console.log('📤 Submitting form...');
    sendStatus('Submitting form...', 95);

    // Click submit button (AI should have provided selector)
    const submitSelector =
      'button.uagb-forms-main-submit-button, button[type="submit"], input[type="submit"]';

    await page.waitForSelector(submitSelector, { timeout: 5000 });

    await page.evaluate((selector) => {
      const btn = document.querySelector(selector);
      if (btn) btn.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, submitSelector);

    await page.waitForTimeout(1000);
    await page.click(submitSelector);

    sendStatus('✅ Form submitted successfully!', 100);
    await page.waitForTimeout(3000);

    // Check for next page or success message
    const hasNextPage = await checkForNextPage();
    if (hasNextPage) {
      sendStatus('🔄 Next page detected, restarting AI analysis...', 10);
      await processPageWithAI(); // Recursive: process next page
    } else {
      await cleanup();
    }
  } catch (error) {
    console.error('Submit error:', error);
    sendStatus(`Submit Error: ${error.message}`, 0);
  }
});

// Check if there's a next page
async function checkForNextPage() {
  try {
    // Wait a bit for page transition
    await page.waitForTimeout(2000);

    // Check for "Next" button or new form
    const hasNext = await page.evaluate(() => {
      const nextBtn = document.querySelector(
        'button:has-text("Next"), button:has-text("Continue"), .next-page'
      );
      return !!nextBtn;
    });

    return hasNext;
  } catch {
    return false;
  }
}

ipcMain.handle('stop-automation', async () => {
  console.log('Stopping automation...');
  await cleanup();
  sendStatus('Automation stopped', 0);
});

ipcMain.handle('edit-field', async (event, { fieldIndex, newValue }) => {
  console.log(`User edited field ${fieldIndex}: "${newValue}"`);
  // Field edits are handled in renderer and sent back in approve-and-fill
  return { success: true };
});

function sendStatus(message, progress, needsApproval = false) {
  console.log(`Status: ${message} (${progress}%)`);
  if (mainWindow && mainWindow.webContents) {
    mainWindow.webContents.send('status-update', {
      message,
      progress,
      needsApproval,
    });
  }
}

async function cleanup() {
  try {
    if (browserView) {
      mainWindow.removeBrowserView(browserView);
      browserView.webContents.destroy();
      browserView = null;
    }
    if (browser) await browser.close();
  } catch (e) {
    console.error('Cleanup error:', e);
  }
  page = null;
  browser = null;
  console.log('Cleanup complete');
}
