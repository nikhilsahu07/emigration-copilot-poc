const { app, BrowserWindow, BrowserView, ipcMain } = require('electron');

let chromium;
app.commandLine.appendSwitch('remote-debugging-port', '9222');

let mainWindow;
let browserView;
let page = null;
let browser = null;

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
    },
  });

  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);

  // Only open DevTools in development
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

ipcMain.handle('start-automation', async () => {
  try {
    console.log('Starting automation...');

    browserView = new BrowserView({
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    mainWindow.setBrowserView(browserView);

    const bounds = mainWindow.getBounds();
    browserView.setBounds({
      x: 400,
      y: 0,
      width: bounds.width - 400,
      height: bounds.height,
    });

    mainWindow.on('resize', () => {
      if (browserView) {
        const newBounds = mainWindow.getBounds();
        browserView.setBounds({
          x: 400,
          y: 0,
          width: newBounds.width - 400,
          height: newBounds.height,
        });
      }
    });

    // Load URL
    await browserView.webContents.loadURL('https://raghuvartech.com/contact/');
    sendStatus('Page loaded', 10);

    // Wait for page to fully load
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // Connect Playwright
    if (!chromium) {
      chromium = require('playwright-core').chromium;
    }

    browser = await chromium.connectOverCDP('http://localhost:9222');
    const context = browser.contexts()[0];
    const pages = context.pages();
    console.log(`Found ${pages.length} pages`);

    // CRITICAL FIX: Find the correct page by URL
    page = null;
    for (const p of pages) {
      const url = p.url();
      console.log(`Page URL: ${url}`);
      if (url.includes('raghuvartech.com/contact')) {
        page = p;
        console.log('✅ Found RaghuvarTech contact page!');
        break;
      }
    }

    if (!page) {
      throw new Error(
        'Could not find RaghuvarTech contact page among open pages'
      );
    }

    await page.waitForLoadState('domcontentloaded');
    sendStatus('Connected to form page', 15);

    // Scroll to contact form
    await page.evaluate(() => {
      const form = document.getElementById('contactform');
      if (form) {
        form.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });

    await page.waitForTimeout(2000);
    sendStatus('Scrolled to form', 20);

    // Wait for form to be visible
    await page.waitForSelector('input[name="your-first-name"]', {
      state: 'visible',
      timeout: 15000,
    });

    // Form data
    const formData = [
      {
        selector: 'input[name="your-first-name"]',
        value: 'John',
        label: 'First Name',
      },
      {
        selector: 'input[name="your-last-name"]',
        value: 'Doe',
        label: 'Last Name',
      },
      {
        selector: 'input[name="your-email"]',
        value: 'john.doe@example.com',
        label: 'Email',
      },
      {
        selector: 'input[name="your-phone"]',
        value: '+919810375969',
        label: 'Phone',
      },
      {
        selector: 'textarea[name="your-message"]',
        value:
          'This is an automated test message from Electron Playwright demo!',
        label: 'Message',
      },
    ];

    for (let i = 0; i < formData.length; i++) {
      const field = formData[i];

      console.log(`Filling field ${i + 1}/${formData.length}: ${field.label}`);

      try {
        await page.waitForSelector(field.selector, {
          state: 'visible',
          timeout: 5000,
        });

        await page.evaluate((selector) => {
          const el = document.querySelector(selector);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, field.selector);

        await page.waitForTimeout(500);

        // Clear and fill
        await page.fill(field.selector, ''); // Clear first
        await page.waitForTimeout(200);
        await page.fill(field.selector, field.value);

        const progress = Math.round(20 + ((i + 1) / formData.length) * 50);
        sendStatus(`✅ Filled: ${field.label}`, progress);

        await page.waitForTimeout(1200);
      } catch (error) {
        console.error(`❌ Error filling ${field.label}:`, error.message);
        sendStatus(
          `❌ Error on ${field.label}`,
          Math.round(20 + ((i + 1) / formData.length) * 50)
        );
        throw error; // Stop on error
      }
    }

    // Pause for CAPTCHA
    sendStatus(
      '⚠️ Please solve the hCaptcha - Click Approve when done',
      75,
      true
    );
    console.log('Automation paused for hCaptcha');
  } catch (error) {
    console.error('Automation error:', error);
    sendStatus(`Error: ${error.message}`, 0);
  }
});

ipcMain.handle('approve-submit', async () => {
  if (page) {
    try {
      console.log('User approved, submitting form...');

      // Find submit button
      await page.waitForSelector('input[type="submit"]', { timeout: 5000 });
      await page.click('input[type="submit"]');

      sendStatus('Form submitted successfully! ✅', 100);
      await page.waitForTimeout(3000);
      await cleanup();
    } catch (error) {
      console.error('Submit error:', error);
      sendStatus(`Submit error: ${error.message}`, 0);
    }
  }
});

ipcMain.handle('stop-automation', async () => {
  console.log('Stopping automation...');
  await cleanup();
  sendStatus('Automation stopped', 0);
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
