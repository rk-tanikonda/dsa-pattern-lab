export const plans = {
  monthly: {
    name: "Focus",
    amount: 49900,
    display: "₹499",
    interval: "month",
    description: "Find your rhythm, one month at a time.",
  },
  annual: {
    name: "Momentum",
    amount: 399900,
    display: "₹3,999",
    interval: "year",
    description: "Make consistent practice part of your year.",
  },
} as const;
export type Plan = keyof typeof plans;
export const runLimits = { month: 500, day: 50, minute: 5 };
export function isPlan(value: unknown): value is Plan {
  return value === "monthly" || value === "annual";
}
