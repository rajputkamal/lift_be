import NodeCache from "node-cache";

const messageCentralCache = new NodeCache({ stdTTL: 0, checkperiod: 0 });

const TOKEN_KEY = "MC_AUTH_TOKEN";

export const getCachedMcToken = () => messageCentralCache.get(TOKEN_KEY);

export const setCachedMcToken = (token) =>
  messageCentralCache.set(TOKEN_KEY, token);
