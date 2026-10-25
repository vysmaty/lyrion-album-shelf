package Plugins::AlbumShelf::Plugin;
use strict;
use warnings;
use base qw(Slim::Plugin::OPMLBased);
use Slim::Web::Pages;
use Slim::Control::Request;
use Slim::Utils::Network;
use Slim::Utils::Prefs;
use Slim::Player::Client;
use Slim::Web::HTTP;
use Slim::Utils::PluginManager;
use JSON::PP ();
use Time::HiRes ();
use Slim::Utils::Timers;
use File::Basename qw(dirname);
use File::Spec::Functions qw(catfile);

our $assetDir = catfile(dirname(__FILE__), 'HTML');
our $pageFile = catfile($assetDir, 'index.html');
my $prefs = Slim::Utils::Prefs::preferences('plugin.albumshelf');

sub _asset {
    my ($socket,$response) = @_;
    my $path = $response->request->uri->path;
    my %mime = (js=>'application/javascript; charset=utf-8', css=>'text/css; charset=utf-8', svg=>'image/svg+xml', webp=>'image/webp', png=>'image/png', ttf=>'font/ttf', txt=>'text/plain; charset=utf-8');
    my ($file,$ext) = $path =~ m{\A/plugins/AlbumShelf/([A-Za-z0-9_-]+\.(js|css|svg|webp|png|ttf|txt))\z};
    my $body = '';
    my $found = 0;
    if ($file && open my $fh, '<:raw', catfile($assetDir,$file)) {
        local $/;
        $body = <$fh>;
        close $fh;
        $found = 1;
    }
    $response->code($found ? 200 : 404);
    $response->content_type($found ? $mime{$ext} : 'text/plain; charset=utf-8');
    $response->header('Cache-Control' => 'no-cache');
    $response->header('X-Content-Type-Options' => 'nosniff');
    $response->header('Content-Length' => length($body));
    Slim::Web::HTTP::addHTTPResponse($socket,$response,\$body);
}

sub _page {
    my ($socket,$response) = @_;
    if (($response->request->uri->path || '') eq '/plugins/AlbumShelf') {
        my $query = $response->request->uri->can('query') ? $response->request->uri->query : '';
        $response->code(302);
        $response->header('Location' => 'AlbumShelf/' . (defined($query) && length($query) ? '?' . $query : ''));
        $response->header('Content-Length' => 0);
        my $empty = '';
        return Slim::Web::HTTP::addHTTPResponse($socket,$response,\$empty);
    }
    my $body = '';
    if (open my $fh, '<:raw', $pageFile) {
        local $/;
        $body = <$fh>;
        close $fh;
    }
    if (length $body) {
        $response->code(200);
        $response->content_type('text/html; charset=utf-8');
    }
    else {
        $body = 'AlbumShelf frontend is missing. Reinstall the complete plugin archive.';
        $response->code(503);
        $response->content_type('text/plain; charset=utf-8');
    }
    $response->header('Cache-Control' => 'no-cache');
    $response->header('X-Content-Type-Options' => 'nosniff');
    $response->header('Referrer-Policy' => 'same-origin');
    $response->header('Content-Length' => length($body));
    Slim::Web::HTTP::addHTTPResponse($socket,$response,\$body);
}

sub _json {
    my ($socket, $response, $code, $data) = @_;
    my $body = JSON::PP->new->utf8->encode($data);
    $response->code($code);
    $response->content_type('application/json; charset=utf-8');
    $response->header('Cache-Control' => 'no-store');
    $response->header('X-Content-Type-Options' => 'nosniff');
    $response->header('Content-Length' => length($body));
    Slim::Web::HTTP::addHTTPResponse($socket, $response, \$body);
}

sub _error {
    my ($socket,$response,$code,$error,$message) = @_;
    return _json($socket,$response,$code,{albums => [], error => $error, message => $message});
}

