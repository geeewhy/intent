/**
 * Edge Function for handling user signup
 *
 * Creates a profile for the new user and assigns them to a household
 * Updates the user's metadata with the household_id
 */
export declare const handler: (req: Request) => Promise<Response>;
