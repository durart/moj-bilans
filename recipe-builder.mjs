import { searchBasicFoods } from './wyszukiwarka.mjs';
import { searchFoodCatalog } from './katalog-produktow.mjs';

const api = window.MojBilansRecipes;
const fields = ['kcal', 'protein', 'fat', 'carbs'];
const labels = { kcal: 'kcal', protein: 'Białko', fat: 'Tłuszcze', carbs: 'Węglowodany' };
const byId = id => document.getElementById(id);
const makeId = () => crypto.randomUUID();
const format = value => Number(value).toLocaleString('pl-PL', { maximumFractionDigits: 1 });
const emptyIngredient = () => ({ id: makeId(), name: '', grams: 100, kcal: 0, protein: 0, fat: 0, carbs: 0 });
let ingredients = [emptyIngredient()];
let editingId = null;
let searchTimer;

const root = document.createElement('section');
root.className = 'recipe-builder';
root.innerHTML = `
  <h3 class="subheading">🍲 Moje przepisy</h3>
  <p class="help">Zbuduj danie z produktów z bazy. Wartości składników dotyczą 100 g, a porcje liczymy według masy gotowego dania.</p>
  <button id="recipeOpen" type="button" class="primary-button wide" aria-expanded="false">+ Dodaj przepis</button>
  <div id="recipeEditor" class="recipe-card" hidden>
    <h3 id="recipeFormHeading">Nowy przepis</h3>
    <label class="field-label">Nazwa przepisu<input id="recipeName" maxlength="100" placeholder="Np. domowy bigos"></label>
    <label class="field-label">Masa gotowego dania (g)<input id="recipeYield" type="number" min="1" max="100000" step="1" value="1000"></label>
    <div id="recipeIngredients"></div>
    <button id="recipeAddIngredient" type="button" class="secondary-button">+ Dodaj składnik</button>
    <div id="recipeTotals" class="recipe-totals" aria-live="polite"></div>
    <div class="recipe-actions"><button id="recipeSave" type="button" class="primary-button">Zapisz przepis</button>
    <button id="recipeCancel" type="button" class="secondary-button">Wyczyść</button></div>
    <p id="recipeMessage" role="status" aria-live="polite"></p>
  </div>
  <h3 class="subheading">Zapisane przepisy</h3>
  <div id="recipeList"></div>`;
const editorVisible = show => {
  byId('recipeEditor').hidden = !show;
  byId('recipeOpen').setAttribute('aria-expanded', String(show));
  byId('recipeOpen').textContent = show ? '− Zamknij kreator przepisu' : '+ Dodaj przepis';
};
const productPage = byId('page-products');
byId('newOwnProduct').insertAdjacentElement('afterend', root);

