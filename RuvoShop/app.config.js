export default {
  "expo": {
    "name": "Ruvo Shop",
    "slug": "ruvo-shop",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/images/ruvo-shop-icon.png",
    "scheme": "ruvo-shop",
    "userInterfaceStyle": "automatic",
    "android": {
      "package": "com.ruvo.shop",
      "icon": "./assets/images/ruvo-shop-icon.png",
      "adaptiveIcon": {
        "foregroundImage": "./assets/images/ruvo-shop-foreground.png",
        "backgroundColor": "#FFD21C"
      },
      "config": {
        "googleMaps": {
          "apiKey": process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY
        }
      }
    },
    "ios": {
      "bundleIdentifier": "com.ruvo.shop",
      "config": {
        "googleMapsApiKey": process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY
      }
    },
    "extra": {
      "apiBaseUrl": "https://api.ruvo.in",
      "googleMapsApiKey": process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY
    },
    "web": {
      "bundler": "metro"
    },
    "plugins": [
      "expo-font",
      "expo-secure-store",
      [
        "expo-splash-screen",
        {
          "image": "./assets/images/RuvoShop_Foreground.png",
          "resizeMode": "contain",
          "backgroundColor": "#FFD21C"
        }
      ],
      [
        "expo-location",
        {
          "locationWhenInUsePermission": "Allow RuVo Shop to use your location to fill your shop address."
        }
      ],
      "expo-asset",
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