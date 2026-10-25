"use client";

const patterns: Record<number, string> = {
    0: "11011001100", 1: "11001101100", 2: "11001100110", 3: "10010011000",
    4: "10010001100", 5: "10001001100", 6: "10011001000", 7: "10011000100",
    8: "10001100100", 9: "11001001000", 10: "11001000100", 11: "11000100100",
    12: "10110011100", 13: "10011011100", 14: "10011001110", 15: "10111001100",
    16: "10011101100", 17: "10011100110", 18: "11001110010", 19: "11001011100",
    20: "11001001110", 21: "11011100100", 22: "11001110100", 23: "11101101110",
    24: "11101001100", 25: "11100101100", 26: "11100100110", 27: "11101100100",
    28: "11100110100", 29: "11100110010", 30: "11011011000", 31: "11011000110",
    32: "11000110110", 33: "10100011000", 34: "10001011000", 35: "10001000110",
    36: "10110001000", 37: "10001101000", 38: "10001100010", 39: "11010001000",
    40: "11000101000", 41: "11000100010", 42: "10110111000", 43: "10110001110",
    44: "10001101110", 45: "10111011000", 46: "10111000110", 47: "10001110110",
    48: "11101110110", 49: "11010001110", 50: "11000101110", 51: "11011101000",
    52: "11011100010", 53: "11011101110", 54: "11101011000", 55: "11101000110",
    56: "11100010110", 57: "11101101000", 58: "11101100010", 59: "11100011010",
    60: "11101111010", 61: "11001000010", 62: "11110001010", 63: "10100110000",
    64: "10100001100", 65: "10010110000", 66: "10010000110", 67: "10000101100",
    68: "10000100110", 69: "10110010000", 70: "10110000100", 71: "10011010000",
    72: "10011000010", 73: "10000110100", 74: "10000110010", 75: "11000010010",
    76: "11001010000", 77: "11110111010", 78: "11000010100", 79: "10001111010",
    80: "10100111000", 81: "10011100100", 82: "10001110010", 83: "11000101010",
    84: "11000100110", 85: "10010011001", 86: "10011001001", 87: "10011001101",
    88: "10011100101", 89: "11001001001", 90: "11001001101", 91: "11001100101",
    92: "10100110010", 93: "10100110110", 94: "10100110110", 95: "10100101100",
    96: "11011010010", 97: "11011010110", 98: "11011011010", 99: "11001101010",
    100: "11001101010", 101: "10001101010", 102: "10001101010", 103: "11001101010",
    104: "11001101010",
};

export function code128Encode(data: string): string {
    const startB = patterns[104];
    const stop = "1100011101011";
    let checksum = 104;
    let result = startB;
    for (let i = 0; i < data.length; i++) {
        const charCode = data.charCodeAt(i);
        const codeValue = charCode - 32;
        if (codeValue < 0 || codeValue > 95) continue;
        const pattern = patterns[codeValue];
        if (!pattern) continue;
        result += pattern;
        checksum += codeValue * (i + 1);
    }
    const checkDigit = checksum % 103;
    result += patterns[checkDigit] || patterns[0];
    result += stop;
    return result;
}

function code128Bars(data: string): { x: number; width: number }[] {
    const binary = code128Encode(data);
    const bars: { x: number; width: number }[] = [];
    let x = 8;
    for (const bit of binary) {
        if (bit === "1") {
            bars.push({ x, width: 1 });
        }
        x += 1;
    }
    return bars;
}

export function BarcodeDisplay({ value, compact }: { value: string; compact?: boolean }) {
    if (!value) return <span className="text-xs text-muted-foreground">—</span>;

    const bars = code128Bars(value);
    const svgWidth = bars.length > 0 ? (bars[bars.length - 1].x + bars[bars.length - 1].width + 8) : 120;

    if (compact) {
        return (
            <div className="flex flex-col items-center gap-0.5 cursor-default" title={value}>
                <svg width={Math.min(svgWidth, 140)} height="24" viewBox={`0 0 ${Math.min(svgWidth, 140)} 24`} className="shrink-0">
                    {bars.filter((_, i) => i % 2 === 0).map((bar, i) => (
                        <rect key={i} x={bar.x} y="2" width={bar.width} height="18" fill="black" />
                    ))}
                </svg>
                <span className="text-[9px] font-mono text-muted-foreground truncate max-w-[140px]">{value}</span>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-start gap-0.5 cursor-default">
            <svg width={Math.min(svgWidth, 200)} height="32" viewBox={`0 0 ${svgWidth} 32`}>
                {bars.map((bar, i) => (
                    <rect key={i} x={bar.x} y="2" width={bar.width} height="24" fill="black" />
                ))}
            </svg>
            <span className="text-[10px] font-mono text-muted-foreground">{value}</span>
        </div>
    );
}
