const tg = window.Telegram.WebApp;
tg.expand();

const dataContainer = document.getElementById('data-container');
const loader = document.getElementById('loader');
const navBtns = document.querySelectorAll('.nav-btn');

let currentTab = 'positions';

let refreshInterval;

let currentData = [];
const filtersContainer = document.getElementById('filters');
const searchInput = document.getElementById('search-input');
const typeFilter = document.getElementById('type-filter');
const outcomeFilter = document.getElementById('outcome-filter');

async function fetchData(tab, isAutoRefresh = false) {
    if (!isAutoRefresh) {
        loader.style.display = 'block';
        dataContainer.innerHTML = '';
        searchInput.value = '';
        typeFilter.value = 'all';
        outcomeFilter.value = 'all';
    }
    
    // Show/hide filters
    if (tab === 'positions' || tab === 'activity' || tab === 'my-profile') {
        filtersContainer.style.display = 'flex';
        typeFilter.style.display = tab === 'activity' ? 'block' : 'none';
        outcomeFilter.style.display = (tab === 'positions' || tab === 'my-profile') ? 'block' : 'none';
    } else {
        filtersContainer.style.display = 'none';
    }

    try {
        if (tab === 'my-profile') {
            const profileRes = await fetch('/api/my-profile');
            const { wallet, portfolioValue } = await profileRes.json();
            
            const [posData, actData] = await Promise.all([
                fetch(`/api/positions?wallet=${wallet}`).then(r => r.json()),
                fetch(`/api/activity?wallet=${wallet}`).then(r => r.json())
            ]);
            
            currentData = { wallet, portfolioValue, positions: posData, activity: actData };
            renderMyProfile(wallet, portfolioValue, posData, actData);
        } else {
            const response = await fetch(`/api/${tab}`);
            const data = await response.json();
            currentData = data;
            applyFilters();
        }
    } catch (error) {
        if (!isAutoRefresh) {
            dataContainer.innerHTML = `<p style="color: red; text-align: center;">Error loading data</p>`;
        }
    } finally {
        if (!isAutoRefresh) loader.style.display = 'none';
    }
}

function applyFilters() {
    let dataToFilter = currentData;
    if (currentTab === 'my-profile') {
        // Handle my-profile separately if needed, or just filter its positions
        // For now, let's just filter the global data container if it's an array
        if (!Array.isArray(currentData)) return;
    }

    if (!Array.isArray(currentData)) return;

    const searchTerm = searchInput.value.toLowerCase();
    const typeTerm = typeFilter.value;
    const outcomeTerm = outcomeFilter.value;

    const filtered = currentData.filter(item => {
        const title = (item.title || item.name || '').toLowerCase();
        const matchesSearch = title.includes(searchTerm);
        
        if (currentTab === 'activity') {
            const matchesType = typeTerm === 'all' || item.side === typeTerm;
            return matchesSearch && matchesType;
        }
        
        if (currentTab === 'positions') {
            const matchesOutcome = outcomeTerm === 'all' || item.outcome === outcomeTerm;
            return matchesSearch && matchesOutcome;
        }
        
        return matchesSearch;
    });

    dataContainer.innerHTML = '';
    renderData(currentTab, filtered);
}

searchInput.addEventListener('input', applyFilters);
typeFilter.addEventListener('change', applyFilters);
outcomeFilter.addEventListener('change', applyFilters);

function renderMyProfile(wallet, portfolioValue, positions, activity) {
    // ... (rest of the function stays same)
    dataContainer.innerHTML = ''; // Clear for refresh
    
    // Calculate total position value
    const posValue = positions.reduce((sum, pos) => sum + (parseFloat(pos.currentValue) || 0), 0);
    const cashValue = Math.max(0, parseFloat(portfolioValue) - posValue);

    const header = document.createElement('div');
    header.style.marginBottom = '20px';
    header.innerHTML = `
        <div class="card" style="background: linear-gradient(135deg, #1e293b, #0f172a); border: none; padding: 20px;">
            <div style="color: var(--text-secondary); font-size: 14px;">Umumiy hisob (Portfolio Value)</div>
            <div style="font-size: 32px; font-weight: 700; color: var(--accent-green); margin: 8px 0;">$${parseFloat(portfolioValue).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
            
            <div style="display: flex; gap: 20px; margin-top: 15px; padding-top: 15px; border-top: 1px solid rgba(255,255,255,0.1);">
                <div>
                    <div style="color: var(--text-secondary); font-size: 11px; text-transform: uppercase;">Pozitsiyalar</div>
                    <div style="font-weight: 600; font-size: 16px;">$${posValue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
                </div>
                <div>
                    <div style="color: var(--text-secondary); font-size: 11px; text-transform: uppercase;">Naqd pul (Cash)</div>
                    <div style="font-weight: 600; font-size: 16px;">$${cashValue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
                </div>
            </div>
            <div style="font-size: 11px; color: var(--text-secondary); margin-top: 15px; word-break: break-all; opacity: 0.7;">${wallet}</div>
        </div>
    `;
    dataContainer.appendChild(header);

    const posTitle = document.createElement('h3');
    posTitle.innerText = 'Pozitsiyalar';
    posTitle.style.margin = '20px 0 10px';
    dataContainer.appendChild(posTitle);
    renderData('positions', positions);

    const actTitle = document.createElement('h3');
    actTitle.innerText = 'Oxirgi faollik';
    actTitle.style.margin = '30px 0 10px';
    dataContainer.appendChild(actTitle);
    renderData('activity', activity);
}

