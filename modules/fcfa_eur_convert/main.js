function run(input) {
  const amount = input.amount;
  const direction = input.direction;
  const rate = input.rate_xof_per_eur ?? 655.957;
  if (direction === "XOF_TO_EUR") {
    return { result: amount / rate, currency: "EUR" };
  } else {
    return { result: amount * rate, currency: "XOF" };
  }
}
