import json, pathlib
root=pathlib.Path(__file__).parent
# Polskie nazwy, orientacyjne wartości na 100 g części jadalnej. Format:
# id | nazwa | kcal | białko | tłuszcz | węglowodany łącznie (US) | błonnik | synonimy
# W węglowodany w aplikacji = węglowodany łącznie - błonnik (przybliżenie etykietowania UE).
raw_fruits='''
banana|Banan, miąższ|89|1.09|0.33|22.84|2.6|banany;banan bez skórki
apple|Jabłko ze skórką|52|0.26|0.17|13.81|2.4|jabłka;jablko;jablka;jabłko
mandarin|Mandarynka, bez skórki|53|0.81|0.31|13.34|1.8|mandarynki;mandarynka;klementynka;klementynki
orange|Pomarańcza, bez skórki|47|0.94|0.12|11.75|2.4|pomarańcze;pomarancza;pomarancze
pear|Gruszka ze skórką|57|0.36|0.14|15.23|3.1|gruszki;gruszka
white-grape|Winogrona jasne|69|0.72|0.16|18.1|0.9|winogrona;winogrono;winogrona białe;winogrona zielone
red-grape|Winogrona czerwone|69|0.72|0.16|18.1|0.9|winogrona;winogrona ciemne
kiwi|Kiwi zielone, miąższ|61|1.14|0.52|14.66|3.0|kiwi;kiwi zielone
strawberry|Truskawki świeże|32|0.67|0.30|7.68|2.0|truskawka;truskawki
blueberry|Borówki amerykańskie|57|0.74|0.33|14.49|2.4|borówka;borówki;borowki;borówka amerykańska
raspberry|Maliny świeże|52|1.20|0.65|11.94|6.5|maliny;malina
blackberry|Jeżyny świeże|43|1.39|0.49|9.61|5.3|jeżyna;jezyny;jeżyny
pineapple|Ananas świeży, miąższ|50|0.54|0.12|13.12|1.4|ananas;ananas świeży
watermelon|Arbuz czerwony, miąższ|30|0.61|0.15|7.55|0.4|arbuz;arbuzy
melon-cantaloupe|Melon kantalupa, miąższ|34|0.84|0.19|8.16|0.9|melon;melony;kantalupa
melon-honeydew|Melon miodowy, miąższ|36|0.54|0.14|9.09|0.8|melon;melon zielony
peach|Brzoskwinia ze skórką|39|0.91|0.25|9.54|1.5|brzoskwinie;brzoskwinia
nectarine|Nektarynka ze skórką|44|1.06|0.32|10.55|1.7|nektarynki;nektarynka
plum|Śliwka świeża|46|0.70|0.28|11.42|1.4|śliwki;sliwka;sliwki
apricot|Morela świeża|48|1.40|0.39|11.12|2.0|morele;morela
cherry|Czereśnie świeże|63|1.06|0.20|16.01|2.1|czereśnie;czeresnie;czereśnia
sour-cherry|Wiśnie świeże|50|1.0|0.30|12.18|1.6|wiśnie;wisnie;wiśnia
mango|Mango, miąższ|60|0.82|0.38|14.98|1.6|mango
pomegranate|Granat, pestki jadalne|83|1.67|1.17|18.70|4.0|granat;owoc granatu
pink-grapefruit|Grejpfrut różowy, miąższ|42|0.77|0.14|10.66|1.6|grejpfrut;grejpfruty;grapefruit
lemon|Cytryna, miąższ|29|1.10|0.30|9.32|2.8|cytryna;cytryny
lime|Limonka, miąższ|30|0.70|0.20|10.54|2.8|limonka;limonki
fig|Figa świeża|74|0.75|0.30|19.18|2.9|figi;figa
persimmon|Kaki (persymona), miąższ|70|0.58|0.19|18.59|3.6|kaki;persymona;hurma
papaya|Papaja, miąższ|43|0.47|0.26|10.82|1.7|papaja;papaya
lychee|Liczi, miąższ|66|0.83|0.44|16.53|1.3|liczi;lychee
cranberry|Żurawina świeża|46|0.46|0.13|12.20|3.6|żurawina;zurawina;żurawiny
redcurrant|Porzeczka czerwona|56|1.40|0.20|13.80|4.3|porzeczki czerwone;porzeczka;porzeczki
blackcurrant|Porzeczka czarna|63|1.40|0.41|15.38|4.3|czarna porzeczka;porzeczki czarne
chokeberry|Aronia świeża|47|1.4|0.5|9.6|5.3|aronia;aronie
gooseberry|Agrest świeży|44|0.88|0.58|10.18|4.3|agrest
avocado|Awokado, miąższ|160|2.0|14.66|8.53|6.7|awokado;avocado
'''
raw_veg='''
tomato|Pomidor surowy|18|0.88|0.20|3.89|1.2|pomidor;pomidory
cucumber|Ogórek zielony ze skórką|15|0.65|0.11|3.63|0.5|ogórek;ogórek świeży;ogórki;ogorek
carrot|Marchew surowa|41|0.93|0.24|9.58|2.8|marchew;marchewka;marchewki
broccoli-boiled|Brokuły gotowane, bez dodatków|35|2.38|0.41|7.18|3.3|brokuły;brokuł;brokuly;brokuł gotowany
broccoli-raw|Brokuły surowe|34|2.82|0.37|6.64|2.6|brokuły;brokuly;brokuł surowy
cauliflower-raw|Kalafior surowy|25|1.92|0.28|4.97|2.0|kalafior;kalafiory
cauliflower-boiled|Kalafior gotowany, bez dodatków|23|1.84|0.45|4.11|2.3|kalafior;kalafiory;kalafior gotowany
cabbage-white|Kapusta biała surowa|25|1.28|0.10|5.80|2.5|kapusta;kapusta biała
cabbage-red|Kapusta czerwona surowa|31|1.43|0.16|7.37|2.1|kapusta;kapusta czerwona
sauerkraut|Kapusta kiszona, bez oleju|19|0.91|0.14|4.28|2.9|kapusta kiszona;kiszona kapusta
lettuce-iceberg|Sałata lodowa|14|0.90|0.14|2.97|1.2|sałata;salata;sałata lodowa
lettuce-romaine|Sałata rzymska|17|1.23|0.30|3.29|2.1|sałata;salata;sałata rzymska
spinach|Szpinak surowy|23|2.86|0.39|3.63|2.2|szpinak;liście szpinaku
kale|Jarmuż surowy|49|4.28|0.93|8.75|3.6|jarmuż;jarmuz
arugula|Rukola|25|2.58|0.66|3.65|1.6|rukola;rukola świeża
pepper-red|Papryka czerwona surowa|31|0.99|0.30|6.03|2.1|papryka;papryka czerwona
pepper-green|Papryka zielona surowa|20|0.86|0.17|4.64|1.7|papryka;papryka zielona
pepper-yellow|Papryka żółta surowa|27|1.00|0.21|6.32|0.9|papryka;papryka zolta;papryka żółta
onion|Cebula biała surowa|40|1.10|0.10|9.34|1.7|cebula;cebule
onion-red|Cebula czerwona surowa|40|1.10|0.10|9.34|1.7|cebula;cebula czerwona
spring-onion|Szczypior z cebulki dymki|32|1.83|0.19|7.34|2.6|szczypiorek;dymka;zielona cebulka
chives|Szczypiorek surowy|30|3.27|0.73|4.35|2.5|szczypiorek;szczypior
leek|Por surowy|61|1.50|0.30|14.15|1.8|por;pory
celery-stalk|Seler naciowy|14|0.69|0.17|2.97|1.6|seler;seler naciowy
celery-root|Seler korzeniowy|42|1.50|0.30|9.20|1.8|seler;seler korzeniowy
parsley-leaf|Natka pietruszki|36|2.97|0.79|6.33|3.3|pietruszka;natka;natka pietruszki
radish|Rzodkiewka surowa|16|0.68|0.10|3.40|1.6|rzodkiewki;rzodkiewka
beetroot-raw|Burak czerwony surowy|43|1.61|0.17|9.56|2.8|buraki;burak;buraczek
beetroot-boiled|Burak czerwony gotowany|44|1.68|0.18|9.96|2.0|buraki;burak;buraki gotowane
zucchini|Cukinia surowa|17|1.21|0.32|3.11|1.0|cukinia;cukinie
white-squash|Kabaczek surowy|17|1.20|0.30|3.20|1.0|kabaczek;kabaczki
pumpkin|Dynia zwyczajna surowa|26|1.0|0.10|6.50|0.5|dynia;dynie
butternut|Dynia piżmowa surowa|45|1.0|0.10|11.69|2.0|dynia;dynia piżmowa;butternut
sweet-potato-raw|Batat surowy|86|1.57|0.05|20.12|3.0|batat;bataty;słodki ziemniak
sweet-potato-boiled|Batat gotowany bez tłuszczu|76|1.37|0.14|17.72|2.5|batat;bataty;batat gotowany
mushroom|Pieczarki świeże|22|3.09|0.34|3.26|1.0|pieczarki;pieczarka
mushroom-oyster|Boczniaki świeże|33|3.31|0.41|6.09|2.3|boczniaki;boczniak
asparagus|Szparagi surowe|20|2.20|0.12|3.88|2.1|szparagi;szparag
brussels-sprouts|Brukselka surowa|43|3.38|0.30|8.95|3.8|brukselka;kapusta brukselska
kohlrabi|Kalarepa surowa|27|1.70|0.10|6.20|3.6|kalarepa;kalarepy
turnip|Rzepa surowa|28|0.90|0.10|6.43|1.8|rzepa;rzepy
parsnip|Pasternak surowy|75|1.20|0.30|17.99|4.9|pasternak;pasternaki
fennel|Fenkuł (koper włoski) surowy|31|1.24|0.20|7.30|3.1|fenkuł;fenkul;koper włoski
green-beans|Fasolka szparagowa surowa|31|1.83|0.22|6.97|2.7|fasolka szparagowa;fasolka;zielona fasolka
peas|Groszek zielony świeży|81|5.42|0.40|14.45|5.7|groszek;groszek zielony;groszek cukrowy
sweetcorn-boiled|Kukurydza słodka gotowana|96|3.41|1.5|20.98|2.4|kukurydza;kukurydza gotowana
lentils-cooked|Soczewica gotowana bez dodatków|116|9.02|0.38|20.13|7.9|soczewica;soczewica gotowana
chickpeas-cooked|Ciecierzyca gotowana bez dodatków|164|8.86|2.59|27.42|7.6|ciecierzyca;cieciorka
red-beans-cooked|Fasola czerwona gotowana bez dodatków|127|8.67|0.5|22.8|6.4|fasola;fasola czerwona;czerwona fasola
'''

