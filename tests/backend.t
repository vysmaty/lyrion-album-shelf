use strict;
use warnings;
use Test::More;
use JSON::PP;
use FindBin;
# LMS boundary stubs, NOT a real server/provider integration test.
BEGIN {
    $INC{'Slim/Control/Request.pm'}=1;
    $INC{'Slim/Plugin/OPMLBased.pm'}=1;
    $INC{'Slim/Player/Client.pm'}=1;
    $INC{'Slim/Web/Pages.pm'}=1;
    $INC{'Slim/Web/HTTP.pm'}=1;
    $INC{'Slim/Utils/PluginManager.pm'}=1;
    $INC{'Slim/Utils/Timers.pm'}=1;
    $INC{'Slim/Utils/Strings.pm'}=1;
    $INC{'Slim/Utils/Network.pm'}=1;
    $INC{'Slim/Utils/JSON.pm'}=1;
}
{ package Slim::Plugin::OPMLBased; our %init; sub initPlugin {shift; %init=@_} sub initCLI {} }
{ package Slim::Control::Request; our @dispatch; sub addDispatch {push @dispatch, [@_]} }
{ package Slim::Utils::JSON; sub to_json { JSON::PP->new->utf8->encode($_[0]) } }
{ package Slim::Player::Client; our %clients; sub getClient { $clients{$_[0]} } }
{ package TestClient; sub id {'existing'} sub connected {1} }
{ package Slim::Web::Pages; our @raw; our %links; sub addRawFunction {shift; push @raw, [@_]} sub addPageLinks {shift; $links{$_[0]}=$_[1]} }
{ package Slim::Utils::PluginManager; our $enabled=1; sub isEnabled {$enabled} }
{ package Slim::Utils::Timers; our @timers; sub setTimer {push @timers, [@_]} sub killTimers {@timers=()} }
{ package Slim::Utils::Strings; sub string {'Album Shelf'} }
{ package Slim::Utils::Network; sub serverURL {'http://localhost:9000'} }
{ package Slim::Web::HTTP; our @sent; sub addHTTPResponse {push @sent, [@_]} }
{ package Plugins::TIDAL::Plugin; our @calls; our $result={items=>[]}; our $die=0; our $defer=0; sub getFavorites {push @calls, [@_]; die 'secret-token' if $die; $_[1]->($result) unless $defer} }
my $path=$ENV{ALBUMSHELF_PLUGIN} || "$FindBin::Bin/../plugin/AlbumShelf/Plugin.pm";
my $loaded=eval {require $path; 1};
ok($loaded, 'plugin loads against explicitly stubbed LMS boundary') or BAIL_OUT($@);
Plugins::AlbumShelf::Plugin->initPlugin;
is($Slim::Plugin::OPMLBased::init{tag}, 'albumshelf', 'standalone app registered');
ok($Slim::Plugin::OPMLBased::init{is_app}, 'appears in Apps');
my $feed;
$Slim::Plugin::OPMLBased::init{feed}->(undef, sub {$feed=shift});
is($feed->{items}[0]{weblink}, 'http://localhost:9000/plugins/AlbumShelf/', 'App opens standalone page');
is(scalar @Slim::Web::Pages::raw, 3, 'standalone HTML, static asset and album JSON routes registered');
# Minimal HTTP objects only at the LMS integration boundary.
{ package TestURI; sub query_form { @{$_[0]{query}} } sub path { $_[0]{path} } }
{ package TestRequest; sub uri {bless {query=>$_[0]{query},path=>$_[0]{path}}, 'TestURI'} sub method {$_[0]{method}} }
{ package TestResponse; sub new {bless {query=>$_[1],method=>($_[2] || 'GET'),path=>$_[3]}, $_[0]} sub request {bless {query=>$_[0]{query},method=>$_[0]{method},path=>$_[0]{path}}, 'TestRequest'} sub code {$_[0]{code}=$_[1]} sub content_type {$_[0]{type}=$_[1]} sub header {$_[0]{headers}{$_[1]}=$_[2]} }
$Slim::Player::Client::clients{existing}=bless {}, 'TestClient';
$Plugins::TIDAL::Plugin::result={items=>[{line1=>'Record',line2=>'Artist',favorites_url=>'tidal://album:123',image=>'https://example.org/cover.jpg'}]};
my $res=TestResponse->new([player=>'existing']);
my $handled=eval {Plugins::AlbumShelf::Plugin::_albums('socket', $res); 1};
ok($handled, 'read-only album route executes') or diag $@;
is($res->{code},200,'albums request succeeds');
my $body=@Slim::Web::HTTP::sent ? JSON::PP->new->utf8->decode(${ $Slim::Web::HTTP::sent[-1][2] }) : {};
is_deeply($body->{albums},[{id=>'123',title=>'Record',artist=>'Artist',artwork=>'https://example.org/cover.jpg'}],'provider menu converted to credential-free album DTO');
is($body->{player},'existing','selected player echoed');
my $call=$Plugins::TIDAL::Plugin::calls[-1] || [];
is($call->[0], $Slim::Player::Client::clients{existing}, 'selected player passed to provider');
is_deeply($call->[3],{type=>'albums'},'only favourite albums read');
is($res->{headers}{'Cache-Control'},'no-store','personal favourites never cached');
sub request_albums {
    my ($query,$method)=@_;
    my $r=TestResponse->new($query,$method);
    Plugins::AlbumShelf::Plugin::_albums('socket',$r);
    return ($r, JSON::PP->new->utf8->decode(${ $Slim::Web::HTTP::sent[-1][2] }));
}
for my $case ([[], 'missing player'], [[player=>'unknown'],'unknown player'], [[player=>"bad\nvalue"],'control characters'], [[player=>'existing',player=>'unknown'],'duplicate player']) {
    my $before=@Plugins::TIDAL::Plugin::calls;
    my ($r,$b)=request_albums($case->[0]);
    is($r->{code},400,"reject $case->[1]");
    is_deeply($b->{albums},[],"$case->[1] has empty albums");
    is(scalar @Plugins::TIDAL::Plugin::calls,$before,"$case->[1] does not call provider");
}
{ package DisconnectedClient; sub connected {0} }
$Slim::Player::Client::clients{offline}=bless {},'DisconnectedClient';
my ($off)=request_albums([player=>'offline']);
is($off->{code},400,'disconnected player rejected');
my ($post)=request_albums([player=>'existing'],'POST');
is($post->{code},405,'only GET accepted');
$Slim::Utils::PluginManager::enabled=0;
my $before_missing=@Plugins::TIDAL::Plugin::calls;
my ($missing,$mb)=request_albums([player=>'existing']);
is($missing->{code},503,'disabled TIDAL Local returns service unavailable');
is(scalar @Plugins::TIDAL::Plugin::calls,$before_missing,'disabled provider not called');
$Slim::Utils::PluginManager::enabled=1;
$Plugins::TIDAL::Plugin::die=1;
my $caught=eval {my ($r,$b)=request_albums([player=>'existing']); is($r->{code},502,'provider exception becomes bad gateway'); unlike($b->{message},qr/secret/,'provider exception secrets not returned'); 1};
ok($caught,'provider exception contained');
$Plugins::TIDAL::Plugin::die=0;
$Plugins::TIDAL::Plugin::result={items=>undef};
my $invalid=eval {my ($r)=request_albums([player=>'existing']); is($r->{code},502,'undefined provider result is not an empty collection'); 1};
ok($invalid,'malformed provider result contained');
$Plugins::TIDAL::Plugin::result={items=>[]};
my ($empty,$eb)=request_albums([player=>'existing']);
is($empty->{code},200,'empty collection succeeds');
is_deeply($eb->{albums},[],'empty collection contains no albums');
$Plugins::TIDAL::Plugin::result={items=>[
    {favorites_url=>'tidal://album:7',line1=>'Valid',line2=>'Artist',image=>'javascript:alert(1)'},
    {favorites_url=>'tidal://album:7',line1=>'Duplicate'},
    {favorites_url=>'tidal://track:8',line1=>'Not an album'},
    {favorites_url=>'tidal://album:9',line1=>{},image=>'/imageproxy/cover'},
    undef,
]};
my ($filtered,$fb)=request_albums([player=>'existing']);
is($filtered->{code},200,'individual malformed entries cannot crash collection');
is_deeply($fb->{albums},[{id=>'7',title=>'Valid',artist=>'Artist',artwork=>''}],'deduplicates album IDs, excludes non-albums and rejects unsafe artwork');
$Plugins::TIDAL::Plugin::defer=1;
my $pending=TestResponse->new([player=>'existing']);
my $start=@Slim::Web::HTTP::sent;
Plugins::AlbumShelf::Plugin::_albums('socket',$pending);
is(scalar @Slim::Web::HTTP::sent,$start,'asynchronous provider does not send prematurely');
ok(@Slim::Utils::Timers::timers,'provider request has a timeout');
my $timer=$Slim::Utils::Timers::timers[-1];
$timer->[2]->() if $timer;
is($pending->{code},504,'stalled provider times out');
$Plugins::TIDAL::Plugin::calls[-1][1]->({items=>[]});
is(scalar @Slim::Web::HTTP::sent,$start+1,'late callback cannot send a second response');
$Plugins::TIDAL::Plugin::defer=0;
my $page_ok=eval {
    local $Plugins::AlbumShelf::Plugin::pageFile="$FindBin::Bin/fixtures/page.html";
    my $r=TestResponse->new([]);
    Plugins::AlbumShelf::Plugin::_page('socket',$r);
    is($r->{code},200,'standalone page served');
    is($r->{type},'text/html; charset=utf-8','page content type');
    like(${ $Slim::Web::HTTP::sent[-1][2] },qr/AlbumShelf test fixture/,'actual page bytes returned');
    is($r->{headers}{'Referrer-Policy'},'same-origin','page limits referrer disclosure');
    1;
};
ok($page_ok,'standalone handler executes') or diag $@;
my $page_missing=eval {
    local $Plugins::AlbumShelf::Plugin::pageFile="$FindBin::Bin/fixtures/absent.html";
    my $r=TestResponse->new([]);
    Plugins::AlbumShelf::Plugin::_page('socket',$r);
    is($r->{code},503,'missing frontend reported without crashing LMS');
    1;
};
ok($page_missing,'missing page handled');
my $asset_ok=eval {
    no warnings 'once';
    local $Plugins::AlbumShelf::Plugin::assetDir="$FindBin::Bin/fixtures";
    my $r=TestResponse->new([],'GET','/plugins/AlbumShelf/test.js');
    Plugins::AlbumShelf::Plugin::_asset('socket',$r);
    is($r->{code},200,'root-relative frontend asset served');
    is($r->{type},'application/javascript; charset=utf-8','asset MIME type');
    like(${ $Slim::Web::HTTP::sent[-1][2] },qr/fixture/,'actual asset bytes');
    my $bad=TestResponse->new([],'GET','/plugins/AlbumShelf/../../Plugin.pm');
    Plugins::AlbumShelf::Plugin::_asset('socket',$bad);
    is($bad->{code},404,'asset path traversal rejected');
    1;
};
ok($asset_ok,'asset route executes') or diag $@;
$Slim::Player::Client::clients{alias}=$Slim::Player::Client::clients{existing};
my ($alias)=request_albums([player=>'alias']);
is($alias->{code},400,'LMS name/IP alias cannot substitute for exact player ID');
is($feed->{items}[0]{type},'text','web app feed is a link to open, not a feed to fetch');
{ package TestCLI; sub getParam {$_[0]{params}{$_[1]}} sub addResultLoop {$_[0]{$_[1]}[$_[2]]{$_[3]}=$_[4]} sub addResult {$_[0]{$_[1]}=$_[2]} sub setStatusDone {$_[0]{done}=1} }
Plugins::AlbumShelf::Plugin->initCLI;
ok(@Slim::Control::Request::dispatch,'controller app dispatch registered');
my $cli=bless {params=>{_index=>0,_quantity=>1}},'TestCLI';
my $cli_ok=eval {Plugins::AlbumShelf::Plugin::_appItems($cli); 1};
ok($cli_ok,'controller Apps handler executes') or diag $@;
is($cli->{item_loop}[0]{weblink},'http://localhost:9000/plugins/AlbumShelf/','controller receives followable standalone link');
is($cli->{item_loop}[0]{text},$cli->{item_loop}[0]{weblink},'Material parseURLs sees URL as first text');
ok($cli->{done},'Apps query completed');
my $paged=bless {params=>{_index=>1,_quantity=>1}},'TestCLI';
my $paged_ok=eval {Plugins::AlbumShelf::Plugin::_appItems($paged); 1};
ok($paged_ok,'out-of-range page handled');
is($paged->{count},1,'Apps pagination reports total');
ok(!$paged->{item_loop},'no duplicate item on out-of-range page');
done_testing;
