export default {
  "expo": {
    "name": "Ruvo",
    "slug": "RuvoMobile",
    "version": "1.0.0",
    "sdkVersion": "57.0.0",
    "orientation": "portrait",
    "icon": "./assets/images/RuvoMobileLogo.png",
    "scheme": "ruvomobile",
    "userInterfaceStyle": "automatic",
    "android": {
      "icon": "./assets/images/ruvo-mobile-icon.png",
      "package": "com.ruvo.mobile",
      "adaptiveIcon": {
        "foregroundImage": "./assets/images/ruvo-mobile-foreground.png",
        "backgroundColor": "#FFD21C"
      },
      "permissions": [
        "android.permission.ACCESS_FINE_LOCATION",
        "android.permission.ACCESS_COARSE_LOCATION",
        "android.permission.CAMERA",
        "android.permission.READ_EXTERNAL_STORAGE",
        "android.permission.WRITE_EXTERNAL_STORAGE",
        "android.permission.RECORD_AUDIO"
      ],
      "config": {
        "googleMaps": {
          "apiKey": process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY
        }
      }
    },
    "ios": {
      "bundleIdentifier": "com.ruvo.mobile",
      "config": {
        "googleMapsApiKey": process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY
      },
      "infoPlist": {
        "NSLocationWhenInUseUsageDescription": "RuVo uses your location to find nearby shops and fill delivery addresses.",
        "NSCameraUsageDescription": "RuVo needs camera access to upload shop and product photos.",
        "NSPhotoLibraryUsageDescription": "RuVo needs photo library access to select images for uploads."
      }
    },
    "extra": {
      "apiBaseUrl": "https://api.ruvo.in",
      "googleMapsApiKey": process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
      "eas": {
        "projectId": "a7867734-495f-4b45-a681-09ffdb633254"
      }
    },
    "plugins": [
      [
        "react-native-maps",
        {
          "androidGoogleMapsApiKey": process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY
        }
      ],
      [
        "expo-location",
        {
          "locationAlwaysAndWhenInUsePermission": "RuVo uses your location to fill delivery address and find nearby shops."
        }
      ],
      [
        "expo-image-picker",
        {
          "photosPermission": "RuVo accesses your photos to let you upload shop logos and product images."
        }
      ],
      "expo-asset",
      "expo-font",
      "expo-secure-store",
      [
        "expo-splash-screen",
        {
          "image": "./assets/images/RuvoMobile_Foreground.png",
          "resizeMode": "contain",
          "backgroundColor": "#FFD21C"
        }
      ],
      [
        "expo-build-properties",
        {
          "android": {
            "usesCleartextTraffic": true
          }
        }
      ]
    ]
  }
}
;