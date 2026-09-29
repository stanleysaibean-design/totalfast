# Total Fast app

Expo (SDK 57) app for iOS and Android, with a web build for quick previews. It uses the compliance engine in `packages/engine` directly, so every check runs on the device and works offline. Only barcode lookups need a connection.

## Screens

- **Check** (`src/app/index.tsx`): type an ingredient or paste a label's ingredient list and get a verdict for the active fast.
- **Scan** (`src/app/scan.tsx`): scan a UPC or EAN barcode (or type its digits), look the product up in Open Food Facts, and check its ingredients.
- **My fast** (`src/app/diet.tsx`): pick the Daniel Fast, Whole30 or Lent. The choice is saved on the device.

Every verdict shows the ingredients that decided it and why, and says when a rule set is still a draft.

## Run it

From the repo root:

```bash
npm install
npm run app          # starts Expo; press i, a or w for iOS, Android or web
```

The scanner uses `expo-camera`, which is included in Expo Go, so a phone with Expo Go can scan without a custom build.

## Checks

```bash
npm run typecheck    # engine and app
npm run lint         # app
npm test             # engine
```

Store builds (bundle identifier, app icons, EAS) aren't set up yet.