function renderData(tab, data) {
    if (!data || data.length === 0) {
        dataContainer.innerHTML = `<p style="text-align: center; margin-top: 40px; color: var(--text-secondary);">No data found</p>`;
        return;
    }

    if (tab === 'positions') {
        data.forEach(pos => {
            const card = document.createElement('div');
            card.className = 'card';
            const cashPnl = parseFloat(pos.cashPnl) || 0;
            const percentPnl = parseFloat(pos.percentPnl) || 0;
            const pnlColor = cashPnl >= 0 ? 'var(--accent-green)' : 'var(--accent-red)';
            const pnlSign = cashPnl >= 0 ? '+' : '';

            card.innerHTML = `
                <div class="card-header">
                    <div class="card-title">${pos.title}</div>
                    <span class="badge ${pos.outcome === 'Yes' ? 'badge-buy' : 'badge-sell'}">${pos.outcome}</span>
                </div>
                <div class="card-body">
                    <div class="info-item">
                        <label>Size</label>
                        <span>${parseFloat(pos.size).toLocaleString()}</span>
                    </div>
                    <div class="info-item">
                        <label>Current Value</label>
                        <span>$${parseFloat(pos.currentValue).toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                    </div>
                    <div class="info-item">
                        <label>Avg / Current Price</label>
                        <span>$${parseFloat(pos.avgPrice).toFixed(3)} / $${parseFloat(pos.curPrice).toFixed(3)}</span>
                    </div>
                    <div class="info-item">
                        <label>P&L</label>
                        <span style="color: ${pnlColor}">${pnlSign}$${cashPnl.toLocaleString(undefined, {minimumFractionDigits: 2})} (${pnlSign}${percentPnl.toFixed(2)}%)</span>
                    </div>
                </div>
            `;
            dataContainer.appendChild(card);
        });
    } else if (tab === 'activity') {
        data.forEach(act => {
            if (act.type.toLowerCase() !== 'trade') return;
            const card = document.createElement('div');
            card.className = 'card';
            card.innerHTML = `
                <div class="card-header">
                    <div class="card-title">${act.title || act.name}</div>
                    <span class="badge ${act.side === 'BUY' ? 'badge-buy' : 'badge-sell'}">${act.side}</span>
                </div>
                <div class="card-body">
                    <div class="info-item">
                        <label>Size</label>
                        <span>${act.size} ($${act.usdcSize})</span>
                    </div>
                    <div class="info-item">
                        <label>Price</label>
                        <span>$${parseFloat(act.price).toFixed(4)}</span>
                    </div>
                    <div class="info-item">
                        <label>Outcome</label>
                        <span>${act.outcome}</span>
                    </div>
                    <div class="info-item">
                        <label>Time</label>
                        <span>${new Date(act.timestamp * 1000).toLocaleString()}</span>
                    </div>
                </div>
            `;
            dataContainer.appendChild(card);
        });
    } else if (tab === 'leaderboard') {
        data.forEach(leader => {
            const item = document.createElement('div');
            item.className = 'leader-item';
            item.innerHTML = `
                <div class="leader-rank">#${leader.rank}</div>
                <div class="leader-info">
                    <div class="leader-name">${leader.userName || (leader.proxyWallet.slice(0, 10) + '...')}</div>
                </div>
                <div class="leader-pnl">$${parseFloat(leader.pnl).toLocaleString()}</div>
            `;
            dataContainer.appendChild(item);
        });
    }
}

function startAutoRefresh() {
    if (refreshInterval) clearInterval(refreshInterval);
    refreshInterval = setInterval(() => {
        fetchData(currentTab, true);
    }, 10000); // Har 10 soniyada yangilash
}

navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        navBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentTab = btn.dataset.tab;
        fetchData(currentTab);
        startAutoRefresh();
    });
});

// Initial fetch
fetchData('positions');
startAutoRefresh();
