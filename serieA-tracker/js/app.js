let appData = {};

class SerieATracker {
    constructor() {
        this.data = {};
        this.init();
    }

    async init() {
        await this.loadData();
        this.setupEventListeners();
        this.render();
    }

    async loadData() {
        try {
            localStorage.removeItem('serieAData');
            const response = await fetch('data/data.json?t=' + new Date().getTime());
            this.data = await response.json();
            this.saveData();
        } catch (error) {
            console.error('Errore caricamento dati:', error);
        }
    }

    saveData() {
        localStorage.setItem('serieAData', JSON.stringify(this.data));
    }

    setupEventListeners() {
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchSection(e.target));
        });

        document.getElementById('giornataFilter').addEventListener('change', (e) => {
            this.renderCalendario(e.target.value);
        });
    }

    switchSection(btn) {
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
        
        btn.classList.add('active');
        const sectionId = btn.getAttribute('data-section');
        document.getElementById(sectionId).classList.add('active');

        if (sectionId === 'calendario') this.renderCalendario();
        if (sectionId === 'classifica') this.renderClassifica();
        if (sectionId === 'salvezza') this.renderSalvezza();
        if (sectionId === 'champions') this.renderChampions();
        if (sectionId === 'scudetto') this.renderScudetto();
    }

    renderCalendario(giornataFilter = '') {
        const container = document.getElementById('calendarioContainer');
        container.innerHTML = '';

        let matches = this.data.matches;
        if (giornataFilter) {
            matches = matches.filter(m => m.giornata == giornataFilter);
        }

        const grouped = {};
        matches.forEach(m => {
            if (!grouped[m.giornata]) grouped[m.giornata] = [];
            grouped[m.giornata].push(m);
        });

        Object.keys(grouped).sort((a, b) => a - b).forEach(giornata => {
            grouped[giornata].forEach(match => {
                const card = this.createMatchCard(match, giornata);
                container.appendChild(card);
            });
        });
    }

    createMatchCard(match, giornata) {
        const card = document.createElement('div');
        card.className = `match-card giornata-${giornata}`;
        
        const casa = this.getTeam(match.casa);
        const ospite = this.getTeam(match.ospite);
        
        const scoreDisplay = match.golCasa !== null && match.golOspite !== null 
            ? `${match.golCasa} - ${match.golOspite}`
            : '- : -';

        card.innerHTML = `
            <div class="match-giornata">Giornata ${giornata}</div>
            <div class="match-content">
                <div class="team">
                    <div class="team-badge">
                        <img src="${casa.image}" alt="${casa.name}">
                    </div>
                    <div class="team-name">${casa.name}</div>
                </div>
                <div class="match-score">
                    <div class="score-display">${scoreDisplay}</div>
                    <div class="match-time">${match.orario}</div>
                </div>
                <div class="team">
                    <div class="team-badge">
                        <img src="${ospite.image}" alt="${ospite.name}">
                    </div>
                    <div class="team-name">${ospite.name}</div>
                </div>
            </div>
            <div class="match-date">${this.formatDate(match.data)}</div>
        `;

        return card;
    }

    renderClassifica() {
        const container = document.getElementById('classificaContainer');
        container.innerHTML = '';

        const sorted = [...this.data.teams].sort((a, b) => b.pts - a.pts);

        let html = `
            <table>
                <thead>
                    <tr>
                        <th>Pos</th>
                        <th>Squadra</th>
                        <th>Pts</th>
                        <th>PG</th>
                        <th>V</th>
                        <th>N</th>
                        <th>P</th>
                    </tr>
                </thead>
                <tbody>
        `;

        sorted.forEach((team, index) => {
            const pos = index + 1;
            let rowClass = '';
            
            if (pos <= 4) rowClass = 'champions';
            else if (pos >= 5 && pos <= 6) rowClass = 'europaLeague';
            else if (pos === 17) rowClass = 'salvato';
            else if (pos >= 18) rowClass = 'retrocesso';

            html += `
                <tr class="${rowClass}">
                    <td class="posizione">${pos}</td>
                    <td class="team-cell">
                        <img src="${team.image}" alt="${team.name}">
                        ${team.name}
                    </td>
                    <td><strong>${team.pts}</strong></td>
                    <td>31</td>
                    <td>-</td>
                    <td>-</td>
                    <td>-</td>
                </tr>
            `;
        });

        html += `</tbody></table>`;
        container.innerHTML = html;
    }

    renderSalvezza() {
        const container = document.getElementById('salvezzaContainer');
        container.innerHTML = '';

        const sorted = [...this.data.teams].sort((a, b) => b.pts - a.pts);
        const atRisk = sorted.slice(13, 20);

        const html = atRisk.map(team => {
            const analysis = this.analyzeTeam(team, 'salvezza');
            return this.createLottaCard(team, analysis, 'salvezza');
        }).join('');

        container.innerHTML = html;
    }

    renderChampions() {
        const container = document.getElementById('championsContainer');
        container.innerHTML = '';

        const sorted = [...this.data.teams].sort((a, b) => b.pts - a.pts);
        const topTeams = sorted.slice(0, 6);

        const html = topTeams.map(team => {
            const analysis = this.analyzeTeam(team, 'champions');
            return this.createLottaCard(team, analysis, 'champions');
        }).join('');

        container.innerHTML = html;
    }

    renderScudetto() {
        const container = document.getElementById('scudettoContainer');
        container.innerHTML = '';

        const sorted = [...this.data.teams].sort((a, b) => b.pts - a.pts);
        const topTeams = sorted.slice(0, 3);

        const html = topTeams.map(team => {
            const analysis = this.analyzeTeam(team, 'scudetto');
            return this.createLottaCard(team, analysis, 'scudetto');
        }).join('');

        container.innerHTML = html;
    }

    analyzeTeam(team, type) {
        const matches = this.data.matches.filter(m => m.casa === team.name || m.ospite === team.name);
        const remaining = matches.filter(m => !m.giocata).length;

        let maxPoints = team.pts + (remaining * 3);
        let minPoints = team.pts;

        const sorted = [...this.data.teams].sort((a, b) => b.pts - a.pts);

        let status = 'possibile';
        let message = '';

        if (type === 'salvezza') {
            const pos17 = sorted[16].pts;
            if (maxPoints < pos17) {
                status = 'impossibile';
                message = 'Retrocesso matematicamente';
            } else if (minPoints > pos17 + 5) {
                status = 'possibile';
                message = 'Salvezza quasi certa';
            } else {
                status = 'difficile';
                message = 'Situazione critica';
            }
        } else if (type === 'champions') {
            const pos4 = sorted[3].pts;
            if (minPoints > pos4) {
                status = 'possibile';
                message = 'Champions quasi certa';
            } else if (maxPoints < pos4) {
                status = 'impossibile';
                message = 'Champions matemat. out';
            } else {
                status = 'difficile';
                message = 'Ancora in corsa';
            }
        } else if (type === 'scudetto') {
            const firstTeam = sorted[0];
            if (team.name === firstTeam.name) {
                if (maxPoints > team.pts + 10) {
                    status = 'possibile';
                    message = 'Scudetto in vista';
                } else {
                    status = 'difficile';
                    message = 'Volata decisiva';
                }
            }
        }

        return {
            ptsAttuali: team.pts,
            ptsMax: maxPoints,
            ptsMin: minPoints,
            gareRestanti: remaining,
            status,
            message
        };
    }

    createLottaCard(team, analysis, type) {
        const statusClass = analysis.status;
        const typeClass = type;

        return `
            <div class="lotta-card ${typeClass}">
                <div class="lotta-header">
                    <div class="lotta-badge">
                        <img src="${team.image}" alt="${team.name}">
                    </div>
                    <div class="lotta-info">
                        <div class="lotta-name">${team.name}</div>
                        <div class="lotta-pts">${analysis.ptsAttuali} punti</div>
                    </div>
                    <div class="lotta-status ${statusClass}">${analysis.status}</div>
                </div>
                <div class="lotta-details">
                    <div class="detail-row">
                        <span class="detail-label">Gare restanti:</span>
                        <span class="detail-value">${analysis.gareRestanti}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Pts minimi:</span>
                        <span class="detail-value">${analysis.ptsMin}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Pts massimi:</span>
                        <span class="detail-value">${analysis.ptsMax}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Scenario:</span>
                        <span class="detail-value">${analysis.message}</span>
                    </div>
                </div>
            </div>
        `;
    }

    getTeam(name) {
        return this.data.teams.find(t => t.name === name) || { name, image: 'images/placeholder.png' };
    }

    formatDate(dateStr) {
        const date = new Date(dateStr);
        return date.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' });
    }

    render() {
        this.renderCalendario();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new SerieATracker();
});