sub _albums {
    my ($socket, $response) = @_;
    return _error($socket,$response,405,'method_not_allowed','Use GET for album favourites.')
        unless $response->request->method eq 'GET';
    my @query = $response->request->uri->query_form;
    my @ids;
    while (@query) {
        my ($key,$value) = splice(@query,0,2);
        push @ids, $value if $key eq 'player';
    }
    return _error($socket,$response,400,'invalid_player','Select one connected LMS player.')
        unless @ids == 1 && defined($ids[0]) && $ids[0] =~ /\A[A-Za-z0-9:._-]{1,128}\z/;
    my $id = $ids[0];
    my $client = Slim::Player::Client::getClient($id);
    return _error($socket,$response,400,'invalid_player','Select one connected LMS player.')
        unless $client && $client->connected && $client->id eq $id;
    return _error($socket,$response,503,'tidal_unavailable','Enable and configure TIDAL Local in LMS.')
        unless Slim::Utils::PluginManager->isEnabled('Plugins::TIDAL::Plugin')
            && Plugins::TIDAL::Plugin->can('getFavorites');
    # One completion path for synchronous/asynchronous replies, exceptions and timeouts.
    my $done = 0;
    my $token = {};
    my $timeout;
    my $finish = sub {
        my ($code,$data) = @_;
        return if $done++;
        my $timer = $timeout;
        undef $timeout; # break the completion/timeout closure cycle
        Slim::Utils::Timers::killTimers($token,$timer);
        _json($socket,$response,$code,$data);
    };
    my $fail = sub {
        my ($code,$error,$message) = @_;
        $finish->($code,{albums=>[],error=>$error,message=>$message});
    };
    $timeout = sub { $fail->(504,'provider_timeout','TIDAL Local did not respond in time.'); };
    Slim::Utils::Timers::setTimer($token,Time::HiRes::time()+30,$timeout);
    eval {
        Plugins::TIDAL::Plugin::getFavorites($client, sub {
            my $feed = shift;
            return if $done;
            return $fail->(502,'provider_error','TIDAL Local could not read favourite albums.')
                unless ref($feed) eq 'HASH' && ref($feed->{items}) eq 'ARRAY';
            my (@albums,%seen);
            for my $item (@{$feed->{items}}) {
                next unless ref($item) eq 'HASH';
                my $url = $item->{favorites_url};
                next unless defined($url) && !ref($url) && $url =~ /^tidal:\/\/album:(\d+)\z/;
                my $albumId = "$1";
                next if $seen{$albumId}++;
                next unless defined($item->{line1}) && !ref($item->{line1});
                my $artist = $item->{line2};
                $artist = '' if !defined($artist) || ref($artist);
                my $art = $item->{image};
                $art = '' unless defined($art) && !ref($art) && $art !~ /[\x00-\x20\x7f]/
                    && $art =~ m{\A(?:https?://[^/]+/|/(?!/))}i;
                push @albums, {id=>$albumId,title=>"$item->{line1}",artist=>"$artist",artwork=>$art};
            }
            $finish->(200,{albums=>\@albums,player=>$id,source=>'tidal-local'});
        }, {quantity => 2}, {type => 'albums'});
        1;
    } or $fail->(502,'provider_error','TIDAL Local could not read favourite albums.');
}

sub initPlugin {
    my $class = shift;
    $class->SUPER::initPlugin(feed => \&_appFeed, tag => 'albumshelf', is_app => 1);
    $prefs->init({publicUrl => ''});
    Slim::Web::Pages->addRawFunction(qr{^/plugins/AlbumShelf(?:/(?:index\.html)?)?$}, \&_page);
    Slim::Web::Pages->addRawFunction(qr{^/plugins/AlbumShelf/albums\.json$}, \&_albums);
    Slim::Web::Pages->addRawFunction(qr{^/plugins/AlbumShelf/[A-Za-z0-9_-]+\.(?:js|css|svg|webp|png|ttf|txt)$}, \&_asset);
    Slim::Web::Pages->addPageLinks('plugins', { PLUGIN_ALBUMSHELF => '/plugins/AlbumShelf/' });
}

sub initCLI {
    my $class = shift;
    $class->SUPER::initCLI(@_);
    Slim::Control::Request::addDispatch(['albumshelf','items','_index','_quantity'],[0,1,1,\&_appItems]);
    Slim::Control::Request::addDispatch(['albumshelf','publicurl','?'],[0,1,0,\&_publicUrl]);
    Slim::Control::Request::addDispatch(['albumshelf','publicurl','_url'],[0,0,1,\&_publicUrl]);
}

sub _normalizePublicUrl {
    my $value = shift;
    return undef if !defined($value) || ref($value) || length($value) > 2048 || $value =~ /[\x00-\x1f\x7f\\]/;
    $value =~ s/^ +| +$//g;
    return '' unless length($value);
    my ($scheme,$host,$port,$path) = $value =~ m{\A(https?)://(\[[A-Fa-f0-9:.]+\]|[A-Za-z0-9](?:[A-Za-z0-9.-]*[A-Za-z0-9])?)(?::(\d{1,5}))?(/[A-Za-z0-9._~!\$&'()*+,;=:\@%/-]*)?\z}i;
    return undef unless $scheme && (!defined($port) || ($port > 0 && $port <= 65535));
    $path ||= '';
    $path =~ s{/$}{};
    $path = '/plugins/AlbumShelf' unless length($path);
    return undef unless $path =~ m{/plugins/AlbumShelf\z};
    return lc($scheme) . '://' . lc($host) . (defined($port) ? ':' . $port : '') . $path . '/';
}

sub _standaloneUrl {
    my $configured = _normalizePublicUrl($prefs->get('publicUrl'));
    return $configured || Slim::Utils::Network::serverURL() . '/plugins/AlbumShelf/';
}

sub _publicUrl {
    my $request = shift;
    my $value = $request->getParam('_url');
    if (defined($value)) {
        my $normalized = _normalizePublicUrl($value);
        return $request->setStatusBadParams() unless defined($normalized);
        $prefs->set('publicUrl',$normalized);
    }
    $request->addResult('publicurl',$prefs->get('publicUrl') || '');
    $request->addResult('url',_standaloneUrl());
    $request->setStatusDone();
}

sub _appItems {
    my $request = shift;
    my $url = _standaloneUrl();
    my $start = $request->getParam('_index');
    $start = 0 unless defined($start) && $start =~ /^\d+\z/;
    my $quantity = $request->getParam('_quantity');
    $quantity = 1 unless defined($quantity) && $quantity =~ /^\d+\z/;
    if ($start == 0 && $quantity > 0) {
        $request->addResultLoop('item_loop',0,'text',$url);
        $request->addResultLoop('item_loop',0,'weblink',$url);
        $request->addResultLoop('item_loop',0,'parseURLs',1);
    }
    $request->addResult('count',1);
    $request->addResult('offset',$start);
    $request->addResult('window',{windowStyle=>'text_list'});
    $request->setStatusDone();
}

sub _appFeed {
    my ($client, $cb) = @_;
    $cb->({items => [{name => _standaloneUrl(), type => 'text',
        weblink => _standaloneUrl(),
        parseURLs => 1}]});
}
1;
