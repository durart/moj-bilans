import { PRODUCE_FOODS } from './owoce-warzywa.mjs';
/**
 * Mój Bilans – baza podstawowych produktów (wartości ORIENTACYJNE na 100 g/ml).
 * Nie jest to baza produktów konkretnych marek ani dokumentacja medyczna.
 * Zmiany przygotowane jako niezależny moduł – nie modyfikują dziennika użytkownika.
 */
const entry = (id, name, kcal, protein, fat, carbs, aliases = [], unit = 'g') =>
  Object.freeze({
    id: `base:${id}`, name, aliases: Object.freeze(aliases),
    kcal, protein, fat, carbs, unit, source: 'Baza podstawowa – wartości orientacyjne'
  });

const LEGACY_BASIC_FOODS = Object.freeze([
  entry('potato-boiled', 'Ziemniaki gotowane w wodzie', 81, 2.1, 0.1, 18.4, ['ziemniaki', 'ziemniak', 'kartofle gotowane', 'kartofle', 'pyry', 'ziemniaki bez tłuszczu']),
  entry('potato-raw', 'Ziemniaki surowe', 77, 2.0, 0.1, 17.0, ['ziemniaki', 'ziemniak', 'surowy ziemniak', 'kartofle surowe']),
  entry('potato-baked', 'Ziemniaki pieczone bez tłuszczu', 93, 2.5, 0.1, 21.2, ['ziemniaki', 'ziemniaki pieczone', 'pieczony ziemniak', 'kartofle pieczone']),
  entry('rice-white-cooked', 'Ryż biały gotowany', 130, 2.7, 0.3, 28.2, ['ryż', 'ryz', 'ryż biały', 'ryż po ugotowaniu']),
  entry('rice-brown-cooked', 'Ryż brązowy gotowany', 123, 2.7, 1.0, 25.6, ['ryż', 'ryz', 'ryż brązowy']),
  entry('rice-white-dry', 'Ryż biały suchy', 360, 7.0, 0.7, 80.0, ['ryż', 'ryz', 'ryż przed gotowaniem', 'suchy ryż']),
  entry('pasta-cooked', 'Makaron pszenny gotowany', 158, 5.8, 0.9, 30.9, ['makaron', 'spaghetti gotowane', 'makaron po ugotowaniu']),
  entry('pasta-dry', 'Makaron pszenny suchy', 350, 12.0, 1.5, 72.0, ['makaron', 'makaron przed gotowaniem']),
  entry('oats', 'Płatki owsiane suche', 370, 13.5, 7.0, 59.0, ['owsianka', 'płatki owsiane', 'platki owsiane']),
  entry('buckwheat-cooked', 'Kasza gryczana gotowana', 92, 3.4, 0.6, 19.9, ['kasza', 'gryczana', 'kasza gryczana']),
  entry('chicken-raw', 'Pierś z kurczaka surowa bez skóry', 110, 23.0, 1.5, 0.0, ['pierś kurczaka', 'piers kurczaka', 'kurczak', 'filet z kurczaka']),
  entry('chicken-cooked', 'Pierś z kurczaka gotowana bez skóry', 165, 31.0, 3.6, 0.0, ['pierś kurczaka', 'piers kurczaka', 'kurczak gotowany', 'filet z kurczaka gotowany']),
  entry('turkey-raw', 'Pierś z indyka surowa bez skóry', 107, 24.0, 1.2, 0.0, ['indyk', 'pierś indyka', 'piers indyka']),
  entry('salmon', 'Łosoś surowy', 208, 20.0, 13.0, 0.0, ['łosoś', 'losos', 'ryba łosoś']),
  entry('tuna-water', 'Tuńczyk w wodzie, odsączony', 116, 26.0, 1.0, 0.0, ['tuńczyk', 'tunczyk', 'tuńczyk w sosie własnym']),
  entry('trout', 'Pstrąg surowy', 141, 20.5, 6.2, 0.0, ['pstrąg', 'pstrag']),
  entry('egg', 'Jajko kurze całe', 143, 12.6, 9.5, 0.7, ['jajka', 'jajko', 'jajo']),
  entry('egg-white', 'Białko jaja kurzego', 52, 11.0, 0.2, 0.7, ['białko jajka', 'bialko jajka', 'białka jaj']),
  entry('milk-32', 'Mleko 3,2%', 61, 3.2, 3.2, 4.7, ['mleko', 'mleko pełne'], 'ml'),
  entry('milk-20', 'Mleko 2%', 50, 3.4, 2.0, 4.8, ['mleko'], 'ml'),
  entry('milk-05', 'Mleko 0,5%', 38, 3.5, 0.5, 5.0, ['mleko'], 'ml'),
  entry('skyr', 'Skyr naturalny', 60, 11.0, 0.2, 4.0, ['skyr', 'jogurt typu skyr']),
  entry('cottage', 'Serek wiejski naturalny', 97, 11.0, 5.0, 2.3, ['serek wiejski', 'serek ziarnisty']),
  entry('quark-lean', 'Twaróg chudy', 99, 19.8, 0.5, 3.5, ['twaróg', 'twarog', 'ser biały chudy']),
  entry('roll-wheat', 'Bułka kajzerka', 270, 9.0, 1.7, 55.0, ['kajzerka', 'bułka', 'bulka', 'bułka pszenna']),
  entry('bread-rye', 'Chleb żytni', 230, 6.0, 1.5, 48.0, ['chleb', 'chleb razowy', 'chleb żytni']),
  entry('banana', 'Banan', 89, 1.1, 0.3, 22.8, ['banany']),
  entry('apple', 'Jabłko ze skórką', 52, 0.3, 0.2, 13.8, ['jabłko', 'jablko', 'jabłka', 'jablka']),
  entry('tomato', 'Pomidor surowy', 18, 0.9, 0.2, 3.9, ['pomidor', 'pomidory']),
  entry('cucumber', 'Ogórek świeży ze skórką', 15, 0.7, 0.1, 3.6, ['ogórek', 'ogorek', 'ogórki świeże']),
  entry('carrot', 'Marchew surowa', 41, 0.9, 0.2, 9.6, ['marchew', 'marchewka', 'marchewki']),
  entry('broccoli', 'Brokuł gotowany', 35, 2.4, 0.4, 7.2, ['brokuły', 'brokuly', 'brokuł']),
  entry('oil-olive', 'Oliwa z oliwek', 884, 0.0, 100.0, 0.0, ['oliwa', 'oliwa z oliwek']),
  entry('oil-rapeseed', 'Olej rzepakowy', 884, 0.0, 100.0, 0.0, ['olej', 'olej rzepakowy']),
  entry('butter', 'Masło 82%', 744, 0.5, 82.0, 0.7, ['masło', 'maslo']),
]);

// Owoce/warzywa mają wspólną, jawnie oznaczoną bazę wartości dla części jadalnej.
// Zastępujemy 6 wcześniejszych uproszczonych rekordów, by uniknąć dubli.
const REPLACED_IDS = new Set(['base:banana','base:apple','base:tomato',
  'base:cucumber','base:carrot','base:broccoli']);
export const BASIC_FOODS = Object.freeze([
  ...LEGACY_BASIC_FOODS.filter(food => !REPLACED_IDS.has(food.id)),
  ...PRODUCE_FOODS
]);
