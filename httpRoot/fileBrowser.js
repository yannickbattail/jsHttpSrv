var fileBrowser = document.getElementById("fileBrowser");
currentDir = "./";

function refreshFileBrowser(data) {
  var fileBrowser = document.getElementById("fileBrowser");
  fileBrowser.innerHTML = "";
  try {
    var files = eval(data);
  } catch (e) {
    // alert(e);
  }
  fileBrowser.innerHTML += '<tr onclick="changeDir(\'..\');" ><td class="dir">[parent directory]</td><td></td></tr>';
  for ( var fk in files) {
    var f = files[fk];
    // alert("file: " + f.name);
    if (f.type == 'dir') {
      fileBrowser.innerHTML += '<tr onclick="changeDir(\'' + f.name + '\');" ><td class="' + f.type + '">' + f.name + '</td><td>' + humanReadableByteCount(f.size, false) + '</td></tr>';
    } else {
      fileBrowser.innerHTML += '<tr onclick="addFile(\'' + f.name + '\');" ><td class="' + f.type + '">' + f.name + '</td><td>' + humanReadableByteCount(f.size, false) + '</td></tr>';
    }
  }
}

function updateFileBrowser() {
  if (this.readyState == 4 && this.status == 200) {
    // so far so good
    if (this.responseText != null) {
      // success!
      // alert("responseText: "+this.responseText);
      refreshFileBrowser(this.responseText);
    } else {
      alert("no responseText");
    }
  } else if (this.readyState == 4 && this.status != 200) {
    // fetched the wrong page or network error...
    alert("net error");
  }
}

function humanReadableByteCount(bytes, si) {
  var unit = si ? 1000 : 1024;
  if (bytes < unit) return bytes + " B";
  var exp = Math.round(Math.log(bytes) / Math.log(unit));
  var pre = (si ? "kMGTPE" : "KMGTPE").charAt(exp - 1) + (si ? "" : "i");
  return "" + new Number(bytes / Math.pow(unit, exp)).toFixed(2) + pre;
}

function changeDir(dir) {
  currentDir += "/" + dir;
  // alert("currentDir: " + currentDir);
  var client = new XMLHttpRequest();
  client.onreadystatechange = updateFileBrowser;
  client.open("GET", currentDir + "?format=json");
  client.send();
  return null;
}

function addFile(file) {
  var f = currentDir + "/" + file;
  // alert("file: " + f);
  doAction('addMedia', {
    'media' : f
  });
  return null;
}

changeDir("");

function updatePlayListContent(data) {
  var playlist = document.getElementById("playlist");
  playlist.innerHTML = "";
  try {
    var medias = eval(data);
  } catch (e) {
    // alert(e);
  }
  var html = '<tr><th>play</th><th>url</th><th>duration</th><th>position</th><th>del</th></tr>';
  for ( var k in medias) {
    var media = medias[k];
    // alert(media.toSource());
    if (media.isplaying) {
      html += '<tr class="isplaying">';
    } else {
      html += '<tr class="isnotplaying">';
    }
    html += ' <td><button class="play"  onclick="doAction(\'play\' , {\'media\' : ' + k + ' });" /></td>';
    html += ' <td>' + ((media.url) ? media.url : '') + '</td>';
    html += ' <td>' + ((media.duration) ? Math.round(media.duration / 1000) : '?') + 's<br />' + humanReadableByteCount(media.size) + '</td>';
    html += ' <td>' + ((media.position) ? Math.round(media.position / 1000) : '') /* media.loaded media.looping */+ '</td>';
    html += ' <td><button class="delMedia"  onclick="doAction(\'delMedia\' , {\'media\' : ' + k + ' });" /></td>';
    html += '</tr>';
  }
  playlist.innerHTML += html;
}

function updatePlayList() {
  if (this.readyState == 4 && this.status == 200) {
    // so far so good
    if (this.responseText != null) {
      // success!
      // alert("responseText: "+this.responseText);
      updatePlayListContent(this.responseText);
    } else {
      alert("no responseText");
    }
    setTimeout(refreshPlayList, 3000);
  } else if (this.readyState == 4 && this.status != 200) {
    // fetched the wrong page or network error...
    alert("net error");
    setTimeout(refreshPlayList, 3000);
  }
}

function refreshPlayList() {
  var client = new XMLHttpRequest();
  client.onreadystatechange = updatePlayList;
  client.open("GET", "player.js?action=getPlayList");
  client.send();
  return null;
}

function actionHandler() {
  if (this.readyState == 4 && this.status == 200) {
    // so far so good
    if (this.responseText != null) {
      // success!
      document.getElementById('info').style.visibility = 'visible';
      document.getElementById('info').innerHTML = this.responseText;
      setTimeout("document.getElementById('info').style.visibility = 'hidden';", 3000);
    } else {
      alert("no responseText");
    }
  } else if (this.readyState == 4 && this.status != 200) {
    // fetched the wrong page or network error...
    alert("net error");
  }
}

function doAction(action, params) {
  var client = new XMLHttpRequest();
  client.onreadystatechange = actionHandler;
  var url = "player.js?action=" + action;
  for ( var paramKey in params) {
    var paramValue = params[paramKey];
    url += "&" + paramKey + "=" + paramValue;
  }
  client.open("GET", url);
  client.send();
  return null;
}

setTimeout(refreshPlayList, 500);
