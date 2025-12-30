import './index.css';

console.log('👋 AI Renderer loading...');

let currentFormMapping = null;

document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM ready, building AI UI...');

  document.body.innerHTML = `
    <div class="container">
      <div class="left-panel" id="leftPanel">
        <h1>🤖 AI Form Filler</h1>
        
        <div class="card target-info">
          <h3>Target Website</h3>
          <div class="target-url">https://testing.thepolicymall.com/health-insurance</div>
          <div class="ai-badge">✨ Powered by Gemini AI</div>
        </div>

        <div class="card">
          <h3>Controls</h3>
          <div class="controls">
            <button class="btn btn-primary btn-icon" id="startBtn">
              🚀 Start AI Analysis
            </button>
            <button class="btn btn-danger btn-icon" id="stopBtn" disabled>
              ⬛ Stop
            </button>
          </div>
        </div>

        <div class="card" id="previewCard" style="display: none;">
          <h3>📋 AI Field Mapping</h3>
          <div class="field-preview" id="fieldPreview"></div>
          <button class="btn btn-success btn-icon" id="approveBtn">
            ✓ Approve & Fill
            </button>
        </div>

        <div class="card">
          <div class="status-box">
            <h3>Status</h3>
            <div id="statusText">Ready to analyze form</div>
            <div class="progress-bar">
              <div class="progress-fill" id="progressBar"></div>
            </div>
            <div id="progressText">0%</div>
            <button class="btn btn-success btn-icon" id="submitBtn" style="display: none;">
              📤 Submit Form
            </button>
          </div>
        </div>
      </div>

      <div class="right-panel" id="rightPanel">
        <button class="toggle-btn" id="toggleBtn" title="Toggle Panel">◀</button>
        <div class="placeholder-content">
          <div class="placeholder-icon">🤖</div>
          <div class="placeholder-text">AI-Powered Browser</div>
          <div class="placeholder-subtext">Gemini will analyze and fill forms automatically</div>
        </div>
      </div>
    </div>
  `;

  const startBtn = document.getElementById('startBtn');
  const stopBtn = document.getElementById('stopBtn');
  const approveBtn = document.getElementById('approveBtn');
  const submitBtn = document.getElementById('submitBtn');
  const toggleBtn = document.getElementById('toggleBtn');
  const leftPanel = document.getElementById('leftPanel');
  const statusText = document.getElementById('statusText');
  const progressBar = document.getElementById('progressBar');
  const progressText = document.getElementById('progressText');
  const previewCard = document.getElementById('previewCard');
  const fieldPreview = document.getElementById('fieldPreview');

  // Toggle panel
  toggleBtn.addEventListener('click', () => {
    leftPanel.classList.toggle('hidden');
    toggleBtn.textContent = leftPanel.classList.contains('hidden') ? '▶' : '◀';
  });

  // Start AI automation
  startBtn.addEventListener('click', async () => {
    console.log('🚀 Start AI clicked');
    startBtn.disabled = true;
    stopBtn.disabled = false;
    previewCard.style.display = 'none';

    try {
      await window.electronAPI.startAutomation();
    } catch (error) {
      console.error('❌ Start error:', error);
      statusText.textContent = `Error: ${error.message}`;
      startBtn.disabled = false;
      stopBtn.disabled = true;
    }
  });

  // Stop automation
  stopBtn.addEventListener('click', async () => {
    console.log('⬛ Stop clicked');
    stopBtn.disabled = true;

    try {
      await window.electronAPI.stopAutomation();
    } catch (error) {
      console.error('❌ Stop error:', error);
    }

    startBtn.disabled = false;
    previewCard.style.display = 'none';
  });

  // Approve AI mapping
  approveBtn.addEventListener('click', async () => {
    console.log('✓ Approve clicked');
    approveBtn.disabled = true;
    approveBtn.textContent = '⏳ Filling...';

    try {
      // Collect edited values
      const fields = currentFormMapping.fields.map((field, idx) => {
        const input = document.getElementById(`field-${idx}`);
        if (input) {
          field.value = input.value;
        }
        return field;
      });

      await window.electronAPI.approveAndFill({
        ...currentFormMapping,
        fields,
      });
      previewCard.style.display = 'none';
    } catch (error) {
      console.error('❌ Approve error:', error);
      statusText.textContent = `Error: ${error.message}`;
      approveBtn.disabled = false;
      approveBtn.textContent = '✓ Approve & Fill';
    }
  });

  // Final submit
  submitBtn.addEventListener('click', async () => {
    console.log('📤 Submit clicked');
    submitBtn.disabled = true;
    submitBtn.textContent = '⏳ Submitting...';

    try {
      await window.electronAPI.finalSubmit();
      submitBtn.style.display = 'none';
    } catch (error) {
      console.error('❌ Submit error:', error);
      submitBtn.disabled = false;
      submitBtn.textContent = '📤 Submit Form';
    }
  });

  // Listen for AI form preview
  window.electronAPI.onFormPreview((formMapping) => {
    console.log('📋 Received AI form mapping:', formMapping);
    currentFormMapping = formMapping;

    // Build preview UI
    let html = '<div class="field-list">';

    formMapping.fields.forEach((field, idx) => {
      const confidenceColor =
        field.confidence === 'high'
          ? '#10b981'
          : field.confidence === 'medium'
            ? '#f59e0b'
            : '#ef4444';

      html += `
        <div class="field-item">
          <div class="field-header">
            <span class="field-label">${field.fieldLabel || 'Unknown Field'}</span>
            <span class="confidence-badge" style="background: ${confidenceColor}">
              ${field.confidence || 'low'}
            </span>
          </div>
          <input 
            type="text" 
            class="field-input" 
            id="field-${idx}"
            value="${field.value || ''}"
            placeholder="${field.reasoning || 'AI suggested value'}"
          />
          <div class="field-meta">
            ${field.selector}
          </div>
        </div>
      `;
    });

    html += '</div>';
    fieldPreview.innerHTML = html;
    previewCard.style.display = 'block';
    approveBtn.disabled = false;
    approveBtn.textContent = '✓ Approve & Fill';
  });

  // Listen for status updates
  window.electronAPI.onStatusUpdate((data) => {
    console.log('📊 Status update:', data);

    statusText.textContent = data.message;
    progressBar.style.width = `${data.progress}%`;
    progressText.textContent = `${data.progress}%`;

    if (data.needsApproval) {
      submitBtn.style.display = 'block';
      submitBtn.disabled = false;
      submitBtn.textContent = '📤 Submit Form';
    }

    if (data.progress === 100 || data.progress === 0) {
      startBtn.disabled = false;
      stopBtn.disabled = true;
    }
  });

  console.log('✅ AI UI initialized');
});
