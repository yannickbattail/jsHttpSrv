

var file = function() {
	this.name = "";
	this.absolutePath = "";
	this.isFile = true;
	this.size = 0;
	this.readable = false;
	this.writeable = false;
};

file.readFile = function(filePath, characterCoding) {
	return readFile(filePath);
};

file.readFile2 = function(filePath, characterCoding) {
	var fis = FileInputStream(filePath);
	var buffer = java.lang.reflect.Array.newInstance(java.lang.Byte.TYPE, fis.available());
	fis.read(buffer, 0, fis.available());
	fis.close();
	return "" + new java.lang.String(buffer);
};

file.writeFile = function(filePath, content) {
	var dos = new DataOutputStream(new FileOutputStream('./conso.json'));
	dos.writeBytes(content);
	// dos.flush();
	dos.close();
};

file.listDirectory = function(dirPath) {
	var f = new File(dirPath);
	if (!f.exists() || !f.isDirectory()) {
		return null;
	}
	var ret = [];
	var fileList = file.listFiles();
	for ( var fIndex in fileList) {
		var curFile = fileList[fIndex];
		ret.push("" + curFile.getName());
	}
	return ret;
};

file.ListFileDirectory = function(dirPath) {
	var f = new File(dirPath);
	if (!f.exists() || !f.isDirectory()) {
		return null;
	}
	var ret = [];
	var fileList = file.listFiles();
	for ( var fIndex in fileList) {
		var curFile = fileList[fIndex];
		
		var fileDetail = new file();
		fileDetail.name = "" + curFile.getName();
		fileDetail.absolutePath = "" + curFile.getAbsolutePath();
		fileDetail.isFile = curFile.isFile();
		fileDetail.size = "" + curFile.length();
		fileDetail.readable = curFile.canRead();
		fileDetail.writeable = curFile.canWrite();
		ret.push("" + curFile.getName());
	}
	return ret;
};

file.getFileInfo = function(dirPath) {
	var f = new File(dirPath);
	if (!f.exists()) {
		return null;
	}
	var fileDetail = new file();
	fileDetail.name = "" + f.getName();
	fileDetail.absolutePath = "" + f.getAbsolutePath();
	fileDetail.isFile = f.isFile();
	fileDetail.size = "" + f.length();
	fileDetail.readable = f.canRead();
	fileDetail.writeable = f.canWrite();
	return fileDetail;
};

libUtil.file = file;
