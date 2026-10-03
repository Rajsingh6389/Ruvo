export default {
  "expo": {
    "name": "RuvoPartner",
    "slug": "RuvoPartner",
    "version": "1.0.0",
    "sdkVersion": "57.0.0",
    "orientation": "portrait",
    "icon": "./assets/images/ruvo-partner-icon.png",
    "scheme": "ruvopartner",
    "userInterfaceStyle": "light",
    "ios": {
      "bundleIdentifier": "com.ruvo.partner",
      "config": {
        "googleMapsApiKey": process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY
      },
      "infoPlist": {
        "NSLocationWhenInUseUsageDescription": "RuvoPartner needs your location to track deliveries and update your availability.",
        "NSCameraUsageDescription": "RuvoPartner needs camera access for verification documents.",
        "NSPhotoLibraryUsageDescription": "RuvoPartner needs photo library access for verification documents."
      }
    },
    "android": {
      "icon": "./assets/images/ruvo-partner-icon.png",
      "adaptiveIcon": {
        "foregroundImage": "./assets/images/ruvo-partner-foreground.png",
        "backgroundColor": "#FFD21C"
      },
      "config": {
        "googleMaps": {
          "apiKey": process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY
        }
      },
      "predictiveBackGestureEnabled": false,
      "package": "com.ruvo.partner"
    },
    "web": {
      "bundler": "metro",
      "favicon": "./assets/images/favicon.png"
    },
    "extra": {
      "apiBaseUrl": "https://api.ruvo.in",
      "googleMapsApiKey": process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY
    },
    "plugins": [
      "expo-font",
      "expo-secure-store",
      [
        "expo-splash-screen",
        {
          "image": "./assets/images/RuvoPartner_Foreground.png",
          "resizeMode": "contain",
          "backgroundColor": "#FFD21C"
        }
      ],
      "@react-native-community/datetimepicker",
      [
        "expo-location",
        {
          "locationWhenInUsePermission": "Allow RuvoPartner to use your location to fill your registration address."
        }
      ],
      "expo-status-bar",
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
};