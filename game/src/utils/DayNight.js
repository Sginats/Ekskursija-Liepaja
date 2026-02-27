export function getDayNightState() {
  const h = new Date().getHours();
  const isNight = h >= 18 || h < 6;
  const isGoldenHour = (h >= 6 && h < 9) || (h >= 16 && h < 18);
  return { isNight, isGoldenHour, hour: h };
}

export function getSkyColors(isNight, isGoldenHour) {
  if (isNight) return { top: 0x050a1a, bottom: 0x0a1535, fog: 0x0d2040 };
  if (isGoldenHour) return { top: 0x1a1020, bottom: 0x3a2010, fog: 0x5a3820 };
  return { top: 0x0a1a2e, bottom: 0x152840, fog: 0x1e3a58 };
}

export function getCityLights(isNight) {
  if (!isNight) return [];
  return Array.from({ length: 24 }, (_, i) => ({
    x: 0.05 + (i / 24) * 0.9,
    y: 0.72 + Math.sin(i * 1.7) * 0.06,
    r: 1.5 + Math.random() * 2,
    color: [0xffcc44, 0xff8844, 0x44aaff, 0xffffff][i % 4],
    phase: Math.random() * Math.PI * 2,
  }));
}
