console.log('hola 🎉');

$(document).ready(function() {
  var $cardsResult = $('.cards-result');

  // check localStorage for any board IDs and replace 'em in the input field
  var storedIds = localStorage.getItem('boardIds');
  if (storedIds) { $('.board-ids').val(storedIds) }
  
  // whenever a value changes in the board IDs input, localStorage that val
  $('.board-ids').on('keyup', function() {
    localStorage.setItem('boardIds', this.value);
  });

  $('[data-action="auth-with-trello"]').on('click', function() {
    window.Trello.authorize({
      type: 'popup',
      name: 'Export Trello Lists',
      scope: {
        read: 'true',
        write: 'true'
      },
      expiration: 'never',
      success: authenticationSuccess,
      error: authenticationFailure
    });
  });
  
  $('[data-action="get-cards"]').on('click', function() {
    var boardIds = uniq( $('.board-ids').val().replace(/\s/g, '').split(',') );
    var boardCount = 0;
    var exportableLists = [];
    
    // reset the .cards-result field ready for a new result
    $cardsResult.val('Fetching cards...');
  
    boardIds.forEach(function(boardId) {
      Trello.get('/boards/' + boardId + '/lists').then(function(lists) {
        
        // keep track of the number of boards we've fetched
        boardCount++;
        
        lists.forEach(function(list) {
          if (list.name.indexOf('EXPORT') > -1) {
            exportableLists.push(list);
          }
        });
        
        // if we've gone through each board...
        if (boardCount == boardIds.length) {
          
          if (exportableLists.length == 0) {
            $cardsResult.val('No exportable lists found. Did you add the word "EXPORT" to the name of any lists that you want to export?');
            
          } else {
            var cardsToDisplay = {};
            var listCount = 0;
            
            exportableLists.forEach(function(list) {
              Trello.get('/lists/' + list.id + '/cards').then(function(fetchedCards) {
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
                if (listCount == exportableLists.length) {
                  var cardIds = Object.keys(cardsToDisplay);
                  
                  if (cardIds.length == 0) {
                    $cardsResult.val('No cards found on any of the lists marked "EXPORT".');
    
                  } else {
                    // create each card's display string (including any check-
                    // list items that it has)
                    var cardCount = 0;
                        
                    cardIds.forEach(function(cardId) {
                      var card = cardsToDisplay[cardId];
                      
                      card.displayString = `* ${card.name}\r\n`;
                      
                      Trello.get('/cards/' + cardId + '/checklists').then(function(checklists) {
                        var checkItems = flatten(
                          checklists.map(checklist => checklist.checkItems.map(checkItem => checkItem.name))
                        );
                        
                        card.displayString += checkItems.map(name => `  - ${name}\r\n`).join('');
                        card.displayString = cleanUp(card.displayString);
                        card.displayString += '\r\n'; // extra line break
                        
                        // keep track of the cards we've gone through
                        cardCount++;
                        
                        // if we've been through all the cards...
                        if (cardCount == cardIds.length) {
                          sortAndDisplayCards(cardsToDisplay);
                        }
                        
                      }).error(function(err) {
                        console.log('error:', err);
                      });
                    });
                  }
                  
                }
                
              }).error(function(err) {
                console.log('error:', err);
              });
              
            });
          }
          
        }
        
      }).error(function(err) {
        console.log('error:', err);
        $cardsResult.val('An error occurred :( Could you double-check your board IDs and try again?');
      });
    });
  });

  function sortAndDisplayCards(cards) {
    var cardsArray = Object.keys(cards).map(cardId => cards[cardId]);
    
    cardsArray.sort(function(a, b) { 
        return a.pos - b.pos;
    });
    
    $cardsResult.val(
      cardsArray.map(card => card.displayString).join('')
    );
  }
});

function authenticationSuccess() {
  $('.step-1 .response-msg').text('Successfully authenticated with Trello.');
  $('.step-1').slideUp();
  $('.step-2').slideDown();
}

function authenticationFailure() {
  $('.step-1 .response-msg').text('Authentication failed :(');
  $('.step-2').slideUp();
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
  return s.replace(/\[(.*?)\]/g, '').replace(/\:(.*?)\:/g, '').trim();
}