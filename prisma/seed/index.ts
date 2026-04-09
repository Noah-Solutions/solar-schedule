import { PrismaClient } from "../../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import "dotenv/config";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding database...");

  // ─── Service Plans ────────────────────────────────────────
  await prisma.servicePlan.upsert({
    where: { tier: "BASIC" },
    update: {},
    create: {
      tier: "BASIC",
      name: "Basic",
      description: "Remote monitoring, troubleshooting, and essential service discounts.",
      benefits: [
        "Remote monitoring and troubleshooting",
        "Remote rebooting of battery systems",
        "1 hour diagnostic/repair time",
        "20% off annual panel cleaning service",
        "10% off hourly repair costs",
        "$300 referral bonus for purchases over $20k",
      ],
      discounts: { panelCleaning: 0.2, hourlyRepair: 0.1, referralBonus: 300 },
      responseWindow: "Standard queue",
    },
  });

  await prisma.servicePlan.upsert({
    where: { tier: "ELITE" },
    update: {},
    create: {
      tier: "ELITE",
      name: "Elite",
      description: "Priority service with free annual cleaning and enhanced discounts.",
      benefits: [
        "All Basic benefits",
        "Priority diagnostic/service under 5 business days",
        "1 free annual panel cleaning",
        "25% off hourly repair costs",
        "1 free on-site system inspection",
        "$600 referral bonus for purchases over $20k",
      ],
      discounts: { panelCleaning: 0.25, hourlyRepair: 0.25, freePanelCleanings: 1, freeInspections: 1, referralBonus: 600 },
      responseWindow: "Under 5 business days",
    },
  });

  await prisma.servicePlan.upsert({
    where: { tier: "PLATINUM" },
    update: {},
    create: {
      tier: "PLATINUM",
      name: "Platinum",
      description: "Top-tier priority with maximum coverage and custom battery management.",
      benefits: [
        "All Elite benefits",
        "Priority diagnostic/service under 1 business day",
        "50% of hourly repair costs covered",
        "Custom battery profile management",
        "Second free panel cleaning",
        "$1,000 referral bonus for purchases over $20k",
      ],
      discounts: { panelCleaning: 0.5, hourlyRepair: 0.5, freePanelCleanings: 2, freeInspections: 1, referralBonus: 1000 },
      responseWindow: "Under 1 business day",
    },
  });

  // ─── Internal Users ───────────────────────────────────────
  const gmPasswordHash = await bcrypt.hash("admin123", 12);
  const gmUser = await prisma.user.upsert({
    where: { email: "gm@egt.com" },
    update: {},
    create: {
      email: "gm@egt.com",
      passwordHash: gmPasswordHash,
      roles: { create: [{ role: "GM" }, { role: "ADMIN" }] },
    },
  });

  const techPasswordHash = await bcrypt.hash("tech123", 12);
  const techUser = await prisma.user.upsert({
    where: { email: "tech@egt.com" },
    update: {},
    create: {
      email: "tech@egt.com",
      passwordHash: techPasswordHash,
      roles: { create: [{ role: "TECHNICIAN" }] },
    },
  });

  const bookPasswordHash = await bcrypt.hash("book123", 12);
  await prisma.user.upsert({
    where: { email: "bookkeeper@egt.com" },
    update: {},
    create: {
      email: "bookkeeper@egt.com",
      passwordHash: bookPasswordHash,
      roles: { create: [{ role: "BOOKKEEPER" }] },
    },
  });

  // ─── Customer 1: Jane Smith — Elite, EGT-installed ────────
  const custPassword = await bcrypt.hash("customer123", 12);

  const jane = await prisma.customer.upsert({
    where: { primaryPhone: "+16025551234" },
    update: {},
    create: {
      primaryPhone: "+16025551234",
      firstName: "Jane",
      lastName: "Smith",
      email: "jane@example.com",
      additionalPhones: ["+16025559999"],
      user: {
        create: {
          email: "jane@example.com",
          passwordHash: custPassword,
          roles: { create: [{ role: "CUSTOMER" }] },
        },
      },
      accounts: {
        create: {
          type: "RESIDENTIAL",
          name: "Home",
          addressLine1: "123 Solar Lane",
          city: "Phoenix",
          state: "AZ",
          zip: "85001",
          installedBy: "EGT",
          membership: {
            create: {
              tier: "ELITE",
              status: "ACTIVE",
              startDate: new Date("2026-01-01"),
              renewalDate: new Date("2027-01-01"),
            },
          },
        },
      },
    },
  });

  // ─── Customer 2: Marcus Rivera — Platinum, multi-account ──
  const marcus = await prisma.customer.upsert({
    where: { primaryPhone: "+14805552468" },
    update: {},
    create: {
      primaryPhone: "+14805552468",
      firstName: "Marcus",
      lastName: "Rivera",
      email: "marcus.rivera@example.com",
      user: {
        create: {
          email: "marcus.rivera@example.com",
          passwordHash: custPassword,
          roles: { create: [{ role: "CUSTOMER" }] },
        },
      },
    },
  });

  const marcusHome = await prisma.account.create({
    data: {
      customerId: marcus.id,
      type: "RESIDENTIAL",
      name: "Main Residence",
      addressLine1: "4521 Cactus Rd",
      city: "Scottsdale",
      state: "AZ",
      zip: "85251",
      installedBy: "EGT",
      membership: {
        create: {
          tier: "PLATINUM",
          status: "ACTIVE",
          startDate: new Date("2025-06-15"),
          renewalDate: new Date("2026-06-15"),
        },
      },
    },
  });

  const marcusBusiness = await prisma.account.create({
    data: {
      customerId: marcus.id,
      type: "COMMERCIAL",
      name: "Rivera Auto Body",
      addressLine1: "890 Industrial Pkwy",
      addressLine2: "Suite 12",
      city: "Tempe",
      state: "AZ",
      zip: "85281",
      installedBy: "EGT",
      membership: {
        create: {
          tier: "BASIC",
          status: "ACTIVE",
          startDate: new Date("2025-09-01"),
          renewalDate: new Date("2026-09-01"),
        },
      },
    },
  });

  // ─── Customer 3: Linda Chen — no membership, outside install
  const linda = await prisma.customer.upsert({
    where: { primaryPhone: "+14805553690" },
    update: {},
    create: {
      primaryPhone: "+14805553690",
      firstName: "Linda",
      lastName: "Chen",
      email: "linda.chen@example.com",
      user: {
        create: {
          email: "linda.chen@example.com",
          passwordHash: custPassword,
          roles: { create: [{ role: "CUSTOMER" }] },
        },
      },
    },
  });

  const lindaHome = await prisma.account.create({
    data: {
      customerId: linda.id,
      type: "RESIDENTIAL",
      name: "Home",
      addressLine1: "2210 Sunrise Dr",
      city: "Mesa",
      state: "AZ",
      zip: "85201",
      installedBy: "OTHER",
    },
  });

  // ─── Get Jane's account for service requests ──────────────
  const janeAccounts = await prisma.account.findMany({ where: { customerId: jane.id } });
  const janeAccount = janeAccounts[0];

  // ─── Service Requests ─────────────────────────────────────

  // Jane: completed maintenance
  const sr1 = await prisma.serviceRequest.create({
    data: {
      accountId: janeAccount.id,
      category: "MAINTENANCE",
      urgency: "NORMAL",
      description: "Annual system checkup. Everything seems to be working fine but it's been 12 months since the last inspection. Would like someone to check all connections and verify output levels.",
      preferredWindows: [
        { date: "2026-03-15", startTime: "09:00", endTime: "12:00" },
        { date: "2026-03-17", startTime: "13:00", endTime: "17:00" },
      ],
      status: "CLOSED",
      createdAt: new Date("2026-03-10T14:30:00"),
    },
  });

  await prisma.job.create({
    data: {
      serviceRequestId: sr1.id,
      assignedTechnicianId: techUser.id,
      scheduledDate: new Date("2026-03-15"),
      scheduledWindow: "9am-12pm",
      technicianNotes: "All panels operating within spec. Cleaned connections on inverter. Output at 98% rated capacity.",
      billingStatus: "BILLED",
    },
  });

  const sr1Job = await prisma.job.findUnique({ where: { serviceRequestId: sr1.id } });
  await prisma.comment.createMany({
    data: [
      { jobId: sr1Job!.id, authorId: techUser.id, body: "Arrived on site. Starting inspection.", createdAt: new Date("2026-03-15T09:15:00") },
      { jobId: sr1Job!.id, authorId: techUser.id, body: "All 24 panels checked. Found minor corrosion on connector at panel 17, cleaned and reseated. Inverter firmware is current.", createdAt: new Date("2026-03-15T10:45:00") },
      { jobId: sr1Job!.id, authorId: gmUser.id, body: "Good work. Marked complete.", createdAt: new Date("2026-03-15T14:00:00") },
    ],
  });

  // Jane: urgent — something wrong, currently in progress
  const sr2 = await prisma.serviceRequest.create({
    data: {
      accountId: janeAccount.id,
      category: "SOMETHING_WRONG",
      urgency: "URGENT",
      description: "System stopped producing power yesterday afternoon. The inverter is showing a red fault light and the app shows zero output since 3pm on April 5th. No storms or obvious damage visible.",
      preferredWindows: [
        { date: "2026-04-07", startTime: "08:00", endTime: "17:00" },
      ],
      status: "IN_PROGRESS",
      createdAt: new Date("2026-04-06T08:00:00"),
    },
  });

  await prisma.job.create({
    data: {
      serviceRequestId: sr2.id,
      assignedTechnicianId: techUser.id,
      scheduledDate: new Date("2026-04-07"),
      scheduledWindow: "8am-10am",
    },
  });

  const sr2Job = await prisma.job.findUnique({ where: { serviceRequestId: sr2.id } });
  await prisma.comment.createMany({
    data: [
      { jobId: sr2Job!.id, authorId: gmUser.id, body: "Priority — Elite member, urgent. Scheduled for first thing tomorrow.", createdAt: new Date("2026-04-06T08:30:00") },
      { jobId: sr2Job!.id, authorId: techUser.id, body: "On site. Inverter fault code E-481 — ground fault detected. Isolating circuits to find the source.", createdAt: new Date("2026-04-07T08:20:00") },
    ],
  });

  // Marcus (home): cleaning, scheduled
  const sr3 = await prisma.serviceRequest.create({
    data: {
      accountId: marcusHome.id,
      category: "CLEANING",
      urgency: "NORMAL",
      description: "Panels are pretty dusty after the recent windstorm. Would like the free annual cleaning included with my Platinum membership.",
      preferredWindows: [
        { date: "2026-04-14", startTime: "07:00", endTime: "10:00" },
        { date: "2026-04-15", startTime: "07:00", endTime: "10:00" },
      ],
      status: "SCHEDULED",
      createdAt: new Date("2026-04-03T10:15:00"),
    },
  });

  await prisma.job.create({
    data: {
      serviceRequestId: sr3.id,
      assignedTechnicianId: techUser.id,
      scheduledDate: new Date("2026-04-14"),
      scheduledWindow: "7am-10am",
    },
  });

  // Marcus (business): battery help, under review
  const sr4 = await prisma.serviceRequest.create({
    data: {
      accountId: marcusBusiness.id,
      category: "BATTERY",
      urgency: "NORMAL",
      description: "The battery backup at the shop isn't holding charge like it used to. It was lasting through the night but now it's dying around 2am. System is about 3 years old.",
      preferredWindows: [
        { date: "2026-04-21", startTime: "06:00", endTime: "08:00" },
      ],
      status: "UNDER_REVIEW",
      createdAt: new Date("2026-04-05T16:45:00"),
    },
  });

  // Marcus (home): closed inspection from last year — benefit usage counts toward Platinum
  const sr5 = await prisma.serviceRequest.create({
    data: {
      accountId: marcusHome.id,
      category: "INSPECTION",
      urgency: "NORMAL",
      description: "Annual system inspection for Platinum membership.",
      status: "CLOSED",
      createdAt: new Date("2025-10-01T09:00:00"),
    },
  });

  await prisma.job.create({
    data: {
      serviceRequestId: sr5.id,
      assignedTechnicianId: techUser.id,
      scheduledDate: new Date("2025-10-08"),
      scheduledWindow: "10am-12pm",
      technicianNotes: "Full inspection complete. All 32 panels in excellent condition. Battery health at 94%. Recommended firmware update — applied on site.",
      billingStatus: "NOT_APPLICABLE",
    },
  });

  // Linda: new submission — outside install, something wrong
  const sr6 = await prisma.serviceRequest.create({
    data: {
      accountId: lindaHome.id,
      category: "SOMETHING_WRONG",
      urgency: "URGENT",
      description: "My solar panels were installed by SunRun about 2 years ago but they stopped servicing my area. The system output has dropped by about 40% over the last month. I don't know the model or specs — I just know it's not producing what it used to. A neighbor recommended EGT.",
      preferredWindows: [
        { date: "2026-04-09", startTime: "09:00", endTime: "17:00" },
        { date: "2026-04-10", startTime: "09:00", endTime: "17:00" },
      ],
      status: "SUBMITTED",
      createdAt: new Date("2026-04-07T11:20:00"),
    },
  });

  // Linda: warranty question, submitted
  const sr7 = await prisma.serviceRequest.create({
    data: {
      accountId: lindaHome.id,
      category: "WARRANTY",
      urgency: "NORMAL",
      description: "I have warranty paperwork from SunRun for the panels but I'm not sure if it transfers or if EGT can help me file a claim. The panels are LG NeON 2 375W, installed March 2024.",
      status: "SUBMITTED",
      createdAt: new Date("2026-04-07T11:35:00"),
    },
  });

  // ─── Unlinked request (no account, new prospect) ───────────
  await prisma.serviceRequest.create({
    data: {
      accountId: null,
      category: "INSPECTION",
      urgency: "NORMAL",
      description: "We just bought a house with an existing solar system. Previous owners didn't leave any documentation. We'd like someone to come out, tell us what we have, and whether it's working correctly.",
      preferredWindows: [
        { date: "2026-04-16", startTime: "10:00", endTime: "14:00" },
      ],
      status: "SUBMITTED",
      contactName: "Tom & Sarah Williams",
      contactPhone: "+14805557821",
      contactEmail: "twilliams.home@example.com",
      serviceAddress: {
        addressLine1: "7744 Desert View Dr",
        city: "Gilbert",
        state: "AZ",
        zip: "85234",
        installedBy: "OTHER",
      },
      createdAt: new Date("2026-04-08T09:00:00"),
    },
  });

  // ─── Reschedule-requested scenario ────────────────────────
  const sr8 = await prisma.serviceRequest.create({
    data: {
      accountId: marcusHome.id,
      category: "MAINTENANCE",
      urgency: "NORMAL",
      description: "Routine maintenance on the home system. Want to make sure everything is good before summer.",
      preferredWindows: [
        { date: "2026-04-10", startTime: "08:00", endTime: "12:00" },
      ],
      status: "RESCHEDULE_REQUESTED",
      createdAt: new Date("2026-04-01T08:00:00"),
    },
  });

  await prisma.job.create({
    data: {
      serviceRequestId: sr8.id,
      assignedTechnicianId: techUser.id,
      scheduledDate: new Date("2026-04-10"),
      scheduledWindow: "8am-12pm",
      rescheduleReason: "Customer not home — gate was locked and couldn't reach them by phone.",
      rescheduleSuggestedTimes: [
        { date: "2026-04-17", startTime: "08:00", endTime: "12:00" },
        { date: "2026-04-18", startTime: "13:00", endTime: "17:00" },
      ],
    },
  });

  // ─── Coverage Rules ────────────────────────────────────────
  const coverageRules = [
    // Basic
    { tier: "BASIC" as const, category: "CLEANING" as const, ruleType: "DISCOUNT_PERCENT" as const, value: 20 },
    { tier: "BASIC" as const, category: "SOMETHING_WRONG" as const, ruleType: "DISCOUNT_PERCENT" as const, value: 10 },
    { tier: "BASIC" as const, category: "MAINTENANCE" as const, ruleType: "INCLUDED_HOURS" as const, value: 1 },
    // Elite
    { tier: "ELITE" as const, category: "CLEANING" as const, ruleType: "FREE_PER_YEAR" as const, value: 1, fallbackRuleType: "DISCOUNT_PERCENT" as const, fallbackValue: 25 },
    { tier: "ELITE" as const, category: "INSPECTION" as const, ruleType: "FREE_PER_YEAR" as const, value: 1 },
    { tier: "ELITE" as const, category: "SOMETHING_WRONG" as const, ruleType: "DISCOUNT_PERCENT" as const, value: 25 },
    { tier: "ELITE" as const, category: "MAINTENANCE" as const, ruleType: "INCLUDED_HOURS" as const, value: 1 },
    // Platinum
    { tier: "PLATINUM" as const, category: "CLEANING" as const, ruleType: "FREE_PER_YEAR" as const, value: 2, fallbackRuleType: "DISCOUNT_PERCENT" as const, fallbackValue: 50 },
    { tier: "PLATINUM" as const, category: "INSPECTION" as const, ruleType: "FREE_PER_YEAR" as const, value: 1 },
    { tier: "PLATINUM" as const, category: "SOMETHING_WRONG" as const, ruleType: "DISCOUNT_PERCENT" as const, value: 50 },
    { tier: "PLATINUM" as const, category: "MAINTENANCE" as const, ruleType: "INCLUDED_HOURS" as const, value: 1 },
  ];

  for (const rule of coverageRules) {
    await prisma.coverageRule.upsert({
      where: { tier_category: { tier: rule.tier, category: rule.category } },
      update: {},
      create: {
        tier: rule.tier,
        category: rule.category,
        ruleType: rule.ruleType,
        value: rule.value,
        fallbackRuleType: rule.fallbackRuleType || null,
        fallbackValue: rule.fallbackValue ?? null,
      },
    });
  }

  // ─── Communication Templates ──────────────────────────────
  await prisma.communicationTemplate.createMany({
    data: [
      {
        triggerEvent: "request_submitted",
        name: "Request Confirmation",
        subject: "We received your service request",
        body: "Hi {{customerName}},\n\nThank you for submitting a service request for {{category}} at {{address}}. Our team will review your request and follow up within {{responseWindow}}.\n\nReference: {{requestId}}\n\nBest,\nEGT Service Team",
        isActive: true,
      },
      {
        triggerEvent: "appointment_scheduled",
        name: "Appointment Scheduled",
        subject: "Your appointment has been scheduled",
        body: "Hi {{customerName}},\n\nYour service appointment has been scheduled:\n\nDate: {{scheduledDate}}\nTime: {{scheduledWindow}}\nTechnician: {{technicianName}}\nLocation: {{address}}\n\nIf you need to reschedule, please contact us.\n\nBest,\nEGT Service Team",
        isActive: true,
      },
      {
        triggerEvent: "status_changed",
        name: "Status Update",
        subject: "Service request update: {{status}}",
        body: "Hi {{customerName}},\n\nYour service request ({{requestId}}) has been updated to: {{status}}.\n\nIf you have questions, please reply to this email.\n\nBest,\nEGT Service Team",
        isActive: true,
      },
      {
        triggerEvent: "outside_install_followup",
        name: "Outside Install Follow-up",
        subject: "Welcome to EGT — next steps for your service",
        body: "Hi {{customerName}},\n\nWe noticed your system was installed by another provider. Our GM will reach out within 1 business day to schedule an onboarding call so we can learn about your system and provide the best possible service.\n\nIn the meantime, your service request is in our queue.\n\nBest,\nEGT Service Team",
        isActive: true,
      },
    ],
    skipDuplicates: true,
  });

  // ─── Service Catalog Items ────────────────────────────────
  await prisma.serviceCatalogItem.createMany({
    data: [
      { name: "Emergency Diagnosis", description: "Urgent on-site diagnosis for system failures and faults", category: "SOMETHING_WRONG", isActive: true },
      { name: "Annual Maintenance", description: "Comprehensive annual system checkup including connections, output verification, and firmware updates", category: "MAINTENANCE", isActive: true },
      { name: "Panel Cleaning", description: "Professional cleaning of all solar panels to restore optimal output", category: "CLEANING", isActive: true },
      { name: "System Inspection", description: "Full system inspection with written report on health, output, and recommendations", category: "INSPECTION", isActive: true },
      { name: "Battery Diagnostics", description: "Battery health check, capacity testing, and charge cycle analysis", category: "BATTERY", isActive: true },
      { name: "Battery Replacement", description: "Removal of old battery and installation of replacement unit", category: "BATTERY", isActive: true },
      { name: "Warranty Claim Support", description: "Assistance with filing and tracking manufacturer warranty claims", category: "WARRANTY", isActive: true },
      { name: "Inverter Replacement", description: "Diagnosis and replacement of faulty inverter units", category: "SOMETHING_WRONG", isActive: true },
    ],
    skipDuplicates: true,
  });

  console.log("");
  console.log("Seed complete!");
  console.log("");
  console.log("Dev logins (all passwords below):");
  console.log("  GM/Admin:    gm@egt.com / admin123");
  console.log("  Technician:  tech@egt.com / tech123");
  console.log("  Bookkeeper:  bookkeeper@egt.com / book123");
  console.log("");
  console.log("  Customer 1 (Elite, EGT-installed):      jane@example.com / customer123");
  console.log("  Customer 2 (Platinum+Basic, 2 accounts): marcus.rivera@example.com / customer123");
  console.log("  Customer 3 (No membership, outside):     linda.chen@example.com / customer123");
  console.log("");
  console.log("Service requests:");
  console.log("  Jane:     1 CLOSED maintenance (billed), 1 urgent IN_PROGRESS (inverter fault)");
  console.log("  Marcus:   1 scheduled cleaning, 1 under-review battery, 1 CLOSED inspection (N/A - covered), 1 reschedule-requested");
  console.log("  Linda:    1 submitted urgent (outside install), 1 submitted warranty question");
  console.log("  Unlinked: 1 submitted inspection (new prospect, no account)");
  console.log("");
  console.log("Billing queue: Jane's closed maintenance shows as BILLED, Marcus's inspection as NOT_APPLICABLE");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
