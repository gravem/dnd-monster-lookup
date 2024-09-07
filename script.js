document.addEventListener('DOMContentLoaded', () => {
  const monsterInput = document.getElementById('monsterInput');
  const searchButton = document.getElementById('searchButton');
  const monsterResult = document.getElementById('monsterResult');
  let monsters = [];
  // let selectedSource = '5e SRD'; // Example source. 🚧 To be selectable by user

  // Initialize Awesomplete
  const awesomplete = new Awesomplete(monsterInput, {
    minChars: 0,
    maxItems: 30,
    autoFirst: true,
    tabSelect: true,
  });

  // Fetching local JSON file with monster name, slug, ac and source tag.
  async function loadMonsters() {
    try {
      const response = await fetch('public/data/monsters_summary.json');
      monsters = await response.json();
      console.log('Monsters loaded:', monsters);
    } catch (error) {
      console.error('Error loading monsters:', error);
      monsterResult.innerHTML = 'Error loading monster list';
    }
  }

  loadMonsters();

  // Fuzzy search for autocomplete
  monsterInput.addEventListener('input', () => {
    const fuse = new Fuse(monsters, {
      keys: ['name'], // Customize fields used for fuzzy search
      threshold: 0.3, // Adjust threshold for match sensitivity
    });
    const results = fuse
      .search(monsterInput.value)
      .map((result) => result.item.name);

    console.log('Search results:', results); // Check if search results are populated correctly
    // Ensure Awesomplete list is updated properly
    awesomplete.list = results;
  });

  // Add event listener for search button
  searchButton.addEventListener('click', () => {
    const monsterName = monsterInput.value.trim().toLowerCase();
    if (monsterName) {
      const matchedMonster = monsters.find(
        (monster) => monster.name.toLowerCase() === monsterName
      );

      if (matchedMonster) {
        fetchMonsterDetails(matchedMonster.slug); // fetch details using slug
      } else {
        monsterResult.innerHTML = 'Monster not found.';
      }
    } else {
      monsterResult.innerHTML = 'Please enter a monster name.';
    }
  });

  // Fetch detailed monster data using slug from Open5e API
  async function fetchMonsterDetails(slug) {
    showLoading(slug); // Show loading message
    try {
      const monsterUrl = `https://api.open5e.com/v1/monsters/${slug}/`;
      console.log(monsterUrl);
      const response = await axios.get(monsterUrl);
      renderMonsterDetails(response.data);
    } catch (error) {
      console.error('Error fetching monster details:', error);
      monsterResult.innerHTML = 'Error fetching monster details.';
    }
  }

  // Function to handle spell fetching and display name + description
  async function fetchSpellDetails(spellUrl) {
    try {
      // Correcting the spell URL if necessary
      const correctedSpellUrl = await correctSpellUrl(spellUrl);
      const response = await axios.get(correctedSpellUrl);
      const spellData = response.data;

      // Display spell name and description
      displaySpellDetails(spellData);
    } catch (error) {
      console.error('Error fetching spell details:', error);
    }
  }

  // Function to correct spell URL by adding the missing 'a5e-ag_' prefix
  // Might not work for spells that comes from another source.
  async function correctSpellUrl(spellUrl) {
    if (!spellUrl.includes('a5e-ag_')) {
      const spellKey = spellUrl.split('/spells/')[1]; // Extract the spell name
      console.log(spellKey);
      console.log(`https://api.open5e.com/v2/spells/a5e-ag_${spellKey}`);
      return `https://api.open5e.com/v2/spells/a5e-ag_${spellKey}`;
    }
    return spellUrl; // Return original spell URL if already correct.
  }

  // Function to handle spell name and description
  function displaySpellDetails(spellData) {
    const spellBlock = `
    <div class="spell-stat-block">
      <h3>${spellData.name}</h3>
      <p><strong>School:</strong> ${spellData.school.name}</p>
      <p><strong>Description:</strong> ${spellData.desc}</p>
    </div>
    `;
    document.getElementById('spellResult').innerHTML = spellBlock;
  }

  // Render detailed monster data
  function renderMonsterDetails(monsterData) {
    const armorClass = `${monsterData.armor_class} (${monsterData.armor_desc || 'natural armor'})`;
    const imageUrl = monsterData.img_main ? monsterData.img_main : '';
    const actions = monsterData.actions || [];
    const legendaryActions = monsterData.legendary_actions || [];
    const spellList = monsterData.spell_list || [];

    const statBlockHtml = `
      <div class="monster-stat-block">
        <h2 class="monster-name">${monsterData.name}</h2>
        ${imageUrl ? `<img src="${imageUrl}" alt="${monsterData.name}" class="monster-image">` : ''}

        <p><strong>Type:</strong> ${monsterData.size} ${monsterData.type}, ${monsterData.alignment}</p>
        <p><strong>Armor Class:</strong> ${armorClass}</p>
        <p><strong>Hit Points:</strong> ${monsterData.hit_points} (${monsterData.hit_dice})</p>
        <p><strong>Speed:</strong> ${monsterData.speed.walk || '0'} ft${monsterData.speed.fly ? `, fly ${monsterData.speed.fly} ft` : ''}${monsterData.speed.swim ? `, swim ${monsterData.speed.swim} ft` : ''}</p>
        <p><strong>Challenge Rating:</strong> ${monsterData.challenge_rating}</p>

        <div class="monster-abilities">
          <h3>Abilities</h3>
          <p><strong>STR:</strong> ${monsterData.strength}, <strong>DEX:</strong> ${monsterData.dexterity}, <strong>CON:</strong> ${monsterData.constitution}</p>
          <p><strong>INT:</strong> ${monsterData.intelligence}, <strong>WIS:</strong> ${monsterData.wisdom}, <strong>CHA:</strong> ${monsterData.charisma}</p>
        </div>

        <div class="monster-skills">
          ${
            monsterData.skills
              ? `<p><strong>Skills:</strong> ${Object.entries(
                  monsterData.skills
                )
                  .map(([skill, value]) => `${skill} +${value}`)
                  .join(', ')}</p>`
              : ''
          }
          ${monsterData.senses ? `<p><strong>Senses:</strong> ${monsterData.senses}</p>` : ''}
          ${monsterData.languages ? `<p><strong>Languages:</strong> ${monsterData.languages}</p>` : ''}
        </div>

        <div class="monster-actions">
          <h3>Actions</h3>
          <ul>
            ${actions.map((action) => `<li><strong>${action.name}:</strong> ${action.desc}</li>`).join('')}
          </ul>
        </div>

        ${
          legendaryActions.length > 0
            ? `
        <div class="monster-legendary-actions">
          <h3>Legendary Actions</h3>
          <ul>
            ${legendaryActions.map((action) => `<li><strong>${action.name}:</strong> ${action.desc}</li>`).join('')}
          </ul>
        </div>`
            : ''
        }

        ${
          spellList.length > 0
            ? `
        <div class="spell-list">
          <h3>Spells</h3>
          ${spellList
            .map(
              (spellUrl) =>
                `<button class="spell-btn" data-spell-url="${spellUrl}">${spellUrl.split('/spells/')[1].replaceAll('-', ' ').replace('/', '')}</button>`
            )
            .join('')}
        </div>
        <div id="spellResult"></div>`
            : ''
        }
      </div>
    `;

    monsterResult.innerHTML = statBlockHtml;

    // Attach event listeners for the spell buttons after they are rendered
    const spellButtons = document.querySelectorAll('.spell-btn');
    spellButtons.forEach((button) => {
      const spellUrl = button.getAttribute('data-spell-url');
      button.addEventListener('click', () => fetchSpellDetails(spellUrl));
    });
  }

  // loading text for user
  function showLoading(monsterName) {
    monsterResult.innerHTML = `<p>Chasing down ${monsterName}...</p>`;
  }
});
