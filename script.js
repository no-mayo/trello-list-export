console.log('hola 🎉');

$('[data-action="auth-with-trello"]').on('click', function() {
  window.Trello.authorize({
    type: 'popup',
    name: 'Getting Started Application',
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
  var boardIds = $('.board-ids').val().replace(/\s/g, '').split(',');

  boardIds.forEach(function(boardId) {
    Trello.get('/boards/' + boardId + '/lists').then(function(lists) {
      
      lists.forEach(function(list) {
        if (list.name.indexOf('EXPORT') > -1) {
          
          Trello.get('/lists/' + list.id + '/cards').then(function(cards) {
            var cardsResult = cards.map((card) => card.name).join('\r\n');
            
            console.log('cardsResult:', cardsResult);
            
            // TODO:
            // 1. remove points from cards
            // 2. get checklists and format nicely (at least with '-' in front)
            //
            // API docs: https://trello.readme.io/reference
            
            $('.cards-result').val(cardsResult);
            
          }).error(function(err) {
            console.log('error:', err);
          });
        }
      });
      
    }).error(function(err) {
      console.log('error:', err);
    });
  });
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