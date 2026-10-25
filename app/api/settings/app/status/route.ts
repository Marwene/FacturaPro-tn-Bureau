import { apiRoute } from "@/lib/api-route";
import { getApiKeyStatus } from "@/lib/api-keys";

// GET - Fetch API key status (which source: env or db)
export const GET = apiRoute.get(
    { permission: "parametres:voir", requireCompany: false },
    async () => {
        const status = await getApiKeyStatus();
        return { status };
    },
);
