let extensionConfiguration = {
  apiEndpoint: 'https://romonitorstats.com/api/v1/',
  activePlaceID: null,
  apiExtensionEndpoint: null, 
  apiFeaturedGamesEndpoint: null
};

extensionConfiguration.apiExtensionEndpoint = extensionConfiguration.apiEndpoint + "extension/";
extensionConfiguration.apiFeaturedGamesEndpoint = extensionConfiguration.apiEndpoint + "stats/featured-games/get/";

let loadingStore = {
  socialGraph: false,
};

let pageDictionary = {
  noPage: 0,
  tabs: 1,
  home: 2
};

let gameData = null;
let socialGraphData = null;
let nameChangesGraphData = null;

let homeData = null;

const poweredBy = `Powered by <a href="https://romonitorstats.com/" class="text-link">RoMonitor Stats</a>`

window.addEventListener('load', async function () {
  // Result of prefab check indicates which type of page we are on. 
  const check_id = await prefabChecks();

  if (check_id == pageDictionary.tabs) {
    buildTabs();
  } else if (check_id == pageDictionary.home) {
    buildHomeSearch();
  }
});

async function prefabChecks() {
  /** Check we're on a Roblox games page */
  if (window.location.pathname.match(/\/games\/.*/)) {
    extensionConfiguration.activePlaceID = document.querySelector("#game-detail-page").dataset.placeId;

    return await postData({ game: extensionConfiguration.activePlaceID })
      .then((data) => {
        if (data && data.success) {
          const tabFixCss = '.rbx-tab { width: 25% !important };';
          const styleElement = document.createElement('style');
          document.head.appendChild(styleElement);
          styleElement.type = 'text/css';
          styleElement.appendChild(document.createTextNode(tabFixCss));

          gameData = data;

          // Let the caller know that we are on a tab page. 
          return pageDictionary.tabs
        } else if (data && !data.success && data.message && data.code) {
          createRobloxError(data.message, data.icon, data.code);
        }

        return pageDictionary.noPage;
      });
  }
  /** Check if we are on the home page */
  else if (window.location.pathname.match(/\/home/)) {
    return await getData(extensionConfiguration.apiFeaturedGamesEndpoint).then((data) => {
      if (data) {
        homeData = data

        // Let the caller know that we are on a home page. 
        return pageDictionary.home;
      } 

      // For the home page, if there was an error then we do nothing. 
      return pageDictionary.noPage;
    });
  }

  return false;
}

function romonitorResponseHandler(response) {
  if (response.status === 429) {
    this.createRobloxError("You're sending too many requests to RoMonitor Stats");
    return;
  } else if (response.status === 500) {
    this.createRobloxError('RoMonitor Stats hit an exception, our monitoring tool has logged this');
    return;
  } else if (response.status === 404) {
    this.createRobloxError('The RoMonitor Stats extension endpoint is not available');
    return;
  } else if (response.status === 502) {
    this.createRobloxError('RoMonitor Stats is currently undergoing maintainance');
    return;
  } else if (response.status === 422) {
    this.createRobloxError('Invalid request sent to RoMonitor Stats');
    return;
  }
  return response.json();
}

function romonitorErrorHandler(error) {
  this.createRobloxError('Unable to contact RoMonitor Stats');
  Promise.reject(error);
}

async function postData(data = {}) {
  return await fetch(extensionConfiguration.apiExtensionEndpoint + 'get', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  })
    .then((response) => romonitorResponseHandler(response))
    .catch((error) => romonitorErrorHandler(error));
}

async function getData(uri) {
  return await fetch(uri, ).then((response) => romonitorResponseHandler(response)).catch((error) => romonitorErrorHandler(error))
}

function createRobloxError(message, icon = 'icon-warning', code = null) {
  const tabContainer = document.getElementsByClassName('col-xs-12 rbx-tabs-horizontal')[0];
  const messageBanner = document.createElement('div');
  
  messageBanner.classList.add('message-banner');
  messageBanner.innerHTML = `<span class="${icon}"></span> ${message}`;
  messageBanner.style = 'margin-bottom: 1em; margin-top: 1em;';
  tabContainer.insertBefore(messageBanner, tabContainer.firstChild);
}

