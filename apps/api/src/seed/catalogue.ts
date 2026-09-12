export const categories = [
  {
    name: "Action",
    description: "Fast-paced combat, exploration, and platforming.",
  },
  {
    name: "Role-playing",
    description: "Character progression, rich stories, and meaningful choices.",
  },
  {
    name: "Strategy",
    description:
      "Tactical decisions, careful planning, and resource management.",
  },
  {
    name: "Simulation",
    description: "Farming, transport, and factory-building experiences.",
  },
  {
    name: "Puzzle",
    description: "Logical challenges and creative problem solving.",
  },
  {
    name: "Racing",
    description: "Driving and motorsport games. New titles coming soon.",
  },
] as const;

export const catalogue = [
  { slug: "hades", category: "Action", price: "24.99" },
  { slug: "hollow-knight", category: "Action", price: "14.99" },
  { slug: "celeste", category: "Action", price: "19.99" },
  { slug: "dead-cells", category: "Action", price: "24.99" },
  { slug: "baldurs-gate-iii", category: "Role-playing", price: "59.99" },
  { slug: "the-witcher-3-wild-hunt", category: "Role-playing", price: "29.99" },
  { slug: "sid-meiers-civilization-vi", category: "Strategy", price: "39.99" },
  { slug: "into-the-breach", category: "Strategy", price: "14.99" },
  { slug: "stardew-valley", category: "Simulation", price: "13.99" },
  { slug: "euro-truck-simulator-2", category: "Simulation", price: "19.99" },
  { slug: "factorio", category: "Simulation", price: "32.00" },
  { slug: "portal-2", category: "Puzzle", price: "9.99" },
] as const;

export const demoUsers = [
  { email: "admin@gameon.test", displayName: "Administrator", role: "ADMIN" },
  { email: "matas@gameon.test", displayName: "Matas", role: "USER" },
  { email: "demo@gameon.test", displayName: "Demo", role: "USER" },
] as const;

export const demoReviews = [
  {
    slug: "portal-2",
    email: "matas@gameon.test",
    rating: 5,
    text: "Excellent puzzles. The cooperative campaign is especially fun with a friend.",
  },
  {
    slug: "hades",
    email: "matas@gameon.test",
    rating: 5,
    text: "Every escape attempt feels different, and the combat is wonderfully responsive.",
  },
  {
    slug: "the-witcher-3-wild-hunt",
    email: "demo@gameon.test",
    rating: 4,
    text: "An engaging story with memorable side quests, although the controls take some getting used to.",
  },
  {
    slug: "stardew-valley",
    email: "demo@gameon.test",
    rating: 5,
    text: "Relaxing farming after lectures. I especially enjoy the changing seasons.",
  },
  {
    slug: "into-the-breach",
    email: "matas@gameon.test",
    rating: 3,
    text: "Interesting tactical decisions, but the learning curve is quite steep.",
  },
] as const;
