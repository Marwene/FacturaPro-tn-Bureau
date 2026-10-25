export const HOURS_REQUIRED_FOR_PAYMENT = 84;

export function businessHoursSince(date: Date): number {
    const now = new Date();
    const start = new Date(date);
    let hours = 0;
    const current = new Date(start);
    while (current < now) {
        const day = current.getDay();
        if (day !== 0 && day !== 6) hours += 9;
        current.setDate(current.getDate() + 1);
    }
    return hours;
}

export interface PayEligibility {
    canPay: boolean;
    hoursElapsed: number;
    hoursRequired: number;
    hoursRemaining: number;
    payableAt: Date;
}

export function computePayEligibility(dateCreation: Date): PayEligibility {
    const hoursElapsed = businessHoursSince(dateCreation);

    let hours = 0;
    const current = new Date(dateCreation);
    while (hours < HOURS_REQUIRED_FOR_PAYMENT) {
        const day = current.getDay();
        if (day !== 0 && day !== 6) hours += 9;
        if (hours >= HOURS_REQUIRED_FOR_PAYMENT) break;
        current.setDate(current.getDate() + 1);
    }

    return {
        canPay: hoursElapsed >= HOURS_REQUIRED_FOR_PAYMENT,
        hoursElapsed: Math.round(hoursElapsed),
        hoursRequired: HOURS_REQUIRED_FOR_PAYMENT,
        hoursRemaining: Math.max(0, HOURS_REQUIRED_FOR_PAYMENT - Math.round(hoursElapsed)),
        payableAt: current,
    };
}
