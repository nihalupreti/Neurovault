import neo4j, { type Driver } from "neo4j-driver";

let driver: Driver | null = null;

export function getNeo4jDriver(
  uri = process.env.NEO4J_URI || "bolt://localhost:7687",
  user = process.env.NEO4J_USER || "neo4j",
  password = process.env.NEO4J_PASSWORD || "password"
): Driver {
  if (driver) return driver;

  driver = neo4j.driver(uri, neo4j.auth.basic(user, password));
  console.log(`Neo4j driver initialized at ${uri}`);

  return driver;
}
