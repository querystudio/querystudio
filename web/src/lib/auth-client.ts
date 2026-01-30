import { createAuthClient } from "better-auth/react";
import { inferAdditionalFields, oneTimeTokenClient } from "better-auth/client/plugins";
import { waitlistClient } from "better-auth-waitlist";
import { auth } from "./auth";

export const authClient = createAuthClient({
  plugins: [waitlistClient(), inferAdditionalFields<typeof auth>(), oneTimeTokenClient()],
});