function totals() {
  return Object.fromEntries(fields.map(field => [field,
    ingredients.reduce((sum, item) => sum + Number(item.grams || 0) * Number(item[field] || 0) / 100, 0)]));
}
function showTotals() {
  const yieldGrams = Number(byId('recipeYield').value);
  const total = totals();
  byId('recipeTotals').textContent = yieldGrams > 0
    ? 'Całe danie: ' + format(total.kcal) + ' kcal | 100 g: ' +
      fields.map(field => labels[field] + ' ' + format(total[field] * 100 / yieldGrams)).join(' · ')
    : 'Wprowadź prawidłową masę gotowego dania.';
}
function renderIngredients() {
  const host = byId('recipeIngredients');
  host.replaceChildren();
  ingredients.forEach(item => {
    const card = document.createElement('div');
    card.className = 'recipe-ingredient';
    const heading = document.createElement('div');
    heading.className = 'recipe-ingredient-heading';
    const title = document.createElement('strong');
    title.textContent = 'Składnik';
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.textContent = 'Usuń';
    remove.className = 'danger-quiet';
    remove.disabled = ingredients.length === 1;
    remove.addEventListener('click', () => { ingredients = ingredients.filter(row => row.id !== item.id); renderIngredients(); showTotals(); });
    heading.append(title, remove);
    const nameLabel = document.createElement('label');
    nameLabel.className = 'field-label';
    nameLabel.textContent = 'Wyszukaj produkt';
    const name = document.createElement('input');
    name.value = item.name;
    name.maxLength = 100;
    name.placeholder = 'Np. ziemniaki';
    name.autocomplete = 'off';
    const results = document.createElement('div');
    results.className = 'recipe-search-results';
    name.addEventListener('input', () => {
      item.name = name.value;
      clearTimeout(searchTimer);
      results.replaceChildren();
      searchTimer = setTimeout(() => {
        const query = name.value.trim();
        if (query.length < 2) return;
        const seen = new Set();
        const matches = [...searchBasicFoods(query, 12), ...searchFoodCatalog(query, { limit: 12 })]
          .filter(product => { const key = product.id || product.name; if (seen.has(key)) return false; seen.add(key); return true; }).slice(0, 12);
        for (const product of matches) {
          const button = document.createElement('button');
          button.type = 'button';
          button.className = 'recipe-search-option';
          button.textContent = product.name + ' — ' + format(product.kcal) + ' kcal/100 g';
          button.addEventListener('click', () => {
            item.name = product.name;
            item.productId = product.id || null;
            for (const field of fields) item[field] = Number(product[field]) || 0;
            renderIngredients(); showTotals();
          });
          results.append(button);
        }
      }, 180);
    });
    nameLabel.append(name);
    card.append(heading, nameLabel, results);
    const grid = document.createElement('div');
    grid.className = 'recipe-ingredient-grid';
    for (const [field, label] of [['grams', 'Ilość (g)'], ...fields.map(key => [key, labels[key] + '/100 g'])]) {
      const wrapper = document.createElement('label');
      wrapper.textContent = label;
      const input = document.createElement('input');
      input.type = 'number'; input.min = '0'; input.max = '100000'; input.step = 'any';
      input.value = item[field];
      input.addEventListener('input', () => { item[field] = Number(input.value); showTotals(); });
      wrapper.append(input);
      grid.append(wrapper);
    }
    card.append(grid);
    host.append(card);
  });
}
function reset() {
  editingId = null; ingredients = [emptyIngredient()];
  byId('recipeName').value = ''; byId('recipeYield').value = '1000';
  byId('recipeFormHeading').textContent = 'Nowy przepis';
  renderIngredients(); showTotals();
}
function renderList() {
  const list = byId('recipeList');
  list.replaceChildren();
  for (const recipe of api.getRecipes().sort((a, b) => Number(Boolean(b.favorite)) - Number(Boolean(a.favorite)))) {
    const row = document.createElement('div');
    row.className = 'recipe-card';
    const title = document.createElement('strong');
    title.textContent = recipe.name;
    const info = document.createElement('p');
    info.className = 'help';
    info.textContent = recipe.ingredients.length + ' składników · ' + format(recipe.yieldGrams) + ' g gotowego dania';
    const controls = document.createElement('div');
    controls.className = 'recipe-actions';
    const edit = document.createElement('button');
    edit.type = 'button'; edit.textContent = 'Edytuj'; edit.className = 'secondary-button';
    edit.addEventListener('click', () => {
      editingId = recipe.id; ingredients = structuredClone(recipe.ingredients);
      byId('recipeName').value = recipe.name;
      byId('recipeYield').value = recipe.yieldGrams;
      byId('recipeFormHeading').textContent = 'Edytuj przepis';
      renderIngredients(); showTotals(); editorVisible(true); root.scrollIntoView({ behavior: 'smooth' });
    });
    const duplicate = document.createElement('button');
    duplicate.type = 'button'; duplicate.textContent = 'Duplikuj'; duplicate.className = 'secondary-button';
    duplicate.addEventListener('click', () => { edit.click(); editingId = null; byId('recipeName').value += ' (kopia)'; });
    const remove = document.createElement('button');
    remove.type = 'button'; remove.textContent = 'Usuń'; remove.className = 'danger-quiet';
    remove.addEventListener('click', () => {
      if (confirm('Trwale usunąć przepis „' + recipe.name + '”?') && api.removeRecipe(recipe.id)) renderList();
    });
    const favorite = document.createElement('button');
    favorite.type = 'button'; favorite.className = 'secondary-button';
    const isFavorite = Boolean(recipe.favorite);
    favorite.textContent = isFavorite ? '★ Ulubiony' : '☆ Ulubiony';
    favorite.setAttribute('aria-pressed', String(isFavorite));
    favorite.addEventListener('click', () => {
      if (api.saveRecipe({ ...recipe, favorite: !isFavorite })) renderList();
    });
    controls.append(favorite, edit, duplicate, remove);
    const portion = document.createElement('input');
    portion.type = 'number'; portion.min = '0.1'; portion.max = '100000'; portion.step = 'any'; portion.value = '200';
    portion.setAttribute('aria-label', 'Masa porcji w gramach');
    const meal = document.createElement('select');
    for (const [id, label] of [['breakfast', 'Śniadanie'], ['lunch', 'Obiad'], ['dinner', 'Kolacja'], ['snack', 'Przekąski']]) {
      const option = document.createElement('option'); option.value = id; option.textContent = label; meal.append(option);
    }
    const date = document.createElement('input');
    date.type = 'date'; date.value = api.getDate();
    const add = document.createElement('button');
    add.type = 'button'; add.className = 'primary-button'; add.textContent = '+ Dodaj porcję do dziennika';
    add.addEventListener('click', () => {
      const ok = api.addPortion({ recipeId: recipe.id, grams: Number(portion.value), meal: meal.value, date: date.value });
      byId('recipeMessage').textContent = ok ? 'Dodano porcję do dziennika.' : 'Nie udało się dodać porcji. Sprawdź wartości.';
    });
    row.append(title, info, controls, portion, meal, date, add);
    list.append(row);
  }
  if (!list.children.length) list.textContent = 'Nie masz jeszcze zapisanych przepisów.';
}
byId('recipeAddIngredient').addEventListener('click', () => { ingredients.push(emptyIngredient()); renderIngredients(); showTotals(); });
byId('recipeYield').addEventListener('input', showTotals);
byId('recipeOpen').addEventListener('click', () => {
  const opening = byId('recipeEditor').hidden;
  if (opening) reset();
  editorVisible(opening);
});
byId('recipeCancel').addEventListener('click', () => { reset(); editorVisible(false); });
byId('recipeSave').addEventListener('click', () => {
  const name = byId('recipeName').value.trim();
  const yieldGrams = Number(byId('recipeYield').value);
  const valid = name && yieldGrams > 0 && yieldGrams <= 100000 &&
    ingredients.every(item => item.name.trim() && ['grams', ...fields].every(field =>
      Number.isFinite(Number(item[field])) && Number(item[field]) >= 0 && Number(item[field]) <= 100000)) &&
    ingredients.some(item => Number(item.grams) > 0);
  if (!valid) { byId('recipeMessage').textContent = 'Uzupełnij nazwę, masę gotowego dania i składniki.'; return; }
  const old = api.getRecipes().find(item => item.id === editingId);
  const recipe = { id: editingId || makeId(), name, yieldGrams, ingredients: structuredClone(ingredients), favorite: Boolean(old?.favorite) };
  if (!api.saveRecipe(recipe)) { byId('recipeMessage').textContent = 'Nie udało się zapisać przepisu.'; return; }
  reset(); editorVisible(false); renderList(); byId('recipeMessage').textContent = 'Przepis zapisany.';
});
reset(); editorVisible(false); renderList();
