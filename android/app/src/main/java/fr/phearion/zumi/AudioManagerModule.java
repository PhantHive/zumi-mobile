// android/app/src/main/java/fr/phearion/zumi/AudioManagerModule.java
package fr.phearion.zumi;

import android.content.Context;
import android.media.AudioDeviceInfo;
import android.media.AudioManager;
import android.os.Build;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;

public class AudioManagerModule extends ReactContextBaseJavaModule {
    private final ReactApplicationContext reactContext;
    private AudioManager audioManager;

    public AudioManagerModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
        this.audioManager = (AudioManager) reactContext.getSystemService(Context.AUDIO_SERVICE);
    }

    @Override
    public String getName() {
        return "AudioManagerModule";
    }

    @ReactMethod
    public void setMode(String mode, Promise promise) {
        try {
            int audioMode = AudioManager.MODE_NORMAL;

            switch (mode) {
                case "NORMAL":
                    audioMode = AudioManager.MODE_NORMAL;
                    break;
                case "IN_CALL":
                    audioMode = AudioManager.MODE_IN_CALL;
                    break;
                case "IN_COMMUNICATION":
                    audioMode = AudioManager.MODE_IN_COMMUNICATION;
                    break;
                case "RINGTONE":
                    audioMode = AudioManager.MODE_RINGTONE;
                    break;
            }

            audioManager.setMode(audioMode);
            promise.resolve(true);
        } catch (Exception e) {
            promise.reject("ERROR", e);
        }
    }

    @ReactMethod
    public void setSpeakerphoneOn(boolean on, Promise promise) {
        try {
            audioManager.setSpeakerphoneOn(on);
            promise.resolve(true);
        } catch (Exception e) {
            promise.reject("ERROR", e);
        }
    }

    @ReactMethod
    public void isSpeakerphoneOn(Promise promise) {
        try {
            boolean isOn = audioManager.isSpeakerphoneOn();
            promise.resolve(isOn);
        } catch (Exception e) {
            promise.reject("ERROR", e);
        }
    }

    /**
     * NEW METHOD: Route to phone speaker (MEDIA mode, proper volume control)
     * This uses the speaker as the output device while keeping MEDIA stream
     */
    @ReactMethod
    public void routeToPhoneSpeaker(Promise promise) {
        try {
            // Stay in NORMAL mode (media volume control)
            audioManager.setMode(AudioManager.MODE_NORMAL);

            // Force speaker ON for media
            audioManager.setSpeakerphoneOn(true);

            // On Android 8.0+ (API 26+), we can also set audio routing preference
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                // Get speaker device
                AudioDeviceInfo[] devices = audioManager.getDevices(AudioManager.GET_DEVICES_OUTPUTS);
                for (AudioDeviceInfo device : devices) {
                    if (device.getType() == AudioDeviceInfo.TYPE_BUILTIN_SPEAKER) {
                        // Found speaker - this will be used automatically when speakerphone is on
                        break;
                    }
                }
            }

            promise.resolve(true);
        } catch (Exception e) {
            promise.reject("ERROR", e);
        }
    }

    /**
     * NEW METHOD: Route to Bluetooth (MEDIA mode, proper volume control)
     */
    @ReactMethod
    public void routeToBluetooth(Promise promise) {
        try {
            // Stay in NORMAL mode (media volume control)
            audioManager.setMode(AudioManager.MODE_NORMAL);

            // Turn OFF speakerphone to allow Bluetooth
            audioManager.setSpeakerphoneOn(false);

            promise.resolve(true);
        } catch (Exception e) {
            promise.reject("ERROR", e);
        }
    }

    @ReactMethod
    public void setBluetoothScoOn(boolean on, Promise promise) {
        try {
            audioManager.setBluetoothScoOn(on);
            if (on) {
                audioManager.startBluetoothSco();
            } else {
                audioManager.stopBluetoothSco();
            }
            promise.resolve(true);
        } catch (Exception e) {
            promise.reject("ERROR", e);
        }
    }

    @ReactMethod
    public void isBluetoothScoOn(Promise promise) {
        try {
            boolean isOn = audioManager.isBluetoothScoOn();
            promise.resolve(isOn);
        } catch (Exception e) {
            promise.reject("ERROR", e);
        }
    }
}