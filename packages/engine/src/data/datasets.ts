/** A dataset the ingredient database draws on. `id` is the prefix used in Ingredient.sources. */
export interface Dataset {
  id: string;
  name: string;
  url: string;
  license: string;
  /** What the app must do to comply with the license. */
  obligations?: string;
  version: string;
}

export const DATASETS: Dataset[] = [
  {
    id: 'seed',
    name: 'Total Fast seed ingredients (hand-curated)',
    url: 'packages/engine/src/data/ingredients.ts',
    license: 'Project source',
    version: 'in repository',
  },
  {
    id: 'curated',
    name: 'Total Fast label coverage (hand-curated)',
    url: 'packages/engine/src/data/curated.ts',
    license: 'Project source',
    version: 'in repository',
  },
  {
    id: 'off',
    name: 'Open Food Facts ingredients and additives taxonomies',
    url: 'https://github.com/openfoodfacts/openfoodfacts-server/tree/main/taxonomies',
    license: 'Open Database License (ODbL 1.0); contents under the Database Contents License (DbCL 1.0)',
    obligations:
      'Credit "Open Food Facts contributors" where the data is shown, and share the derived ingredient database under the ODbL on request (share-alike).',
    version: 'openfoodfacts-server@3ac7d13c1754e965fa7fd1490dd7e1164ca52976',
  },
  {
    id: 'usda-sr28',
    name: 'USDA National Nutrient Database for Standard Reference, Legacy Release (SR28)',
    url: 'https://fdc.nal.usda.gov/download-datasets',
    license: 'Public domain (U.S. Government work); FoodData Central lists its data under CC0 1.0',
    obligations: 'None required; USDA asks for citation: U.S. Department of Agriculture, Agricultural Research Service, FoodData Central.',
    version: 'SR28 (2015), as republished in SR Legacy (April 2018)',
  },
];
