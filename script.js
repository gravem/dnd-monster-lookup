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

  // Fetch the list of monsters once and store it
  // 🚧 ?source=${encodeURIComponent(selectedSource)}
  function fetchMonsters(url = 'https://api.open5e.com/v1/monsters/') {
    axios
      .get(url)
      .then((response) => {
        monsters = response.data.results;
        console.log('Fetched monsters list:', monsters);
        // Check if there is a next page
        if (response.data.next) {
          fetchMonsters(response.data.next);
        }
      })
      .catch((error) => {
        console.error('Error fetching monsters:', error);
        showError('Error fetching monster list.');
      });
  }

  fetchMonsters();

  // Add event listener for input to show suggestions from fuzzy search
  monsterInput.addEventListener('input', () => {
    const fuse = new Fuse(monsters, {
      keys: ['name'],
      threshold: 0.3,
    });
    const results = fuse
      .search(monsterInput.value)
      .map((result) => result.item.name);
    awesomplete.list = results;
  });

  // Add event listener for search button
  searchButton.addEventListener('click', () => {
    const monsterName = monsterInput.value.trim().toLowerCase();
    if (monsterName) {
      searchMonster(monsterName);
    } else {
      monsterResult.innerHTML = 'Please enter a monster name.';
    }
  });

  function searchMonster(monsterName) {
    showLoading(monsterName);
    const matchedMonster = monsters.find(
      (monster) => monster.name.toLowerCase() === monsterName
    );
    if (matchedMonster) {
      console.log('Matched monster:', matchedMonster);
      const monsterUrl = `https://api.open5e.com/v1/monsters/${matchedMonster.slug}/`;
      axios
        .get(monsterUrl)
        .then((monsterResponse) => {
          renderMonsterDetails(monsterResponse.data);
        })
        .catch((error) => {
          console.error('Error fetching monster details:', error);
          monsterResult.innerHTML = 'Error fetching monster details.';
        });
    } else {
      console.log(`${monsterName} not found`);
      showError('Monster not found');
    }
  }

  function renderMonsterDetails(monsterData) {
    // Handle armor class
    const armorClass = Array.isArray(monsterData.armor_class)
      ? monsterData.armor_class
          .map((ac) => `${ac.value} (${ac.type})`)
          .join(', ')
      : monsterData.armor_class;

    console.log(armorClass);

    // Handle image
    const imageUrl = monsterData.image
      ? `https://api.open5e.com${monsterData.image}`
      : '';

    monsterResult.innerHTML = `
            <h2>${monsterData.name}</h2>
            <p><strong>Size:</strong> ${monsterData.size}</p>
            <p><strong>Armor Class:</strong> ${armorClass}</p>
            <p><strong>HP:</strong> ${monsterData.hit_points}</p>
            <p><strong>Speed:</strong> ${monsterData.speed.walk} ft</p>
            ${imageUrl ? `<img src="${imageUrl}" alt="${monsterData.name}" class="monster-image">` : ''}
          `;
  }

  // loading text for user
  function showLoading(monsterName) {
    monsterResult.innerHTML = `<p>Chasing down ${monsterName}...</p>`;
  }

  // Handling missing monster
  function showError(message) {
    monsterResult.innerHTML = `<p class='error'>${message}</p>`;
  }
});
