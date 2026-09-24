const game = {
  players: [],
  impostors: [],
  category: "",
  word: "",
  currentPlayer: 0,
  selectedVote: null,
};

let hasRevealed = false;
let isHolding = false;

const PLAYER_STORAGE_KEY = "whosTheImpostorPlayers";

/* =========================================================
   DOM ELEMENTS
========================================================= */

const setupScreen = document.getElementById("setup-screen");

const revealScreen = document.getElementById("reveal-screen");

const discussionScreen = document.getElementById("discussion-screen");

const votingScreen = document.getElementById("voting-screen");

const resultScreen = document.getElementById("result-screen");

const playersList = document.getElementById("players-list");

const playerCount = document.getElementById("player-count");

const addPlayerBtn = document.getElementById("add-player-btn");

const impostorCount = document.getElementById("impostor-count");

const startGameBtn = document.getElementById("start-game-btn");

const currentPlayerName = document.getElementById("current-player-name");

const hiddenCard = document.getElementById("hidden-card");

const roleCard = document.getElementById("role-card");

const categoryText = document.getElementById("category-text");

const wordText = document.getElementById("word-text");

const nextPlayerBtn = document.getElementById("next-player-btn");

const startVotingBtn = document.getElementById("start-voting-btn");

const votingList = document.getElementById("voting-list");

const voteBtn = document.getElementById("vote-btn");

const resultStatus = document.getElementById("result-status");

const resultTitle = document.getElementById("result-title");

const impostorResult = document.getElementById("impostor-result");

const wordResult = document.getElementById("word-result");

const wordSpoiler = document.getElementById("word-spoiler");

const playAgainBtn = document.getElementById("play-again-btn");

/* =========================================================
   SCREEN MANAGEMENT
========================================================= */

function showScreen(screen) {
  const screens = [
    setupScreen,
    revealScreen,
    discussionScreen,
    votingScreen,
    resultScreen,
  ];

  screens.forEach((item) => {
    item.classList.remove("active");
  });

  screen.classList.add("active");

  window.scrollTo({
    top: 0,
    behavior: "smooth",
  });
}

/* =========================================================
   GET PLAYER NAMES
========================================================= */

function getPlayerNames() {
  const inputs = document.querySelectorAll(".player-input");

  return Array.from(inputs).map((input) => input.value.trim());
}

/* =========================================================
   SAVE PLAYERS
========================================================= */

function savePlayers() {
  const names = getPlayerNames();

  localStorage.setItem(PLAYER_STORAGE_KEY, JSON.stringify(names));
}

/* =========================================================
   LOAD PLAYERS
========================================================= */

function loadPlayers() {
  playersList.innerHTML = "";

  const saved = localStorage.getItem(PLAYER_STORAGE_KEY);

  /*
   * First time opening the game
   */

  if (!saved) {
    addPlayer("Player 1");
    addPlayer("Player 2");
    addPlayer("Player 3");

    return;
  }

  try {
    const names = JSON.parse(saved);

    /*
     * Invalid saved data
     */

    if (!Array.isArray(names) || names.length < 3) {
      addPlayer("Player 1");
      addPlayer("Player 2");
      addPlayer("Player 3");

      return;
    }

    /*
     * Restore names in exactly
     * the saved order.
     */

    names.slice(0, 20).forEach((name) => {
      addPlayer(name);
    });
  } catch (error) {
    console.error("Failed to load saved players:", error);

    addPlayer("Player 1");
    addPlayer("Player 2");
    addPlayer("Player 3");
  }
}

/* =========================================================
   ADD PLAYER
========================================================= */

