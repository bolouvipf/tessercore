function run(input) {
  const P = input.principal;
  const r = input.annual_rate_percent / 100 / 12;
  const n = input.months;
  let payment;
  if (r === 0) payment = P / n;
  else payment = P * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1);
  const total_paid = payment * n;
  const total_interest = total_paid - P;
  return { payment, total_interest, total_paid };
}
