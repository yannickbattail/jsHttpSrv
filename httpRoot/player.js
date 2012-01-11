importPackage(java.io);

try {
  
  function initSession() {
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
    // print("Session:" + uuid + ", " + session['last_use_date']);
    return session;
  }
  
  function getMediaIndex(medias, media) {
    for ( var k in medias) {
      if (medias[k].url == media) {
        return k;
      }
    }
    return null;
  }
  
  function pauseAll(stop) {
    var playList = droid.mediaPlayList();
    for ( var k in playList) {
      var tag = playList[k];
      droid.mediaPlayPause(tag);
      if (stop) {
        droid.mediaPlayClose(tag);
      }
    }
  }
  
  function isPlaying() {
    var playList = droid.mediaPlayList();
    for ( var k in playList) {
      var tag = playList[k];
      var mediaInfo = droid.mediaPlayInfo(tag);
      if (mediaInfo.isplaying) {
        return true;
      }
    }
  }
  
  function printList(medias) {
    http.print('<table id="playlist">');
    http.print('<tr><td>play</td><td>tag</td><td>url</td><td>duration</td><td>position</td><td>loaded</td><td>looping</td></tr>');
    /*
     * for ( var k in session.medias) { var mi = session.medias[k]; http.print('<tr class="' + ((mi.isplaying) ? 'isplaying' : 'isnotplaying') + '">'); http.print(' <td><a
     * href="player.js?action=play&media=' + k + '"><img src="images/media-playback-start.png"/></a></td>'); http.print(' <td>' + k + '</td>'); http.print(' <td>' + ((mi.url) ? mi.url : '') + '</td>');
     * http.print(' <td>' + ((mi.duration) ? Math.round(mi.duration / 1000) : '') + '</td>'); http.print(' <td>' + ((mi.position) ? Math.round(mi.position / 1000) : '') + '</td>'); http.print('
     * <td>' + ((mi.loaded) ? mi.loaded : '') + '</td>'); http.print(' <td>' + ((mi.looping) ? mi.looping : '') + '</td>'); http.print('</tr>'); }
     */
    http.print('</table>');
  }
  
  function fileBrowser() {
    if (!session.currentDir) {
      session.currentDir = "./";
    }
    http.print('<table id="fileBrowser">');
    http.print('</table>');
    http.print('<script type="text/javascript">');
    http.print(readFile('/sdcard/sl4a/scripts/httpSrv/httpRoot/fileBrowser.js'));
    http.print('</script>');
  }
  
  function manageActions(session) {
    var mapAction = {
      'addMedia' : actionAddMedia,
      'delMedia' : actionDelMedia,
      'play' : actionPlay,
      'pause' : actionPause,
      'bwd' : actionBwd,
      'fwd' : actionFwd,
      'prev' : actionPrev,
      'next' : actionNext,
      'getPlayList' : actionGetPlayList
    };
    
    if (mapAction[http.request.vars.action]) {
      var fct = mapAction[http.request.vars.action];
      var ret = fct.call(fct, session);
      if (ret) {
        http.print(ret);
        // print(ret);
      } else {
        http.print('.');
      }
    } else {
      print('unknown action ' + http.request.vars.action);
    }
  }
  
  function actionAddMedia(session) {
    if (http.request.vars.media != '') {
      var fileInfo = libUtil.file.getFileInfo('/sdcard/sl4a/' + http.request.vars.media);
      if (fileInfo && fileInfo.isFile) {
        // print('add file: '+'' + JSON.stringify(fileInfo, null, 4));
        var url = 'file://' + fileInfo.absolutePath;
        if (getMediaIndex(session.medias, url) == null) {
          var ret = droid.mediaPlay(url, url, false);
          if (ret) {
            var mediaInfo = droid.mediaPlayInfo(url);
            session.medias.push({
              'url' : url,
              'duration' : mediaInfo.duration,
              'size' : fileInfo.size,
              'position' : mediaInfo.position,
              'loaded' : mediaInfo.loaded,
              'looping' : mediaInfo.looping,
              'isplaying' : mediaInfo.isplaying
            });
            return 'added: ' + url;
          } else {
            return 'audio file not readable: ' + http.request.vars.media;
          }
        } else {
          return 'file already in playlist: ' + http.request.vars.media;
        }
      } else {
        return 'file not found: ' + http.request.vars.media;
      }
    }
  }
  
  function actionDelMedia(session) {
    if (http.request.vars.media != '') {
      session.medias.splice(1 * http.request.vars.media, 1);
      return 'deleted from playlist: ' + http.request.vars.media;
    } else {
      return 'not found, not deleted.';
    }
  }
  
  function actionPlay(session) {
    pauseAll(true);
    if (http.request.vars.media) {
      if (session.medias[1 * http.request.vars.media]) {
        session.currentMedia = http.request.vars.media;
      } else {
        return "no element " + http.request.vars.media + " in playlist.";
      }
    }
    if (!session.medias[session.currentMedia]) {
      session.currentMedia = 0;
    }
    if (session.medias[session.currentMedia]) {
      var url = session.medias[session.currentMedia].url;
      var ret = droid.mediaPlay(url, url);
      session.play = true;
      return 'play ' + url;
      print("playstart: " + url + " => " + ret);
    } else {
      return 'not current element in playlist';
    }
  }
  
  function actionPause(session) {
    pauseAll(false);
    session.play = false;
    return "pause";
  }
  
  function actionBwd(session) {
    var media = session.medias[session.currentMedia];
    if (media.isPlaying) {
      var p = media.position - (5 * 1000); // - 5s
      if (p < 0) {
        p = 0;
      }
      droid.mediaPlaySeek(p, media.url);
      return 'Move 5s backward.';
    } else {
      return 'nothing curently playing.';
    }
  }
  
  function actionFwd(session) {
    var media = session.medias[session.currentMedia];
    if (media.isPlaying) {
      var p = media.position + (5 * 1000); // + 5s
      if (p >= media.duration) {
        p = media.duration - 500;
      }
      droid.mediaPlaySeek(p, media.url);
      return 'Move 5s forward.';
    } else {
      return 'nothing curently playing.';
    }
  }
  
  function actionPrev(session) {
    pauseAll(true);
    session.currentMedia--;
    if (session.currentMedia >= session.medias.length) {
      session.currentMedia = 0;
    } else if (session.currentMedia < 0) {
      session.currentMedia = session.medias.length - 1;
    }
    return actionPlay(session);
  }
  
  function actionNext(session) {
    pauseAll(true);
    session.currentMedia++;
    if (session.currentMedia >= session.medias.length) {
      session.currentMedia = 0;
    } else if (session.currentMedia < 0) {
      session.currentMedia = session.medias.length - 1;
    }
    return actionPlay(session);
  }
  
  function actionGetPlayList(session) {
    if (session.play && !isPlaying()) {
      actionNext(session);
    }
    for ( var k in session.medias) {
      var media = session.medias[k];
      var mediaInfo = droid.mediaPlayInfo(media.url);
      if (mediaInfo) {
        media.position = mediaInfo.position;
        media.loaded = mediaInfo.loaded;
        media.looping = mediaInfo.looping;
        media.isplaying = mediaInfo.isplaying;
      } else {
        media.position = 0;
        media.loaded = false;
        media.looping = false;
        media.isplaying = false;
      }
    }
    return '' + JSON.stringify(session.medias, null, 4);
  }
  
  libUtil = {};
  load("/sdcard/sl4a/scripts/httpSrv/libUtil/file.js");
  if (libUtil.file.getFileInfo("/sdcard/com.googlecode.rhinoforandroid/extras/rhino/android.js")) {
    load("/sdcard/com.googlecode.rhinoforandroid/extras/rhino/android.js");
  } else {
    load("../libUtil/android.js");
  }
  droid = new Android();
  
  var session = {};
  session = initSession();
  
  if (!session.medias) {
    session.medias = [];
  }
  if (!session.currentMedia) {
    session.currentMedia = 0;
  }
  if (session.play == undefined) {
    session.play = false;
  }
  
  if (http.request.vars.action) {
    manageActions(session);
  } else {
    http.addHeader("Content-Type", "text/html ; charset=UTF-8");
    http.print('<!DOCTYPE html><html><head>');
    http.print('<title>Audio player</title>');
    http.print('<link rel="stylesheet" type="text/css" href="conso.css" />');
    http.print('</head><body>');
    http.print('<h2>Audio player</h2>');
    http.print('<div id="controls">');
    http.print('<img src="images/media-skip-backward.png" onclick="doAction(\'prev\', {});" />');
    http.print('<img src="images/media-seek-backward.png" onclick="doAction(\'bwd\', {});" />');
    http.print('<img src="images/media-playback-start.png" onclick="doAction(\'play\', {});" />');
    http.print('<img src="images/media-playback-pause.png" onclick="doAction(\'pause\', {});" />');
    http.print('<img src="images/media-seek-forward.png" onclick="doAction(\'fwd\', {});" />');
    http.print('<img src="images/media-skip-forward.png" onclick="doAction(\'next\', {});" />');
    http.print('</div>');
    http.print('<br />');
    printList(session.medias);
    
    http.print('<br />');
    http.print('<div id="info">info</div>');
    http.print('<br />');
    
    fileBrowser();
    http.print('</body></html>');
  }
  
} catch (e) {
  print(e.message + "\r\n in file " + e.sourceName + " at line " + e.lineNumber + "\r\n" + e.lineSource);
  http.response.code = "500";
  http.response.message = "Internal Server Error";
  http.print("Internal Server Error\n");
  http.print(e.message + "\r\n in file " + e.sourceName + " at line " + e.lineNumber + "\r\n" + e.lineSource);
}