function addPlayer(name = null) {
  /*
   * Maximum 20 players
   */

  if (playersList.children.length >= 20) {
    return;
  }

  /*
   * Determine the automatic name
   */

  const playerNumber = playersList.children.length + 1;

  const defaultName =
    name !== null && name !== "" ? name : `Player ${playerNumber}`;

  /* =====================================================
       PLAYER ROW
    ===================================================== */

  const row = document.createElement("div");

  row.className = "player-row";

  /* =====================================================
       DRAG HANDLE
    ===================================================== */

  const dragHandle = document.createElement("button");

  dragHandle.type = "button";

  dragHandle.className = "drag-handle";

  dragHandle.setAttribute("aria-label", "Hold to reorder player");

  /* =====================================================
       PLAYER INPUT
    ===================================================== */

  const input = document.createElement("input");

  input.className = "player-input";

  input.type = "text";

  input.value = defaultName;

  input.maxLength = 20;

  input.autocomplete = "off";

  /*
   * Select the entire name when
   * the input receives focus.
   */

  input.addEventListener("focus", () => {
    input.select();
  });

  /*
   * Also select everything when
   * the user explicitly clicks.
   */

  input.addEventListener("click", () => {
    input.select();
  });

  /*
   * Save whenever the name changes.
   */

  input.addEventListener("input", () => {
    savePlayers();
  });

  /* =====================================================
       REMOVE BUTTON
    ===================================================== */

  const removeButton = document.createElement("button");

  removeButton.className = "remove-player";

  removeButton.type = "button";

  removeButton.textContent = "×";

  removeButton.setAttribute("aria-label", "Remove player");

  removeButton.addEventListener("click", () => {
    /*
     * Don't allow fewer than
     * 3 players.
     */

    if (playersList.children.length <= 3) {
      alert("You need at least 3 players.");

      return;
    }

    row.remove();

    updatePlayersUI();

    savePlayers();
  });

  /* =====================================================
       BUILD ROW
    ===================================================== */

  row.appendChild(dragHandle);

  row.appendChild(input);

  row.appendChild(removeButton);

  playersList.appendChild(row);

  /* =====================================================
       ENABLE REORDERING
    ===================================================== */

  setupTouchReorder(row, dragHandle);

  updatePlayersUI();

  /*
   * If this was created by pressing
   * "+ Add Player", immediately focus
   * and select the automatic name.
   *
   * Existing saved players won't steal
   * focus during page loading.
   */

  if (name === null) {
    requestAnimationFrame(() => {
      input.focus();

      input.select();
    });
  }
}

/* =========================================================
   TOUCH / MOUSE REORDER
========================================================= */

let draggedRow = null;

let pointerId = null;

let dragStarted = false;

function setupTouchReorder(row, handle) {
  handle.addEventListener("pointerdown", startReorder);

  /* =====================================================
       START REORDER
    ===================================================== */

  function startReorder(event) {
    event.preventDefault();

    draggedRow = row;

    pointerId = event.pointerId;

    dragStarted = true;

    row.classList.add("dragging");

    /*
     * Keep receiving pointer events
     * even if the finger moves away
     * from the handle.
     */

    try {
      handle.setPointerCapture(pointerId);
    } catch (error) {
      // Ignore if pointer capture
      // is not supported.
    }

    document.addEventListener("pointermove", moveReorder);

    document.addEventListener("pointerup", endReorder, {
      once: true,
    });

    document.addEventListener("pointercancel", endReorder, {
      once: true,
    });
  }

  /* =====================================================
       MOVE REORDER
    ===================================================== */

  function moveReorder(event) {
    if (!dragStarted || !draggedRow) {
      return;
    }

    if (event.pointerId !== pointerId) {
      return;
    }

    /*
     * Get every row except
     * the row currently being dragged.
     */

    const rows = Array.from(playersList.children).filter(
      (item) => item !== draggedRow,
    );

    if (rows.length === 0) {
      return;
    }

    let closestRow = null;

    let closestDistance = Infinity;

    /*
     * Find the row closest to
     * the user's finger/cursor.
     */

    rows.forEach((otherRow) => {
      const rect = otherRow.getBoundingClientRect();

      const center = rect.top + rect.height / 2;

      const distance = Math.abs(event.clientY - center);

      if (distance < closestDistance) {
        closestDistance = distance;

        closestRow = otherRow;
      }
    });

    if (!closestRow) {
      return;
    }

    const rect = closestRow.getBoundingClientRect();

    const center = rect.top + rect.height / 2;

    /*
     * Move before or after the
     * closest row.
     */

    if (event.clientY < center) {
      playersList.insertBefore(draggedRow, closestRow);
    } else {
      playersList.insertBefore(draggedRow, closestRow.nextSibling);
    }
  }

  /* =====================================================
       END REORDER
    ===================================================== */

  function endReorder(event) {
    if (!dragStarted) {
      return;
    }

    if (event && event.pointerId !== pointerId) {
      return;
    }

    dragStarted = false;

    pointerId = null;

    if (draggedRow) {
      draggedRow.classList.remove("dragging");
    }

    draggedRow = null;

    document.removeEventListener("pointermove", moveReorder);

    /*
     * Save the NEW order.
     */

    savePlayers();

    updatePlayersUI();
  }
}

/* =========================================================
   PLAYER UI
========================================================= */

function updatePlayersUI() {
  const count = playersList.children.length;

  playerCount.textContent = `${count} / 20`;

  updateImpostorOptions(count);
}

