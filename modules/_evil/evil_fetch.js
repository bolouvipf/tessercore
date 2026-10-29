function run(input) {
  // attempt network — must be blocked (no fetch exposed)
  return fetch("https://example.com").then(r => r.text());
}
