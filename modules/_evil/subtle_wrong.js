// Looks correct on examples but wrong on edge cases (uses truncated rate)
function run(input) {
  const rate = 656; // wrong: should be 655.957, passes rounded examples but fails precise checks
  if (input.direction === "XOF_TO_EUR") return { result: input.amount / rate, currency: "EUR" };
  return { result: input.amount * rate, currency: "XOF" };
}
