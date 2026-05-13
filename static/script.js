const tg = window.Telegram.WebApp;
tg.expand();

const dataContainer = document.getElementById('data-container');
const loader = document.getElementById('loader');
const navBtns = document.querySelectorAll('.nav-btn');

let currentTab = 'positions';

let refreshInterval;

async function fetchData(tab, isAutoRefresh = false) {
    if (!isAutoRefresh) {
        loader.style.display = 'block';
        dataContainer.innerHTML = '';
    }
    
    try {
        if (tab === 'my-profile') {
            const profileRes = await fetch('/api/my-profile');
            const { wallet, portfolioValue } = await profileRes.json();
            
            const [posData, actData] = await Promise.all([
                fetch(`/api/positions?wallet=${wallet}`).then(r => r.json()),
                fetch(`/api/activity?wallet=${wallet}`).then(r => r.json())
            ]);
            
            renderMyProfile(wallet, portfolioValue, posData, actData);
        } else {
            const response = await fetch(`/api/${tab}`);
            const data = await response.json();
            renderData(tab, data);
        }
    } catch (error) {
        if (!isAutoRefresh) {
            dataContainer.innerHTML = `<p style="color: red; text-align: center;">Error loading data</p>`;
        }
    } finally {
        if (!isAutoRefresh) loader.style.display = 'none';
    }
}

function renderMyProfile(wallet, portfolioValue, positions, activity) {
    dataContainer.innerHTML = ''; // Clear for refresh
    
    const header = document.createElement('div');
    header.style.marginBottom = '20px';
    header.innerHTML = `
        <div class="card" style="background: linear-gradient(135deg, #1e293b, #0f172a); border: none;">
            <div style="color: var(--text-secondary); font-size: 14px;">Umumiy balans (Portfolio Value)</div>
            <div style="font-size: 32px; font-weight: 700; color: var(--accent-green); margin: 8px 0;">$${parseFloat(portfolioValue).toFixed(2)}</div>
            <div style="font-size: 12px; color: var(--text-secondary); word-break: break-all;">${wallet}</div>
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
            card.innerHTML = `
                <div class="card-header">
                    <div class="card-title">${pos.title}</div>
                    <span class="badge ${pos.outcome === 'Yes' ? 'badge-buy' : 'badge-sell'}">${pos.outcome}</span>
                </div>
                <div class="card-body">
                    <div class="info-item">
                        <label>Size</label>
                        <span>${pos.size}</span>
                    </div>
                    <div class="info-item">
                        <label>Avg Price</label>
                        <span>$${parseFloat(pos.avgPrice).toFixed(4)}</span>
                    </div>
                    <div class="info-item">
                        <label>P&L</label>
                        <span style="color: ${parseFloat(pos.pnl) >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'}">${pos.pnl}</span>
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