function getTabs() {
  return [
    {
      title: 'Stats',
      id: 'stats',
    },
    {
      title: 'Milestones',
      id: 'milestones',
    },
    {
      title: 'Social Graph',
      id: 'social-graph',
    },
    {
      title: 'Name Changes',
      id: 'name-changes',
    },
    {
      title: 'RoMonitor Stats',
      id: 'go-to-stats',
      href: `https://romonitorstats.com/experience/${extensionConfiguration.activePlaceID}/?utm_source=roblox&utm_medium=extension&utm_campaign=extension_leadthrough`,
      target: '_blank',
    }
  ];
}

function buildTabs() {
  lastAddedTab = null;

  getTabs().forEach((tab) => {
    var gameNavigationTabs = document.getElementById("horizontal-tabs");
    var newTab = gameNavigationTabs.lastElementChild.cloneNode(true);
    var tabTitle = newTab.getElementsByClassName('text-lead')[0];

    tabTitle.textContent = tab.title;
    newTab.classList.remove("tab-game-instances");
    newTab.classList.add(`tab-${tab.id}`);
    newTab.id = `tab-${tab.id}`;
    newTab.firstElementChild.href = tab.href ? tab.href : `#${tab.id}`;

    if (tab.target) {
      newTab.firstElementChild.target = tab.target;
    }

    gameNavigationTabs.appendChild(newTab);

    if (lastAddedTab) {
      newTab.classList.remove(`tab-${lastAddedTab}`);
    }

    lastAddedTab = tab.id;

    if (!tab.href) {
      var firstTabContent = document.getElementById('about').cloneNode(true);
      firstTabContent.id = tab.id;
      firstTabContent.classList.add(tab.id);
      firstTabContent.innerHTML = '';

      document.getElementsByClassName("rbx-tab-content")[0].appendChild(firstTabContent);
      firstTabContent.classList.remove("active");

      const containerHeader = document.createElement('div');
      containerHeader.classList.add('container-header');
      const poweredByHtml = 
      containerHeader.innerHTML = `<h3>${tab.title}</h3><br><div class="text-secondary" style="margin-top: 1em;">${poweredBy}</div>`;
      firstTabContent.appendChild(containerHeader);
    }

    /** The following are lightweight queries to our servers, so we build these to make the tabs load faster, others are dynamically injected. */
    if (tab.title === 'Milestones') {
      buildMilestonesTab();
    } else if (tab.title === 'Stats') {
      buildStatsTab();
    }

    if (!tab.href) {
      addTabListener(newTab, firstTabContent)
    }
  });

  /** Adds event listeners to the default Roblox tabs */
  const baseRobloxTabs = ['about', 'store', 'game-instances'];
  baseRobloxTabs.forEach((tab) => {
    const tabElement = document.getElementById(`tab-${tab}`);

    addTabListener(tabElement, document.getElementById(tab));
  });
}

function addTabListener(tab, aboutContent) {
  tab.addEventListener('click', function () {
    removeAllTabActiveStates();

    if (tab.id === 'tab-social-graph' || tab.id === 'tab-name-changes') {
      if (tab.id === 'tab-social-graph' && socialGraphData) {
        if (socialGraphData) {
          return;
        } else {
          loadingStore.socialGraph = true;
        }
      }

      if (tab.id === 'tab-name-changes' && nameChangesGraphData) {
        if (nameChangesGraphData) {
          return;
        } else {
          loadingStore.nameChangesGraph = true;
        }
      }

      const socialGraphContainer = document.getElementsByClassName(`tab-pane ${tab.id.replace('tab-', '')}`)[0];
      const loaderElement = document.createElement('span');
      loaderElement.id = `${tab.id.replace('tab-', '')}-loader`;
      loaderElement.classList.add('spinner');
      loaderElement.classList.add('spinner-default');

      socialGraphContainer.appendChild(loaderElement);

      if (tab.id === 'tab-social-graph') {
        tab.id = 'socialGraph';
      } else if (tab.id === 'tab-name-changes') {
        tab.id = 'nameChanges';
      }

      postData({ game: extensionConfiguration.activePlaceID, tab: tab.id })
        .then((data) => {
          if (data.success) {
            if (tab.id === 'socialGraph') {
              socialGraphData = data['data'];
              buildSocialGraphTab();
              loadingStore.socialGraph = false;
            } else if (tab.id === 'nameChanges') {
              nameChangesGraphData = data['data'];
              buildNameChangesTab();
              loadingStore.nameChangesGraphData = false;
            }
          } else if (data && !data.success && data.message) {
            createRobloxError(data.message, data.icon);
          }
        });
    }

    aboutContent.style.display = "block";
    tab.classList.add('active');
  }, false);
}

