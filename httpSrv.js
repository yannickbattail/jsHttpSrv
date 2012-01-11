importPackage(java.io);
importPackage(java.net);
importPackage(java.util);
importPackage(java.lang);

libUtil = {};

if (new java.io.File('/sdcard/com.googlecode.rhinoforandroid/extras/rhino/android.js').exists()) { // in android system
  libUtil.httpSrvDir = '/sdcard/sl4a/scripts/httpSrv/';
} else {
  libUtil.httpSrvDir = '../';;
}

libUtil.httpRoot = libUtil.httpSrvDir + "httpRoot/";

lastSocket = null;
sessions = {};
main();

function main() {
  // Set the port number.
  var port = 8080;
  
  try {
    var socketSrv = new ServerSocket(port);
    
    print("\n" + "Waiting on port " + port + ".\n");
    
    // Process HTTP service requests in an infinite loop.
    while (true) {
      try {
        var socketClient = socketSrv.accept();
        print("socket accept: " + socketClient);
        var tm = new threadManagment(socketClient);
        tm.sock = socketClient;
        lastSocket = socketClient;
        tm.spawnWay();
        // tm.threadedWay();
      } catch (e) {
        print("Could not accept socket connection\n\n" + e);
      }
    }
  } catch (e) {
    print("Could not open port " + port + " for listening.\n\n" + e);
  }
}

function threadManagment(socketClient) {
  this.sock = socketClient;
  
  // Implement the run() method of the Runnable interface.
  this.run = function() {
    // print("RUN in the thread");
    try {
      this.threadWork();
    } catch (e) {
      print("Could not process HTTP Request.\n\n" + e);
    }
  };
  
  this.threadedWay = function() {
    // print("threaded Way");
    try {
      // var run = new java.lang.Runnable(handler);
      var run = new JavaAdapter(java.lang.Runnable, this);
      var clientThread = new Thread(run);
      clientThread.start();
    } catch (e) {
      print("Could not process HTTP Request.\n\n" + e);
    }
  };
  
  this.spawnWay = function() {
    // print("spawn Way");
    try {
      spawn(this.threadWork);
    } catch (e) {
      print("Could not process HTTP Request.\n\n" + e);
    }
  };
  
  this.threadWork = function() {
    // print("thread Work " + lastSocket);
    parser = new httpParser(lastSocket);
    parser.handleSocket();
  };
  this.threadWork.socket = socketClient;
}

/**
 * 
 * Implement the Runnable interface.
 */
