// Normalisation / validation d'un numéro belge extrait du web. L'extraction
// stocke parfois du bruit ("00.07-100.07", numéros surtaxés, identifiants) : on
// filtre ici à l'affichage pour que la liste d'appels ne contienne que des
// numéros réellement composables. Retourne null si le numéro n'est pas un
// numéro belge plausible.

export interface CleanPhone {
  display: string // format lisible, ex. "0465 36 82 65"
  dial: string // format tel:, ex. "+32465368265"
}

export function cleanBelgianPhone(raw: string | null | undefined): CleanPhone | null {
  if (!raw) return null
  let digits = raw.replace(/\D/g, "")
  // Normalise l'indicatif international vers 0 national. En international, le
  // numéro belge fait 10 chiffres (fixe : 32 + 8) ou 11 (mobile : 32 + 9).
  if (digits.startsWith("0032")) digits = "0" + digits.slice(4)
  else if (digits.startsWith("32") && (digits.length === 10 || digits.length === 11)) digits = "0" + digits.slice(2)

  // Numéro belge valide :
  //  - mobile : 04 + 8 chiffres = 10 chiffres (04xxxxxxxx)
  //  - fixe   : 0 + zone [1-9] + 7 chiffres = 9 chiffres (0xxxxxxxx)
  const isMobile = /^04\d{8}$/.test(digits)
  const isLandline = /^0[1-9]\d{7}$/.test(digits)
  if (!isMobile && !isLandline) return null

  const dial = "+32" + digits.slice(1)
  const display = isMobile
    ? `${digits.slice(0, 4)} ${digits.slice(4, 6)} ${digits.slice(6, 8)} ${digits.slice(8, 10)}`
    : `${digits.slice(0, 3)} ${digits.slice(3, 5)} ${digits.slice(5, 7)} ${digits.slice(7, 9)}`
  return { display, dial }
}
