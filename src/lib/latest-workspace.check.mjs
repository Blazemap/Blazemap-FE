import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { URL } from "node:url";
import { governmentPublicItems, privateReportMarkers } from "./dashboard.ts";

const reports = [
  { id: "confirmed", case: { id: "case-1" }, latitude: 1, longitude: 2 },
  { id: "unconfirmed", case: null, latitude: 3, longitude: 4 },
];
const cases = [{ id: "case-1", number: "C-1", verification: "CONFIRMED_FIRE", perimeter: { type: "Polygon", coordinates: [[[2, 1], [2.1, 1], [2, 1.1], [2, 1]]] } }];
assert.deepEqual(privateReportMarkers(reports, cases).map(item => item.id), ["unconfirmed"]);
const publicItems = [
  { id: "publication:duplicate", kind: "publication", caseNumber: "C-1" },
  { id: "publication:other", kind: "publication", caseNumber: "C-2" },
  { id: "hotspot:1", kind: "hotspot" },
];
assert.deepEqual(governmentPublicItems(publicItems, cases).map(item => item.id), ["publication:other", "hotspot:1"]);

const nav = await readFile(new URL("../components/common/WorkspaceNav.tsx", import.meta.url), "utf8");
assert.match(nav, /user\.role === "USER"[\s\S]*?\["news", "News"/);
assert.match(nav, /NotificationBell/);
const routes = await readFile(new URL("../config/routes.ts", import.meta.url), "utf8");
assert.match(routes, /path === "\/news" && user\.role === "ADMIN"/);
const citizen = await readFile(new URL("../pages/dashboard/components/CitizenDashboard.tsx", import.meta.url), "utf8");
assert.match(citizen, /const ownReports = data\?\.ownReports \?\? \[\]/);
assert.match(citizen, /ownReports=\{publications \? ownReports : \[\]\}/);
const feed = await readFile(new URL("../pages/dashboard/components/NewsFeed.tsx", import.meta.url), "utf8");
assert.match(feed, /useCitizenFeed/);
assert.match(feed, /OWN_REPORT/);
assert.match(feed, /PUBLICATION/);
const bell = await readFile(new URL("../components/notifications/NotificationBell.tsx", import.meta.url), "utf8");
assert.match(bell, /aria-label=.*notification/i);
assert.match(bell, /Mark all as read/);
assert.match(bell, /Show more/);
assert.match(bell, /Bell/);
assert.match(bell, /Inbox/);
const session = await readFile(new URL("../hooks/dashboard/session.ts", import.meta.url), "utf8");
assert.match(session, /removeQueries\(\{ queryKey: queryKeys\.dashboard\.all \}\)/);
