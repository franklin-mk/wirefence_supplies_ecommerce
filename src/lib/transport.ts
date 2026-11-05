/**
 * Transport estimate for heavy lorry deliveries.
 * Replace the numbers with the supplier's real tariff (or load from a DB table in v2).
 */
export const COUNTIES = [
  "Baringo","Bomet","Bungoma","Busia","Elgeyo-Marakwet","Embu","Garissa","Homa Bay","Isiolo","Kajiado",
  "Kakamega","Kericho","Kiambu","Kilifi","Kirinyaga","Kisii","Kisumu","Kitui","Kwale","Laikipia","Lamu",
  "Machakos","Makueni","Mandera","Marsabit","Meru","Migori","Mombasa","Murang'a","Nairobi","Nakuru",
  "Nandi","Narok","Nyamira","Nyandarua","Nyeri","Samburu","Siaya","Taita-Taveta","Tana River",
  "Tharaka-Nithi","Trans Nzoia","Turkana","Uasin Gishu","Vihiga","Wajir","West Pokot",
] as const;

// Depot assumed in Nyeri/Central. Zone 1 = near, 4 = far.
const ZONES: Record<string, 1 | 2 | 3 | 4> = {
  Nyeri: 1, Kirinyaga: 1, "Murang'a": 1, Nyandarua: 1, Laikipia: 1,
  Nairobi: 2, Kiambu: 2, Meru: 2, Embu: 2, "Tharaka-Nithi": 2, Nakuru: 2, Machakos: 2, Kajiado: 2, Isiolo: 2,
  Narok: 3, Kericho: 3, Bomet: 3, Baringo: 3, Samburu: 3, Makueni: 3, Kitui: 3, Nandi: 3, "Uasin Gishu": 3,
  "Elgeyo-Marakwet": 3, "Trans Nzoia": 3, Kisumu: 3, Kakamega: 3, Vihiga: 3, Kisii: 3, Nyamira: 3,
};

const BASE: Record<1 | 2 | 3 | 4, number> = { 1: 1500, 2: 3500, 3: 6500, 4: 12000 };
const PER_TONNE: Record<1 | 2 | 3 | 4, number> = { 1: 800, 2: 1500, 3: 2500, 4: 4000 };

export function estimateTransport(county: string, totalWeightKg: number) {
  const zone = ZONES[county] ?? 4;
  const tonnes = Math.max(totalWeightKg, 0) / 1000;
  const fee = Math.round((BASE[zone] + PER_TONNE[zone] * tonnes) / 50) * 50;
  const lorry = totalWeightKg > 3000 ? "Heavy lorry (over 3 t)" : totalWeightKg > 1000 ? "Medium lorry" : "Pickup / light truck";
  return { zone, fee, lorry };
}