function removeAllTabActiveStates() {
  NodeList.prototype[Symbol.iterator] = Array.prototype[Symbol.iterator];
  HTMLCollection.prototype[Symbol.iterator] = Array.prototype[Symbol.iterator];
  for (const tab of document.getElementById('horizontal-tabs').children) {
    tab.classList.remove('active');
  }

  for (const tabContainer of document.getElementsByClassName("tab-pane")) {
    tabContainer.style.removeProperty('display');
    tabContainer.classList.remove('active');
  }
}

function buildStatsTab() {
  const statsContainer = document.getElementsByClassName('tab-pane stats');
  const flexboxContainer = document.createElement('div');
  flexboxContainer.style = 'display: flex; flex-wrap: wrap;';

  /** Set Rating Card -- We use the data already on the games page for this */
  const upVotes = Number(document.getElementsByClassName('count-left')[0].firstElementChild.title)
  const downVotes = Number(document.getElementsByClassName('count-right')[0].firstElementChild.title)
  gameData.stats.items.push({
    title: 'Rating',
    copy: `${(upVotes / (upVotes + downVotes) * 100).toFixed(2)}%`,
  });

  gameData.stats.items.forEach((item) => {
    const gridEntry = document.createElement('div');
    gridEntry.classList.add('romonitor-grid-item');
    gridEntry.innerHTML = `<h2 style="
    text-align: center;
">${item.copy}</h2>
    <p style="
    text-align: center;
">${item.title}</p>`
    flexboxContainer.appendChild(gridEntry);
  });

  statsContainer[0].appendChild(flexboxContainer);
}

function buildMilestonesTab() {
  const milestonesContainer = document.getElementsByClassName('tab-pane milestones');
  const milestonesTable = document.createElement('table');
  milestonesTable.classList.add('table');
  milestonesTable.classList.add('table-striped');
  milestonesTable.innerHTML = '<thead><tr><th class="text-label">Milestone</th><th class="text-label">Achived</th><th class="text-label">Tweets</th></tr></thead><tbody id="milestones-table"></tbody>';

  if (!Object.keys(gameData.milestones).length) {
    const messageBanner = document.createElement('div');

    messageBanner.classList.add('message-banner');
    messageBanner.innerHTML = `<span class="icon-warning"></span> This game has no tracked milestones`;
    messageBanner.style = 'margin-bottom: 1em; margin-top: 1em;';
    milestonesContainer[0].appendChild(messageBanner);

    return;
  }

  milestonesContainer[0].appendChild(milestonesTable);

  Object.keys(gameData.milestones).reverse().forEach((milestoneIndex) => {
    const milestone = gameData.milestones[milestoneIndex];
    const milestoneEntry = document.createElement('tr');

    const svg = `<a href="${milestone.tweet}" target="_blank"><svg class="romonitor-milestone-social-item" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="#1DA1F2" d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/></svg></a></div>`

    milestoneEntry.innerHTML = `<td>${milestone.value} ${milestone.type}</td><td>${milestone.achieved}</td><td class="romonitor-tableitem">${svg}</td>`;

    document.getElementById('milestones-table').appendChild(milestoneEntry);
  });
}

