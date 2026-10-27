let gameData = [];

// Load JSON data on startup
async function initApp() {
    try {
        const response = await fetch('bg-list.json');
        rawData = await response.json();
        
        // Pre-process raw data: clean blank names and normalize types
        gameData = rawData
            .filter(g => g.game && g.game.trim() !== "")
            .map(g => ({
                ...g,
                // Convert numeric fields to actual numbers, or null if blank
                'min-players': g['min-players'] !== "" ? parseInt(g['min-players'], 10) : null,
                'max-players': g['max-players'] !== "" ? parseInt(g['max-players'], 10) : null,
                'complexity / 5': g['complexity / 5'] !== "" ? parseFloat(g['complexity / 5']) : null
            }))
        
        filterGames(); // Render initial state
    } catch (error) {
        console.error("Failed to load local board game data:", error);
    }
}

function filterGames() {
    const rawSearchQuery = document.getElementById('searchName').value.toLowerCase().trim();
    const players = document.getElementById('playerCount').value;
    const owner = document.getElementById('filterOwner').value;
    
    // NEW: Get complexity filter inputs
    const complexityOp = document.getElementById('complexityOp').value;
    const complexityValInput = document.getElementById('complexityValue').value;

    let sqlQuery = `
        SELECT * FROM ? 
        WHERE (
            LOWER(game) LIKE ? 
            OR LOWER(COALESCE(genre, '')) LIKE ? 
            OR LOWER(COALESCE(theme, '')) LIKE ?
        )
    `;
    
    const searchWildcard = `%${rawSearchQuery}%`;
    let params = [gameData, searchWildcard, searchWildcard, searchWildcard];

    // Player filter
    if (players !== "") {
        sqlQuery += ` AND [max-players] IS NOT NULL AND [max-players] >= ?`;
        params.push(parseInt(players, 10));
    }

    // NEW: Complexity filter (safely validated against allowed operators)
    if (complexityValInput !== "") {
        const allowedOps = ['<', '<=', '=', '>=', '>'];
        // Default to '<=' if an invalid operator slips through
        const safeOp = allowedOps.includes(complexityOp) ? complexityOp : '<=';
        
        sqlQuery += ` AND [complexity / 5] IS NOT NULL AND [complexity / 5] ${safeOp} ?`;
        params.push(parseFloat(complexityValInput));
    }

    // Owner filter
    if (owner !== "") {
        sqlQuery += ` AND owner = ?`;
        params.push(owner);
    }

    sqlQuery += ` ORDER BY game ASC`;

    const results = alasql(sqlQuery, params);
    renderTable(results);
}

function filterGames2() {
    const nameQuery = document.getElementById('searchName').value.toLowerCase();
    const maxPlayersInput = document.getElementById('maxPlayersFilter').value;
    const owner = document.getElementById('filterOwner').value;

    // Base SQL query
    let sqlQuery = `
        SELECT * FROM ? 
        WHERE LOWER(game) LIKE ? 
    `;
    
    let params = [gameData, `%${nameQuery}%`];

    // FIX: Only add the max-players condition if a valid number was actually entered
    if (maxPlayersInput !== "") {
        const parsedMax = parseInt(maxPlayersInput, 10);
        // We check that max-players is not empty/null and is greater than or equal to the input
        sqlQuery += ` AND max-players !== "" AND CAST(max-players AS INT) >= ?`;
        params.push(parsedMax);
    }

    if (owner) {
        sqlQuery += ` AND owner = ?`;
        params.push(owner);
    }

    sqlQuery += ` ORDER BY game ASC`;

    const results = alasql(sqlQuery, params);
    renderTable(results);
}

