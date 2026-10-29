function run(input) {
  const dosage = input.cement_kg_per_m3 ?? 350;
  const volume_m3 = input.length_m * input.width_m * input.thickness_m;
  const cement_kg = volume_m3 * dosage;
  const bags_50kg = Math.ceil(cement_kg / 50);
  return { volume_m3, cement_kg, bags_50kg };
}
