import * as db from "../server/db";

async function main() {
  try {
    console.log("Fetching users with 'gregg' or 'disantis' in their email or name...");
    
    const allUsers = await db.getAllUsers();
    const targetUsers = allUsers.filter(
      (u) =>
        u.email?.toLowerCase().includes("gregg") ||
        u.email?.toLowerCase().includes("disantis") ||
        u.name?.toLowerCase().includes("gregg") ||
        u.name?.toLowerCase().includes("disantis")
    );

    console.log(`Found ${targetUsers.length} matching users:`);
    targetUsers.forEach((u) => {
      console.log(`  - ${u.name || "Unknown"} (${u.email}) - Current role: ${u.role}`);
    });

    if (targetUsers.length === 0) {
      console.log("No matching users found!");
      process.exit(0);
    }

    // Update each user to super-admin
    for (const user of targetUsers) {
      console.log(`\nUpdating ${user.email} to super-admin...`);
      await db.approveUser(user.id, "super-admin");
      console.log(`✓ Updated ${user.email} to super-admin`);
    }

    console.log("\n✓ All users updated successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

main();
