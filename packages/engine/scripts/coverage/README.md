# Coverage benchmark

`measure.ts` runs real product labels through the engine and reports how often
ingredients go unrecognized and how often products come back uncertain for each
diet. Rerun it after changing the parser, the resolver or the ingredient data:

```sh
npm run coverage                                   # the committed sample
npm run coverage -- labels.tsv --top 200 --csv unresolved.csv --json result.json
```

## The sample

`sample.tsv` holds 2,600 labels from the Open Food Facts CSV export. Products
were kept when they are sold in the United States, the United Kingdom or Canada
and have an English ingredient list. Each product was put in one of 13 aisle
groups by its categories, and from each group the sample takes the 150 most
scanned products (`pick = popular`) plus 50 drawn at random from the rest
(`pick = random`, seed 7). The `scans` column is Open Food Facts' unique scan
count at the time of the export.

The label text is kept exactly as Open Food Facts has it, typos included,
because that is what the app will see.

## Attribution

The sample is an extract of the Open Food Facts database, © Open Food Facts
contributors, made available under the Open Database License (ODbL 1.0);
individual contents are under the Database Contents License (DbCL 1.0).
See https://world.openfoodfacts.org/data. This file is shared under the same
license.