function renderTable(data) {
    const tbody = document.getElementById('resultsBody');
    tbody.innerHTML = '';

    if (data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;">No matching games found.</td></tr>`;
        return;
    }

    data.forEach(game => {
        // Format player range cleanly
        const minP = game['min-players'] !== null ? game['min-players'] : '?';
        const maxP = game['max-players'] !== null ? game['max-players'] : '?';
        const playerRange = `${minP} – ${maxP} players`;

        const imgSrc = game['bgg-img'] && game['bgg-img'].trim() !== "" 
            ? game['bgg-img'] 
            : 'https://via.placeholder.com/50?text=No+Img';
        const bggUrl = game['bgg-id'] || '#';

        // Complexity color styling (< 3 is green, >= 3 is red)
        const complexityVal = game['complexity / 5'];
        let complexityHtml = 'N/A';

        if (complexityVal !== null && !isNaN(complexityVal)) {
            const cssClass = complexityVal < 3 ? 'complexity-low' : 'complexity-high';
            complexityHtml = `<span class="${cssClass}">${complexityVal.toFixed(2)}</span>`;
        }

        const row = `<tr>
            <td>
                <a href="${bggUrl}" target="_blank">
                    <img src="${imgSrc}" alt="${escapeHtml(game.game)}" class="game-thumbnail">
                </a>
            </td>
            <td><a href="${bggUrl}" target="_blank">${escapeHtml(game.game)}</a></td>
            <td>${escapeHtml(game.owner)}</td>
            <td>${escapeHtml(game.genre || 'N/A')}</td>
            <td>${playerRange}</td>
            <td>${complexityHtml}</td>
        </tr>`;
        tbody.innerHTML += row;
    });
}

function escapeHtml(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function renderTable3(data) {
    const tbody = document.getElementById('resultsBody');
    tbody.innerHTML = '';

    if (data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;">No matching games found.</td></tr>`;
        return;
    }

    data.forEach(game => {
        // Format player range cleanly
        const minP = game['min-players'] !== null ? game['min-players'] : '?';
        const maxP = game['max-players'] !== null ? game['max-players'] : '?';
        const playerRange = `${minP} – ${maxP}`;

        // Handle missing image links gracefully with a fallback or blank space
        const imgSrc = game['bgg-img'] && game['bgg-img'].trim() !== "" 
            ? game['bgg-img'] 
            : 'https://via.placeholder.com/50?text=No+Img';

        const bggUrl = game['bgg-id'] || '#';

        const row = `<tr>
            <td>
                <a href="${bggUrl}" target="_blank">
                    <img src="${imgSrc}" alt="${escapeHtml(game.game)}" class="game-thumbnail">
                </a>
            </td>
            <td><a href="${bggUrl}" target="_blank">${escapeHtml(game.game)}</a></td>
            <td>${escapeHtml(game.owner)}</td>
            <td>${escapeHtml(game.genre || 'N/A')}</td>
            <td>${playerRange}</td>
            <td>${game['complexity / 5'] || 'N/A'}</td>
        </tr>`;
        tbody.innerHTML += row;
    });
}

function renderTable2(data) {
    const tbody = document.getElementById('resultsBody');
    tbody.innerHTML = '';

    if (data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;">No matching games found.</td></tr>`;
        return;
    }

    data.forEach(game => {
        // Format player range cleanly (handles missing values gracefully)
        const minP = game['min-players'] !== "" ? game['min-players'] : '?';
        const maxP = game['max-players'] !== "" ? game['max-players'] : '?';
        const playerRange = `${minP} - ${maxP}`;

        const row = `<tr>
            <td><a href="${game['bgg-id']}" target="_blank">${escapeHtml(game.game)}</a></td>
            <td>${escapeHtml(game.owner)}</td>
            <td>${escapeHtml(game.genre || 'N/A')}</td>
            <td>${playerRange}</td> <!-- Displays the full range here -->
            <td>${game['complexity / 5'] || 'N/A'}</td>
        `;
        tbody.innerHTML += row;
    });
}

function unsafeHtml(str) { return str; } // or use a basic sanitizer
function escapeHtml(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Initialize on page load
window.onload = initApp;