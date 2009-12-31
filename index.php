<?php
include('auth/secret.php');
include('auth/php/EpiCurl.php');
include('auth/php/EpiOAuth.php');
include('auth/php/EpiTwitter.php');

$twitterObj = new EpiTwitter(TWITTER_CONSUMER_KEY, TWITTER_CONSUMER_SECRET);
$twitterInfo = null;

if ($_COOKIE['token'] && file_exists('auth/oauth/' . $_COOKIE['token'])) {
	$username = file_get_contents('auth/oauth/' . $_COOKIE['token']);
	$userToken = $_COOKIE['token'];
	$userSecret = file_get_contents('auth/oauth/' . $username . '-sec');

	$twitterObj->setToken($userToken, $userSecret);
	$twitterInfo = $twitterObj->get_accountVerify_credentials();
	
	if (!$twitterInfo->screen_name) {
      // reset 
      $twitterObj = new EpiTwitter(TWITTER_CONSUMER_KEY, TWITTER_CONSUMER_SECRET);
      $twitterInfo = null;
  }  
}

$screen_name = isset($_GET['screen_name']) ? $_GET['screen_name'] : '';
$search = isset($_GET['search']) ? $_GET['search'] : '';
$type = isset($_GET['type']) ? $_GET['type'] : 'tweets';

?>
<!DOCTYPE html>
<!--
  I wrote this app because the search on Twitter sucks (7 days history). 
  I knew that there something I needed to find in my timeline but couldn't 
  find it. Or it might be favourited but again I couldn't find it - so 
  this app does it for me :-)
  
  - Remy @rem
-->
<html lang="en">
<head>
<title>Snap Bird - re-finding the ones that got away</title>
<meta charset="utf-8" />
<link rel="shortcut icon" href="/images/snapbird-icon.png" />
<link rel="apple-touch-icon" href="/images/snapbird-icon.png" />
<!--[if IE]>
  <script src="http://html5shiv.googlecode.com/svn/trunk/html5.js"></script>
<![endif]-->
<link rel="stylesheet" href="/snapbird.css" type="text/css" />
</head>
<body>
  <header>
    <h1><a href="/">Snap Bird</a></h1>
    <p>Re-finding the ones that got away</p>
  </header>
  <article id="main">
    <p>Can&rsquo;t remember who said that thing that time?</p>
    <ul class="plain">
      <li>Search <strong>beyond</strong> Twitter&rsquo;s 10-day search archive</li>
      <li>Search <strong>tweets, lists, friends &amp; favourites</strong></li>
    </ul>
    <form action="/">
      <fieldset class="who">
        <legend>Where to search</legend>
        <div>
          <label for="screen_name">Search</label>
          <?php if ($twitterInfo != null) : ?>
          <span title="Searching friends is limited to your screen name" class="input" id="auth_screen_name"><?= $twitterInfo->screen_name ?></span>  
          <?php endif ?>
          <input type="text" name="screen_name" value="<?=$screen_name?>" id="screen_name" placeholder="screen name" />
          <span>&rsquo;s</span>
        </div>
        <div class="radiogroup">
          <input type="radio" name="source" <?php if ($type == 'tweets') echo 'checked="checked" '; ?>value="timeline" id="timeline" /><label for="timeline">tweets</label>
          <input type="radio" name="source" <?php if ($type == 'favs') echo 'checked="checked" '; ?>value="favs" id="favs" /><label for="favs">favourites</label>
          <input class="authRequired" type="radio" name="source" <?php if ($type == 'withfriends') echo 'checked="checked" '; ?>value="withfriends" id="withfriends" /><label for="withfriends">friends&rsquo; tweets</label>
        </div>
        <div class="radiogroup">
          <input class="authRequired" type="radio" name="source" <?php if ($type == 'dm_sent') echo 'checked="checked" '; ?>value="dm_sent" id="dm_sent" /><label for="dm_sent">sent DMs</label>
          <input class="authRequired" type="radio" name="source" <?php if ($type == 'dm') echo 'checked="checked" '; ?>value="dm" id="dm" /><label for="dm">received DMs</label>
        </div>
      </fieldset>
      <fieldset class="for">
        <legend>What to search for</legend>
        <div>
          <label for="search">for</label>
          <input type="text" name="search" value="<?=$search?>" id="search" />
          <p class="note">You can do all the usual search stuff like <br />wrapping &ldquo;phrases in quotes&rdquo; and using OR, etc.</p>
        </div>
        <input type="submit" class="submit" value="Search" />
      </fieldset>
    </form>
  </article>
  <div id="mainFooter"></div>
  <article id="tweets">
    <aside>
      <p><a id="permalink" href="http://snapbird.org/">&raquo; Permalink to results</a></p>
      <div id="status"></div>
      <input type="button" class="search button" value="Search back further" />
    </aside>

<ul>
</ul>

    <input type="button" class="search button" value="Search back further" />
  </article>
  <footer>
    <nav>
      <ul id="navlinks">
        <li><a href="/">Search</a></li>
        <!-- <li><a href="/about">About</a></li> --> <!-- Coming soon -->
        <li><a href="http://github.com/remy/twitter-search-js">Developers</a></li>
        <?php if ($twitterInfo != null) : ?>
        <li><a id="logout" href="/">Logout</a></li>
        <?php endif ?>
      </ul>
    </nav>
    <ul id="credit">
      <li><a href="http://twitter.com/rem">Built by @rem</a></li>
      <li><a href="http://twitter.com/nicepaul">Designed by @nicepaul</a></li>
      <li><a href="http://twitter.com/stompfrog">bird by @stompfrog</a></li>
    </ul>
  </footer>
  <div id="auth">
    <div id="overlay"></div>
    <!-- nasty triple nesting, but necessary for what I'm trying to achieve...I think -->
    <div id="login">
      <div>
        <div>
          <p>We can only search within your own friends&rsquo; tweets, and you need to tell Twitter it&rsquo;s OK for us to search.</p>
          <p>Log in to Twitter and on the next screen press &ldquo;allow&rdquo;.</p>
          <p><a class="button" href="<?= $twitterObj->getAuthorizationUrl() ?>">Go to Twitter.com</a> <a class="button cancel" href="#">Cancel</a></p>
        </div>
      </div>
    </div>    
  </div>
<script src="http://ajax.googleapis.com/ajax/libs/jquery/1/jquery.min.js"></script>
<script src="/twitterlib/twitterlib.js?2009-12-31"></script>
<script src="/snapbird.js?2009-12-31"></script>
<script>
var gaJsHost = (("https:" == document.location.protocol) ? "https://ssl." : "http://www.");
document.write(unescape("%3Cscript src='" + gaJsHost + "google-analytics.com/ga.js' type='text/javascript'%3E%3C/script%3E"));
</script>
<script>
try {
var pageTracker = _gat._getTracker("UA-1656750-19");
pageTracker._trackPageview();
} catch(err) {}</script>
</body>
</html>
