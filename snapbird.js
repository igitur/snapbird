var store = (function () {
  var useStorage = !!window.localStorage;
  
  return {
    get: function (key) {
      var value, ca, c, i;

      if (useStorage) {
        value = window.localStorage.getItem(key);
      } else {
        ca = document.cookie.split(';');
        for (i=0; i < ca.length; i++) {
          c = ca[i];
          while (c.charAt(0)==' ') {
            c = c.substring(1, c.length);
          }
          if (c && c.indexOf(key) == 0) {
            value = c.substring(key.length,c.length);
            break;
          }
        }
      }

      if (value == null) {
        value == "";
      }

      return value;
    },
    set: function (key, value) {
      if (useStorage) {
        try {
          window.localStorage.setItem(key, value);
        } catch (e) {
          // could be a QUOTA_EXCEEDED_ERR (for some reason Webkit is giving me this, just needs a restart and it goes away...)
        }
      } else {
        document.cookie = key + "=" + value + "; path=/";
      }      
    }
  };
})();

$('body').keyup(function (event) {
  if (event.keyCode == 27) {
    $('body').removeClass('auth loading');
    twitterlib.cancel();
  }
});

// very hacky code - sorry!
var $tweets = $('#tweets ul'), 
    screen_name = url = state = '', 
    page = 1, 
    total_tweets = 0, 
    total_searched = 0,
    statusTop = null, 
    type_string = { 
      timeline : 'tweets', 
      favs: 'favourites', 
      withfriends: 'friends&rsquo; tweets', 
      list: 'member tweets',
      dm: 'received direct messages',
      dm_sent: 'sent direct messages'
    };

twitterlib.custom('withfriends', '/friends.php?page=%page%');
twitterlib.custom('dm', '/friends.php?page=%page%&type=direct_messages');
twitterlib.custom('dm_sent', '/friends.php?page=%page%&type=direct_messagesSent');

$('input.search').live('click', function () {
  $('form').submit();
  return false;
});

$(function () {  
  var msie6 = $.browser == 'msie' && $.browser.version < 7;
  if (!msie6) {
    $(window).scroll(function (event) {
      var y;
      // what the y position of the scroll is
      if (statusTop != null) {
        y = $(this).scrollTop();

        // whether that's below the form
        if (y >= statusTop) {
          // if so, ad the fixed class
          $('#tweets aside').addClass('fixed');
        } else {
          // otherwise remove it
          $('#tweets aside').removeClass('fixed');
        }        
      }
    });
  }  
});

$('input[type=radio]').bind('click change', function () {
  var authRequired = $('input[type=radio].authRequired').is(':checked');
  var auth = $('#auth_screen_name').length;
  
  if (authRequired && !auth) {
    // show lightbox
    $('body').addClass('auth');
  } else if (authRequired) {
    $('#auth_screen_name').css('display', 'inline-block');
    $('#screen_name').hide();
  } else { // not checked
    $('#auth_screen_name').css('display', 'none');
    $('#screen_name').show();
  }
});

