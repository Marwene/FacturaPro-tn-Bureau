function nombreEnLettres(n: number): string {
    if (n === 0) return "zéro";
    const unite = ["", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf",
        "dix", "onze", "douze", "treize", "quatorze", "quinze", "seize", "dix-sept",
        "dix-huit", "dix-neuf"];
    const dMap: Record<number, string> = { 2: "vingt", 3: "trente", 4: "quarante", 5: "cinquante", 6: "soixante" };
    function dizaine(d: number, u: number): string {
        if (d === 7) return u === 0 ? "soixante-dix" : u === 1 ? "soixante et onze" : "soixante-dix-" + unite[u];
        if (d === 8) return u === 0 ? "quatre-vingts" : u === 1 ? "quatre-vingt-un" : "quatre-vingt-" + unite[u];
        if (d === 9) return u === 0 ? "quatre-vingt-dix" : u === 1 ? "quatre-vingt-onze" : "quatre-vingt-dix-" + unite[u];
        if (u === 0) return dMap[d];
        if (u === 1) return dMap[d] + " et un";
        return dMap[d] + "-" + unite[u];
    }
    function moinsDe100(v: number): string {
        if (v < 20) return unite[v];
        return dizaine(Math.floor(v / 10), v % 10);
    }
    function moinsDe1000(v: number): string {
        const c = Math.floor(v / 100), r = v % 100;
        if (c === 0) return moinsDe100(r);
        if (c === 1) return r === 0 ? "cent" : "cent " + moinsDe100(r);
        return r === 0 ? unite[c] + " cents" : unite[c] + " cent " + moinsDe100(r);
    }
    const noms = ["", "mille", "million", "milliard"];
    const blocs: { val: number; txt: string }[] = [];
    let tmp = n;
    while (tmp > 0) { blocs.push({ val: tmp % 1000, txt: "" }); tmp = Math.floor(tmp / 1000); }
    for (const b of blocs) b.txt = moinsDe1000(b.val);
    const parts: string[] = [];
    for (let i = blocs.length - 1; i >= 0; i--) {
        const b = blocs[i];
        if (b.val === 0) continue;
        if (i === 1 && b.val === 1) { parts.push("mille"); continue; }
        const nom = noms[i];
        const pluriel = i >= 2 && b.val > 1 ? nom + "s" : nom;
        parts.push(b.txt + (nom ? " " + pluriel : ""));
    }
    return parts.join(" ").replace(/\s+/g, " ").trim();
}

export function montantEnLettres(n: number, devise = "TND"): string {
    const digits = devise === "TND" ? 3 : 2;
    const partieEntiere = Math.floor(Math.abs(n));
    const centiemes = Math.round((Math.abs(n) - partieEntiere) * Math.pow(10, digits));
    const intWords = nombreEnLettres(partieEntiere);
    const centWords = centiemes > 0 ? nombreEnLettres(centiemes) : "";
    const deviseLabels: Record<string, { int: string; cent: string }> = {
        TND: { int: partieEntiere > 1 ? "dinars tunisiens" : "dinar tunisien", cent: "millimes" },
        EUR: { int: partieEntiere > 1 ? "euros" : "euro", cent: "centimes" },
        USD: { int: partieEntiere > 1 ? "dollars américains" : "dollar américain", cent: "cents" },
    };
    const label = deviseLabels[devise] ?? deviseLabels.TND;
    const intPart = intWords + " " + label.int;
    if (!centWords) return intPart;
    return intPart + " et " + centWords + " " + label.cent;
}
