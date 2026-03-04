// ─── Types & Constants ───────────────────────────────────────────────

export type Period = "monthly" | "quarterly" | "bi-annual";

export const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export const SHORT_MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export const QUARTER_DEFINITIONS = [
  { key: "Q1", label: "Q1 · Jan - Mar", months: [0, 1, 2] },
  { key: "Q2", label: "Q2 · Apr - Jun", months: [3, 4, 5] },
  { key: "Q3", label: "Q3 · Jul - Sep", months: [6, 7, 8] },
  { key: "Q4", label: "Q4 · Oct - Dec", months: [9, 10, 11] },
] as const;

export const HALF_DEFINITIONS = [
  { key: "H1", label: "H1 · Jan - Jun", months: [0, 1, 2, 3, 4, 5] },
  { key: "H2", label: "H2 · Jul - Dec", months: [6, 7, 8, 9, 10, 11] },
] as const;

// ─── Chart Configs ───────────────────────────────────────────────────

export const barChartConfig = {
  screenTime: {
    label: "Screen Time",
    color: "#10b981",
  },
};

export const radarChartConfig = {
  screenTime: {
    label: "Screen Time",
    color: "#10b981",
  },
};
