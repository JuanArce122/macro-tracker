export type Food = {
  id: number;
  nombre: string;
  categoria: "proteina" | "cereal" | "legumbre" | "lacteo" | "verdura" | "fruta" | "grasa" | "suplemento";
  cal: number;  // kcal por 100g
  p: number;    // proteína por 100g
  c: number;    // carbohidratos por 100g
  f: number;    // grasa por 100g
  gramsPerUnit?: number; // gramos por unidad para alimentos que se miden por pieza
  unitLabel?: string;    // ej: "huevo", "rebanada", "tortilla"
};

export const FOODS: Food[] = [
  // ── POLLO ──────────────────────────────────────────────────────
  { id: 1,  nombre: "Pechuga de pollo cruda",        categoria: "proteina", cal: 120, p: 22.5, c: 0,    f: 2.6  },
  { id: 2,  nombre: "Pechuga de pollo cocida",        categoria: "proteina", cal: 165, p: 31.0, c: 0,    f: 3.6  },
  { id: 3,  nombre: "Muslo de pollo crudo",           categoria: "proteina", cal: 177, p: 18.6, c: 0,    f: 11.0 },
  { id: 4,  nombre: "Muslo de pollo cocido",          categoria: "proteina", cal: 209, p: 26.0, c: 0,    f: 10.9 },
  { id: 5,  nombre: "Pollo entero cocido",            categoria: "proteina", cal: 239, p: 27.3, c: 0,    f: 13.6 },
  { id: 6,  nombre: "Pechuga de pavo cruda",          categoria: "proteina", cal: 104, p: 17.6, c: 0,    f: 3.3  },
  { id: 7,  nombre: "Pechuga de pavo cocida",         categoria: "proteina", cal: 135, p: 29.9, c: 0,    f: 1.0  },

  // ── CARNE DE RES ───────────────────────────────────────────────
  { id: 10, nombre: "Carne molida 90% magra cruda",   categoria: "proteina", cal: 172, p: 21.0, c: 0,    f: 9.7  },
  { id: 11, nombre: "Carne molida 80% magra cruda",   categoria: "proteina", cal: 254, p: 17.2, c: 0,    f: 20.0 },
  { id: 12, nombre: "Bistec de res (sirloin)",        categoria: "proteina", cal: 207, p: 26.0, c: 0,    f: 11.0 },
  { id: 13, nombre: "Lomo de res crudo",              categoria: "proteina", cal: 147, p: 26.3, c: 0,    f: 4.3  },
  { id: 14, nombre: "Costilla de res",                categoria: "proteina", cal: 291, p: 22.2, c: 0,    f: 22.1 },

  // ── CERDO ──────────────────────────────────────────────────────
  { id: 20, nombre: "Lomo de cerdo crudo",            categoria: "proteina", cal: 143, p: 20.8, c: 0,    f: 6.3  },
  { id: 21, nombre: "Lomo de cerdo cocido",           categoria: "proteina", cal: 175, p: 26.0, c: 0,    f: 7.2  },
  { id: 22, nombre: "Costilla de cerdo",              categoria: "proteina", cal: 280, p: 18.0, c: 0,    f: 23.0 },
  { id: 23, nombre: "Jamón (bajo sodio)",             categoria: "proteina", cal: 113, p: 16.6, c: 1.5,  f: 4.3  },
  { id: 24, nombre: "Tocino cocido",                  categoria: "proteina", cal: 541, p: 37.0, c: 1.4,  f: 42.0 },

  // ── PESCADOS Y MARISCOS ────────────────────────────────────────
  { id: 30, nombre: "Salmón atlántico crudo",         categoria: "proteina", cal: 208, p: 20.4, c: 0,    f: 13.4 },
  { id: 31, nombre: "Salmón atlántico cocido",        categoria: "proteina", cal: 206, p: 28.8, c: 0,    f: 9.2  },
  { id: 32, nombre: "Atún en agua enlatado",          categoria: "proteina", cal: 116, p: 25.5, c: 0,    f: 0.8  },
  { id: 33, nombre: "Atún en aceite enlatado",        categoria: "proteina", cal: 198, p: 29.9, c: 0,    f: 8.2  },
  { id: 34, nombre: "Atún fresco crudo",              categoria: "proteina", cal: 132, p: 28.2, c: 0,    f: 1.3  },
  { id: 35, nombre: "Tilapia cruda",                  categoria: "proteina", cal: 96,  p: 20.1, c: 0,    f: 1.7  },
  { id: 36, nombre: "Tilapia cocida",                 categoria: "proteina", cal: 128, p: 26.2, c: 0,    f: 2.7  },
  { id: 37, nombre: "Camarón cocido",                 categoria: "proteina", cal: 99,  p: 20.9, c: 0.9,  f: 1.1  },
  { id: 38, nombre: "Camarón crudo",                  categoria: "proteina", cal: 106, p: 20.3, c: 1.5,  f: 1.7  },
  { id: 39, nombre: "Sardina en aceite enlatada",     categoria: "proteina", cal: 208, p: 24.6, c: 0,    f: 11.4 },
  { id: 40, nombre: "Bacalao crudo",                  categoria: "proteina", cal: 82,  p: 17.8, c: 0,    f: 0.7  },
  { id: 41, nombre: "Merluza cruda",                  categoria: "proteina", cal: 72,  p: 16.3, c: 0,    f: 0.5  },

  // ── HUEVOS ─────────────────────────────────────────────────────
  { id: 50, nombre: "Huevo entero crudo",             categoria: "proteina", cal: 155, p: 12.6, c: 1.1,  f: 11.5, gramsPerUnit: 60,  unitLabel: "huevo"  },
  { id: 51, nombre: "Huevo entero cocido (hervido)",  categoria: "proteina", cal: 155, p: 12.6, c: 1.1,  f: 11.5, gramsPerUnit: 60,  unitLabel: "huevo"  },
  { id: 52, nombre: "Clara de huevo cruda",           categoria: "proteina", cal: 52,  p: 10.9, c: 0.7,  f: 0.2,  gramsPerUnit: 33,  unitLabel: "clara"  },
  { id: 53, nombre: "Yema de huevo",                  categoria: "proteina", cal: 322, p: 15.9, c: 3.6,  f: 26.5, gramsPerUnit: 18,  unitLabel: "yema"   },

  // ── CEREALES Y GRANOS ──────────────────────────────────────────
  { id: 60, nombre: "Arroz blanco cocido",            categoria: "cereal",   cal: 130, p: 2.7,  c: 28.2, f: 0.3  },
  { id: 61, nombre: "Arroz integral cocido",          categoria: "cereal",   cal: 123, p: 2.6,  c: 25.6, f: 1.0  },
  { id: 62, nombre: "Arroz blanco crudo",             categoria: "cereal",   cal: 365, p: 7.1,  c: 80.0, f: 0.7  },
  { id: 63, nombre: "Arroz integral crudo",           categoria: "cereal",   cal: 370, p: 7.9,  c: 77.2, f: 2.9  },
  { id: 64, nombre: "Pasta de trigo cocida",          categoria: "cereal",   cal: 158, p: 5.8,  c: 30.9, f: 0.9  },
  { id: 65, nombre: "Pasta de trigo cruda",           categoria: "cereal",   cal: 371, p: 13.0, c: 74.7, f: 1.5  },
  { id: 66, nombre: "Avena cruda (rolled oats)",      categoria: "cereal",   cal: 389, p: 16.9, c: 66.3, f: 6.9  },
  { id: 67, nombre: "Avena cocida con agua",          categoria: "cereal",   cal: 71,  p: 2.5,  c: 12.0, f: 1.5  },
  { id: 68, nombre: "Pan blanco de trigo",            categoria: "cereal",   cal: 265, p: 9.0,  c: 51.0, f: 3.2,  gramsPerUnit: 30,  unitLabel: "rebanada" },
  { id: 69, nombre: "Pan integral",                   categoria: "cereal",   cal: 247, p: 9.0,  c: 41.0, f: 3.4,  gramsPerUnit: 30,  unitLabel: "rebanada" },
  { id: 70, nombre: "Tortilla de maíz",               categoria: "cereal",   cal: 218, p: 5.7,  c: 45.9, f: 2.8,  gramsPerUnit: 28,  unitLabel: "tortilla" },
  { id: 71, nombre: "Tortilla de harina de trigo",    categoria: "cereal",   cal: 312, p: 8.3,  c: 51.6, f: 7.7,  gramsPerUnit: 45,  unitLabel: "tortilla" },
  { id: 72, nombre: "Quinoa cocida",                  categoria: "cereal",   cal: 120, p: 4.4,  c: 21.3, f: 1.9  },
  { id: 73, nombre: "Quinoa cruda",                   categoria: "cereal",   cal: 368, p: 14.1, c: 64.2, f: 6.1  },
  { id: 74, nombre: "Papa cocida (sin piel)",         categoria: "cereal",   cal: 87,  p: 1.9,  c: 20.1, f: 0.1  },
  { id: 75, nombre: "Papa al horno (con piel)",       categoria: "cereal",   cal: 93,  p: 2.5,  c: 21.2, f: 0.1  },
  { id: 76, nombre: "Camote / batata cocido",         categoria: "cereal",   cal: 86,  p: 1.6,  c: 20.1, f: 0.1  },
  { id: 77, nombre: "Maíz dulce cocido",              categoria: "cereal",   cal: 108, p: 3.3,  c: 25.1, f: 1.3  },
  { id: 78, nombre: "Granola",                        categoria: "cereal",   cal: 471, p: 10.4, c: 64.2, f: 20.3 },
  { id: 79, nombre: "Harina de avena (oat flour)",   categoria: "cereal",   cal: 404, p: 14.7, c: 65.7, f: 8.2  },
  { id: 80, nombre: "Cous cous cocido",               categoria: "cereal",   cal: 112, p: 3.8,  c: 23.2, f: 0.2  },

  // ── LEGUMBRES ──────────────────────────────────────────────────
  { id: 90, nombre: "Frijoles negros cocidos",        categoria: "legumbre", cal: 132, p: 8.9,  c: 23.7, f: 0.5  },
  { id: 91, nombre: "Frijoles rojos cocidos",         categoria: "legumbre", cal: 127, p: 8.7,  c: 22.8, f: 0.5  },
  { id: 92, nombre: "Frijoles blancos cocidos",       categoria: "legumbre", cal: 139, p: 9.7,  c: 25.1, f: 0.4  },
  { id: 93, nombre: "Lentejas cocidas",               categoria: "legumbre", cal: 116, p: 9.0,  c: 20.1, f: 0.4  },
  { id: 94, nombre: "Garbanzos cocidos",              categoria: "legumbre", cal: 164, p: 8.9,  c: 27.4, f: 2.6  },
  { id: 95, nombre: "Edamame cocido",                 categoria: "legumbre", cal: 122, p: 10.9, c: 8.9,  f: 5.2  },
  { id: 96, nombre: "Tofu firme",                     categoria: "legumbre", cal: 76,  p: 8.1,  c: 1.9,  f: 4.3  },

  // ── LÁCTEOS ────────────────────────────────────────────────────
  { id: 100, nombre: "Leche entera (3.5%)",           categoria: "lacteo",   cal: 61,  p: 3.2,  c: 4.8,  f: 3.3  },
  { id: 101, nombre: "Leche semi-descremada (2%)",    categoria: "lacteo",   cal: 50,  p: 3.3,  c: 4.8,  f: 2.0  },
  { id: 102, nombre: "Leche descremada (0%)",         categoria: "lacteo",   cal: 34,  p: 3.4,  c: 5.0,  f: 0.1  },
  { id: 103, nombre: "Yogur griego natural sin grasa",categoria: "lacteo",   cal: 59,  p: 10.0, c: 3.6,  f: 0.4  },
  { id: 104, nombre: "Yogur griego natural entero",   categoria: "lacteo",   cal: 100, p: 9.0,  c: 3.9,  f: 5.0  },
  { id: 105, nombre: "Yogur natural entero",          categoria: "lacteo",   cal: 61,  p: 3.5,  c: 4.7,  f: 3.3  },
  { id: 106, nombre: "Queso cheddar",                 categoria: "lacteo",   cal: 403, p: 25.0, c: 1.3,  f: 33.0 },
  { id: 107, nombre: "Queso mozzarella",              categoria: "lacteo",   cal: 280, p: 28.0, c: 2.2,  f: 17.0 },
  { id: 108, nombre: "Queso cottage (requesón)",      categoria: "lacteo",   cal: 98,  p: 11.1, c: 3.4,  f: 4.3  },
  { id: 109, nombre: "Queso parmesano",               categoria: "lacteo",   cal: 431, p: 38.5, c: 4.1,  f: 29.7 },
  { id: 110, nombre: "Queso panela",                  categoria: "lacteo",   cal: 270, p: 20.0, c: 3.3,  f: 20.0 },
  { id: 111, nombre: "Leche de almendra (sin azúcar)",categoria: "lacteo",   cal: 15,  p: 0.6,  c: 0.6,  f: 1.0  },
  { id: 112, nombre: "Leche de avena",                categoria: "lacteo",   cal: 47,  p: 1.0,  c: 8.0,  f: 1.5  },

  // ── VERDURAS ───────────────────────────────────────────────────
  { id: 120, nombre: "Brócoli cocido",                categoria: "verdura",  cal: 34,  p: 2.8,  c: 6.6,  f: 0.4  },
  { id: 121, nombre: "Espinaca cruda",                categoria: "verdura",  cal: 23,  p: 2.9,  c: 3.6,  f: 0.4  },
  { id: 122, nombre: "Espinaca cocida",               categoria: "verdura",  cal: 23,  p: 3.0,  c: 3.8,  f: 0.3  },
  { id: 123, nombre: "Lechuga romana",                categoria: "verdura",  cal: 17,  p: 1.2,  c: 3.3,  f: 0.3  },
  { id: 124, nombre: "Tomate",                        categoria: "verdura",  cal: 18,  p: 0.9,  c: 3.9,  f: 0.2  },
  { id: 125, nombre: "Zanahoria",                     categoria: "verdura",  cal: 41,  p: 0.9,  c: 9.6,  f: 0.2  },
  { id: 126, nombre: "Pepino",                        categoria: "verdura",  cal: 15,  p: 0.7,  c: 3.6,  f: 0.1  },
  { id: 127, nombre: "Cebolla",                       categoria: "verdura",  cal: 40,  p: 1.1,  c: 9.3,  f: 0.1  },
  { id: 128, nombre: "Pimiento rojo",                 categoria: "verdura",  cal: 31,  p: 1.0,  c: 6.0,  f: 0.3  },
  { id: 129, nombre: "Pimiento verde",                categoria: "verdura",  cal: 20,  p: 0.9,  c: 4.6,  f: 0.2  },
  { id: 130, nombre: "Aguacate / palta",              categoria: "verdura",  cal: 160, p: 2.0,  c: 8.5,  f: 14.7 },
  { id: 131, nombre: "Calabacín / zucchini crudo",    categoria: "verdura",  cal: 17,  p: 1.2,  c: 3.1,  f: 0.3  },
  { id: 132, nombre: "Coliflor",                      categoria: "verdura",  cal: 25,  p: 1.9,  c: 5.0,  f: 0.3  },
  { id: 133, nombre: "Champiñón / hongo",             categoria: "verdura",  cal: 22,  p: 3.1,  c: 3.3,  f: 0.3  },
  { id: 134, nombre: "Chícharos / arvejas cocidas",   categoria: "verdura",  cal: 81,  p: 5.4,  c: 14.5, f: 0.4  },
  { id: 135, nombre: "Apio",                          categoria: "verdura",  cal: 16,  p: 0.7,  c: 3.0,  f: 0.2  },
  { id: 136, nombre: "Berenjena cocida",              categoria: "verdura",  cal: 25,  p: 0.8,  c: 5.9,  f: 0.2  },
  { id: 137, nombre: "Espárragos cocidos",            categoria: "verdura",  cal: 22,  p: 2.4,  c: 4.1,  f: 0.2  },
  { id: 138, nombre: "Kale / col rizada",             categoria: "verdura",  cal: 49,  p: 4.3,  c: 9.0,  f: 0.9  },
  { id: 139, nombre: "Col / repollo crudo",           categoria: "verdura",  cal: 25,  p: 1.3,  c: 5.8,  f: 0.1  },

  // ── FRUTAS ─────────────────────────────────────────────────────
  { id: 150, nombre: "Banana / plátano",              categoria: "fruta",    cal: 89,  p: 1.1,  c: 23.0, f: 0.3,  gramsPerUnit: 120, unitLabel: "banana"   },
  { id: 151, nombre: "Manzana",                       categoria: "fruta",    cal: 52,  p: 0.3,  c: 14.0, f: 0.2,  gramsPerUnit: 182, unitLabel: "manzana"  },
  { id: 152, nombre: "Naranja",                       categoria: "fruta",    cal: 47,  p: 0.9,  c: 12.0, f: 0.1,  gramsPerUnit: 180, unitLabel: "naranja"  },
  { id: 153, nombre: "Fresa / frutilla",              categoria: "fruta",    cal: 32,  p: 0.7,  c: 7.7,  f: 0.3  },
  { id: 154, nombre: "Mango",                         categoria: "fruta",    cal: 60,  p: 0.8,  c: 15.0, f: 0.4  },
  { id: 155, nombre: "Uvas",                          categoria: "fruta",    cal: 69,  p: 0.7,  c: 18.0, f: 0.2  },
  { id: 156, nombre: "Pera",                          categoria: "fruta",    cal: 57,  p: 0.4,  c: 15.2, f: 0.1,  gramsPerUnit: 178, unitLabel: "pera"     },
  { id: 157, nombre: "Piña",                          categoria: "fruta",    cal: 50,  p: 0.5,  c: 13.1, f: 0.1  },
  { id: 158, nombre: "Papaya",                        categoria: "fruta",    cal: 43,  p: 0.5,  c: 11.0, f: 0.3  },
  { id: 159, nombre: "Sandía",                        categoria: "fruta",    cal: 30,  p: 0.6,  c: 7.6,  f: 0.2  },
  { id: 160, nombre: "Melón",                         categoria: "fruta",    cal: 34,  p: 0.8,  c: 8.2,  f: 0.2  },
  { id: 161, nombre: "Kiwi",                          categoria: "fruta",    cal: 61,  p: 1.1,  c: 14.7, f: 0.5,  gramsPerUnit: 76,  unitLabel: "kiwi"     },
  { id: 162, nombre: "Arándanos",                     categoria: "fruta",    cal: 57,  p: 0.7,  c: 14.5, f: 0.3  },
  { id: 163, nombre: "Durazno / melocotón",           categoria: "fruta",    cal: 39,  p: 0.9,  c: 9.5,  f: 0.3,  gramsPerUnit: 150, unitLabel: "durazno"  },
  { id: 164, nombre: "Ciruela",                       categoria: "fruta",    cal: 46,  p: 0.7,  c: 11.4, f: 0.3,  gramsPerUnit: 66,  unitLabel: "ciruela"  },

  // ── NUECES, SEMILLAS Y GRASAS ──────────────────────────────────
  { id: 170, nombre: "Almendras",                     categoria: "grasa",    cal: 579, p: 21.2, c: 21.6, f: 49.9 },
  { id: 171, nombre: "Nueces",                        categoria: "grasa",    cal: 654, p: 15.2, c: 13.7, f: 65.2 },
  { id: 172, nombre: "Cacahuate / maní crudo",        categoria: "grasa",    cal: 567, p: 25.8, c: 16.1, f: 49.2 },
  { id: 173, nombre: "Mantequilla de maní",           categoria: "grasa",    cal: 588, p: 25.1, c: 20.0, f: 50.4 },
  { id: 174, nombre: "Semillas de chía",              categoria: "grasa",    cal: 486, p: 16.5, c: 42.1, f: 30.7 },
  { id: 175, nombre: "Semillas de lino / linaza",     categoria: "grasa",    cal: 534, p: 18.3, c: 28.9, f: 42.2 },
  { id: 176, nombre: "Semillas de girasol",           categoria: "grasa",    cal: 584, p: 20.8, c: 20.0, f: 51.5 },
  { id: 177, nombre: "Pistaches",                     categoria: "grasa",    cal: 560, p: 20.2, c: 27.5, f: 45.4 },
  { id: 178, nombre: "Anacardos / cajú",              categoria: "grasa",    cal: 553, p: 18.2, c: 30.2, f: 43.8 },
  { id: 179, nombre: "Aceite de oliva",               categoria: "grasa",    cal: 884, p: 0,    c: 0,    f: 100.0},
  { id: 180, nombre: "Aceite de coco",                categoria: "grasa",    cal: 862, p: 0,    c: 0,    f: 100.0},
  { id: 181, nombre: "Aceite vegetal / canola",       categoria: "grasa",    cal: 884, p: 0,    c: 0,    f: 100.0},
  { id: 182, nombre: "Mantequilla",                   categoria: "grasa",    cal: 717, p: 0.9,  c: 0.1,  f: 81.1 },

  // ── SUPLEMENTOS ────────────────────────────────────────────────
  { id: 190, nombre: "Proteína whey (promedio)",      categoria: "suplemento", cal: 400, p: 80.0, c: 7.0,  f: 7.0  },
  { id: 191, nombre: "Proteína caseína",              categoria: "suplemento", cal: 380, p: 80.0, c: 8.0,  f: 3.0  },
  { id: 192, nombre: "Proteína vegetal (promedio)",   categoria: "suplemento", cal: 375, p: 75.0, c: 10.0, f: 5.0  },
];

export function searchFoods(query: string, extra: Food[] = []): Food[] {
  if (!query.trim()) return [];
  const words = query.toLowerCase().trim().split(/\s+/);
  const all = [...extra, ...FOODS];
  return all.filter((f) => {
    const nombre = f.nombre.toLowerCase();
    return words.every((w) => {
      if (nombre.includes(w)) return true;
      if (w.length > 3 && nombre.includes(w.slice(0, -1))) return true;
      return false;
    });
  }).slice(0, 10);
}

export function calcMacros(food: Food, weightG: number) {
  const factor = weightG / 100;
  return {
    calorias: Math.round(food.cal * factor * 10) / 10,
    proteina: Math.round(food.p * factor * 10) / 10,
    carbs:    Math.round(food.c * factor * 10) / 10,
    grasa:    Math.round(food.f * factor * 10) / 10,
  };
}
