importPackage(java.io);

try {
    load("/sdcard/com.googlecode.rhinoforandroid/extras/rhino/android.js");

    /** *** session managment ***** */
    var session = {};
    var uuid = '';
    if (!http.request.headers["Cookie"]) {
        importPackage(java.util);
        uuid = "" + UUID.randomUUID().toString();
        http.response.headers["Set-Cookie"] = "js_session_cookie=" + uuid;
    } else {
        uuid = http.request.headers["Cookie"];
        uuid.replace('js_session_cookie=', '');
    }
    if (!http.sessions[uuid]) {
        http.sessions[uuid] = {};
    }
    session = http.sessions[uuid];
    // time of the last use of the session
    session['last_use_date'] = new Date().getTime(); // unix timestamp in milisec

    // clean out of date sessions
    for ( var id in http.sessions) {
        if (http.sessions[id]['last_use_date'] < (new Date().getTime() - (10 * 60 * 1000))) { // ms = min*60*1000
            http.sessions[id] = null;
        }
    }
    //print("Session:" + uuid + ", " + session['last_use_date']);
    /** *** end session managment ***** */

    var droid = new Android();

    if (!session.player) {
        session.player = {
            'current' : '',
            'playlist' : {}
        };
    }
    // var mediaList = droid.mediaPlayList();
    // if (mediaList.length == 0) {
    var mediaDir = "/sdcard/Music/reflet-d-acide/bonus/";
    var file = new File(mediaDir);
    var fileList = file.listFiles();
    for ( var fIndex in fileList) {
        var curFile = fileList[fIndex];
        if (curFile.isFile()) {
            var path = "" + curFile.getAbsolutePath();
            if (!session.player.playlist[path]) {
                session.player.playlist[path] = {
                    path : path,
                    size : curFile.length(),
                    isPlaying : false
                };
            }
        }
    }
    // }

    var medias = {};
    var mediaPlayed = "";

    for ( var k in mediaList) {
        var mediaTag = mediaList[k];
        medias[mediaTag] = droid.mediaPlayInfo(mediaTag);
        if (medias[mediaTag].isplaying) {
            mediaPlayed = mediaTag;
        }
    }

    function getFirstMedia(medias) {
        for ( var k in medias) {
            return k;
        }
    }

    function getPrevMedia(medias, currentMedia) {
        var prev = "";
        for ( var k in medias) {
            if (k == currentMedia) {
                return prev;
            }
            prev = k;
        }
    }

    function getNextMedia(medias, currentMedia) {
        var found = false;
        for ( var k in medias) {
            if (found) {
                return k;
            }
            if (k == currentMedia) {
                found = true;
            }
        }
    }

    if (!session.currentMedia) {
        if (mediaPlayed != "") {
            session.currentMedia = mediaPlayed;
        } else {
            session.currentMedia = getFirstMedia(medias);
        }
    }

    // actions managment
    if (http.request.vars.action == 'play') {
        if (http.request.vars.media) {
            droid.mediaPlayPause(session.currentMedia);
            droid.mediaPlayPause(mediaPlayed);
            var ret = droid.mediaPlayStart(http.request.vars.media);
            session.currentMedia = http.request.vars.media;
            print("playstart: " + http.request.vars.media + " => " + ret);
        } else {
            droid.mediaPlayPause(session.currentMedia);
            droid.mediaPlayPause(mediaPlayed);
            var ret = droid.mediaPlayStart(session.currentMedia);
            print("play: " + session.currentMedia + " => " + ret);
        }
    }
    if (http.request.vars.action == 'pause') {
        var ret = droid.mediaPlayPause(mediaPlayed);
        print("pause: " + mediaPlayed + " => " + ret);
    }
    if (http.request.vars.action == 'bwd') {
        var p = medias[mediaPlayed].position - (5 * 1000);
        var ret = droid.mediaPlaySeek(p, mediaPlayed);
        print("Seek: " + p + " => " + ret);
    }
    if (http.request.vars.action == 'fwd') {
        var p = medias[mediaPlayed].position + (5 * 1000);
        var ret = droid.mediaPlaySeek(p, mediaPlayed);
        print("Seek: " + p + " => " + ret);
    }
    if (http.request.vars.action == 'prev') {
        var p = getPrevMedia(medias, session.currentMedia);
        var ret = droid.mediaPlayStart(p);
        print("Seek: " + p + " => " + ret);
    }
    if (http.request.vars.action == 'next') {
        var p = getNextMedia(medias, session.currentMedia);
        var ret = droid.mediaPlayStart(p);
        print("Seek: " + p + " => " + ret);
    }

    for ( var k in mediaList) {
        var mediaTag = mediaList[k];
        medias[mediaTag] = droid.mediaPlayInfo(mediaTag);
        if (medias[mediaTag].isplaying) {
            mediaPlayed = mediaTag;
        }
    }

    http.addHeader("Content-Type", "text/html");
    http.print('<html><head>');
    http.print('  <title>Audio player</title>');
    http.print('  <style type="text/css">');
    http.print('    .isplaying { background-color: #99ff99; font-weight:bold;}');
    http.print('    .isnotplaying { background-color: #dddddd; font-style:italic;}');
    http.print('  </style>');
    http.print('</head><body>');
    http.print('<h2>Audio player</h2>');
    http.print('<a href="player.js?action=prev"><img src="images/media-skip-backward.png"/></a>');
    http.print('<a href="player.js?action=bwd"><img src="images/media-seek-backward.png"/></a>');
    http.print('<a href="player.js?action=play"><img src="images/media-playback-start.png"/></a>');
    if (mediaPlayed != "") {
        http.print('<a href="player.js?action=pause"><img src="images/media-playback-pause.png"/></a>');
    }
    http.print('<a href="player.js?action=fwd"><img src="images/media-seek-forward.png"/></a>');
    http.print('<a href="player.js?action=next"><img src="images/media-skip-forward.png"/></a>');
    http.print('<table border="1">');
    http.print('<tr><td>play</td><td>tag</td><td>url</td><td>duration</td><td>position</td><td>loaded</td><td>looping</td></tr>');

    for ( var k in medias) {
        var mi = medias[k];
        http.print('<tr class="' + ((mi.isplaying) ? 'isplaying' : 'isnotplaying') + '">');
        http.print(' <td><a href="player.js?action=play&media=' + k + '"><img src="images/media-playback-start.png"/></a></td>');
        http.print(' <td>' + k + '</td>');
        http.print(' <td>' + ((mi.url) ? mi.url : '') + '</td>');
        http.print(' <td>' + ((mi.duration) ? Math.round(mi.duration / 1000) : '') + '</td>');
        http.print(' <td>' + ((mi.position) ? Math.round(mi.position / 1000) : '') + '</td>');
        http.print(' <td>' + ((mi.loaded) ? mi.loaded : '') + '</td>');
        http.print(' <td>' + ((mi.looping) ? mi.looping : '') + '</td>');
        http.print('</tr>');
    }
    http.print('</table>');

    var evTab = droid.eventPoll(1024);
    for ( var ev in evTab) {
        http.print(ev.name + ': ' + ev.data);
    }
    http.print('</body></html>');

} catch (e) {
    print(e.message + "\r\n in file " + e.sourceName + " at line " + e.lineNumber + "\r\n" + e.lineSource);
    http.response.code = "500";
    http.response.message = "Internal Server Error";
    http.print("Internal Server Error\n");
    http.print(e.message + "\r\n in file " + e.sourceName + " at line " + e.lineNumber + "\r\n" + e.lineSource);
}
