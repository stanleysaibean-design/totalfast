# Total Fast

Food-compliance engine and mobile app: "can I eat this?" across food-restriction fasts.

## Stack
- App: React Native + Expo + TypeScript (iOS and Android from one codebase). Not scaffolded yet; waiting on where the code will live.
- Engine: `packages/engine`, plain TypeScript with no runtime dependencies, so the app and the rules backend share it.

## packages/engine
- `src/types.ts`: verdicts (compliant, not_compliant, uncertain), ingredient and rule-set schema.
- `src/data/ingredients.ts`: seed canonical ingredient database (~170 entries) with category tags.
- `src/parse.ts`: splits printed ingredient statements (nesting, "2% or less of", allergen statements).
- `src/resolve.ts`: exact name/alias matching after light normalization. No fuzzy matching; unknown text is `uncertain`.
- `src/engine.ts`: the diet-agnostic engine. Every verdict names the ingredient that triggered it.
- `src/rulesets/`: draft Daniel Fast, Whole30 and Lent (Catholic abstinence) rule sets. All are `review.status: 'draft'` until reviewed.
- `src/calendar.ts`: Easter/Lent calendar for date-dependent rules.
- `src/openfoodfacts.ts`: maps an Open Food Facts product response to something the engine can check.

Rule precedence: rules naming an ingredient beat category rules; at the same level an `allow` is an exception and wins; otherwise deny beats caution. A new diet is a new rule set file, not engine code.

```
cd packages/engine
npm install
npm test
npm run check -- whole30 "Water, cane sugar, ghee (milk)"
npm run check -- lent-catholic "Chicken broth, carrots" 2027-02-19
```

Note: the shared project folder does not support symlinks, so run `npm install` in a copy (or the real repo), not in /mnt/project-files.
