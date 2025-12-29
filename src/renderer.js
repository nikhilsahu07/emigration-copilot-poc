import './index.css';

console.log('👋 Renderer loading...');

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM ready, building UI...');

  document.body.innerHTML = `
    <div class="container">
      <div class="left-panel" id="leftPanel">
        <h1>🤖 Automation Demo</h1>
        
        <div class="card">
          <h3>Target: RaghuvarTech Form</h3>
          <small>https://raghuvartech.com/contact/</small>
        </div>

        <div class="controls">
          <button id="startBtn" class="btn btn-primary">▶️ Start</button>
          <button id="stopBtn" class="btn btn-danger" disabled>⏹️ Stop</button>
          <button id="toggleBtn" class="btn">⛶ Toggle View</button>
        </div>

        <div class="status-box">
          <h3>Status</h3>
          <p id="statusText">Ready</p>
          <div class="progress-bar">
            <div id="progressFill"></div>
          </div>
          <p id="progressText">0%</p>
          
          <button id="approveBtn" class="btn btn-success" style="display: none;">
            ✅ Approve & Submit
          </button>
        </div>
      </div>

      <div class="right-panel">
        <h2>🌐 Browser Preview</h2>
        <p>Form automation happens in Electron's browser via CDP</p>
      </div>
    </div>
  `;

  // Check if electronAPI is available
  if (!window.electronAPI) {
    console.error('❌ electronAPI not available!');
    document.getElementById('statusText').textContent = 'Error: API not loaded';
    return;
  }

  console.log('✅ electronAPI available:', window.electronAPI);

  // Get DOM elements
  const startBtn = document.getElementById('startBtn');
  const stopBtn = document.getElementById('stopBtn');
  const toggleBtn = document.getElementById('toggleBtn');
  const approveBtn = document.getElementById('approveBtn');
  const statusText = document.getElementById('statusText');
  const progressFill = document.getElementById('progressFill');
  const progressText = document.getElementById('progressText');
  const leftPanel = document.getElementById('leftPanel');

  // Event listeners
  startBtn.onclick = async () => {
    console.log('Start button clicked');
    startBtn.disabled = true;
    stopBtn.disabled = false;

    try {
      await window.electronAPI.startAutomation();
    } catch (error) {
      console.error('Automation error:', error);
      statusText.textContent = `Error: ${error.message}`;
      startBtn.disabled = false;
      stopBtn.disabled = true;
    }
  };

  stopBtn.onclick = async () => {
    console.log('Stop button clicked');
    await window.electronAPI.stopAutomation();
    startBtn.disabled = false;
    stopBtn.disabled = true;
  };

  approveBtn.onclick = async () => {
    console.log('Approve button clicked');
    approveBtn.style.display = 'none';
    await window.electronAPI.approveSubmit();
    startBtn.disabled = false;
    stopBtn.disabled = true;
  };

  toggleBtn.onclick = () => {
    leftPanel.classList.toggle('hidden');
  };

  // Status updates
  window.electronAPI.onStatusUpdate((data) => {
    console.log('Status update:', data);
    statusText.textContent = data.message;
    progressFill.style.width = `${data.progress}%`;
    progressText.textContent = `${data.progress}%`;

    if (data.needsApproval) {
      approveBtn.style.display = 'block';
    }
  });

  console.log('✅ All event listeners attached');
});
