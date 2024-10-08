document.addEventListener('DOMContentLoaded', () => {
  const closeDivButton = document.querySelector('.collapse-div-btn');
  const sourceFilterDiv = document.querySelector('#sourceFilter');
  const monsterInput = document.getElementById('monsterInput');
  const searchButton = document.getElementById('searchButton');
  const monsterResult = document.getElementById('monsterResult');
  const notification = document.createElement('div');
  notification.classList.add('notification');
  document.body.appendChild(notification); // Notification element for user feedback
  let monsters = [];

  // Load the cashed list of monsters
  loadMonsters();
  // Load and apply selected monster sources
  loadSelectedSources();

  // Initialize Awesomplete
  const awesomplete = new Awesomplete(monsterInput, {
    minChars: 0,
    maxItems: 30,
    autoFirst: true,
    tabSelect: true,
  });

  // Utility function to show notifications
  function showNotification(message, duration = 3000) {
    notification.textContent = message;
    notification.classList.add('notification--unhide'); // Add class with display block to unhide

    setTimeout(() => {
      notification.classList.remove('notification--unhide'); // Remove unhide class list after timer
    }, duration);
  }

  // Fetching local JSON file with monster name, slug, ac and source tag for preloaded fuzzy search.
  async function loadMonsters() {
    try {
      const response = await fetch('data/monsters_summary.json');
      monsters = await response.json();
    } catch (error) {
      console.error('Error loading monsters:', error);
      monsterResult.innerHTML = 'Error loading monster list';
    }
  }

  // Utility function to get selected sources from checkboxes
  function getSelectedSources() {
    const checkboxes = sourceFilter.querySelectorAll('input[type="checkbox"]');
    const selected = Array.from(checkboxes)
      .filter((checkbox) => checkbox.checked)
      .map((checkbox) => checkbox.value);

    // If "all" is selected, ignore other sources
    if (selected.includes('all')) {
      return ['all'];
    }

    return selected;
  }

  // Uncheck 'all' when other sources are selected and opposite
  sourceFilter.addEventListener('change', (event) => {
    const allCheckbox = sourceFilter.querySelector('input[value="all"]');

    if (event.target.value !== 'all' && event.target.checked) {
      allCheckbox.checked = false;
    }

    if (event.target.value === 'all' && event.target.checked) {
      const checkboxes = sourceFilter.querySelectorAll(
        'input[type="checkbox"]'
      );
      checkboxes.forEach((checkbox) => {
        if (checkbox.value !== 'all') {
          checkbox.checked = false;
        }
      });
    }

    // Save selected sources and show notifications
    saveSelectedSources();
  });

  // Save selected sources to local storage
  function saveSelectedSources() {
    const selectedSources = getSelectedSources();
    localStorage.setItem('selectedSources', JSON.stringify(selectedSources));
    showNotification('Master, I have saved your selected sources.');
  }

  // Load saved source on page load
  function loadSelectedSources() {
    const savedSources =
      JSON.parse(localStorage.getItem('selectedSources')) || [];
    const checkboxes = sourceFilter.querySelectorAll('input[type="checkbox"]');
    const allCheckbox = sourceFilter.querySelector('input[value="all"]');

    // Checking the boxes that match the saved sources
    checkboxes.forEach((checkbox) => {
      if (savedSources.includes(checkbox.value)) {
        checkbox.checked = true;
      }
    });

    // If specific sources are selected, uncheck 'all'
    if (savedSources.length > 0 && !savedSources.includes('all')) {
      allCheckbox.checked = false;
    }

    // Showing notification if sources were loaded from localStorage
    if (savedSources.length > 0) {
      showNotification(
        'Welcome back master! I have applied your previous choices'
      );
    }
  }

  // Fuzzy search with Awesomplete for autocomplete, with source filtering
  monsterInput.addEventListener('input', () => {
    const selectedSources = getSelectedSources();

    // Filter monsters by selected sources
    const filteredMonsters = monsters.filter((monster) => {
      // If 'all' is selected or no source is selected, return all monsters
      if (selectedSources.includes('all')) return true;
      return selectedSources.includes(monster.source);
    });

    const fuse = new Fuse(filteredMonsters, {
      keys: ['name'], // Customize fields used for fuzzy search
      threshold: 0.3, // Adjust threshold for match sensitivity
    });

    const results = fuse.search(monsterInput.value).map((result) => ({
      label: `${result.item.name} (${result.item.source}) (CR: ${result.item.challenge_rating})`, // Display name + source in suggestions
      value: result.item.name, // Use only the name for selection
    }));

    awesomplete.list = results;

    // Use Awesomplete’s built-in function to replace the input value with the actual name
    awesomplete.replace = function (suggestion) {
      // Set the monster input value to the suggestion value (name only)
      monsterInput.value = suggestion.value;
    };
  });

  // Clear all checkboxes except 'all' when uncheckAllBtn is clicked
  uncheckAllBtn.addEventListener('click', () => {
    const checkboxes = sourceFilter.querySelectorAll('input[type="checkbox"');
    checkboxes.forEach((checkbox) => {
      checkbox.checked = false;
    });

    // Recheck 'all'
    const allCheckbox = sourceFilter.querySelector('input[value="all"]');
    allCheckbox.checked = true;

    saveSelectedSources();
    showNotification('All filters banished, Master!');

    // Reset the autocomplete and search
    monsterInput.value = '';
    awesomplete.list = [];
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
      <h3 class="spell-name">${spellData.name}</h3>
      <hr/>
      <p><strong>School:</strong> ${spellData.school.name}</p>
      <p><strong>Description:</strong> ${spellData.desc}</p>
    </div>
    `;
    document.getElementById('spellResult').innerHTML = spellBlock;
  }

  // Function for replacing Markdown with HTML
  function formatMarkdownToHtml(text) {
    if (!text) return '';
    // Bold: Replace ** with <strong>
    text = text.replaceAll(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    // italics: Replace _ with <em>
    text = text.replaceAll(/_(.*?)_/g, '<em>$1</em>');
    // Line break: Replace \n with <br> or dividing into paragraphs
    text = text.replaceAll(/\n/g, '</p><p>');

    return text;
  }

  // Render detailed monster data
  function renderMonsterDetails(monsterData) {
    console.log(monsterData);
    const armorClass = `${monsterData.armor_class} (${formatMarkdownToHtml(monsterData.armor_desc) || 'natural armor'})`;
    const imageUrl = monsterData.img_main ? monsterData.img_main : '';
    const actions = monsterData.actions || [];
    const legendaryActions = monsterData.legendary_actions || [];
    const specialAbilities = monsterData.special_abilities || [];
    const spellList = monsterData.spell_list || [];
    const description = formatMarkdownToHtml(monsterData.desc) || [];
    const dndBeyondSearch =
      monsterData.document__slug === 'wotc-srd'
        ? `<a href="https://www.dndbeyond.com/search?q=${monsterData.name}">Search for ${monsterData.name} on D&D Beyond</a>`
        : '';
    const source = monsterData.document__title;
    const pageNumber = monsterData.page_no ? monsterData.page_no : '';

    const statBlockHtml = `
      <div class="monster-stat-block">
          <h2 class="monster-name">${monsterData.name}</h2>
          <p>${monsterData.size} ${monsterData.type}, ${monsterData.alignment}</p>
          ${imageUrl ? `<img src="${imageUrl}" alt="${monsterData.name}" class="monster-image">` : ''}
          <div class="monster-basic-info">
          <!-- <p><strong>Source:</strong> ${monsterData.document__slug}</p> -->
          <p><strong>Armor Class:</strong> ${armorClass}</p>
          <p><strong>Hit Points:</strong> ${monsterData.hit_points} (${monsterData.hit_dice})</p>
          <p><strong>Speed:</strong> ${monsterData.speed.walk || '0'} ft${monsterData.speed.fly ? `, fly ${monsterData.speed.fly} ft` : ''}${monsterData.speed.swim ? `, swim ${monsterData.speed.swim} ft` : ''}</p>
          <p><strong>Challenge Rating:</strong> ${monsterData.challenge_rating}</p>
        </div>

        <div class="monster-abilities">
          <h3>Abilities</h3>
          <hr/>
          <div class="ability-table">
            <div class="ability">
              <p>STR</p>
              <p class="ability-score">${monsterData.strength}</p>
              <p class="ability-mod">${Math.floor((monsterData.strength - 10) / 2)}</p>
            </div>
            <div class="ability">
              <p>DEX</p>
              <p class="ability-score">${monsterData.dexterity}</p>
              <p class="ability-mod">${Math.floor((monsterData.dexterity - 10) / 2)}</p>
            </div>
            <div class="ability">
              <p>CON</p>
              <p class="ability-score">${monsterData.constitution}</p>
              <p class="ability-mod">${Math.floor((monsterData.constitution - 10) / 2)}</p>
            </div>
            <div class="ability">
              <p>INT</p>
              <p class="ability-score">${monsterData.intelligence}</p>
              <p class="ability-mod">${Math.floor((monsterData.intelligence - 10) / 2)}</p>
            </div>
            <div class="ability">
              <p>WIS</p>
              <p class="ability-score">${monsterData.wisdom}</p>
              <p class="ability-mod">${Math.floor((monsterData.wisdom - 10) / 2)}</p>
            </div>
            <div class="ability">
              <p>CHA</p>
              <p class="ability-score">${monsterData.charisma}</p>
              <p class="ability-mod">${Math.floor((monsterData.charisma - 10) / 2)}</p>
            </div>
          </div>
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
          ${monsterData.senses ? `<p><strong>Senses:</strong> ${monsterData.senses}</p>` : 'No description'}
          ${monsterData.languages ? `<p><strong>Languages:</strong> ${monsterData.languages}</p>` : ''}
        </div>

        <div class="monster-actions">
          <h3>Actions</h3>
          <hr/>
          <ul>
            ${actions.map((action) => `<li><strong>${action.name}:</strong> ${action.desc}</li>`).join('')}
          </ul>
        </div>

        ${
          specialAbilities.length > 0
            ? `
          <div class="monster-special-abilities">
            <h3>Special Abilities</h3>
            <hr/>
            <ul>
              ${specialAbilities.map((ability) => `<li><strong>${ability.name}:</strong> ${formatMarkdownToHtml(ability.desc)}</li>`).join('')}
            </ul>
          </div>
          `
            : ''
        }

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
            <h3>Spells</h3>
            <hr/>
              <div class="spell-list">
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

        ${
          monsterData.desc
            ? `
            <div class="monster-basic-info">
              <h3>Description</h3>
              <hr/>
              <p>${formatMarkdownToHtml(description)}</p>
            </div>`
            : ''
        }

        ${
          monsterData.document__title
            ? `
            <div class="monster-basic-info">
              <h3>Source</h3>
              <hr>
              <p>${source + ', page nr. ' + pageNumber}</p>
              <p>${dndBeyondSearch}</p>
            </div>`
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
  // Script for collapsing sources
  closeDivButton.addEventListener('click', () => {
    sourceFilterDiv.classList.toggle('revealed');

    if (sourceFilterDiv.classList.contains('revealed')) {
      closeDivButton.textContent = 'Hide the monster sources';
    } else {
      closeDivButton.textContent = 'Show the monster sources';
    }
  });
});
