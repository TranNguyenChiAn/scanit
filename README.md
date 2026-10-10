# ScanIt

A React Native (Expo) app that scans a product's barcode — or takes a photo
for AI-style recognition — and shows its details. Runs on both iOS and
Android from one codebase.

## What's inside

- **Home** — a "Scan a product" button plus a list of recent scans (saved
  locally with AsyncStorage).
- **Scanner** — live camera with two modes:
  - **Barcode** — detects a barcode automatically and looks it up.
  - **Photo** — tap the shutter to snap a picture; a stubbed recognition
    function returns a best-guess match.
- **Product Detail** — image, price, description, and details for the
  matched product.
- **Not Found** — shown only when a **barcode** has no catalog match. A
  photo-mode miss is intentionally silent (the camera just stays open) since
  a single snapshot guess isn't confident enough to interrupt the user.

## Data

`src/data/products.js` holds a mock catalog of 13 products: 10 general
retail (electronics + household) plus 3 apparel items (a knit cardigan set,
a knit midi skirt, and a wrap sweater), each with a barcode.
`lookupByBarcode()` simulates a network lookup against it.

`src/data/recognizeProduct.js` stubs the photo-recognition step. It's
written so you can swap in a real vision API later — replace the body of
`recognizeProductFromImage()` with a `fetch` call that uploads the photo and
returns a matching product.

To connect a **real barcode API** instead of mock data, replace
`lookupByBarcode()` in `src/data/products.js` with a call to a service like
Open Food Facts, UPCitemdb, or your own backend.

## Requirements

- Node.js 18+
- The [Expo Go](https://expo.dev/go) app on your phone (easiest way to test;
  it must match this project's SDK — see below), or Xcode / Android Studio
  if you want a native simulator.

## Setup

```bash
npm install
npx expo install --fix
```

The second command aligns every Expo-managed package to the exact versions
this SDK expects — always run it after `npm install` on a fresh clone.

## Run

```bash
npx expo start -c
```

This opens the Expo dev tools in your terminal/browser. From there:

- Press `i` to open in the iOS Simulator (macOS + Xcode required) — note the
  simulator has **no camera**, so barcode/photo scanning won't work there,
  only navigation and layout.
- Press `a` to open in an Android emulator (Android Studio required).
- Scan the QR code with the **Expo Go** app on your physical iPhone or
  Android phone — this is the only way to test the camera, and the fastest
  way to try the app overall.

⚠️ **Expo Go only supports one SDK version at a time** (whatever's latest).
If Expo Go reports an SDK mismatch, update this project's `expo` version in
`package.json` to match, then rerun `npx expo install --fix`.

## Try it

1. Tap **Scan a product** on the home screen.
2. Stay in **Barcode** mode and scan one of these test codes (generate one
   from any online barcode generator, e.g. for `0112345678904`):
   - `0012345678905` — AeroSound Wireless Earbuds
   - `0045678901236` — CleanBrew 12-Cup Coffee Maker
   - `0112345678904` — Knit Zip-Up Cardigan Set
   - `0123456789011` — A-Line Knit Midi Skirt
   - `0134567890128` — Belted Wrap Sweater
3. Scan any barcode not in that list to see the **Not Found** screen.
4. Switch to **Photo** mode, point at any real clothing item, and tap the
   shutter — since recognition is stubbed, it returns a random catalog
   match most of the time (sometimes a clothing item, sometimes not), and
   just returns you to the camera the rest of the time, simulating an
   unconfident AI guess.

## Building for real devices (optional, later)

When you're ready to ship beyond Expo Go, use [EAS Build](https://docs.expo.dev/build/introduction/):

```bash
npm install -g eas-cli
eas login
eas build --platform ios
eas build --platform android
```

## Project structure

```
ScanIt/
├── App.js                     # Navigation stack
├── app.json                   # Expo config (permissions, bundle IDs)
├── src/
│   ├── screens/
│   │   ├── HomeScreen.js
│   │   ├── ScannerScreen.js
│   │   ├── ProductDetailScreen.js
│   │   └── NotFoundScreen.js
│   ├── components/
│   │   └── ProductCard.js
│   ├── data/
│   │   ├── products.js        # Mock catalog + lookupByBarcode()
│   │   └── recognizeProduct.js# Stubbed image recognition
│   ├── theme/
│   │   └── theme.js           # Colors, type scale, spacing
│   └── utils/
│       └── history.js         # AsyncStorage-backed scan history
```
# scanit
