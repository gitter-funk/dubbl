import pg from "pg";

const demoOrganizationId = "00000000-0000-0000-0000-000000000002";
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });

try {
  await client.connect();
  await client.query(
    `update organization
     set country = 'United States',
         country_code = 'US',
         onboarding_completed_at = now()
     where id = $1`,
    [demoOrganizationId],
  );
} finally {
  await client.end();
}
