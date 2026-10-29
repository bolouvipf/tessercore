function run(input) {
  const toM = { mm:0.001, cm:0.01, m:1, km:1000, in:0.0254, ft:0.3048, yd:0.9144, mi:1609.344 };
  const from = toM[input.from];
  const to = toM[input.to];
  if (from === undefined || to === undefined) throw new Error("unknown unit");
  const result = input.value * from / to;
  return { result, unit: input.to };
}