function buildNameChangesTab() {
  document.getElementById('name-changes-loader').remove();
  const nameChangesContainer = document.getElementsByClassName('tab-pane name-changes');
  const nameChangesTable = document.createElement('table');
  nameChangesTable.classList.add('table');
  nameChangesTable.classList.add('table-striped');
  nameChangesTable.innerHTML = '<thead><tr><th class="text-label">Name</th><th class="text-label">Changed</th></tr></thead><tbody id="name-changes-table"></tbody>';

  if (!Object.keys(nameChangesGraphData).length) {
    const messageBanner = document.createElement('div');

    messageBanner.classList.add('message-banner');
    messageBanner.innerHTML = `<span class="icon-warning"></span> This game has no tracked name changes`;
    messageBanner.style = 'margin-bottom: 1em; margin-top: 1em;';
    nameChangesContainer[0].appendChild(messageBanner);

    return;
  }
  const limitWarning = document.createElement('div');
  limitWarning.classList.add('text-label');
  limitWarning.innerHTML = 'Showing the Last 10 Name Changes';

  nameChangesContainer[0].appendChild(limitWarning);
  nameChangesContainer[0].appendChild(nameChangesTable);

  Object.keys(nameChangesGraphData).reverse().forEach((changeIndex) => {
    const nameChange = nameChangesGraphData[changeIndex];
    const changeEntry = document.createElement('tr');
    changeEntry.innerHTML = `<td>${nameChange.name}</td><td>${nameChange.changed}</td>`;

    document.getElementById('name-changes-table').appendChild(changeEntry);
  });
}

function buildSocialGraphTab() {
  document.getElementById('social-graph-loader').remove();
  const socialGraphContainer = document.getElementsByClassName('tab-pane social-graph');

  if (!socialGraphData.items) {
    const socialGraphMessageBanner = document.createElement('div');

    socialGraphMessageBanner.classList.add('message-banner');
    socialGraphMessageBanner.innerHTML = `<span class="icon-warning"></span> This game has no trackable social graph`;
    socialGraphMessageBanner.style = 'margin-bottom: 1em; margin-top: 1em;';
    socialGraphContainer[0].appendChild(socialGraphMessageBanner);
  } else {
    const flexboxContainer = document.createElement('div');

    flexboxContainer.style = 'display: flex; flex-wrap: wrap;';
    socialGraphData.items.forEach((item) => {
      const gridEntry = document.createElement('div');
      gridEntry.classList.add('romonitor-grid-item');
      gridEntry.innerHTML = `<h2 style="
      text-align: center;
  ">${item.copy}</h2>
      <p style="
      text-align: center;
  ">${item.title}</p>`
      flexboxContainer.appendChild(gridEntry);
    });

    socialGraphContainer[0].appendChild(flexboxContainer);
  }
}

function buildHomeSearch() {
  let container;
  
  // Perform a bunch of checks here to make sure the 
  // HTML looks like it is expected, to avoid extension breaking/doing 
  // weird things if webpage is updated in the future. 
  {
    let place_list = document.getElementById("place-list");

    if (!place_list) {
      return;
    }
    
    container = place_list.getElementsByClassName("game-home-page-container");
  }

  if (container.length != 1) {
    return;
  }
  container = container[0]
  if (container.nodeName != "DIV") {
    return;
  }

  // Once the search/carousel container is found, add our new search to the page. 
  container.insertBefore(buildCarousel(), container.children.item(2));
  container.insertBefore(buildHomePageTitle("Top Experiences", "https://romonitorstats.com/"), container.children.item(2));

  // Function puts the title/search in the correct place on the page. 
  updateHomePage(container);

  // Unfortunately since the DOM does not load consistently, sometimes the insertion happens 
  // before the other searches have loaded. To combat this, we add a MutationObserver which 
  // removes and adds the carousel/title every time the children of the container are updated
  // to ensure that our title/carousel is always in the same place. 
  const config = {
    childList: true 
  };

  const callback = function(mutations, observer) {
      const container = document.getElementById("place-list").getElementsByClassName("game-home-page-container")[0];
      const config = {
        childList: true 
      };

      observer.disconnect();
      updateHomePage(container);
      observer.observe(container, config);
  }

  const observer = new MutationObserver(callback); 
  observer.observe(container, config);
}

// Simply refreshes the page with our new element in a consistent location. 
function updateHomePage(container) {
  const title = document.getElementById("romonitor-title");
  const search = document.getElementById("romonitor-search");

  if (title) {
    container.removeChild(title);
  }
  if (search) {
    container.removeChild(search)
  }
  if (search) {
    container.insertBefore(search, container.children.item(2));
  }
  if (title) {
    container.insertBefore(title, container.children.item(2));
  }
  

}

