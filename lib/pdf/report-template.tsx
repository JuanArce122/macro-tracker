/**
 * Plantilla PDF del reporte exportable (HU-10).
 *
 * Diseño minimalista en blanco/negro, sin imágenes embebidas (para
 * mantenerlo ligero y compatible con render server-side).
 */

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import type { ExportData } from "@/lib/export/build-export-data";

const styles = StyleSheet.create({
  page: {
    paddingTop: 48,
    paddingBottom: 48,
    paddingHorizontal: 56,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#111",
    backgroundColor: "#fff",
  },
  // ── Cover ──────────────────────────────────────────────
  coverTitle: {
    fontSize: 32,
    fontFamily: "Times-Roman",
    marginBottom: 8,
    color: "#000",
  },
  coverSubtitle: {
    fontSize: 12,
    color: "#666",
    marginBottom: 32,
  },
  // ── Secciones ──────────────────────────────────────────
  sectionTitle: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1,
    color: "#666",
    marginTop: 24,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#000",
    paddingBottom: 4,
  },
  // ── Bloques de datos ───────────────────────────────────
  row: {
    flexDirection: "row",
    marginBottom: 4,
  },
  rowLabel: {
    width: 110,
    color: "#666",
  },
  rowValue: {
    flex: 1,
    color: "#000",
  },
  // ── Stats grid ─────────────────────────────────────────
  statsGrid: {
    flexDirection: "row",
    marginTop: 8,
    marginBottom: 16,
  },
  statCell: {
    flex: 1,
    paddingRight: 8,
  },
  statValue: {
    fontSize: 22,
    fontFamily: "Times-Roman",
    color: "#000",
  },
  statLabel: {
    fontSize: 9,
    color: "#666",
    marginTop: 2,
  },
  // ── Tabla de comidas ───────────────────────────────────
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#000",
    paddingBottom: 4,
    marginBottom: 4,
    fontSize: 9,
    color: "#666",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: "#eee",
  },
  colDate:    { width: 70 },
  colCat:     { width: 60 },
  colName:    { flex: 1 },
  colCal:     { width: 50, textAlign: "right" },
  colMacro:   { width: 45, textAlign: "right" },
  // ── Footer ─────────────────────────────────────────────
  footer: {
    position: "absolute",
    bottom: 24,
    left: 56,
    right: 56,
    fontSize: 8,
    color: "#999",
    textAlign: "center",
  },
});

const CATEGORY_LABEL: Record<string, string> = {
  breakfast: "Desayuno",
  lunch: "Almuerzo",
  dinner: "Cena",
  snack: "Snack",
};

function formatDateLocal(date: string | null, fallback: string): string {
  return date ?? fallback.split("T")[0];
}

