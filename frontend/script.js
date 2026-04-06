// ========== CONFIGURATION ==========
const API_BASE = 'http://10.46.146.21:5000/api';

let token = localStorage.getItem('token') || null;
let userId = localStorage.getItem('userId') || null;

function showToast(msg) {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 3000);
}

async function apiCall(endpoint, method = 'GET', body = null) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const options = { method, headers };
    if (body) options.body = JSON.stringify(body);
    const response = await fetch(`${API_BASE}${endpoint}`, options);
    if (response.status === 401) {
        localStorage.clear();
        token = null;
        userId = null;
        document.getElementById('authScreen').classList.remove('hidden');
        document.getElementById('mainScreen').classList.add('hidden');
        throw new Error('Session expired. Please login again.');
    }
    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${response.status}`);
    }
    return response.json();
}

// ---------- AUTH ----------
async function register(email, password) {
    const data = await apiCall('/auth/register', 'POST', { email, password });
    token = data.token;
    userId = data.userId;
    localStorage.setItem('token', token);
    localStorage.setItem('userId', userId);
    showToast('Registered!');
    if (window.Android) {
    window.Android.saveToken(token);
}
    showMainApp();
}

async function login(email, password) {
    const data = await apiCall('/auth/login', 'POST', { email, password });
    token = data.token;
    userId = data.userId;
    localStorage.setItem('token', token);
    localStorage.setItem('userId', userId);
    showToast('Logged in!');
    if (window.Android) {
    window.Android.saveToken(token);
}
    showMainApp();
}

function showMainApp() {
    document.getElementById('authScreen').classList.add('hidden');
    document.getElementById('mainScreen').classList.remove('hidden');
    document.getElementById('userEmail').innerText = localStorage.getItem('email') || 'User';
    loadHomeStats();
    loadGoals();
    switchTab('home');
}

// ---------- TABS ----------
function switchTab(tabId) {
    ['home', 'log', 'dashboard', 'goals', 'assistant'].forEach(id => {
        const el = document.getElementById(id + 'Tab');
        if (el) el.classList.add('hidden');
    });
    document.getElementById(tabId + 'Tab').classList.remove('hidden');
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelector(`.tab[data-tab="${tabId}"]`).classList.add('active');
    if (tabId === 'dashboard') refreshDashboard();
    if (tabId === 'goals') loadGoals();
}

// ---------- HOME ----------
async function loadHomeStats() {
    try {
        const insights = await apiCall('/insights');
        document.getElementById('productivityScore').innerText = insights.productivityScore + '%';
        let nudge = '';
        if (insights.productivityScore < 40) nudge = "Try the Pomodoro technique!";
        else if (insights.productivityScore > 80) nudge = "Great job! Take breaks.";
        else nudge = "Keep going! Small steps count.";
        document.getElementById('nudgeText').innerText = nudge;
    } catch (e) { console.error(e); }
}

// ---------- DASHBOARD ----------
async function refreshDashboard() {
    try {
        const insights = await apiCall('/insights');
        document.getElementById('dashboardScore').innerText = insights.productivityScore + '%';
        document.getElementById('totalActions').innerText = `Total actions: ${insights.totalActions}`;
        const emotionDiv = document.getElementById('emotionChart');
        emotionDiv.innerHTML = '';
        const emotions = insights.emotionTrend || {};
        for (let [emotion, count] of Object.entries(emotions)) {
            emotionDiv.innerHTML += `<div><strong>${emotion}</strong> ${count}</div>`;
        }
        const catDiv = document.getElementById('categoryBreakdown');
        catDiv.innerHTML = '';
        const cats = insights.topCategories || {};
        for (let [cat, count] of Object.entries(cats)) {
            catDiv.innerHTML += `<div>${cat}: ${count}</div>`;
        }
    } catch (e) { console.error(e); }
}

// ---------- LOG ACTION (WITH AI MODAL BEFORE SAVING) ----------
let pendingAction = null; // store action data before saving

async function logAction() {
    const text = document.getElementById('actionText').value.trim();
    if (!text) return showToast('Describe your action');
    const category = document.querySelector('.chip.active')?.dataset.cat || 'productive';
    
    // Store pending action
    pendingAction = { actionText: text, category, source: 'manual' };
    
    try {
        // First, ask AI for a suggestion based on this action
        const aiResponse = await apiCall('/assistant/chat', 'POST', {
            message: `The user just did this action: "${text}" (category: ${category}). Give a short, encouraging suggestion or appreciation (max 2 sentences).`
        });
        const advice = aiResponse.data || "Great job! Keep taking small steps.";
        
        // Show modal with AI advice and a "Save Action" button
        document.getElementById('adviceText').innerText = advice;
        document.getElementById('adviceModal').style.display = 'flex';
        
        // Change modal button text and behavior
        const modalBtn = document.getElementById('closeModalBtn');
        modalBtn.innerText = 'Save Action';
        modalBtn.onclick = async () => {
            // Save the action to database
            try {
                await apiCall('/actions', 'POST', pendingAction);
                showToast('Action saved!');
                document.getElementById('actionText').value = '';
                loadHomeStats();
                // Reset modal
                document.getElementById('adviceModal').style.display = 'none';
                modalBtn.innerText = 'Got it'; // restore original text
                modalBtn.onclick = () => document.getElementById('adviceModal').style.display = 'none';
                pendingAction = null;
            } catch (err) {
                showToast('Failed to save action');
                console.error(err);
            }
        };
    } catch (e) {
        console.error(e);
        showToast('AI advice failed, but you can still save the action.');
        // Optional: still allow saving without AI advice
        if (confirm('AI advice unavailable. Save action anyway?')) {
            await apiCall('/actions', 'POST', pendingAction);
            showToast('Action saved!');
            document.getElementById('actionText').value = '';
            loadHomeStats();
            pendingAction = null;
        }
    }
}

// ---------- GOALS ----------
async function loadGoals() {
    try {
        const goals = await apiCall('/goals');
        const container = document.getElementById('goalsList');
        if (goals.length === 0) { container.innerHTML = '<p>No goals yet.</p>'; return; }
        container.innerHTML = '';
        for (let g of goals) {
            const div = document.createElement('div');
            div.className = 'goal-item';
            div.innerHTML = `
                <div><strong>${escapeHtml(g.goal)}</strong> ${g.deadline ? g.deadline.slice(0,10) : ''}</div>
                ${g.status !== 'completed' ? `<button class="complete-btn" data-id="${g._id}">Complete</button>` : '<span>✅</span>'}
            `;
            container.appendChild(div);
        }
        document.querySelectorAll('.complete-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                await apiCall(`/goals/${btn.dataset.id}/complete`, 'PATCH');
                loadGoals();
                showToast('Goal completed!');
            });
        });
    } catch (e) { console.error(e); }
}

async function addGoal() {
    const goal = document.getElementById('goalTitle').value.trim();
    if (!goal) return showToast('Enter a goal');
    await apiCall('/goals', 'POST', { goal, deadline: document.getElementById('goalDeadline').value });
    showToast('Goal added');
    document.getElementById('goalTitle').value = '';
    loadGoals();
}

// ---------- AI CHAT ----------
async function sendChat() {
    const input = document.getElementById('chatInput');
    const msg = input.value.trim();
    if (!msg) return;
    const chatDiv = document.getElementById('chatMessages');
    chatDiv.innerHTML += `<div class="message user-message"><div class="bubble">${escapeHtml(msg)}</div></div>`;
    input.value = '';
    chatDiv.scrollTop = chatDiv.scrollHeight;
    const typing = document.createElement('div');
    typing.className = 'message ai-message';
    typing.innerHTML = '<div class="bubble">...</div>';
    chatDiv.appendChild(typing);
    chatDiv.scrollTop = chatDiv.scrollHeight;
    try {
        const res = await apiCall('/assistant/chat', 'POST', { message: msg });
        typing.remove();
        let replyHtml = '';
        if (res.type === 'courses') {
            replyHtml = '<div>' + res.data.map(c => `<div><strong>${c.platform}</strong>: <a href="${c.url}" target="_blank">${c.title}</a></div>`).join('') + '</div>';
        } else {
            replyHtml = `<div>${escapeHtml(res.data)}</div>`;
        }
        chatDiv.innerHTML += `<div class="message ai-message"><div class="bubble">${replyHtml}</div></div>`;
    } catch (e) {
        typing.remove();
        chatDiv.innerHTML += `<div class="message ai-message"><div class="bubble">Error: ${e.message}</div></div>`;
    }
    chatDiv.scrollTop = chatDiv.scrollHeight;
}

function escapeHtml(str) {
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    }).replace(/\n/g, '<br>');
}

// ---------- EVENT LISTENERS ----------
document.getElementById('authBtn').onclick = () => {
    const email = document.getElementById('email').value;
    const pass = document.getElementById('password').value;
    const isLogin = document.getElementById('authBtn').innerText === 'Login';
    if (isLogin) login(email, pass);
    else register(email, pass);
};
document.getElementById('toggleAuthBtn').onclick = () => {
    const btn = document.getElementById('authBtn');
    const title = document.getElementById('authTitle');
    if (btn.innerText === 'Login') {
        btn.innerText = 'Register';
        title.innerText = 'Register';
        document.getElementById('toggleAuthBtn').innerText = 'Back to Login';
    } else {
        btn.innerText = 'Login';
        title.innerText = 'Login';
        document.getElementById('toggleAuthBtn').innerText = 'Create account';
    }
};
document.querySelectorAll('.tab').forEach(t => t.onclick = () => switchTab(t.dataset.tab));
document.getElementById('quickLogBtn').onclick = () => switchTab('log');
document.getElementById('saveActionBtn').onclick = logAction;
document.getElementById('addGoalBtn').onclick = addGoal;
document.getElementById('sendChatBtn').onclick = sendChat;
document.getElementById('chatInput').onkeypress = (e) => { if (e.key === 'Enter') sendChat(); };
document.querySelectorAll('#categoryGroup .chip').forEach(chip => {
    chip.onclick = () => {
        document.querySelectorAll('#categoryGroup .chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
    };
});
// Default modal close behavior (reset button text)
const modalBtn = document.getElementById('closeModalBtn');
modalBtn.onclick = () => {
    document.getElementById('adviceModal').style.display = 'none';
    modalBtn.innerText = 'Got it'; // restore
    modalBtn.onclick = () => document.getElementById('adviceModal').style.display = 'none';
};

// ---------- INITIAL CHECK ----------
async function checkToken() {
    if (token) {
        try {
            await apiCall('/insights');
            showMainApp();
        } catch (err) {
            localStorage.clear();
            token = null;
            userId = null;
            document.getElementById('authScreen').classList.remove('hidden');
            document.getElementById('mainScreen').classList.add('hidden');
        }
    } else {
        document.getElementById('authScreen').classList.remove('hidden');
        document.getElementById('mainScreen').classList.add('hidden');
    }
}

checkToken();