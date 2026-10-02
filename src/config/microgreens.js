// Database selection belongs to the deployment, never to an incoming Host header.
export function microgreensEnvironment(
  value = process.env.MICROGREENS_ENVIRONMENT || "production",
) {
  if (!["test", "production"].includes(value))
    throw new Error("MICROGREENS_ENVIRONMENT must be test or production");
  return value;
}

export function validateMicrogreensDatabase(
  uri,
  environment = microgreensEnvironment(),
) {
  const expected = environment === "test" ? "rides" : "microgreenskart";
  let database;
  try {
    const parsed = new URL(uri);
    if (
      !["mongodb:", "mongodb+srv:"].includes(parsed.protocol) ||
      parsed.searchParams.has("dbName")
    )
      throw new Error();
    database = decodeURIComponent(parsed.pathname.slice(1));
  } catch {
    throw new Error("Invalid Microgreens MongoDB URI");
  }
  if (database !== expected)
    throw new Error(`Microgreens ${environment} requires database ${expected}`);
  return expected;
}
