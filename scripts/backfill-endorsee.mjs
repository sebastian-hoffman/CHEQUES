#!/usr/bin/env node

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function parseEndosoHistory(historyString) {
  if (!historyString || historyString.trim().length === 0) {
    return null;
  }

  // Try to extract CUIT/CUIL pattern (XX-XXXXXXX-X or XXXXXXXX)
  const cuitMatch = historyString.match(/(\d{2}-\d{6,8}-\d|\d{11})/);
  const taxId = cuitMatch ? cuitMatch[1].replace(/[^0-9-]/g, "") : null;

  // Extract name: try to get everything before the CUIT, or the first meaningful segment
  let name = historyString;
  if (taxId) {
    // Remove the CUIT from the string and get what remains
    name = historyString.replace(taxId, "").trim();
    // Remove common separators
    name = name.replace(/^[-–—\s]+|[-–—\s]+$/g, "").trim();
  }

  // Clean up the name: remove extra spaces and get the first meaningful part
  name = name.split(/[,;|\/]/)[0].trim();

  if (name.length > 0 && taxId) {
    return { name, taxId };
  }

  if (name.length > 0) {
    return { name, taxId: "" };
  }

  return null;
}

async function backfillEndorseeData() {
  console.log("Starting backfill of endorsee data...");

  // Find all ENDORSED cheques with endosoHistory but no endorseeName in history
  const endorsedCheques = await prisma.cheque.findMany({
    where: {
      status: "ENDORSED",
      endosoHistory: { not: null },
    },
    include: {
      history: {
        where: { toStatus: "ENDORSED" },
        orderBy: { observedAt: "desc" },
        take: 1,
      },
    },
  });

  console.log(`Found ${endorsedCheques.length} endorsed cheques with endosoHistory`);

  let updated = 0;

  for (const cheque of endorsedCheques) {
    const historyEntry = cheque.history[0];
    if (!historyEntry) continue;

    // Skip if already has endorsee data
    if (historyEntry.endorseeName) {
      continue;
    }

    // Parse the endosoHistory
    const parsed = parseEndosoHistory(cheque.endosoHistory);
    if (!parsed) {
      console.log(`  ⚠ Could not parse endosoHistory for cheque ${cheque.id}`);
      continue;
    }

    // Update the history entry
    try {
      await prisma.chequeStatusHistory.update({
        where: { id: historyEntry.id },
        data: {
          endorseeName: parsed.name,
          endorseeTaxId: parsed.taxId || null,
        },
      });
      console.log(`  ✓ Updated ${cheque.number || cheque.echeqId}: ${parsed.name}`);
      updated++;
    } catch (error) {
      console.log(`  ✗ Error updating cheque ${cheque.id}:`, error instanceof Error ? error.message : error);
    }
  }

  console.log(`\nBackfill complete. Updated ${updated} history entries.`);
  await prisma.$disconnect();
}

backfillEndorseeData().catch((error) => {
  console.error("Backfill failed:", error);
  process.exit(1);
});
