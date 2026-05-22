/**
 * Alimentos típicos colombianos (HU-12).
 *
 * Fuente: Tabla de Composición de Alimentos Colombianos (TCAC) del ICBF,
 * complementada con valores estándar para preparaciones combinadas.
 * Todos los valores son por 100g de porción comestible.
 *
 * Convención de categorias coincide con el esquema actual: "proteina",
 * "cereal", "legumbre", "lacteo", "verdura", "fruta", "grasa".
 * Para platos compuestos usamos "proteina" (el macro dominante) y dejamos
 * que la UI los muestre como regionales por el badge de bandera.
 */

import type { Food } from "@/lib/foods";

export type RegionalFood = Omit<Food, "id"> & {
  regionCode: "CO" | "LAC";
};

export const FOODS_CO: RegionalFood[] = [
  // ── PLATOS PRINCIPALES COLOMBIANOS ──────────────────────────────────
  { nombre: "Arepa de maíz blanco",              categoria: "cereal",    cal: 220, p: 5.0,  c: 45.0, f: 2.0,  gramsPerUnit: 60, unitLabel: "arepa", regionCode: "CO" },
  { nombre: "Arepa de maíz amarillo",            categoria: "cereal",    cal: 230, p: 5.5,  c: 46.0, f: 2.5,  gramsPerUnit: 60, unitLabel: "arepa", regionCode: "CO" },
  { nombre: "Arepa de huevo",                    categoria: "proteina",  cal: 305, p: 9.5,  c: 35.0, f: 14.0, gramsPerUnit: 110, unitLabel: "arepa", regionCode: "CO" },
  { nombre: "Bandeja paisa (porción completa)",  categoria: "proteina",  cal: 220, p: 14.0, c: 18.0, f: 11.5, regionCode: "CO" },
  { nombre: "Ajiaco santafereño",                categoria: "proteina",  cal: 105, p: 7.5,  c: 12.0, f: 3.0,  regionCode: "CO" },
  { nombre: "Sancocho de gallina",               categoria: "proteina",  cal: 95,  p: 8.0,  c: 8.0,  f: 3.5,  regionCode: "CO" },
  { nombre: "Sancocho de pescado",               categoria: "proteina",  cal: 90,  p: 9.0,  c: 7.5,  f: 2.5,  regionCode: "CO" },
  { nombre: "Mondongo",                          categoria: "proteina",  cal: 115, p: 9.0,  c: 8.5,  f: 4.5,  regionCode: "CO" },
  { nombre: "Mute santandereano",                categoria: "proteina",  cal: 130, p: 10.0, c: 12.0, f: 4.0,  regionCode: "CO" },
  { nombre: "Sudado de pollo",                   categoria: "proteina",  cal: 145, p: 14.0, c: 6.0,  f: 7.0,  regionCode: "CO" },
  { nombre: "Pescado a la criolla",              categoria: "proteina",  cal: 145, p: 18.0, c: 4.0,  f: 6.5,  regionCode: "CO" },
  { nombre: "Arroz con pollo colombiano",        categoria: "cereal",    cal: 175, p: 9.0,  c: 22.0, f: 5.5,  regionCode: "CO" },
  { nombre: "Arroz con coco",                    categoria: "cereal",    cal: 210, p: 3.0,  c: 30.0, f: 9.0,  regionCode: "CO" },
  { nombre: "Calentado paisa",                   categoria: "cereal",    cal: 195, p: 9.5,  c: 25.0, f: 6.5,  regionCode: "CO" },
  { nombre: "Tamal tolimense",                   categoria: "proteina",  cal: 215, p: 8.0,  c: 24.0, f: 9.5,  gramsPerUnit: 280, unitLabel: "tamal", regionCode: "CO" },
  { nombre: "Lechona tolimense",                 categoria: "proteina",  cal: 290, p: 16.0, c: 14.0, f: 19.0, regionCode: "CO" },

  // ── ACOMPAÑAMIENTOS Y FRITOS ────────────────────────────────────────
  { nombre: "Patacón verde",                     categoria: "cereal",    cal: 275, p: 1.5,  c: 35.0, f: 14.0, gramsPerUnit: 50, unitLabel: "patacón", regionCode: "CO" },
  { nombre: "Plátano maduro frito",              categoria: "cereal",    cal: 195, p: 1.0,  c: 31.0, f: 7.5,  regionCode: "CO" },
  { nombre: "Yuca frita",                        categoria: "cereal",    cal: 270, p: 1.5,  c: 38.0, f: 12.0, regionCode: "CO" },
  { nombre: "Yuca cocida",                       categoria: "cereal",    cal: 160, p: 1.4,  c: 38.0, f: 0.3,  regionCode: "CO" },
  { nombre: "Papa criolla cocida",               categoria: "cereal",    cal: 95,  p: 2.5,  c: 21.0, f: 0.2,  regionCode: "CO" },
  { nombre: "Empanada de carne",                 categoria: "proteina",  cal: 285, p: 7.5,  c: 28.0, f: 16.0, gramsPerUnit: 70, unitLabel: "empanada", regionCode: "CO" },
  { nombre: "Empanada de pollo",                 categoria: "proteina",  cal: 270, p: 8.0,  c: 28.0, f: 14.0, gramsPerUnit: 70, unitLabel: "empanada", regionCode: "CO" },
  { nombre: "Pandebono",                         categoria: "cereal",    cal: 340, p: 9.0,  c: 38.0, f: 16.0, gramsPerUnit: 50, unitLabel: "pandebono", regionCode: "CO" },
  { nombre: "Almojábana",                        categoria: "cereal",    cal: 325, p: 12.0, c: 35.0, f: 14.0, gramsPerUnit: 60, unitLabel: "almojábana", regionCode: "CO" },
  { nombre: "Buñuelo navideño",                  categoria: "cereal",    cal: 365, p: 9.0,  c: 32.0, f: 22.0, gramsPerUnit: 45, unitLabel: "buñuelo", regionCode: "CO" },
  { nombre: "Pandeyuca",                         categoria: "cereal",    cal: 305, p: 8.0,  c: 40.0, f: 12.0, gramsPerUnit: 40, unitLabel: "pandeyuca", regionCode: "CO" },
  { nombre: "Pan de queso costeño",              categoria: "cereal",    cal: 290, p: 9.0,  c: 33.0, f: 13.0, gramsPerUnit: 55, unitLabel: "pan", regionCode: "CO" },

  // ── LEGUMBRES Y FRIJOLES ───────────────────────────────────────────
  { nombre: "Fríjoles paisas (cocidos)",         categoria: "legumbre",  cal: 145, p: 9.0,  c: 22.0, f: 1.5,  regionCode: "CO" },
  { nombre: "Lentejas guisadas",                 categoria: "legumbre",  cal: 125, p: 8.5,  c: 20.0, f: 1.0,  regionCode: "CO" },
  { nombre: "Garbanzo cocido",                   categoria: "legumbre",  cal: 165, p: 8.5,  c: 27.0, f: 2.6,  regionCode: "LAC" },

  // ── SALSAS Y CONDIMENTOS ───────────────────────────────────────────
  { nombre: "Hogao (sofrito colombiano)",        categoria: "verdura",   cal: 65,  p: 1.5,  c: 8.0,  f: 3.0,  regionCode: "CO" },
  { nombre: "Ají casero colombiano",             categoria: "verdura",   cal: 40,  p: 1.0,  c: 7.5,  f: 0.5,  regionCode: "CO" },
  { nombre: "Suero costeño",                     categoria: "lacteo",    cal: 95,  p: 3.0,  c: 4.5,  f: 7.0,  regionCode: "CO" },

  // ── FRUTAS COLOMBIANAS / TROPICALES ────────────────────────────────
  { nombre: "Lulo",                              categoria: "fruta",     cal: 25,  p: 0.6,  c: 5.7,  f: 0.1,  regionCode: "CO" },
  { nombre: "Granadilla",                        categoria: "fruta",     cal: 95,  p: 2.0,  c: 22.4, f: 1.5,  regionCode: "CO" },
  { nombre: "Curuba",                            categoria: "fruta",     cal: 60,  p: 1.0,  c: 13.7, f: 0.4,  regionCode: "CO" },
  { nombre: "Feijoa",                            categoria: "fruta",     cal: 55,  p: 0.7,  c: 13.0, f: 0.4,  regionCode: "CO" },
  { nombre: "Gulupa",                            categoria: "fruta",     cal: 70,  p: 1.5,  c: 16.0, f: 0.7,  regionCode: "CO" },
  { nombre: "Uchuva (physalis)",                 categoria: "fruta",     cal: 53,  p: 1.9,  c: 11.2, f: 0.7,  regionCode: "CO" },
  { nombre: "Mora andina",                       categoria: "fruta",     cal: 43,  p: 1.4,  c: 9.6,  f: 0.5,  regionCode: "CO" },
  { nombre: "Tomate de árbol",                   categoria: "fruta",     cal: 33,  p: 2.0,  c: 7.0,  f: 0.7,  regionCode: "CO" },
  { nombre: "Guanábana",                         categoria: "fruta",     cal: 66,  p: 1.0,  c: 16.8, f: 0.3,  regionCode: "CO" },
  { nombre: "Mamoncillo",                        categoria: "fruta",     cal: 60,  p: 1.0,  c: 14.0, f: 0.2,  regionCode: "CO" },
  { nombre: "Zapote",                            categoria: "fruta",     cal: 134, p: 1.4,  c: 33.5, f: 0.5,  regionCode: "CO" },
  { nombre: "Borojó",                            categoria: "fruta",     cal: 92,  p: 1.5,  c: 22.0, f: 0.2,  regionCode: "CO" },
  { nombre: "Chontaduro cocido",                 categoria: "fruta",     cal: 198, p: 4.0,  c: 32.0, f: 6.5,  regionCode: "CO" },

  // ── BEBIDAS Y POSTRES ──────────────────────────────────────────────
  { nombre: "Bocadillo de guayaba",              categoria: "fruta",     cal: 295, p: 0.4,  c: 75.0, f: 0.1,  gramsPerUnit: 25, unitLabel: "tajada", regionCode: "CO" },
  { nombre: "Mazamorra (sin endulzar)",          categoria: "cereal",    cal: 80,  p: 2.5,  c: 16.0, f: 0.7,  regionCode: "CO" },
  { nombre: "Aguapanela con limón",              categoria: "cereal",    cal: 65,  p: 0.0,  c: 16.5, f: 0.0,  regionCode: "CO" },
  { nombre: "Chocolate caliente con queso",      categoria: "lacteo",    cal: 145, p: 6.0,  c: 14.0, f: 7.5,  regionCode: "CO" },
  { nombre: "Avena en hojuelas (preparada)",     categoria: "cereal",    cal: 85,  p: 3.0,  c: 14.5, f: 1.5,  regionCode: "LAC" },
  { nombre: "Champús",                           categoria: "fruta",     cal: 75,  p: 1.0,  c: 17.0, f: 0.5,  regionCode: "CO" },
  { nombre: "Chicha de maíz",                    categoria: "cereal",    cal: 60,  p: 0.5,  c: 13.5, f: 0.2,  regionCode: "CO" },

  // ── CARNES TÍPICAS ─────────────────────────────────────────────────
  { nombre: "Chorizo santarrosano",              categoria: "proteina",  cal: 295, p: 16.0, c: 2.0,  f: 25.0, gramsPerUnit: 70, unitLabel: "chorizo", regionCode: "CO" },
  { nombre: "Morcilla colombiana",               categoria: "proteina",  cal: 320, p: 14.0, c: 8.0,  f: 26.0, regionCode: "CO" },
  { nombre: "Chicharrón colombiano",             categoria: "proteina",  cal: 410, p: 22.0, c: 0.5,  f: 36.0, regionCode: "CO" },
  { nombre: "Carne en polvo",                    categoria: "proteina",  cal: 285, p: 35.0, c: 3.0,  f: 15.0, regionCode: "CO" },
];