/* =========================================================
   IMPOSTOR OPTIONS
========================================================= */

function updateImpostorOptions(count) {
  const previousValue = Number(impostorCount.value) || 1;

  impostorCount.innerHTML = "";

  let maxImpostors = 1;

  /*
   * 3–6 players
   * 1 impostor
   *
   * 7–9 players
   * 1–2 impostors
   *
   * 10+ players
   * 1–3 impostors
   */

  if (count >= 7 && count <= 9) {
    maxImpostors = 2;
  }

  if (count >= 10) {
    maxImpostors = 3;
  }

  for (let i = 1; i <= maxImpostors; i++) {
    const option = document.createElement("option");

    option.value = i;

    option.textContent = `${i} ${i === 1 ? "Impostor" : "Impostors"}`;

    impostorCount.appendChild(option);
  }

  /*
   * Preserve the previous
   * impostor selection if possible.
   */

  impostorCount.value = previousValue <= maxImpostors ? previousValue : 1;
}

/* =========================================================
   START GAME
========================================================= */

function startGame() {
  const names = getPlayerNames();

  /*
   * Minimum 3 players
   */

  if (names.length < 3) {
    alert("You need at least 3 players.");

    return;
  }

  /*
   * No empty names
   */

  if (names.some((name) => !name)) {
    alert("Please enter a name for every player.");

    return;
  }

  /*
   * Names must be unique
   */

  const normalized = names.map((name) => name.toLowerCase());

  const duplicate = normalized.some(
    (name, index) => normalized.indexOf(name) !== index,
  );

  if (duplicate) {
    alert("Player names must be unique.");

    return;
  }

  /*
   * Save the current names AND
   * their current order.
   */

  savePlayers();

  /*
   * Copy players into game state.
   */

  game.players = names;

  game.currentPlayer = 0;

  game.selectedVote = null;

  chooseWord();

  chooseImpostors();

  showPlayerReveal();
}

/* =========================================================
   CHOOSE WORD
========================================================= */

function chooseWord() {
  if (!Array.isArray(wordSets) || wordSets.length === 0) {
    console.error("wordSets is missing or empty.");

    return;
  }

  const randomSet = wordSets[Math.floor(Math.random() * wordSets.length)];

  game.category = randomSet.category;

  game.word =
    randomSet.words[Math.floor(Math.random() * randomSet.words.length)];
}

/* =========================================================
   CHOOSE IMPOSTORS
========================================================= */

function chooseImpostors() {
  const count = Number(impostorCount.value);

  const indexes = [];

  while (indexes.length < count) {
    const randomIndex = Math.floor(Math.random() * game.players.length);

    if (!indexes.includes(randomIndex)) {
      indexes.push(randomIndex);
    }
  }

  game.impostors = indexes;
}

/* =========================================================
   SHOW PLAYER REVEAL
========================================================= */

function showPlayerReveal() {
  hasRevealed = false;

  isHolding = false;

  currentPlayerName.textContent = game.players[game.currentPlayer];

  hiddenCard.classList.remove("hidden");

  hiddenCard.classList.remove("holding");

  roleCard.classList.add("hidden");

  nextPlayerBtn.classList.add("hidden");

  wordText.classList.remove("forming");

  wordText.textContent = "";

  showScreen(revealScreen);
}

/* =========================================================
   REVEAL ROLE
========================================================= */

function revealRole() {
  if (isHolding) {
    return;
  }

  isHolding = true;

  hasRevealed = true;

  hiddenCard.classList.add("holding");

  const isImpostor = game.impostors.includes(game.currentPlayer);

  categoryText.textContent = `Category: ${game.category}`;

  if (isImpostor) {
    wordText.textContent = "IMPOSTOR";
  } else {
    wordText.textContent = game.word;
  }

  hiddenCard.classList.add("hidden");

  roleCard.classList.remove("hidden");

  /*
   * Next Player appears after
   * the first reveal.
   */

  nextPlayerBtn.classList.remove("hidden");

  /*
   * Restart the word animation.
   */

  wordText.classList.remove("forming");

  void wordText.offsetWidth;

  wordText.classList.add("forming");
}

/* =========================================================
   HIDE ROLE
========================================================= */

function hideRole() {
  if (!isHolding) {
    return;
  }

  isHolding = false;

  hiddenCard.classList.remove("holding");

  roleCard.classList.add("hidden");

  hiddenCard.classList.remove("hidden");

  /*
   * Next Player remains visible.
   */
}

