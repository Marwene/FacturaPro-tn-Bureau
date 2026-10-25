export interface SerializedUser {
    id: string;
    name: string | null;
    email: string | null;
    emailVerified: Date | null;
    image: string | null;
    role: string;
    permissions: string[];
    actif: boolean;
    companyId: string | null;
    createdAt: Date;
    updatedAt: Date;
}
