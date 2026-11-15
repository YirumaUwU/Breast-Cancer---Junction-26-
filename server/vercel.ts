/**
 * Entry for the Vercel function. `npm run build:api` bundles this into
 * api/draft.js, which Vercel serves at /api/draft. Set ANTHROPIC_API_KEY
 * (and ANTHROPIC_WORKSPACE_ID if the key needs it) in the Vercel project.
 */
import { createDraftHandler } from './draft';

export const config = { maxDuration: 60 };
export default createDraftHandler(process.env);
