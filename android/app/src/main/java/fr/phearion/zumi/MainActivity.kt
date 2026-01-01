package fr.phearion.zumi
import expo.modules.splashscreen.SplashScreenManager

import android.media.AudioManager
import android.os.Build
import android.os.Bundle
import android.view.KeyEvent

import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

import expo.modules.ReactActivityDelegateWrapper

class MainActivity : ReactActivity() {
  private val audioManager: AudioManager?
    get() = getSystemService(AUDIO_SERVICE) as? AudioManager

  override fun onCreate(savedInstanceState: Bundle?) {
    // 🎯 PERFECT FIX: Tell Android volume buttons control MUSIC stream
    // Even when we're in IN_COMMUNICATION mode for routing!
    volumeControlStream = AudioManager.STREAM_MUSIC
    // Set the theme to AppTheme BEFORE onCreate to support
    // coloring the background, status bar, and navigation bar.
    // This is required for expo-splash-screen.
    // setTheme(R.style.AppTheme);
    // @generated begin expo-splashscreen - expo prebuild (DO NOT MODIFY) sync-f3ff59a738c56c9a6119210cb55f0b613eb8b6af
    SplashScreenManager.registerOnActivity(this)
    // @generated end expo-splashscreen
    super.onCreate(null)
  }

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun getMainComponentName(): String = "main"

  /**
   * Intercept volume key presses and manually control MEDIA volume
   * This works even when AudioManager is in IN_COMMUNICATION mode!
   */
  override fun onKeyDown(keyCode: Int, event: KeyEvent?): Boolean {
    when (keyCode) {
      KeyEvent.KEYCODE_VOLUME_UP -> {
        audioManager?.adjustStreamVolume(
          AudioManager.STREAM_MUSIC,
          AudioManager.ADJUST_RAISE,
          AudioManager.FLAG_SHOW_UI
        )
        return true  // Consume the event
      }
      KeyEvent.KEYCODE_VOLUME_DOWN -> {
        audioManager?.adjustStreamVolume(
          AudioManager.STREAM_MUSIC,
          AudioManager.ADJUST_LOWER,
          AudioManager.FLAG_SHOW_UI
        )
        return true  // Consume the event
      }
    }
    return super.onKeyDown(keyCode, event)
  }

  /**
   * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
   * which allows you to enable New Architecture with a single boolean flags [fabricEnabled]
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate {
    return ReactActivityDelegateWrapper(
          this,
          BuildConfig.IS_NEW_ARCHITECTURE_ENABLED,
          object : DefaultReactActivityDelegate(
              this,
              mainComponentName,
              fabricEnabled
          ){})
  }

  /**
    * Align the back button behavior with Android S
    * where moving root activities to background instead of finishing activities.
    * @see <a href="https://developer.android.com/reference/android/app/Activity#onBackPressed()">onBackPressed</a>
    */
  override fun invokeDefaultOnBackPressed() {
      if (Build.VERSION.SDK_INT <= Build.VERSION_CODES.R) {
          if (!moveTaskToBack(false)) {
              // For non-root activities, use the default implementation to finish them.
              super.invokeDefaultOnBackPressed()
          }
          return
      }

      // Use the default back button implementation on Android S
      // because it's doing more than [Activity.moveTaskToBack] in fact.
      super.invokeDefaultOnBackPressed()
  }
}
