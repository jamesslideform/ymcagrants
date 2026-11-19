/**
 * Example data for the stub API.
 *
 * Plausible YMCA of East Tennessee grants and outcomes — enough variety that
 * every screen has something real to show. Replaced by Mike's backend; see
 * FRONTEND_TODO.md for the migration.
 */

import type { Grant, Outcome } from "../types";

/** Dates are relative to today so deadlines never go stale in a demo. */
function dateOffset(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function timestampOffset(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

export const SEED_GRANTS: Grant[] = [
  {
    grantId: "g-1001",
    name: "Youth Development 2026",
    funder: "United Way of Greater Knoxville",
    status: "active",
    submissionDate: dateOffset(-210),
    startDate: dateOffset(-150),
    lengthMonths: 12,
    dueDate: dateOffset(18),
    amountRequested: "50000.00",
    amountReceived: "48000.00",
    createdAt: timestampOffset(-210),
  },
  {
    grantId: "g-1002",
    name: "Summer Learning Loss Prevention",
    funder: "City of Knoxville",
    status: "active",
    submissionDate: dateOffset(-180),
    startDate: dateOffset(-120),
    lengthMonths: 9,
    dueDate: dateOffset(42),
    amountRequested: "32500.00",
    amountReceived: "32500.00",
    createdAt: timestampOffset(-180),
  },
  {
    grantId: "g-1003",
    name: "Safety Around Water",
    funder: "Knox County Health Department",
    status: "active",
    submissionDate: dateOffset(-95),
    startDate: dateOffset(-60),
    lengthMonths: 6,
    dueDate: dateOffset(-4),
    amountRequested: "18000.00",
    amountReceived: "15000.00",
    createdAt: timestampOffset(-95),
  },
  {
    grantId: "g-1004",
    name: "Senior Wellness Initiative",
    funder: "East Tennessee Foundation",
    status: "submitted",
    submissionDate: dateOffset(-24),
    startDate: null,
    lengthMonths: 12,
    dueDate: dateOffset(55),
    amountRequested: "25000.00",
    amountReceived: null,
    createdAt: timestampOffset(-24),
  },
  {
    grantId: "g-1005",
    name: "Food Security Partnership",
    funder: "Second Harvest Food Bank",
    status: "prospect",
    submissionDate: null,
    startDate: null,
    lengthMonths: 18,
    dueDate: null,
    amountRequested: "60000.00",
    amountReceived: null,
    createdAt: timestampOffset(-9),
  },
  {
    grantId: "g-1006",
    name: "Teen Leadership Corps",
    funder: "Tennessee Department of Human Services",
    status: "closed",
    submissionDate: dateOffset(-520),
    startDate: dateOffset(-450),
    lengthMonths: 12,
    dueDate: dateOffset(-70),
    amountRequested: "40000.00",
    amountReceived: "40000.00",
    createdAt: timestampOffset(-520),
  },
  {
    grantId: "g-1007",
    name: "Arts Enrichment Pilot",
    funder: "Arts & Culture Alliance",
    status: "declined",
    submissionDate: dateOffset(-140),
    startDate: null,
    lengthMonths: 6,
    dueDate: null,
    amountRequested: "12000.00",
    amountReceived: null,
    createdAt: timestampOffset(-140),
  },
];

export const SEED_OUTCOMES: Outcome[] = [
  {
    outcomeId: "o-2001",
    grantId: "g-1001",
    peopleServed: 184,
    socialStatus: "youth 6-12",
    zipCode: "37902",
    descriptionOfFunding: "After-school programming at the downtown branch",
    result: "Attendance held above 85% across the fall term",
    createdAt: timestampOffset(-120),
  },
  {
    outcomeId: "o-2002",
    grantId: "g-1001",
    peopleServed: 228,
    socialStatus: "youth 6-12",
    zipCode: "37917",
    descriptionOfFunding: "After-school programming at the north branch",
    result: "Met the 350-youth target by the third quarter",
    createdAt: timestampOffset(-45),
  },
  {
    outcomeId: "o-2003",
    grantId: "g-1002",
    peopleServed: 96,
    socialStatus: "youth 6-12",
    zipCode: "37920",
    descriptionOfFunding: "Six-week summer literacy camp",
    result: "Reading assessments improved for 71% of participants",
    createdAt: timestampOffset(-70),
  },
  {
    outcomeId: "o-2004",
    grantId: "g-1003",
    peopleServed: 310,
    socialStatus: "youth 4-10",
    zipCode: "37902",
    descriptionOfFunding: "Free swim lessons, eight sessions",
    result: "Every participant completed the water-safety checklist",
    createdAt: timestampOffset(-30),
  },
  {
    outcomeId: "o-2005",
    grantId: "g-1003",
    peopleServed: 142,
    socialStatus: "youth 4-10",
    zipCode: "37912",
    descriptionOfFunding: "Free swim lessons at the north branch",
    result: null,
    createdAt: timestampOffset(-12),
  },
  {
    outcomeId: "o-2006",
    grantId: "g-1006",
    peopleServed: 48,
    socialStatus: "teens 13-18",
    zipCode: "37917",
    descriptionOfFunding: "Paid leadership internships",
    result: "41 of 48 completed the full program",
    createdAt: timestampOffset(-200),
  },
];