function buildHomePageTitle(title, href) {
  let newTitle = document.createElement("div");
  newTitle.className = 'container-header';
  newTitle.innerHTML = `<h2>
                          <a href="${href}">
                            ${title} 
                          </a>
                        </h2>
                        <div class="btn-secondary-xs see-all-link-icon btn-more">
                          ${poweredBy}
                        </div>`;
  newTitle.id = "romonitor-title";
  return newTitle;
}

function buildCarousel() {
  let newCarousel = document.createElement("div");
  newCarousel.setAttribute("class", "game-carousel")
  newCarousel.setAttribute("data-testid", "game-game-carousel")
  newCarousel.id = "romonitor-search"

  // We loop just to make sure that the API has actually given us data
  const dataAry = [];
  let i = 0;
  while (homeData.length > i && i < 6) {
    dataAry.push(homeData[i]); 
    i++;
  }

  dataAry.forEach((game) => {
    newCarousel.appendChild(buildGameCard(
      "https://www.roblox.com/games/" + game.placeId, game.placeId, game.name, fixPercentage(game.rating), fixPlayCount(game.playing), game.icon
    ));
  });


  return newCarousel;
} 

function buildGameCard(href, id, title, votePercentage, playerCount, imgRef) {
  // Build the card up from elements that reflect the HTMl on the home page. 
  // Class attributes are used for consistency with the home page. 
  let cardContainer = document.createElement("div");
  cardContainer.setAttribute("class", "grid-item-container game-card-container");
  cardContainer.setAttribute("data-testid", "game-title");

  let anchor = document.createElement("a");
  cardContainer.appendChild(anchor);

  anchor.setAttribute("class", "game-card-link");
  anchor.setAttribute("href", `${href}`)
  anchor.setAttribute("id", `${id}`)

  let anchorChildren = [
    document.createElement("span"), // Image Holder
    document.createElement("div"), // Game Title
    document.createElement("div") // stats stuff
  ]
  anchorChildren.forEach((child) => anchor.appendChild(child));

  // Add the child image tag for the span. 
  const img = document.createElement("img");
  img.setAttribute("src", imgRef);
  img.setAttribute("alt", title);
  img.setAttribute("title", title);
  anchorChildren[0].appendChild(img);

  anchorChildren[0].setAttribute("class", "thumbnail-2d-container shimmer game-card-thumb-container");
  anchorChildren[1].setAttribute("class", "game-card-name game-name-title");
  anchorChildren[1].setAttribute("title", `${title}`);
  anchorChildren[1].innerHTML = title;
  anchorChildren[2].setAttribute("class", "game-card-info");
  anchorChildren[2].setAttribute("data-testid", "game-tile-stats");

  let cardInfoChildren = [
    document.createElement("span"), // votePercentageIcon 
    document.createElement("span"), // votePercentage 
    document.createElement("span"), // playCountIcon 
    document.createElement("span")  // playCount 
  ]
  cardInfoChildren.forEach((child) => anchorChildren[2].appendChild(child));

  cardInfoChildren[0].setAttribute("class", "info-label icon-votes-gray");
  cardInfoChildren[1].setAttribute("class", "info-label vote-percentage-label");
  cardInfoChildren[1].innerHTML = votePercentage; 
  cardInfoChildren[2].setAttribute("class", "info-label icon-playing-counts-gray");
  cardInfoChildren[3].setAttribute("class", "info-label playing-counts-label");
  cardInfoChildren[3].innerHTML = playerCount; 


  return cardContainer;
}

// Roblox home page has play count with k's, for example 1000 would be 1k. 
// Use this function to convert from an int to the required string version. 
function fixPlayCount(count) {
  if (count < 1000) {
    return toString(count);
  } 
  else if (count < 1000000) {
    return (Math.round(10 * count / 1000) / 10).toString() + "k"
  } 
  else {
    return (Math.round(10 * count / 1000000) / 10).toString() + "m"
  }
}

// Convert the 0-100 number to a percentage formatted in the same was as on the home page.
function fixPercentage(percentage) {
  return Math.round(percentage).toString() + "%"
}