def parse(v, category):
    out=[]
    for line in v.strip().splitlines():
        cells=line.split('|')
        assert len(cells)==8, line
        uid,name,kcal,p,f,ct,fi,aliases=cells
        kcal=float(kcal);p=float(p);f=float(f);ct=float(ct);fi=float(fi)
        net=round(ct-fi,1)
        assert 0<=net<=100 and kcal<=900 and p+f+net<=101, line
        obj=dict(id=f'{category}:{uid}',name=name,kcal=round(kcal,1),protein=round(p,1),fat=round(f,1),carbs=net,fiber=round(fi,1),aliases=aliases.split(';'),category=category)
        out.append(obj)
    return out
items=parse(raw_fruits,'fruit')+parse(raw_veg,'veg')
print('fruit',sum(a['category']=='fruit' for a in items),'veg',sum(a['category']=='veg' for a in items),'total',len(items))
# Source provenance: based on generic food composition tables, values are reference estimates,
# not item-by-item certified extracts from an FDC data release.
text='''/**\n * Mój Bilans — owoce i warzywa: lokalne dane orientacyjne na 100 g CZĘŚCI JADALNEJ.\n * Referencja metody: USDA FoodData Central, Standard Reference Legacy (2018).\n * UWAGA: ręcznie opracowane/zaokrąglone wartości referencyjne; nie potwierdzono\n * każdej pozycji z osobnym identyfikatorem FDC ani laboratoryjnie.\n * `carbs`: przybliżone przyswajalne węglowodany = US total carbs - fiber.\n * `fiber`: błonnik oddzielnie, poza bilansem W. Kcal nie są przeliczane 4/4/9.\n * Żaden rekord nie oznacza danych z etykiety produktu markowego.\n * Zmiana bazy nie modyfikuje istniejących posiłków użytkownika.\n * Źródło bazowe i licencja: https://fdc.nal.usda.gov/ (CC0).\n */\nexport const PRODUCE_FOODS = Object.freeze(\n'''+ json.dumps(items,ensure_ascii=False,indent=2) + '''\n  .map(food => Object.freeze({\n    ...food,\n    aliases: Object.freeze(food.aliases),\n    unit: 'g',\n    source: 'Baza podstawowa – orientacyjne wartości referencyjne',\n    sourceName: 'Wartości orientacyjne (USDA FDC SR Legacy – adaptacja)',\n    sourceUrl: 'https://fdc.nal.usda.gov/',\n    edible: true,\n    carbohydratesBasis: 'przyswajalne (szacunek: ogółem minus błonnik)',\n    isEstimate: true\n  }))\n);\n'''
(root/'owoce-warzywa.mjs').write_text(text,encoding='utf-8')
(root/'DANE_OWOCE_WARZYWA.json').write_text(json.dumps(dict(schema='moj-bilans-produce-v1',unit='100 g części jadalnej',carbs='ogółem minus błonnik (orientacyjnie)',reference='USDA FDC SR Legacy – adaptacja; każda pozycja orientacyjna',items=items),ensure_ascii=False,indent=2),encoding='utf-8')
