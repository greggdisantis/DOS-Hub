import bcrypt from "bcryptjs";
import mysql from "mysql2/promise";

const SALT_ROUNDS = 10;

// Ensure DATABASE_URL is set
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL environment variable is required");
  process.exit(1);
}

// User passwords from the document
const userPasswords = [
  // Admin Accounts
  { email: "greggdisantis@gmail.com", password: null }, // GitHub sign-in only
  { email: "gdisantis@distinctiveos.com", password: "Pa$%$w0rdGcd#8541" },
  { email: "judyantonucci32@salsnursery.com", password: "Secure5644$" },
  { email: "z6rr82xkpq@privaterelay.appleid.com", password: "Team5236&" },

  // Manager Accounts
  { email: "maksymm26@gmail.com", password: "DosHub4934!" },
  { email: "smelnyk@distinctiveos.com", password: "Team1547!" },
  { email: "sgiordano@distinctiveos.com", password: "Team8713&" },
  { email: "jantonucci@salsnursery.com", password: "Login7810!" },
  { email: "sliney99@gmail.com", password: "Team6152&" },
  { email: "kpoarch@distinctiveos.com", password: "Portal7756!" },
  { email: "nhitch@salsnursery.com", password: "Portal3075&" },
  { email: "mjohnson@distinctiveos.com", password: "Entry7876@" },
  { email: "KHARRY@SALSNURSERY.COM", password: "Login4534$" },

  // Team Member Accounts
  { email: "BThornton@DistinctiveOS.com", password: "Team5365!" },
  { email: "rmiller@distinctiveos.com", password: "Access1691!" },
  { email: "vcash@distinctiveos.com", password: "Access2022!" },
  { email: "zacharyd@distinctiveos.com", password: "Login8003$" },
  { email: "greggd.distinctiveos@gmail.com", password: "Login5471&" },
];

async function setUserPasswords() {
  console.log("[SetPasswords] Starting password setup...");

  const connection = await mysql.createConnection(process.env.DATABASE_URL);

  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  for (const { email, password } of userPasswords) {
    try {
      // Skip if no password (GitHub-only accounts)
      if (!password) {
        console.log(`[SetPasswords] Skipping ${email} (GitHub sign-in only)`);
        skipCount++;
        continue;
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

      // Update user with password hash
      const [result] = await connection.execute(
        "UPDATE users SET password_hash = ? WHERE LOWER(email) = LOWER(?)",
        [passwordHash, email],
      );

      if ((result as any).affectedRows > 0) {
        console.log(`[SetPasswords] ✓ Password set for ${email}`);
        successCount++;
      } else {
        console.warn(`[SetPasswords] User not found: ${email}`);
        errorCount++;
      }
    } catch (error) {
      console.error(`[SetPasswords] Error setting password for ${email}:`, error);
      errorCount++;
    }
  }

  await connection.end();

  console.log(`\n[SetPasswords] Summary:`);
  console.log(`  ✓ Success: ${successCount}`);
  console.log(`  ⊘ Skipped: ${skipCount}`);
  console.log(`  ✗ Errors: ${errorCount}`);
  console.log(`\nAll passwords have been set. Users can now log in with email/password.`);

  process.exit(0);
}

setUserPasswords().catch((error) => {
  console.error("[SetPasswords] Fatal error:", error);
  process.exit(1);
});
