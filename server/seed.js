// Ejecutar una vez: node seed.js
const db = require('./db');

const CDN = 'https://cdn.shopify.com/s/files/1/0703/2995/8561/files/';

const products = [
  { name: "9am Dive",                    brand: "Afnan",       price: 67999,  image: CDN+"9AM_Dive.png?v=1769729633",           description: "Una fragancia fresca y acuática que evoca la energía del amanecer. Notas de bergamota, menta y almizcle blanco. Ideal para el uso diurno.", featured: 0 },
  { name: "9pm Elixir",                  brand: "Afnan",       price: 84999,  image: CDN+"9PM_Elixir.png?v=1769729640",          description: "Una versión más intensa y seductora del 9pm original. Notas orientales profundas con vainilla, oud y especias cálidas. Para noches especiales.", featured: 0 },
  { name: "9pm Rebel",                   brand: "Afnan",       price: 79999,  image: CDN+"9PM_Rebel.png?v=1769729648",           description: "Audaz y provocador. Una fragancia amaderada con notas de cuero, especias y ámbar. Para quien se atreve a destacar.", featured: 0 },
  { name: "AFNAN 9pm",                   brand: "Afnan",       price: 66000,  image: CDN+"9PM.png?v=1769729653",                 description: "El icónico 9pm de Afnan. Una fragancia oriental con notas de frutas, especias y maderas. Un clásico moderno.", featured: 0 },
  { name: "Asad",                        brand: "Lattafa",     price: 51999,  image: CDN+"ASAD.png?v=1769729685",                description: "Fragancia masculina poderosa con notas de oud, sándalo y almizcle. Inspirado en la fortaleza y la elegancia oriental.", featured: 0 },
  { name: "Asad Bourbon",                brand: "Lattafa",     price: 59999,  image: CDN+"ASAD_Bourbon.png?v=1769729700",        description: "Una fusión única entre el poder de Asad y notas de bourbon. Cálido, especiado y envolvente, con toques de vainilla y madera ahumada.", featured: 0 },
  { name: "Asad Yara Rose",              brand: "Lattafa",     price: 51999,  image: CDN+"ASAD_Yara_rose.png?v=1769729691",      description: "Delicada y romántica. Una fragancia floral con rosa, peonía y almizcle suave. Para la mujer moderna y apasionada.", featured: 0 },
  { name: "Asad Elixir",                 brand: "Lattafa",     price: 74999,  image: CDN+"ASAD_Elixir.png?v=1769729698",         description: "La versión más concentrada y lujosa de Asad. Notas de oud premium, resinas exóticas y maderas preciosas con una proyección excepcional.", featured: 0 },
  { name: "Asad Yara White",             brand: "Lattafa",     price: 49999,  image: CDN+"ASAD_Yara_White.png?v=1769729690",     description: "Fragancia femenina fresca y luminosa. Notas de jazmín, almendra y almizcle blanco. Elegante y versátil para todo el día.", featured: 0 },
  { name: "Asad Yara Pink",              brand: "Lattafa",     price: 49999,  image: CDN+"ASAD_Yara_Pink.png?v=1769735762",      description: "Juguetona y dulce. Con notas de frutos rojos, rosa y vainilla cremosa. Una fragancia femenina llena de encanto.", featured: 0 },
  { name: "Asad Yara Mango",             brand: "Lattafa",     price: 54999,  image: CDN+"ASAD_Yara_Mango.png?v=1769729696",     description: "Tropical y vibrante. Notas de mango maduro, frutas exóticas y flor de tiare. Perfecta para el verano.", featured: 0 },
  { name: "Asad Zanzibar",               brand: "Lattafa",     price: 49999,  image: CDN+"ASAD_Zanzibar.png?v=1769729689",       description: "Inspirado en las especias de Zanzíbar. Una mezcla exótica de clavo, canela, oud y sándalo. Misterioso y envolvente.", featured: 0 },
  { name: "Bharara King",                brand: "Bharara",     price: 109999, image: CDN+"BHARARA_King.png?v=1769729332",         description: "El rey de las fragancias orientales. Notas de bergamota, rosa turca y oud. Una experiencia olfativa majestuosa y poderosa.", featured: 1 },
  { name: "Bharara King Soleil",         brand: "Bharara",     price: 119999, image: CDN+"BHARARA_King_Soleil.png?v=1769729375",  description: "La versión solar y luminosa del King. Notas cítricas de bergamota y limón combinadas con maderas claras y almizcle solar.", featured: 0 },
  { name: "Bharara King Gold Edition",   brand: "Bharara",     price: 114999, image: CDN+"BHARARA_King_Gold_Edition.png?v=1769729351", description: "Edición dorada de lujo. Una fragancia opulenta con notas de azafrán, rosa de Damasco, oud y ámbar. Exclusiva y memorable.", featured: 0 },
  { name: "Bharara King Parfum",         brand: "Bharara",     price: 124999, image: CDN+"BHARARA_King_Parfum.png?v=1769729362",  description: "La concentración más alta del King. Parfum puro con una duración excepcional. Oud, resinas raras y maderas nobles en su máxima expresión.", featured: 1 },
  { name: "Club de Nuit Ico|nic",        brand: "Armaf",       price: 82999,  image: CDN+"ARMAF_ClubdenuitIconic.png?v=1769732710", description: "Una reinterpretación icónica del Club de Nuit. Fresco, moderno y sofisticado con notas de pomelo, piña y madera de cedro.", featured: 0 },
  { name: "Club de Nuit Imperiale",      brand: "Armaf",       price: 79999,  image: CDN+"ARMAF_Club_de_nuit_Imperiale.png?v=1769729195", description: "Imperial y elegante. Una fragancia femenina con notas de frutos rojos, flor de naranjo y almizcle. Sofisticación en cada spray.", featured: 0 },
  { name: "Club de Nuit Intense Man",    brand: "Armaf",       price: 68999,  image: CDN+"ARMAF_ClubdenuitIntenseman.png?v=1769733036", description: "Un bestseller mundial. Inspirado en el famoso Aventus. Notas de piña, abedul ahumado, cedro y almizcle. Proyección y duración excepcionales.", featured: 1 },
  { name: "Club de Nuit Sillage",        brand: "Armaf",       price: 72999,  image: CDN+"ARMAF_Club_de_nuit_Sillage.png?v=1769729295", description: "Una estela olfativa irresistible. Fresco y amaderado con notas de pomelo, pimienta negra y sándalo. Perfecto para el día a día.", featured: 0 },
  { name: "Club de Nuit Untold",         brand: "Armaf",       price: 84999,  image: CDN+"ARMAF_Club_de_nuit_Untold.png?v=1769729311", description: "Una historia sin contar. Oriental y especiado con notas de cardamomo, oud y ámbar. Una fragancia masculina con mucho carácter.", featured: 0 },
  { name: "Club de Nuit Urban Elixir",   brand: "Armaf",       price: 69999,  image: CDN+"ARMAF_ClubdenuitUrbanmanElixir.png?v=1769733117", description: "El elixir urbano por excelencia. Fresco, vibrante y moderno. Notas de limón, cedro y almizcle limpio. Para el hombre de ciudad.", featured: 0 },
  { name: "Haramain Amber Oud",          brand: "Al Haramain", price: 104999, image: CDN+"HARAMAIN_AmberOud.png?v=1769729708",    description: "La fusión perfecta entre ámbar y oud. Una fragancia oriental profunda y envolvente con resinas, bálsamos y maderas preciosas.", featured: 0 },
  { name: "Haramain Dubai Night",        brand: "Al Haramain", price: 104999, image: CDN+"HARAMAIN_DubaiNight.png?v=1769729710",  description: "La esencia de las noches de Dubái. Lujosa y seductora con notas de rosa, oud negro y almizcle oriental. Para ocasiones especiales.", featured: 1 },
  { name: "Haramain Gold Edition",       brand: "Al Haramain", price: 102999, image: CDN+"HARAMAIN_GoldEdition.png?v=1769729713", description: "Edición dorada de Al Haramain. Una fragancia de lujo con azafrán, oud, rosa y sándalo. Proyección extraordinaria y larga duración.", featured: 0 },
  { name: "Hawas Fire",                  brand: "Rasasi",      price: 84999,  image: CDN+"HAWAS_Fire.png?v=1769729387",           description: "La versión ardiente de Hawas. Notas de pimienta roja, jengibre y oud ahumado. Intenso, apasionado y memorable.", featured: 1 },
  { name: "Hawas For Her",               brand: "Rasasi",      price: 49999,  image: CDN+"HAWAS_For_her.png?v=1769729420",        description: "Fragancia femenina fresca y frutal. Notas de cítricos, flor blanca y almizcle suave. Ligera y elegante para el uso diario.", featured: 0 },
  { name: "Hawas For Him",               brand: "Rasasi",      price: 54999,  image: CDN+"HAWAS_for_him.png?v=1769729430",        description: "Fresco y acuático, evoca la libertad del mar. Notas de menta marina, cítricos y maderas limpias. Vibrante y masculino.", featured: 0 },
  { name: "Hawas Ice",                   brand: "Rasasi",      price: 99999,  image: CDN+"HAWAS_Ice.png?v=1769729450",            description: "Una explosión de frescura glacial. Notas de menta ártica, eucalipto y almizcle frío. Refrescante e irresistible en verano.", featured: 1 },
  { name: "Odyssey Aqua",                brand: "Armaf",       price: 67999,  image: CDN+"Odyssey_Aqua_1db6ac5e-9b36-4d7e-b49c-449b1829835d.png?v=1769730292", description: "Un viaje acuático y fresco. Notas de agua marina, cítricos y madera blanca. Perfecto para el día a día.", featured: 0 },
  { name: "Odyssey Home White",          brand: "Armaf",       price: 65999,  image: CDN+"Odyssey_HomeWhite_51a2fce2-dc76-4a94-bd20-2c974cb70880.png?v=1769731092", description: "Fresco y limpio como la ropa recién lavada. Notas de algodón, almizcle blanco y madera suave. Ideal para el uso cotidiano.", featured: 0 },
  { name: "Odyssey Homme Black",         brand: "Armaf",       price: 64999,  image: CDN+"Odyssey_HomeBlack_b343cbd6-60ea-4d93-a9a2-8566e4b80785.png?v=1769731244", description: "Oscuro y misterioso. Una fragancia amaderada con notas de oud, cuero y especias orientales. Para el hombre sofisticado.", featured: 0 },
  { name: "Odyssey Mandarin Sky",        brand: "Armaf",       price: 62999,  image: CDN+"Odyssey_MandarinSky_09022f7b-5056-4542-b1b0-4dcd7934a366.png?v=1769730497", description: "Brillante y vibrante como el cielo al atardecer. Notas de mandarina, bergamota y cedro. Fresco y alegre.", featured: 0 },
  { name: "Odyssey Mandarin Sky Elixir", brand: "Armaf",       price: 64999,  image: CDN+"Odysseyn_MadarinElixir_d9df86f5-d99f-4774-ad1e-d785ae25a433.png?v=1769731394", description: "La versión más intensa del Mandarin Sky. Mayor concentración y profundidad con notas de ámbar y sándalo.", featured: 0 },
  { name: "The Kingdom",                 brand: "Lattafa",     price: 69999,  image: CDN+"LATTAFA_The_Kingdom_Men.png?v=1769729716",  description: "Un reino de aromas. Fragancia masculina con notas de oud, sándalo y almizcle oriental. Poderosa y elegante.", featured: 0 },
  { name: "The Kingdom Woman",           brand: "Lattafa",     price: 54999,  image: CDN+"LATTAFA_The_Kingdom_Woman.png?v=1769729718", description: "La versión femenina del Kingdom. Floral y oriental con rosa, jazmín y almizcle suave. Para la reina que hay en vos.", featured: 0 },
];

const existing = db.prepare('SELECT COUNT(*) as c FROM productos').get();
if (existing.c > 0) {
  console.log(`✅ Ya existen ${existing.c} productos en la BD. Seed omitido.`);
  // Solo salir si se ejecuta directamente, no si es require() desde otro módulo
  if (require.main === module) process.exit(0);
  return;
}

const insert = db.prepare(`
  INSERT INTO productos (name, brand, price, image, description, featured, active)
  VALUES (?, ?, ?, ?, ?, ?, 1)
`);

const insertAll = db.transaction(() => {
  for (const p of products) {
    insert.run(p.name, p.brand, p.price, p.image, p.description, p.featured);
  }
});

insertAll();
console.log(`✅ ${products.length} productos insertados en la BD.`);
