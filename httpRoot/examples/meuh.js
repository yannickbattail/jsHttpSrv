load("/sdcard/com.googlecode.rhinoforandroid/extras/rhino/android.js");

importPackage(java.lang);
 
var droid = new Android();

droid.startSensingTimed(2, 1000);
for (i = 0; i < 20; i++) {
  Thread.sleep(1000);
  s = droid.sensorsReadAccelerometer();
  print(s);
  if (s[1] < -9) {
    //droid.ttsSpeak('meu');
    print("meuh\n");
    if (!droid.mediaIsPlaying("meu"))
      g = droid.mediaPlay('file://mnt/sdcard/sl4a/scripts/my_scripts/resources/vache.wav','meu');
    //print(g);
  } else {
    print("non\n");
  }
}
droid.stopSensing();
//DroidEx::d()->
