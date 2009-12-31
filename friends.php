<?php
include('auth/secret.php');
include('auth/php/EpiCurl.php');
include('auth/php/EpiOAuth.php');
include('auth/php/EpiTwitter.php');

$twitterObj = new EpiTwitter(TWITTER_CONSUMER_KEY, TWITTER_CONSUMER_SECRET);
$twitterInfo = null;
$timeline = null;

$callback = $_GET['callback'];
$page = isset($_GET['page']) ? $_GET['page'] : 1;
$type = isset($_GET['type']) ? $_GET['type'] : 'statusesFriends_timeline';
$data = '[]';

if ($_COOKIE['token'] && file_exists('auth/oauth/' . $_COOKIE['token'])) {
	$username = file_get_contents('auth/oauth/' . $_COOKIE['token']);
	$userToken = $_COOKIE['token'];
	$userSecret = file_get_contents('auth/oauth/' . $username . '-sec');

	$twitterObj->setToken($userToken, $userSecret);
	$twitterInfo = $twitterObj->get_accountVerify_credentials();

	// why I have to probe twitterInfo I'll never know
	if ($twitterInfo->screen_name) {}

	$method = "get_" . $type;
  $timeline = $twitterObj->$method(array('count' => 200, 'page' => $page));

  $data = json_encode($timeline->response);
} 

echo $callback . '(' . $data . ')';
?>