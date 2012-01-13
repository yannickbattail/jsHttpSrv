// load("/sdcard/com.googlecode.rhinoforandroid/extras/rhino/json2.js");

load(libUtil.httpSrvDir + "libUtil/file.js");

http.addHeader("Content-Type", "text/html ; charset=UTF-8");
http.print('<!DOCTYPE html><html><head><title>conso</title><link rel="stylesheet" type="text/css" href="conso.css" /></head><body>');
function loadTable() {
  try {
    var jsonStr = libUtil.file.readFile(libUtil.httpRoot + './conso.json');
    if (jsonStr == '') {
      return {};
    }
    // http.print("jsonStr: "+jsonStr);
    return eval('(' + jsonStr + ')');
  } catch (e) {
    http.print(e.message + "\r\n in file " + e.sourceName + " at line " + e.lineNumber + "\r\n" + e.lineSource);
    print(e.message + "\r\n in file " + e.sourceName + " at line " + e.lineNumber + "\r\n" + e.lineSource);
    return {};
  }
}

function saveTable(table) {
  try {
    var jsonStr = '' + JSON.stringify(table, null, 4);
    http.print(jsonStr);
    libUtil.file.writeFile(libUtil.httpRoot + './conso.json', jsonStr);
  } catch (e) {
    http.print(e.message + "\r\n in file " + e.sourceName + " at line " + e.lineNumber + "\r\n" + e.lineSource);
    print(e.message + "\r\n in file " + e.sourceName + " at line " + e.lineNumber + "\r\n" + e.lineSource);
  }
}

function myRound(val, round) {
  return Math.round(val * round) / round;
}

function myRound00(val) {
  return myRound(val, 100);
}

function saveFormInfo(tableConso) {
  var _GET = http.request.vars;
  if (_GET["go"] == 'go') {
    var timeStamp = new Date().getTime();
    var rate = readUrl('http://download.finance.yahoo.com/d/quotes.json?s=EURCHF=X&f=l1');
    var raw = new RawInfo();
    raw.dist = 1 * _GET["dist"];
    raw.liters = 1 * _GET["liters"];
    raw.price = 1 * _GET["price"];
    raw.isCHF = (_GET["isCHF"]) ? (true) : (false);
    raw.rate = 1 * rate;
    raw.timeStamp = timeStamp;
    raw.date = '' + new Date(timeStamp).toString();
    tableConso[timeStamp] = raw;
    saveTable(tableConso);
    http.print('<script type="text/javascript"> window.location = "./conso.js"; </script>');
  }
}
function RawInfo() {
  this.dist = 0;
  this.liters = 0;
  this.price = 0;
  this.isCHF = false;
  this.rate = 0;
  this.timeStamp = 0;
  this.date = '';
}
function StatsInfo() {
  this.timestamp = 0;
  this.timeDiff = 0;
  this.distTotal = 0;
  this.distDiff = 0;
  this.liters = 0;
  this.rate = 0;
  this.isCHF = false;
  this.priceRaw = 0;
  this.price1litre = 0;
  this.priceTotal = 0;
  this.liter100km = 0;
  this.price100km = 0;
  this.price1day = 0;
  this.dist1day = 0;
  this.liter1day = 0;
  
  this.print = function(cssClass) {
    http.print('<tr class="' + cssClass + '">');
    http.print('    <td>' + myRound00(this.distTotal) + '</td>');
    http.print('    <td>' + myRound00(this.distDiff) + '</td>');
    http.print('    <td>' + myRound00(this.liters) + '</td>');
    http.print('    <td>' + myRound(this.price1litre, 1000) + " EUR" + ((this.isCHF) ? (' <span title="taux: ' + this.rate + '">(' + this.priceRaw + "CHF)</span>") : ("")) + '</td>');
    http.print('    <td>' + myRound00(this.priceTotal) + '</td>');
    http.print('    <td>' + myRound00(this.liter100km) + '</td>');
    http.print('    <td>' + myRound00(this.price100km) + '</td>');
    http.print('    <td>' + myRound00(this.price1day) + '</td>');
    http.print('    <td>' + myRound00(this.dist1day) + '</td>');
    http.print('    <td>' + myRound00(this.liter1day) + '</td>');
    http.print('    <td>' + myRound00(this.timeDiff / (1000 * 60 * 60 * 24)) + '</td>');
    http.print('    <td>' + new Date(this.timestamp).toLocaleDateString() + '</td>');
    http.print('</tr>');
  };
  
  this.calc = function(raw, prev) {
    this.timestamp = raw.timeStamp;
    this.timeDiff = raw.timeStamp - prev.timestamp;
    this.distTotal = raw.dist;
    this.distDiff = raw.dist - prev.distTotal;
    this.liters = raw.liters;
    this.rate = raw.rate;
    this.isCHF = raw.isCHF;
    this.priceRaw = raw.price;
    this.price1litre = (raw.isCHF && raw.rate) ? (raw.price / raw.rate) : (raw.price);
    this.priceTotal = this.price1litre * this.liters;
    this.liter100km = this.liters * 100 / this.distDiff;
    this.price100km = this.priceTotal * 100 / this.distDiff;
    this.price1day = (this.priceTotal / this.timeDiff) * (1000 * 60 * 60 * 24);
    this.dist1day = (this.distDiff / this.timeDiff) * (1000 * 60 * 60 * 24);
    this.liter1day = (this.liters / this.timeDiff) * (1000 * 60 * 60 * 24);
  };
  
  this.addAvg = function(current) {
    this.timeDiff += current.timeDiff;
    this.distDiff += current.distDiff;
    this.liters += current.liters;
    this.price1litre += current.price1litre;
    this.rate += current.rate;
  };
  
  this.calcAvg = function(nb) {
    this.timestamp = NaN;
    this.timeDiff = this.timeDiff / nb;
    this.distDiff = this.distDiff / nb;
    this.liters = this.liters / nb;
    this.price1litre = this.price1litre / nb;
    this.rate = this.rate / nb;
    
    this.priceTotal = this.price1litre * this.liters;
    this.liter100km = this.liters * 100 / this.distDiff;
    this.price100km = this.liters * 100 * this.priceTotal / this.distDiff;
    this.price1day = (this.priceTotal / this.timeDiff) * (1000 * 60 * 60 * 24);
    this.dist1day = (this.distDiff / this.timeDiff) * (1000 * 60 * 60 * 24);
    this.liter1day = (this.liters / this.timeDiff) * (1000 * 60 * 60 * 24);
  };
}