export function ReportTemplate({ data }: { data: ExportData }) {
  const meals = data.meals;
  const PAGE_SIZE = 25; // comidas por página de tabla
  const pages: typeof meals[] = [];
  for (let i = 0; i < meals.length; i += PAGE_SIZE) {
    pages.push(meals.slice(i, i + PAGE_SIZE));
  }
  if (pages.length === 0) pages.push([]); // siempre al menos 1 página

  const rangeLabel = data.range
    ? `${data.range.from} a ${data.range.to}`
    : "Todo el historial";

  return (
    <Document
      title={`Macro Tracker — Reporte ${data.user.name ?? data.user.email}`}
      author="Macro Tracker"
    >
      {/* ── PORTADA + RESUMEN ─────────────────────────────────── */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.coverTitle}>Macro Tracker</Text>
        <Text style={styles.coverSubtitle}>
          Reporte nutricional · {rangeLabel}
        </Text>

        <Text style={styles.sectionTitle}>Usuario</Text>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Nombre</Text>
          <Text style={styles.rowValue}>{data.user.name ?? "—"}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Email</Text>
          <Text style={styles.rowValue}>{data.user.email}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Edad</Text>
          <Text style={styles.rowValue}>{data.profile.age ?? "—"} años</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Sexo</Text>
          <Text style={styles.rowValue}>
            {data.profile.sex === "male" ? "Hombre" : data.profile.sex === "female" ? "Mujer" : "—"}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Peso</Text>
          <Text style={styles.rowValue}>{data.profile.weightKg ?? "—"} kg</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Altura</Text>
          <Text style={styles.rowValue}>{data.profile.heightCm ?? "—"} cm</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>País</Text>
          <Text style={styles.rowValue}>{data.profile.countryCode ?? "—"}</Text>
        </View>

        <Text style={styles.sectionTitle}>Metas diarias</Text>
        {data.goals ? (
          <View style={styles.statsGrid}>
            <View style={styles.statCell}>
              <Text style={styles.statValue}>{data.goals.calories.toFixed(0)}</Text>
              <Text style={styles.statLabel}>kcal</Text>
            </View>
            <View style={styles.statCell}>
              <Text style={styles.statValue}>{data.goals.protein.toFixed(0)}</Text>
              <Text style={styles.statLabel}>g proteína</Text>
            </View>
            <View style={styles.statCell}>
              <Text style={styles.statValue}>{data.goals.carbs.toFixed(0)}</Text>
              <Text style={styles.statLabel}>g carbos</Text>
            </View>
            <View style={styles.statCell}>
              <Text style={styles.statValue}>{data.goals.fat.toFixed(0)}</Text>
              <Text style={styles.statLabel}>g grasa</Text>
            </View>
          </View>
        ) : (
          <Text style={{ color: "#666", marginTop: 8 }}>Sin metas configuradas</Text>
        )}

        <Text style={styles.sectionTitle}>Resumen</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statCell}>
            <Text style={styles.statValue}>{data.summary.totalDays}</Text>
            <Text style={styles.statLabel}>días con registro</Text>
          </View>
          <View style={styles.statCell}>
            <Text style={styles.statValue}>{data.summary.totalMeals}</Text>
            <Text style={styles.statLabel}>comidas totales</Text>
          </View>
          <View style={styles.statCell}>
            <Text style={styles.statValue}>{data.summary.avgCaloriesPerDay}</Text>
            <Text style={styles.statLabel}>kcal/día promedio</Text>
          </View>
          <View style={styles.statCell}>
            <Text style={styles.statValue}>{(data.summary.totalCalories / 1000).toFixed(1)}k</Text>
            <Text style={styles.statLabel}>kcal totales</Text>
          </View>
        </View>

        <Text
          style={styles.footer}
          fixed
          render={({ pageNumber, totalPages }) =>
            `Generado ${data.exportedAt.split("T")[0]} · Página ${pageNumber} de ${totalPages}`
          }
        />
      </Page>

      {/* ── PÁGINAS DE TABLA DE COMIDAS ───────────────────── */}
      {pages.map((pageMeals, idx) => (
        <Page key={idx} size="A4" style={styles.page}>
          <Text style={styles.sectionTitle}>
            Comidas {idx > 0 ? `(continuación ${idx + 1}/${pages.length})` : ""}
          </Text>

          {pageMeals.length === 0 ? (
            <Text style={{ color: "#666" }}>Sin comidas registradas en el rango.</Text>
          ) : (
            <>
              <View style={styles.tableHeader}>
                <Text style={styles.colDate}>Fecha</Text>
                <Text style={styles.colCat}>Categoría</Text>
                <Text style={styles.colName}>Comida</Text>
                <Text style={styles.colCal}>kcal</Text>
                <Text style={styles.colMacro}>P</Text>
                <Text style={styles.colMacro}>C</Text>
                <Text style={styles.colMacro}>G</Text>
              </View>
              {pageMeals.map((m) => (
                <View key={m.id} style={styles.tableRow}>
                  <Text style={styles.colDate}>{formatDateLocal(m.dateLocal, m.date)}</Text>
                  <Text style={styles.colCat}>{CATEGORY_LABEL[m.category] ?? m.category}</Text>
                  <Text style={styles.colName}>{m.name}</Text>
                  <Text style={styles.colCal}>{m.calories.toFixed(0)}</Text>
                  <Text style={styles.colMacro}>{m.protein.toFixed(1)}</Text>
                  <Text style={styles.colMacro}>{m.carbs.toFixed(1)}</Text>
                  <Text style={styles.colMacro}>{m.fat.toFixed(1)}</Text>
                </View>
              ))}
            </>
          )}

          <Text
            style={styles.footer}
            fixed
            render={({ pageNumber, totalPages }) =>
              `Macro Tracker · ${data.user.name ?? data.user.email} · Página ${pageNumber} de ${totalPages}`
            }
          />
        </Page>
      ))}
    </Document>
  );
}
