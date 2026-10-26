const units = ["", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf", "dix", "onze", "douze", "treize", "quatorze", "quinze", "seize", "dix-sept", "dix-huit", "dix-neuf"]
const tens = ["", "", "vingt", "trente", "quarante", "cinquante", "soixante", "soixante", "quatre-vingt", "quatre-vingt"]

export function sousCent(m: number): string {
    let r = ""
    if (m >= 20) {
        const d = Math.floor(m / 10)
        r += tens[d]
        const u = m % 10
        if (u > 0) {
            r += (d === 7 || d === 9 ? "-" + units[10 + u] : "-" + units[u])
        } else if (d === 7 || d === 9) {
            r += "-dix"
        }
    } else if (m > 0) {
        r += units[m]
    }
    return r
}

export function sousMille(m: number): string {
    if (m === 0) return ""
    let r = ""
    if (m >= 100) {
        const c = Math.floor(m / 100)
        r += (c > 1 ? units[c] + " " : "") + "cent "
        m %= 100
    }
    if (m > 0) r += sousCent(m)
    return r.trim()
}

export function numInWords(n: number): string {
    if (n === 0) return "zéro"
    let w = ""
    if (n >= 1000000) {
        const mil = Math.floor(n / 1000000)
        w += (mil === 1 ? "un " : sousMille(mil) + " ") + "million "
        n %= 1000000
    }
    if (n >= 1000) {
        const k = Math.floor(n / 1000)
        w += (k > 1 ? sousMille(k) + " " : "") + "mille "
        n %= 1000
    }
    if (n > 0) w += sousMille(n)
    return w.trim().toUpperCase()
}
