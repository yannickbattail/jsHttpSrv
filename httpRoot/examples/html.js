http.addHeader("Content-Type", "text/html");

http.print('<html><head><title>' + http.request.url + '</title></head><body>');
http.print('<h2>In script: ' + http.request.url + '</h2>');
http.print('Script parameters: <br />');
http.print('<table border="1">');
http.print('<tr><th>param</th><th>value</th></tr>');
for ( var v in http.request.vars) {
    http.print('<tr><td>' + v + '</td><td>' + http.request.vars[v] + '</td></tr>');
}
http.print('</table><br />');
/*
http.print('<img src="images/media-skip-backward.png"/>');
http.print('<img src="images/media-seek-backward.png"/>');
http.print('<img src="images/media-playback-start.png"/>');
http.print('<img src="images/media-playback-pause.png"/>');
http.print('<img src="images/media-playback-stop.png"/>');
http.print('<img src="images/media-record.png"/>');
http.print('<img src="images/media-seek-forward.png"/>');
http.print('<img src="images/media-skip-forward.png"/>');
*/
http.print('<form action="./html.js" method="post">');
http.print('    <input type="text" name="toto" value="tata" />');
http.print('    <input type="submit" name="go" value="go" />');
http.print('</form>');

http.print('</body></html>');