function httpParser(sock) {
  this.socket = sock;
  this.request = new HttpRequest();
  this.response = new HttpResponse();
  this.sessions = {};
  
  this.handleSocket = function() {

    // print("processRequest");
    // Get a reference to the socket's input and output streams.
    var inStream = new InputStreamReader(this.socket.getInputStream());
    var outStream = new DataOutputStream(this.socket.getOutputStream());
    
    // Set up input stream filters.
    var bufStreamIn = new BufferedReader(inStream);
    
    try {
      while (true) {
        this.processRequest(bufStreamIn, outStream);
      }
    } catch (e) {
      if (e.message != "connection closed") {
        print("handleSocket: " + e.message + "\r\n in file " + e.sourceName + " at line " + e.lineNumber + "\r\n" + e.lineSource);
      }
    }
    outStream.close();
    bufStreamIn.close();
    this.socket.close();
  };
  
  this.processRequest = function(bufStreamIn, outStream) {
    // print("parseRequest");
    this.request = parseRequest(bufStreamIn);
    print("URL: " + this.request.url);
    // for ( var v in this.request.vars) {
    // print(v + ": " + this.request.vars[v] + "\r\n");
    // }
    
    this.response = new HttpResponse();
    this.sessions = {};
    
    // Attempt to open requested file
    try {
      //handleResponseBasic(this.request, this.response);
      handleResponse(this.request, this.response);
    } catch (e) {
      print(e.message + "\r\n in file " + e.sourceName + " at line " + e.lineNumber + "\r\n" + e.lineSource);
      this.response.code = "500";
      this.response.message = "Internal Server Error";
      this.response.text = "Internal Server Error\n";
      this.response.text += e.message + "\r\n in file " + e.sourceName + " at line " + e.lineNumber + "\r\n" + e.lineSource;
    }
    
    print(this.response.code + " " + this.response.message + " " + this.request.url);
    sendResponse(this.response, outStream);
    if (this.response.body) {
      this.response.body.close();
    }
  };
  
  function humanReadableByteCount(bytes, si) {
    var unit = si ? 1000 : 1024;
    if (bytes < unit) return bytes + " B";
    var exp = Math.round(Math.log(bytes) / Math.log(unit));
    var pre = (si ? "kMGTPE" : "KMGTPE").charAt(exp - 1) + (si ? "" : "i");
    return java.lang.String.format("%.1f %sB", bytes / Math.pow(unit, exp), pre);
  }
  
  function parseRequest(bufStreamIn) {
    var request = new HttpRequest();
    // Get the request line of the HTTP request message.
    var requestLine = bufStreamIn.readLine();
    if (!requestLine) {
      throw new Exception('connection closed');
    }
    var tok = new StringTokenizer(requestLine, " ");
    request.method = tok.nextToken();
    var url = tok.nextToken();
    request.protocol = tok.nextToken();
    
    if (url.indexOf("?") != -1) { // has GET variables
      request.url = URLDecoder.decode(url.substr(0, url.indexOf("?")));
      var getvariable = url.substr(url.indexOf("?") + 1);
      tok = new StringTokenizer(getvariable, "&");
      try {
        var v = tok.nextToken();
        while (v) {
          var headerName = "" + URLDecoder.decode(v.substr(0, v.indexOf("=")));
          var headerValue = "" + URLDecoder.decode(v.substr(v.indexOf("=") + 1));
          request.vars[headerName] = headerValue;
          v = tok.nextToken();
        }
      } catch (e) {}
    } else {
      request.url = URLDecoder.decode(url);
    }
    
    var headerLine = bufStreamIn.readLine();
    while (headerLine.length() != 0 && !headerLine.equals("\r\n")) {
      var headerName = "" + headerLine.substr(0, headerLine.indexOf(":"));
      var headerValue = "" + headerLine.substr(headerLine.indexOf(":"));
      request.headers[headerName] = headerValue;
      headerLine = bufStreamIn.readLine();
    }
    try {
      var contentLength = Integer.valueOf(request.headers["Content-Length"]);
      request.body = this.readBody(bufStreamIn, contentLength);
    } catch (e) {}
    return request;
  }
  
  function readBody(bufStreamIn, contentLength) {
    var body = '';
    bufStreamIn.read(body, 0, contentLength);
    return body;
  }
  
  function sendResponse(response, outStream) {
    if (response.body == null) {
      var arr = new java.lang.String(response.text).getBytes('UTF-8');
      response.body = new ByteArrayInputStream(arr);
      response.headers["Content-Length"] = arr.length;
    }
    outStream.writeBytes(response.protocol + " " + response.code + " " + response.message + "\r\n");
    for ( var headerName in response.headers) {
      outStream.writeBytes(headerName + ": " + response.headers[headerName] + "\r\n");
    }
    outStream.writeBytes("\r\n");
    if (response.body) {
      var buffer = java.lang.reflect.Array.newInstance(java.lang.Byte.TYPE, 1024);
      var length = 0;
      // while we have something to send from the file
      while ((length = response.body.read(buffer)) >= 0) {
        outStream.write(buffer, 0, length);
      }
    }
    outStream.flush();
  }
  
  function handleResponseBasic(request, response) {
    var file = new File(libUtil.httpRoot + "/" + request.url);
    if (file.exists() && file.isFile()) {
      if (request.url.endsWith('.js')) {
        response.headers["Content-Type"] = "text/plain";
        response.text = '';
        try {
          http = {
            "request" : request,
            "response" : response,
            "sessions" : sessions,
            "print" : function(str) {
              this.response.text += str;
            },
            "addHeader" : function(headerName, headerValue) {
              this.response.headers[headerName] = headerValue;
            }
          };
          load(file.getAbsolutePath());
        } catch (e) {
          print(e.message + "\r\n in file " + e.sourceName + " at line " + e.lineNumber + "\r\n" + e.lineSource);
          response.code = "500";
          response.message = "Internal Server Error";
          response.text = "Internal Server Error\n";
          response.text += e.message + "\r\n in file " + e.sourceName + " at line " + e.lineNumber + "\r\n" + e.lineSource;
        }
        gc();
      } else {
        response.headers["Content-Length"] = file.length();
        response.headers["Content-Type"] = URLConnection.guessContentTypeFromName(file.getName());
        if (response.headers["Content-Type"] == null) {
          response.headers["Content-Type"] = "application/octet-stream";
        }
        response.body = new FileInputStream(file);
      }
    } else if (file.exists() && file.isDirectory()) {
      var fileList = file.listFiles();
      var html = '<html><head>';
      html += '<title>Directory: ' + file.getName() + '</title>';
      html += '<style type="text/css">';
      html += '    table { border-width: 1px; border-style: solid; }';
      html += '    td { padding-left: 20px; background-repeat: no-repeat; border-style: solid; border-width: 1px; }';
      html += '    td.dir { background-image:url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABGdBTUEAAQF1s5O+iAAAAAZiS0dEAP8A/wD/oL2nkwAAAvNJREFUeNp9U01oXFUYPd+9903y4tiJIWlKwFJpSBXEiiAKASHgokIRqwjissVVNy5EBG3dCNm3pV0KbkRBRJCKTaOQmibVdmzSpraZNJPMdJKZ18mbzLyZeT/3r4tMQgzigcvlnPttvnvOAf4NTo4rAFCH0y5tLwgA2ybs/x63Zw6NvPjS2x+c+ij9dCazdxjkuO4LL78+emb83MVjx0+8CwD7+vYfOHb8xDtnxs9dmrp570EQaxPE2h44OPw8OW6mf/jV1wAAb314+ov5Za8axFppY+y12VvZS9/8+FPhcaupjbFBrM3Co6a9ki2a76cLavzrX6fnl73Ny9fv3iAAdPb8d5Nfnn5/rB4aaZSEk+riQWLZSqmKtVqsI2lMbybNDg90s4MDLnocMgD45d+uXxOnPr/ww8cn3xsrbYRqM2iJvBdRtamMBlf9z6T54SGXDfY9xTPdsFJZSGWp1IhkuqeLl6uNWMzN37nfVoSVdZ9+uVvHkWcHMTDosqGMYA7bMqNcl6j4CVmesg4jKKkpiKOo6G0GYm5m8ufscu2zqG15M9S2r9dFM1RYDBUAwOFbZnAOAAkEZ1CJJBW1WqWKXxWyupSd+aece+W5/hEvkPZBOUYkDQEA4wIpJpEStGOZYABALPDbcb5U8QWAaOLb838c+fSrkXJDmt8X29xrKmQ62eniQLdD6HKokzSyAMTcncLG4vzqmgCAlYe5q+u19slGBNTqFikO1DsraEO2kxULq6yWiQHAC77NxO2ICQDYyN+ezi2vhtxJuxqw2DpbsMpalWipDAHgiQYBoJSs9orgoScAkA39Qm4hm00denM0AbTWmrRMrNaGJRoMACWtGiWPc41w9a9bzfyfk9q7N2Fl+LcAwAGo1YXZyf1Db4yGqmE7GmK/SFHl/lqUn5kOi9krsro0BWAJgNn51G2yvnhzAkcrZ1Xc0vGj7EK4MjsVFm9ftaF/A4C3t1id2+wW9zn9w5+Q444B6PmPdvJdNd/BE5A0jXw7CYowAAAAAElFTkSuQmCC); }';
      html += '    td.file { background-image:url(data:image/gif;base64,R0lGODlhEAAQAPcAAE5OTv8RkouLi4298KjN9LDR9bLT9bjW9rrX9r3Z9sDb98Pc98be98ng+Mzh+M/j+dHk+dXn+dTm+tfo+drp+tzr+t3r+t/s+uLu++Tv++Tw++bx/Ony/Oz0/O71/fD3/fL3/fT4/vb6/vj7//r8//v8//3+//7+/////wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACH5BAEAAAEALAAAAAAQABAAAAh2AAMIHEiwoMGDBwUoXAgAYQABKCKigNgwocSJESsWhBixhAAAIDUOhHiCRAgPA1KKFCjAxAgQHTJYkDBg5UMRHzhgoAChQU2DAjxsuDDhAYMEPzdqqBDBwQIEBpISFMCzgYIDBQhIHZmya1ebIcOGdEi2bMGAAAA7); }';
      html += '    </style>';
      html += '</head><body>';
      html += '<table><tr><th>Name</th><th>Size</th></tr>';
      for ( var fIndex in fileList) {
        var curFile = fileList[fIndex];
        if (curFile.isFile()) {
          html += '<tr><td class="file"><a href="./' + curFile.getName() + '" >' + curFile.getName() + '</a></td><td>' + humanReadableByteCount(curFile.length(), false) + '</td></tr>';
        } else if (curFile.isDirectory()) {
          html += '<tr><td class="dir"><a  href="./' + curFile.getName() + '/">' + curFile.getName() + '/</a></td><td>' + humanReadableByteCount(curFile.length(), false) + '</td></tr>';
        }
      }
      html += '</table></body></html>';
      response.headers["Content-Type"] = "text/html";
      response.text = html;
    } else {
      response.code = "404";
      response.message = "Not found";
      var message = "File " + request.url + " not found";
      response.text = message;
    }
  }
  
  function handleResponse(request, response) {
    var file = new File(libUtil.httpRoot + "/" + request.url);
    if (file.exists() && file.isFile()) {
      if (request.url.endsWith('.js')) {
        response.headers["Content-Type"] = "text/plain";
        response.text = '';
        try {
          http = {
            "request" : request,
            "response" : response,
            "sessions" : sessions,
            "print" : function(str) {
              this.response.text += str;
            },
            "addHeader" : function(headerName, headerValue) {
              this.response.headers[headerName] = headerValue;
            }
          };
          load(file.getAbsolutePath());
        } catch (e) {
          print(e.message + "\r\n in file " + e.sourceName + " at line " + e.lineNumber + "\r\n" + e.lineSource);
          response.code = "500";
          response.message = "Internal Server Error";
          response.text = "Internal Server Error\n";
          response.text += e.message + "\r\n in file " + e.sourceName + " at line " + e.lineNumber + "\r\n" + e.lineSource;
        }
        gc();
      } else {
        response.headers["Content-Length"] = file.length();
        response.headers["Content-Type"] = URLConnection.guessContentTypeFromName(file.getName());
        if (response.headers["Content-Type"] == null) {
          response.headers["Content-Type"] = "application/octet-stream";
        }
        response.body = new FileInputStream(file);
      }
    } else if (file.exists() && file.isDirectory()) {
      var fileList = file.listFiles();
      if (request.vars && request.vars['format'] && (request.vars['format'] == 'json')) {
        var html = '[';
        var coma = '';
        for ( var fIndex in fileList) {
          var curFile = fileList[fIndex];
          if (curFile.isFile()) {
            html += coma + '{"name":"' + curFile.getName() + '","type":"file","size":"' + curFile.length() + '"}';
          } else if (curFile.isDirectory()) {
            html += coma + '{"name":"' + curFile.getName() + '","type":"dir","size":"' + curFile.length() + '"}';
          }
          coma = ',';
        }
        html += ']';
        response.headers["Content-Type"] = "application/json";
        response.text = html;
      } else if (request.vars && request.vars['format'] && (request.vars['format'] == 'xml')) {
        var html = '<?xml version="1.0" encoding="UTF-8"?>' + "\r\n";
        html += '<dir name="' + file.getName() + '">' + "\r\n";
        for ( var fIndex in fileList) {
          var curFile = fileList[fIndex];
          html += '    <file>' + "\r\n";
          html += '        <name>' + curFile.getName() + '</name>' + "\r\n";
          html += '        <type>' + (curFile.isFile() ? "file" : "dir") + '</type>' + "\r\n";
          html += '        <size>' + curFile.length() + '</size>' + "\r\n";
          html += '    </file>' + "\r\n";
        }
        html += '</dir>' + "\r\n";
        response.headers["Content-Type"] = "text/xml";
        response.text = html;
      } else if (request.vars && request.vars['format'] && (request.vars['format'] == 'text')) {
        var html = '';
        for ( var fIndex in fileList) {
          var curFile = fileList[fIndex];
          html += curFile.isFile() ? "f\t" : "d\t";
          html += curFile.getName() + "\t" + curFile.length() + "\r\n";
        }
        response.headers["Content-Type"] = "text/plain";
        response.text = html;
      } else {
        var html = '<html><head>';
        html += '<title>Directory: ' + file.getName() + '</title>';
        html += '<style type="text/css">';
        html += '    table { border-width: 1px; border-style: solid; }';
        html += '    td { padding-left: 20px; background-repeat: no-repeat; border-style: solid; border-width: 1px; }';
        html += '    td.dir { background-image:url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABGdBTUEAAQF1s5O+iAAAAAZiS0dEAP8A/wD/oL2nkwAAAvNJREFUeNp9U01oXFUYPd+9903y4tiJIWlKwFJpSBXEiiAKASHgokIRqwjissVVNy5EBG3dCNm3pV0KbkRBRJCKTaOQmibVdmzSpraZNJPMdJKZ18mbzLyZeT/3r4tMQgzigcvlnPttvnvOAf4NTo4rAFCH0y5tLwgA2ybs/x63Zw6NvPjS2x+c+ij9dCazdxjkuO4LL78+emb83MVjx0+8CwD7+vYfOHb8xDtnxs9dmrp570EQaxPE2h44OPw8OW6mf/jV1wAAb314+ov5Za8axFppY+y12VvZS9/8+FPhcaupjbFBrM3Co6a9ki2a76cLavzrX6fnl73Ny9fv3iAAdPb8d5Nfnn5/rB4aaZSEk+riQWLZSqmKtVqsI2lMbybNDg90s4MDLnocMgD45d+uXxOnPr/ww8cn3xsrbYRqM2iJvBdRtamMBlf9z6T54SGXDfY9xTPdsFJZSGWp1IhkuqeLl6uNWMzN37nfVoSVdZ9+uVvHkWcHMTDosqGMYA7bMqNcl6j4CVmesg4jKKkpiKOo6G0GYm5m8ufscu2zqG15M9S2r9dFM1RYDBUAwOFbZnAOAAkEZ1CJJBW1WqWKXxWyupSd+aece+W5/hEvkPZBOUYkDQEA4wIpJpEStGOZYABALPDbcb5U8QWAaOLb838c+fSrkXJDmt8X29xrKmQ62eniQLdD6HKokzSyAMTcncLG4vzqmgCAlYe5q+u19slGBNTqFikO1DsraEO2kxULq6yWiQHAC77NxO2ICQDYyN+ezi2vhtxJuxqw2DpbsMpalWipDAHgiQYBoJSs9orgoScAkA39Qm4hm00denM0AbTWmrRMrNaGJRoMACWtGiWPc41w9a9bzfyfk9q7N2Fl+LcAwAGo1YXZyf1Db4yGqmE7GmK/SFHl/lqUn5kOi9krsro0BWAJgNn51G2yvnhzAkcrZ1Xc0vGj7EK4MjsVFm9ftaF/A4C3t1id2+wW9zn9w5+Q444B6PmPdvJdNd/BE5A0jXw7CYowAAAAAElFTkSuQmCC); }';
        html += '    td.file { background-image:url(data:image/gif;base64,R0lGODlhEAAQAPcAAE5OTv8RkouLi4298KjN9LDR9bLT9bjW9rrX9r3Z9sDb98Pc98be98ng+Mzh+M/j+dHk+dXn+dTm+tfo+drp+tzr+t3r+t/s+uLu++Tv++Tw++bx/Ony/Oz0/O71/fD3/fL3/fT4/vb6/vj7//r8//v8//3+//7+/////wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACH5BAEAAAEALAAAAAAQABAAAAh2AAMIHEiwoMGDBwUoXAgAYQABKCKigNgwocSJESsWhBixhAAAIDUOhHiCRAgPA1KKFCjAxAgQHTJYkDBg5UMRHzhgoAChQU2DAjxsuDDhAYMEPzdqqBDBwQIEBpISFMCzgYIDBQhIHZmya1ebIcOGdEi2bMGAAAA7); }';
        html += '    </style>';
        html += '</head><body>';
        html += '<table><tr><th>Name</th><th>Size</th></tr>';
        for ( var fIndex in fileList) {
          var curFile = fileList[fIndex];
          if (curFile.isFile()) {
            html += '<tr><td class="file"><a href="./' + curFile.getName() + '" >' + curFile.getName() + '</a></td><td>' + humanReadableByteCount(curFile.length(), false) + '</td></tr>';
          } else if (curFile.isDirectory()) {
            html += '<tr><td class="dir"><a  href="./' + curFile.getName() + '/">' + curFile.getName() + '/</a></td><td>' + humanReadableByteCount(curFile.length(), false) + '</td></tr>';
          }
        }
        html += '</table></body></html>';
        response.headers["Content-Type"] = "text/html";
        response.text = html;
      }
    } else {
      response.code = "404";
      response.message = "Not found";
      var message = "File " + request.url + " not found";
      response.text = message;
    }
  }
}

/**
 * @constructor
 */
function HttpRequest() {
  this.method = '';
  this.url = '';
  this.vars = {};
  this.protocol = '';
  this.headers = {};
  this.body = null;
}

/**
 * @constructor
 */
function HttpResponse() {
  this.code = '200';
  this.message = 'OK';
  this.protocol = 'HTTP/1.1';
  this.headers = {
    "Content-Type" : "text/plain",
    "Server" : "HttpSrv Javascript Rhino"
  };
  this.text = null;
  this.body = null;
}