$('form').submit(function (e) {
  e.preventDefault();
  screen_name = $('#screen_name').val();
  
  var newstate = $(this).serialize(),
      type = $(this).find('input[type=radio]:checked').val(),
      search = $('#search').val(),
      filter = twitterlib.filter.format(search);

  // if ($.trim(search.length) == 0) {
  //   $('#status').html('Nothing to search for.');
  //   // return;
  // }
  
  if (state != newstate) {
    state = newstate;
    store.set('screen_name', screen_name);
    
    // if ( $('#favs').is(':checked') ) {
    //   type = 'favs';
    // } else if ($('#withfriends').is(':checked')) {
    //   type = 'withfriends';
    // } else 
    if (screen_name.match(/\//)) {
      type = 'list';
    }

    total_tweets = 0;
    total_searched = 0;
    $tweets.empty();
    
    $('#permalink').attr('href', '/' + screen_name + '/' + type + '/' + encodeURIComponent(search));
    
    $tweets.append('<li class="searchterm">Searching <em><strong>' + screen_name + '</strong>&rsquo;s ' + type_string[type] + '</em> for <strong>' + search.replace(/<>/g, function (m) { return m == '<' ? '&lt;' : '&gt;'; }) + '</strong></li>');
    $('body').addClass('results');
    
    updateRequestStatus();
    $('body').addClass('loading');
        
    // cancel any outstanding request, and kick off a new one
    twitterlib.cancel()[type](screen_name, { filter: search }, function (data, options) {
      total_searched += options.originalTweets.length;
      
      // if there's no results, do another call - and keep going until we hit something
      if (data.length == 0 && total_tweets == 0 && options.originalTweets.length == 0) {
        $('#status p:first').text('Searched ' + total_searched + ' tweets, found nothing.');
        updateRequestStatus();
      } else if (data.length == 0 && total_tweets == 0) {
        $('#status').html('<p>Searching ' + total_searched + ' tweets.</p><p>Read to: <strong>' + twitterlib.time.datetime(options.originalTweets[options.originalTweets.length - 1].created_at).replace(/ (AM|PM)/, function (a, m) { return m.toLowerCase() + ','; }) + '</strong></p>');
        updateRequestStatus();
        setTimeout(function () {
          twitterlib.next();
        }, 1000);
        return;
      } 
      
      if (total_tweets) {
        $tweets.find('li:last').addClass('more'); // hard split line
      }
                    
      var i = 0, j = 0, t, r, scrollPos = null, searches = filter.and.concat(filter.or).join('|');
      
      for (i = 0; i < data.length; i++) {
        t = twitterlib.render(data[i], i);
        $tweets.append(t);
        
        if (total_tweets == 0 && i == 0) {
          $tweets.find('li:first').addClass('first');
        } 

        // really tricky code here, we're finding *this* and all nested text nodes
        // then replacing them with our new <strong>text</strong> elements
        $tweets.find('.entry-content:last, .entry-content:last *').contents().filter(function () {
          return this.nodeName == '#text';
        }).each(function () {
          // ignore blank lines
          // make matches bold
          var change = '';
          if (/[^\s]/.test(this.nodeValue)) {
            // encoding of entities happens here, so we need to reverse back out
            change = this.nodeValue.replace(/[<>&]/g, function (m) {
              var r = '&amp;';
              if (m == '<') {
                r = '&lt;';
              } else if (m == '>') {
                r = '&gt;';
              }
              return r;
            }).replace(new RegExp('(' + searches + ')', "gi"), "<strong>$1</strong>");
            // need to convert this textNode to tags and text
            $(this).replaceWith(change);
          }
        });

      }
      scrollPos = $tweets.find('li:last').offset().top;
      if (scrollPos != null) {
        setTimeout(function () {
          $('html,body').animate({ scrollTop: scrollPos }, 500, function () {
          });
        }, 100);
      }
      
      total_tweets += data.length;

      if (options.originalTweets.length) $('#status').html('<p>Found ' + total_tweets + ' tweet' + (total_tweets == 1 ? '' : 's') + '.</p><p>Read to: <strong>' + twitterlib.time.datetime(options.originalTweets[options.originalTweets.length - 1].created_at).replace(/ (AM|PM)/, function (a, m) { return m.toLowerCase() + ','; }) + '</strong></p>');
      
      updateRequestStatus();
      $('body').removeClass('loading');
      
      
      if (statusTop == null) {
        statusTop = $('#tweets aside').offset().top - parseFloat($('#tweets aside').css('margin-top').replace(/auto/, 0));            
      }
      
    });

  } else {
    $('#status').html('<p>Searched ' + total_searched + ' tweets.</p><p>Requesting more...</p>');
    $('body').addClass('loading');
    
    setTimeout(function () { twitterlib.cancel().next(); }, 250);
  } 
});

function two(s) {
  return (s+'').length == 1 ? '0' + s : s;
}

function updateRequestStatus() {
  $.getJSON('http://twitter.com/account/rate_limit_status.json?callback=?', function (data) {
    var date = new Date(Date.parse(data.reset_time));
    if (! $('#status p.rate').length) $('#status').append('<p class="rate" />');
    $('#status p.rate').html('Requests left: ' + data.remaining_hits + '<br />Next reset: ' + two(date.getHours()) + ':' + two(date.getMinutes()));
  });
}

function getQuery(s) {
  var query = {};
  
  s.replace(/\b([^&=]*)=([^&=]*)\b/g, function (m, a, d) {
    if (typeof query[a] != 'undefined') {
      query[a] += ',' + d;
    } else {
      query[a] = d;
    }
  });
  
  return query;
}

$('input[type=reset]').click(function () {
  $tweets.empty();
});

if ( !$('#screen_name').val() ) {
  $('#screen_name').val(store.get('screen_name'));
}

// check location.search to see if we need to prepopulate
if (window.location.search) {
  var query = getQuery(window.location.search.substr(1));
  if (query.screen_name) {
    $('#screen_name').val(decodeURIComponent(query.screen_name));
  }
  if (query.search) {
    $('#search').val(decodeURIComponent(query.search));
  }
  if (query.favs) {
    $('#favs').attr('checked', 'checked');
  }
}

var $ref = $('<div>M</div>').css({
  'visibility' : 'hidden', 
  'font-size': '10px', 
  'line-height': '10px',
  'margin': 0,
  padding: 0,
  overflow: 'hidden'
}).appendTo('body'), oh = 10;

var timer = setInterval(function () {
  var h = $ref.height();
  if (h != oh && !$('#bang').length) {
    // show exploded page
    $('<div id="bang" />').appendTo('body');
  } else if (h == oh && $('#bang').length) {
    $('#bang').remove();
  }
}, 500);

$('#auth .cancel').click(function () {
  $('input[type=radio]:first').click();
  $('body').removeClass('auth');
});

$('#logout').click(function () {
  document.cookie = 'token=; path=/';
});

if ($('#screen_name').val() && $('#search').val()) {
  try {
    $('form').submit();
  } catch (e) {
    // why is this throwing in FF?
  }
}