var ify = function() {
  return {
    link: function(t) {
      return t.replace(/[a-z]+:\/\/[a-z0-9-_]+\.[a-z0-9-_:~%&\?\/.=]+[^:\.,\)\s*$]/ig, function(m) {
        return '<a href="' + m + '">' + ((m.length > 25) ? m.substr(0, 24) + '...' : m) + '</a>';
      });
    },
    at: function(t) {
      return t.replace(/(^|[^\w]+)\@([a-zA-Z0-9_]{1,15}(\/[a-zA-Z0-9-_]+)*)/g, function(m, m1, m2) {
        return m1 + '@<a href="http://twitter.com/' + m2 + '">' + m2 + '</a>';
      });
    },
    hash: function(t) {
      return t.replace(/(^|[^\w'"]+)\#([a-zA-Z0-9_]+)/g, function(m, m1, m2) {
        return m1 + '#<a href="http://search.twitter.com/search?q=%23' + m2 + '">' + m2 + '</a>';
      });
    },
    clean: function(tweet) {
      return this.hash(this.at(this.link(tweet)));
    }
  };
}();

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

// very hacky code - sorry!
var $tweets = $('#tweets ul'), screen_name = '', url = '', page = 1, state = '', total_tweets = 0, statusTop = null;

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
  var withfriends = $('#withfriends').is(':checked');
  var auth = $('#auth_screen_name').length;
  if (withfriends && !auth) {
    // show lightbox
    $('body').addClass('auth');
  } else if (withfriends) {
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
      timeline = 'http://twitter.com/statuses/user_timeline/' + screen_name + '.json',
      favs = 'http://twitter.com/favorites/' + screen_name + '.json',
      friends = '/friends.php',
      type_string = 'tweets', 
      type = 'tweets',
      list = '',
      search = $('#search').val();
  
  if (state != newstate) {
    state = newstate;
    store.set('screen_name', screen_name);
    
    if ( $('#favs').is(':checked') ) {
      url = favs;
      type_string = 'favourites';
      type = 'favs';
    } else if ($('#withfriends').is(':checked')) {
      url = friends;
      type_string = 'friends&rsquo; tweets';
      type = 'withfriends';
    } else {
      list = screen_name.match(/^(.*?)\/(.*?)$/);
      if (list != null) {
        // then we're a list
        timeline = 'http://api.twitter.com/1/' + list[1] + '/lists/' + list[2] + '/statuses.json';
        type_string = 'member tweets';
      }
      url = timeline;
    }
    

    page = 1;
    total_tweets = 0;
    $tweets.empty();
    
    $('#permalink').attr('href', '/' + screen_name + '/' + type + '/' + encodeURIComponent(search));
    
    $tweets.append('<li class="searchterm">Searching <em><strong>' + screen_name + '</strong>&rsquo;s ' + type_string + '</em> for <strong>' + search.replace(/<>/g, function (m) { return m == '<' ? '&lt;' : '&gt;'; }) + '</strong></li>');
    
    // need a way to cancel all outstanding API requests - bespoke $.getJSONP on it's way!
  } 
  // else { don't need page++ happens automatically in the success function }
  
  getTweets();
});

function getTweets() {
  var search = $('#search').val(), s = twitterSearch.formatSearch(search);
  
  if (search) {
    $('#status').html('<p>Searched ' + total_tweets + ' tweets.</p><p>Requesting more...</p>');
    
    $.ajax({
      url: url + '?count=200&per_page=200&page=' + page,
      dataType: 'jsonp',
      success: function (json) {
        // update the page so that searching again requests the next page
        page++;
        
        var i = 0, j = 0, t, r, scrollPos = null, searches = s.and.concat(s.or).join('|');
        total_tweets += json.length;
        for (i = 0; i < json.length; i++) {
          if (twitterSearch.filter(json[i], search)) {
            t = tweet(json[i], i);
            $tweets.append(t);

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

            
            if (scrollPos == null) {
              scrollPos = $tweets.find('li').offset().top;
            }
          }
          
          if (scrollPos != null) {
            console.log(scrollPos);
            // $('body').animate({ scrollTop: scrollPos }, 500, function () {
            //   console.log('finished');
            // });
          }
        }
        $('#status').html('<p>Searched ' + total_tweets + ' tweets.</p><p>Read back to: <strong>' + twitter_time(json[json.length - 1].created_at).replace(/ (AM|PM)/, function (a, m) { return m.toLowerCase() + ','; }) + '</strong></p>');
        
        if ($tweets.find('li').length == 0) {
          // keep searching
          // getTweets();
        } else {
          $('body').addClass('results');
          if (statusTop == null) {
            statusTop = $('#tweets aside').offset().top - parseFloat($('#tweets aside').css('margin-top').replace(/auto/, 0));            
          }
        }
      }
    });
  } else {
    $('#status').html('Nothing to search for.');
  }
}