/* =========================================================
   NEXT PLAYER
========================================================= */

function nextPlayer() {
  if (isHolding) {
    return;
  }

  if (!hasRevealed) {
    return;
  }

  if (game.currentPlayer < game.players.length - 1) {
    game.currentPlayer++;

    showPlayerReveal();
  } else {
    showDiscussion();
  }
}

/* =========================================================
   DISCUSSION
========================================================= */

function showDiscussion() {
  showScreen(discussionScreen);
}

/* =========================================================
   START VOTING
========================================================= */

function startVoting() {
  game.selectedVote = null;

  voteBtn.disabled = true;

  votingList.innerHTML = "";

  game.players.forEach((player, index) => {
    const button = document.createElement("button");

    button.className = "vote-option";

    button.type = "button";

    button.textContent = player;

    button.addEventListener("click", () => {
      selectVote(index, button);
    });

    votingList.appendChild(button);
  });

  showScreen(votingScreen);
}

/* =========================================================
   SELECT VOTE
========================================================= */

function selectVote(playerIndex, selectedButton) {
  game.selectedVote = playerIndex;

  document.querySelectorAll(".vote-option").forEach((option) => {
    option.classList.remove("selected");
  });

  selectedButton.classList.add("selected");

  voteBtn.disabled = false;
}

/* =========================================================
   PROCESS VOTE
========================================================= */

function processVote() {
  if (game.selectedVote === null) {
    return;
  }

  const caughtImpostor = game.impostors.includes(game.selectedVote);

  showResult(caughtImpostor);
}

/* =========================================================
   SHOW RESULT
========================================================= */

function showResult(caughtImpostor) {
  if (caughtImpostor) {
    resultStatus.textContent = "RESULT";

    resultTitle.textContent = "IMPOSTOR CAUGHT";

    impostorResult.textContent = `${game.players[game.selectedVote]} was an impostor.`;
  } else {
    resultStatus.textContent = "RESULT";

    resultTitle.textContent = "WRONG GUESS";

    const names = game.impostors.map((index) => game.players[index]);

    impostorResult.textContent = `The impostor${
      names.length > 1 ? "s were" : " was"
    } ${names.join(", ")}.`;
  }

  wordResult.textContent = game.word;

  wordSpoiler.classList.remove("revealed");

  showScreen(resultScreen);
}

/* =========================================================
   REVEAL RESULT WORD
========================================================= */

function revealResultWord() {
  wordSpoiler.classList.add("revealed");
}

/* =========================================================
   PLAY AGAIN
========================================================= */

function playAgain() {
  /*
   * Do NOT clear localStorage.
   *
   * Names and their order remain saved.
   */

  game.players = [];

  game.impostors = [];

  game.category = "";

  game.word = "";

  game.currentPlayer = 0;

  game.selectedVote = null;

  /*
   * Load the same names and
   * same order from storage.
   */

  loadPlayers();

  showScreen(setupScreen);
}

/* =========================================================
   HOLD TO REVEAL
========================================================= */

/*
 * Mouse
 */

hiddenCard.addEventListener("mousedown", (event) => {
  event.preventDefault();

  revealRole();
});

/*
 * Release mouse anywhere
 */

document.addEventListener("mouseup", () => {
  hideRole();
});

/*
 * Touch start
 */

hiddenCard.addEventListener(
  "touchstart",
  (event) => {
    event.preventDefault();

    revealRole();
  },
  {
    passive: false,
  },
);

/*
 * Touch release
 */

hiddenCard.addEventListener(
  "touchend",
  (event) => {
    event.preventDefault();

    hideRole();
  },
  {
    passive: false,
  },
);

/*
 * Touch cancelled
 */

hiddenCard.addEventListener(
  "touchcancel",
  (event) => {
    event.preventDefault();

    hideRole();
  },
  {
    passive: false,
  },
);

/* =========================================================
   BUTTON EVENTS
========================================================= */

addPlayerBtn.addEventListener("click", () => {
  addPlayer();
});

startGameBtn.addEventListener("click", () => {
  startGame();
});

nextPlayerBtn.addEventListener("click", () => {
  nextPlayer();
});

startVotingBtn.addEventListener("click", () => {
  startVoting();
});

voteBtn.addEventListener("click", () => {
  processVote();
});

wordSpoiler.addEventListener("click", () => {
  revealResultWord();
});

playAgainBtn.addEventListener("click", () => {
  playAgain();
});

/* =========================================================
   INITIAL LOAD
========================================================= */

loadPlayers();