var tableConso = loadTable();
saveFormInfo(tableConso);

http.print('<h2>conso</h2>');
http.print('<table>');
http.print('<tr>');
http.print('    <th>dist total</th>');
http.print('    <th>dist</th>');
http.print('    <th>liters</th>');
http.print('    <th>price/L</th>');
http.print('    <th>price total</th>');
http.print('    <th>L/100Km</th>');
http.print('    <th>price 100Km</th>');
http.print('    <th>price/day</th>');
http.print('    <th>km/day</th>');
http.print('    <th>litter/day</th>');
http.print('    <th>days</th>');
http.print('    <th>date</th>');
http.print('</tr>');

var current = new StatsInfo();
var prev = new StatsInfo();
var avg = new StatsInfo();
var i = 0;
for ( var v in tableConso) {
  var raw = tableConso[v];
  current = new StatsInfo();
  current.calc(raw, prev);
  if (i > 0) {
    avg.addAvg(current);
  }
  current.print();
  prev = current;
  i++;
}
avg.calcAvg(i - 1);
avg.print('avg');

http.print('</table><br />');

http.print('<form action="./conso.js" method="get"><table>');
http.print('    <tr><th><label for="dist"  >Compteur</label> </th><td><input type="text"     id="dist"   name="dist"   value="' + Math.round(current.distTotal + avg.distDiff) + '"  /> </td></tr>');
http.print('    <tr><th><label for="liters">Litres</label>   </th><td><input type="text"     id="liters" name="liters" value="' + myRound00(avg.liters) + '"      /> </td></tr>');
http.print('    <tr><th><label for="price" >Prix/L</label>   </th><td><input type="text"     id="price"  name="price"  value="' + myRound00(avg.price1litre) + '" /> </td></tr>');
http.print('    <tr><th><label for="isCHF" >en CHF</label>   </th><td><input type="checkbox" id="isCHF"  name="isCHF"  value="1"                      /> </td></tr>');
http.print('    <tr><th>                                     </th><td><input type="submit"   id="go"     name="go"     value="go"                     /> </td></tr>');
http.print('</table></form>');

http.print(readFile(libUtil.httpRoot + 'randomImage.html'));
http.print('</body></html>');