function formatTime(date) {
  var hour = date.getHours(),
      min = date.getMinutes() + "",
      ampm = 'AM';
  
  if (hour == 0) {
    hour = 12;
  } else if (hour > 12) {
    hour -= 12;
    ampm = 'PM';
  }
  
  if (min.length == 1) {
    min = '0' + min;
  }
  
  return hour + ':' + min + ' ' + ampm;
}

function formatDate(date) {
  var ds = date.toDateString().split(/ /),
      mon = ds[1],
      day = ds[2],
      dayi = ~~(day),
      year = date.getFullYear(),
      thisyear = (new Date()).getFullYear(),
      th = 'th';
    
  // anti-'th' - but don't do the 11th, 12th or 13th
  if ((dayi % 10) == 1 && day.substr(0, 1) != '1') {
    th = 'st';
  } else if ((dayi % 10) == 2 && day.substr(0, 1) != '1') {
    th = 'nd';
  } else if ((dayi % 10) == 3 && day.substr(0, 1) != '1') {
    th = 'rd';
  }
  
  if (day.substr(0, 1) == '0') {
    day = day.substr(1);
  }
  
  return mon + ' ' + day + th + (thisyear != year ? ', ' + year : '');
}

function twitter_time(time_value) {
  var values = time_value.split(" "),
      parsed_date = Date.parse(values[1] + " " + values[2] + ", " + values[5] + " " + values[3]),
      date = new Date(parsed_date),
      relative_to = (arguments.length > 1) ? arguments[1] : new Date(),
      delta = ~~((relative_to.getTime() - parsed_date) / 1000),
      r = '';
  
  
  delta = delta + (relative_to.getTimezoneOffset() * 60);

  if (delta < 5) {
    r = 'less than 5 seconds ago';
  } else if (delta < 30) {
    r = 'half a minute ago';
  } else if (delta < 60) {
    r = 'less than a minute ago';
  } else if (delta < 120) {
    r = '1 minute ago';
  } else if (delta < (45*60)) {
    r = (~~(delta / 60)).toString() + ' minutes ago';
  } else if (delta < (2*90*60)) { // 2* because sometimes read 1 hours ago
    r = 'about 1 hour ago';
  } else if (delta < (24*60*60)) {
    r = 'about ' + (~~(delta / 3600)).toString() + ' hours ago';
  } else {
    if (delta < (48*60*60)) {
      r = formatTime(date) + ' yesterday';
    } else {
      r = formatTime(date) + ' ' + formatDate(date);
    }
  }

  return r;
}

function tweet(data, i) {
  var html = '<li><div class="tweet';
  if (i == 0) {
      html += ' first';
  }
  
  html += '"><div class="vcard"><a href="http://twitter.com/' + data.user.screen_name + '" class="url"><img alt="' + data.user.name + '" class="photo fn" height="48" src="' + data.user.profile_image_url + '" width="48" /></a></div>';
  
  html += '<div class="hentry"><strong><a href="http://twitter.com/';
  html += data.user.screen_name + '" ';
  html += 'title="' + data.user.name + '">' + data.user.screen_name + '</a></strong> ';
  html += '<span class="entry-content">';
  html += ify.clean(data.text);
  html += '</span> <span class="meta entry-meta"><a href="http://twitter.com/' + data.user.screen_name;
  html += '/status/' + data.id + '" class="entry-date" rel="bookmark"><span class="published" title="';
  html += data.created_at + '">' + twitter_time(data.created_at) + '</span></a> <span>from ';
  html += data.source;
  html += '</span></span></div></div></li>';
  
  return html;
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