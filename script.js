console.log("hola 🎉");

$(document).ready(function() {
  var $cardsResult = $(".cards-result");
  var $listIds = $(".list-ids");
  var $loaderBar = $(".loader .bar");

  $(".js-auth-with-trello").on("click", function() {
    window.Trello.authorize({
      type: "popup",
      name: "Export Trello Lists",
      scope: {
        read: "true",
        write: "true"
      },
      expiration: "never",
      success: authenticationSuccess,
      error: authenticationFailure
    });
  });

  $("#includeOldBoards").on("change", function() {
    updateBoardsList({ recentOnly: this.checked });
  });

  $(".js-fetch-lists").on("click", function() {
    let boardIds = $(".board-ids").val();

    if (boardIds) {
      let boardCount = 0;
      let fetchedData = {};

      boardIds.forEach(function(boardId) {
        fetchedData[boardId] = {};

        Trello.get("/boards/" + boardId)
          .then(function(board) {
            fetchedData[boardId]["name"] = board.name;

            Trello.get("/boards/" + boardId + "/lists")
              .then(function(lists) {
                boardCount++;
                fetchedData[boardId]["lists"] = lists;

                if (boardCount == boardIds.length) {
                  let options = "";

                  for (key in fetchedData) {
                    let boardData = fetchedData[key];

                    boardData.lists.forEach(function(list) {
                      options += `<option value="${list.id}">${boardData.name} - ${list.name}</option>`;
                    });

                    $listIds.html(options);
                  }
                }
              })
              .error(function(err) {
                console.log(err);
              });
          })
          .error(function(err) {
            console.log(err);
          });
      });
    }
  });

  $('[data-action="get-cards"]').on("click", function() {
    var cardsToDisplay = {};
    var listCount = 0;
    var listIds = $listIds.val();
    var includeChecklists = $("#includeChecklists")[0].checked;

    // reset the .cards-result field & loader bar ready for a new result
    $cardsResult.val("Fetching cards...");
    updateLoader(0, 0);

    if (listIds) {
      listIds.forEach(function(listId) {
        Trello.get("/lists/" + listId + "/cards")
          .then(function(fetchedCards) {
            // keep track of how many lists we've fetched cards from
            listCount++;

            // store required data from each fetched card
            fetchedCards.forEach(function(fetchedCard) {
              cardsToDisplay[fetchedCard.id] = {
                idChecklists: fetchedCard.idChecklists,
                name: fetchedCard.name,
                pos: fetchedCard.pos
              };
            });

            // if we've gone through each list...
            if (listCount == listIds.length) {
              // create each card's display string (including any checklist
              // items that it has)
              var cardIds = Object.keys(cardsToDisplay);
              var cardCount = 0;

              cardIds.forEach(function(cardId) {
                var card = cardsToDisplay[cardId];

                card.displayString = `* ${card.name}\r\n`;

                Trello.get("/cards/" + cardId + "/checklists")
                  .then(function(checklists) {
                    var checkItems = flatten(
                      checklists.map(checklist =>
                        checklist.checkItems.map(checkItem => checkItem.name)
                      )
                    );

                    if (includeChecklists) {
                      card.displayString += checkItems
                        .map(name => `  - ${name}\r\n`)
                        .join("");
                    }
                    card.displayString = cleanUp(card.displayString);
                    card.displayString += "\r\n"; // extra line break

                    // keep track of the cards we've gone through
                    cardCount++;

                    // show the user our progress so far
                    updateLoader(cardCount, cardIds.length);

                    // if we've been through all the cards...
                    if (cardCount == cardIds.length) {
                      sortAndDisplayCards(cardsToDisplay);
                    }
                  })
                  .error(function(err) {
                    console.log("error:", err);
                  });
              });
            }
          })
          .error(function(err) {
            console.log("error:", err);
          });
      });
    }
  });

  function updateLoader(current, total) {
    let percentComplete = current / total * 100;

    $loaderBar.css("width", percentComplete + "%");
  }

  function sortAndDisplayCards(cards) {
    var cardsArray = Object.keys(cards).map(cardId => cards[cardId]);

    cardsArray.sort(function(a, b) {
      return a.pos - b.pos;
    });

    $cardsResult.val(cardsArray.map(card => card.displayString).join(""));
  }
});

function authenticationSuccess(thing) {
  $(".step-1 .response-msg").text("Successfully authenticated with Trello.");
  $(".step-1").slideUp();
  $(".step-2").slideDown();

  updateBoardsList({ recentOnly: true });
}

function authenticationFailure() {
  $(".step-1 .response-msg").text("Authentication failed :(");
  $(".step-2").slideUp();
}

function updateBoardsList(opts) {
  Trello.get("/members/me/boards/")
    .then(function(boards) {
      let options = "";

      $.each(boards, function(boardIndex) {
        let board = boards[boardIndex];

        if (!board.closed) {
          if (opts.recentOnly) {
            let lastView = Date.parse(board.dateLastView);
            let tenDaysAgo = Date.now() - 1000 * 60 * 60 * 24 * 10;

            if (!isNaN(lastView) && tenDaysAgo - lastView <= 0) {
              options += `<option value="${board.id}">${board.name}</option>`;
            }
          } else {
            options += `<option value="${board.id}">${board.name}</option>`;
          }
        }
      });

      $(".board-ids").html(options);
    })
    .error(function(err) {
      console.log(err);
    });
}

function uniq(a) {
  return Array.from(new Set(a));
}

function flatten(a) {
  return a.reduce(function(a, b) {
    return a.concat(b);
  }, []);
}

function cleanUp(s) {
  // remove any sprint points and :emojis: from a string for display
  return s
    .replace(/\[(.*?)\]/g, "")
    .replace(/\:(.*?)\:/g, "")
    .trim();
}
