import type { ConditionId, FoodEntry, FoodPref, Macros, MealSlot, Profile } from "./types";

// Condition-specific nutrition guidance. General education drawn from the
// sources listed on each condition, not a treatment plan. It uses only the
// user's own log and never references marketplace products or partners.

export interface ConditionGuide {
  id: ConditionId;
  name: string;
  short: string;
  icon: "droplet" | "heart" | "leaf" | "brain" | "moon";
  intro: string;
  eatMore: string[];
  limit: string[];
  habits: string[];
  sources: { label: string; url: string }[];
}

export const CONDITIONS: ConditionGuide[] = [
  {
    id: "diabetes", name: "Blood sugar", short: "Diabetes & prediabetes", icon: "droplet",
    intro: "Steady carbs, plenty of fiber and protein at each meal help keep blood sugar more even through the day.",
    eatMore: ["Non-starchy vegetables: half the plate", "Whole grains, beans and lentils instead of white bread and rice", "Lean protein at every meal: eggs, fish, chicken, tofu, Greek yogurt", "Water, unsweetened tea or sparkling water"],
    limit: ["Sugary drinks and juice", "Large portions of white rice, pasta, bread and pastries", "Sweets on their own; have them with a meal instead"],
    habits: ["Spread carbs evenly across meals instead of one big carb meal", "A 10–15 minute walk after meals", "Follow your care team's advice on glucose checks and medicines"],
    sources: [
      { label: "American Diabetes Association: Food & nutrition", url: "https://diabetes.org/food-nutrition" },
      { label: "CDC: Diabetes", url: "https://www.cdc.gov/diabetes/" },
    ],
  },
  {
    id: "hypertension", name: "Blood pressure", short: "High blood pressure", icon: "heart",
    intro: "The DASH eating pattern (more vegetables, fruit, beans and whole grains, less salt) is one of the best-studied ways to support healthy blood pressure.",
    eatMore: ["4–5 servings of vegetables and 4–5 of fruit a day", "Beans, lentils, unsalted nuts and seeds", "Whole grains", "Low-fat dairy or fortified alternatives", "Potassium-rich foods such as bananas, potatoes, spinach and yogurt (ask your doctor first if you have kidney disease)"],
    limit: ["Salt: under 2,300 mg sodium a day, ideally about 1,500 mg", "Processed and deli meats, canned soups, chips, pizza and fast food", "Alcohol"],
    habits: ["Cook with herbs, citrus and spices instead of salt", "Check labels: under 140 mg sodium per serving counts as low sodium", "Take blood pressure medicines exactly as prescribed"],
    sources: [
      { label: "NHLBI: DASH eating plan", url: "https://www.nhlbi.nih.gov/education/dash-eating-plan" },
      { label: "American Heart Association: Sodium", url: "https://www.heart.org/en/healthy-living/healthy-eating/eat-smart/sodium" },
    ],
  },
  {
    id: "ibs", name: "Gut comfort", short: "Irritable bowel syndrome (IBS)", icon: "leaf",
    intro: "Regular, unhurried meals and knowing your personal triggers help many people with IBS. A low-FODMAP trial works best with a dietitian.",
    eatMore: ["Regular meals at similar times each day", "Soluble fiber: oats, kiwi, chia, carrots", "Low-FODMAP options: rice, potatoes, eggs, firm tofu, chicken, fish, carrots, zucchini, strawberries", "Plenty of water"],
    limit: ["Common triggers for some people: onion, garlic, beans, apples, pears and wheat in large amounts", "Fatty, fried or very spicy meals", "Caffeine, alcohol and fizzy drinks", "Sugar-free gum and sweets (sorbitol, xylitol)"],
    habits: ["Eat slowly and don't skip meals", "Keep a simple log of foods and symptoms to spot your triggers", "See a doctor about new symptoms, weight loss or blood in the stool"],
    sources: [
      { label: "NIDDK: Eating, diet and nutrition for IBS", url: "https://www.niddk.nih.gov/health-information/digestive-diseases/irritable-bowel-syndrome/eating-diet-nutrition" },
      { label: "Monash University: Low-FODMAP diet", url: "https://www.monashfodmap.com/" },
    ],
  },
  {
    id: "focus", name: "Focus & energy", short: "Concentration and steady energy", icon: "brain",
    intro: "Protein-rich breakfasts, steady carbs and staying hydrated help avoid the mid-morning and afternoon slumps.",
    eatMore: ["A protein-rich breakfast (20 g or more)", "Oily fish twice a week for omega-3s", "Whole grains and fruit for steady energy", "Water through the day: even mild dehydration affects attention"],
    limit: ["Large sugary snacks and drinks that spike then crash", "Caffeine after early afternoon", "Very heavy lunches"],
    habits: ["Keep a water bottle at your desk", "Plan a mid-afternoon snack with protein", "A short walk or energizer workout between long sessions"],
    sources: [
      { label: "USDA MyPlate", url: "https://www.myplate.gov/" },
      { label: "CDC: Healthy weight, nutrition and physical activity", url: "https://www.cdc.gov/healthy-weight-growth/" },
    ],
  },
  {
    id: "relaxation", name: "Stress & sleep", short: "Relaxation and better sleep", icon: "moon",
    intro: "Regular meals, magnesium-rich foods and a caffeine cut-off support calmer days and better sleep.",
    eatMore: ["Magnesium-rich foods: leafy greens, nuts, seeds, beans, whole grains", "Complex carbs at dinner such as oats, sweet potato or brown rice", "Herbal teas like chamomile in the evening"],
    limit: ["Caffeine after about 2 pm", "Alcohol, especially close to bedtime", "Large, heavy meals in the 2–3 hours before bed"],
    habits: ["Keep regular meal and sleep times", "Try 5 minutes of slow breathing or stretching before bed", "Talk to a professional if stress or poor sleep lasts for weeks"],
    sources: [
      { label: "NIH: Magnesium fact sheet", url: "https://ods.od.nih.gov/factsheets/Magnesium-Consumer/" },
      { label: "CDC: Sleep", url: "https://www.cdc.gov/sleep/" },
    ],
  },
];

export const conditionGuide = (id: string) => CONDITIONS.find((c) => c.id === id);

export const FOOD_PREF_LABEL: Record<FoodPref, string> = {
  vegetarian: "Vegetarian", vegan: "Vegan", pescatarian: "Pescatarian", halal: "Halal", kosher: "Kosher",
  gluten_free: "Gluten-free", dairy_free: "Dairy-free", nut_free: "Nut-free", low_carb: "Lower carb",
};

// ---------- today's insight from the user's own log ----------
export interface Insight { text: string; tone: "good" | "tip" }

const SALTY = /(pizza|chips|fries|bacon|ham|salami|pepperoni|sausage|deli|jerky|ramen|instant noodle|canned soup|burger|hot dog|pretzel|soy sauce|pickle)/i;
const PRODUCE = /(salad|veg|vegg|spinach|broccoli|kale|greens|carrot|zucchini|tomato|pepper|berr|apple|banana|orange|kiwi|fruit|lentil|bean|chickpea|quinoa)/i;
const IBS_TRIGGER = /(onion|garlic|bean|lentil|chickpea|hummus|apple|pear|mango|wheat|pasta|bread|milk|ice cream|cauliflower|mushroom)/i;
const CAFFEINE = /(coffee|espresso|latte|cappuccino|cold brew|energy drink|cola|matcha|black tea|green tea)/i;

export interface InsightContext {
  entries: FoodEntry[];
  macros: Macros;
  profile: Pick<Profile, "carbs_goal_g" | "water_goal_glasses">;
  water: number;
  hour: number;
}

export function conditionInsight(id: ConditionId, c: InsightContext): Insight {
  const { entries, macros, profile, water, hour } = c;
  const bySlot = (slot: MealSlot) => entries.filter((e) => e.meal === slot);
  switch (id) {
    case "diabetes": {
      if (!entries.length) return { tone: "tip", text: "Build each meal on the plate method: half vegetables, a quarter protein, a quarter whole-grain carbs." };
      const perMeal = (["breakfast", "lunch", "dinner"] as MealSlot[]).map((m) => bySlot(m).reduce((a, e) => a + Number(e.carbs_g), 0));
      const biggest = Math.max(...perMeal);
      const share = macros.kcal ? Math.round(((macros.carbs_g * 4) / macros.kcal) * 100) : 0;
      if (biggest > 75) return { tone: "tip", text: `One meal had about ${Math.round(biggest)} g of carbs. Spreading carbs more evenly across meals, and a short walk afterwards, helps keep blood sugar steadier.` };
      return { tone: "good", text: `Carbs are spread evenly today (about ${share}% of calories). Keep pairing them with protein and vegetables.` };
    }
    case "hypertension": {
      const salty = entries.filter((e) => SALTY.test(e.name)).map((e) => e.name);
      if (salty.length) return { tone: "tip", text: `${salty[0]} is often high in salt. Balance it with low-salt, potassium-rich choices like vegetables, beans or a banana for the rest of the day.` };
      const produce = entries.filter((e) => PRODUCE.test(e.name)).length;
      if (produce >= 2) return { tone: "good", text: `${produce} meals with vegetables, fruit or beans so far. That's the DASH pattern in action.` };
      return { tone: "tip", text: "Aim for vegetables or fruit at every meal today, and season with herbs, citrus or spices instead of salt." };
    }
    case "ibs": {
      const triggers = entries.filter((e) => IBS_TRIGGER.test(e.name)).map((e) => e.name);
      if (hour >= 13 && !bySlot("breakfast").length && !bySlot("lunch").length) return { tone: "tip", text: "Long gaps between meals can upset digestion. Try a small, regular meal now." };
      if (triggers.length) return { tone: "tip", text: `${triggers[0]} contains ingredients that trigger symptoms for some people with IBS. If you notice discomfort, note it and discuss a low-FODMAP trial with a dietitian.` };
      if (water < Math.ceil(profile.water_goal_glasses / 2) && hour >= 14) return { tone: "tip", text: `You've had ${water} glasses of water. Steady hydration helps digestion; try one now.` };
      return { tone: "good", text: "Regular meals and gentle choices so far today. Eat slowly and keep it steady." };
    }
    case "focus": {
      const breakfastProtein = bySlot("breakfast").reduce((a, e) => a + Number(e.protein_g), 0);
      if (hour < 12 && !bySlot("breakfast").length) return { tone: "tip", text: "Start with a breakfast that has 20 g of protein or more, like eggs, Greek yogurt or a tofu scramble, for steadier morning focus." };
      if (water < Math.ceil(profile.water_goal_glasses / 2) && hour >= 13) return { tone: "tip", text: `Only ${water} glasses of water so far. Even mild dehydration can dull concentration.` };
      if (breakfastProtein >= 20) return { tone: "good", text: `Breakfast had ${Math.round(breakfastProtein)} g of protein. A strong start for focus. Plan a protein snack for mid-afternoon.` };
      return { tone: "tip", text: "Add a protein snack this afternoon, like Greek yogurt, nuts or hummus, to avoid an energy dip." };
    }
    case "relaxation": {
      const lateCaffeine = entries.filter((e) => CAFFEINE.test(e.name) && new Date(e.created_at).getHours() >= 14);
      if (lateCaffeine.length) return { tone: "tip", text: "Caffeine after 2 pm can affect sleep that night. Switch to herbal tea or decaf later in the day." };
      const dinnerKcal = bySlot("dinner").reduce((a, e) => a + e.kcal, 0);
      if (dinnerKcal > 900) return { tone: "tip", text: "A big dinner close to bedtime can disturb sleep. Try finishing larger meals 2–3 hours before bed." };
      if (hour >= 18) return { tone: "good", text: "Wind down: a light dinner, chamomile tea and five minutes of slow breathing set you up for better sleep." };
      return { tone: "good", text: "Regular meals keep energy and mood steadier. Leafy greens, nuts and seeds add magnesium." };
    }
  }
}

// ---------- meal ideas ----------
// Every idea works for the listed preferences as written. Halal and kosher
// assume certified meat and no pork, shellfish or alcohol.
export interface MealIdea {
  id: string;
  name: string;
  meal: MealSlot;
  kcal: number; protein_g: number; carbs_g: number; fat_g: number;
  prefs: FoodPref[];
  goodFor: ConditionId[];
}

const ALL_FAITH: FoodPref[] = ["halal", "kosher"];
const V: FoodPref[] = ["vegan", "vegetarian", "pescatarian", ...ALL_FAITH];
const VEG: FoodPref[] = ["vegetarian", "pescatarian", ...ALL_FAITH];
const FISH: FoodPref[] = ["pescatarian", ...ALL_FAITH];
const MEAT: FoodPref[] = [...ALL_FAITH];

export const MEAL_IDEAS: MealIdea[] = [
  // breakfast
  { id: "veg-omelette", name: "Veggie omelette & wholegrain toast", meal: "breakfast", kcal: 380, protein_g: 24, carbs_g: 28, fat_g: 18, prefs: [...VEG, "dairy_free", "nut_free"], goodFor: ["diabetes", "hypertension", "focus"] },
  { id: "chia-oats", name: "Overnight oats with chia & berries", meal: "breakfast", kcal: 360, protein_g: 12, carbs_g: 54, fat_g: 11, prefs: [...V, "dairy_free", "nut_free"], goodFor: ["ibs", "hypertension", "relaxation"] },
  { id: "yogurt-walnut", name: "Greek yogurt, berries & walnuts", meal: "breakfast", kcal: 330, protein_g: 22, carbs_g: 24, fat_g: 16, prefs: [...VEG, "gluten_free", "low_carb"], goodFor: ["diabetes", "focus", "hypertension"] },
  { id: "tofu-scramble", name: "Tofu scramble with spinach & potatoes", meal: "breakfast", kcal: 390, protein_g: 24, carbs_g: 34, fat_g: 18, prefs: [...V, "gluten_free", "dairy_free", "nut_free"], goodFor: ["hypertension", "focus", "relaxation"] },
  { id: "salmon-rye", name: "Smoked salmon & avocado on rye", meal: "breakfast", kcal: 410, protein_g: 24, carbs_g: 32, fat_g: 20, prefs: [...FISH, "dairy_free", "nut_free"], goodFor: ["focus"] },
  { id: "egg-avo-plate", name: "Eggs, avocado & berries", meal: "breakfast", kcal: 350, protein_g: 17, carbs_g: 12, fat_g: 26, prefs: [...VEG, "gluten_free", "dairy_free", "nut_free", "low_carb"], goodFor: ["diabetes", "focus"] },
  { id: "lf-yogurt-kiwi", name: "Lactose-free yogurt, oats & kiwi", meal: "breakfast", kcal: 320, protein_g: 18, carbs_g: 46, fat_g: 7, prefs: [...VEG, "nut_free"], goodFor: ["ibs", "relaxation"] },
  // lunch
  { id: "chicken-quinoa-salad", name: "Grilled chicken & quinoa salad", meal: "lunch", kcal: 510, protein_g: 40, carbs_g: 38, fat_g: 22, prefs: [...MEAT, "gluten_free", "dairy_free", "nut_free"], goodFor: ["diabetes", "hypertension", "focus"] },
  { id: "lentil-soup-salad", name: "Lentil & vegetable soup with side salad", meal: "lunch", kcal: 410, protein_g: 22, carbs_g: 58, fat_g: 10, prefs: [...V, "gluten_free", "dairy_free", "nut_free"], goodFor: ["diabetes", "hypertension", "relaxation"] },
  { id: "tuna-bean-salad", name: "Tuna & white bean salad", meal: "lunch", kcal: 450, protein_g: 36, carbs_g: 34, fat_g: 18, prefs: [...FISH, "gluten_free", "dairy_free", "nut_free"], goodFor: ["diabetes", "focus"] },
  { id: "lowfodmap-rice-bowl", name: "Chicken rice bowl with carrot, zucchini & spinach", meal: "lunch", kcal: 520, protein_g: 38, carbs_g: 60, fat_g: 14, prefs: [...MEAT, "gluten_free", "dairy_free", "nut_free"], goodFor: ["ibs", "focus"] },
  { id: "chickpea-wrap", name: "Chickpea & roasted vegetable wrap", meal: "lunch", kcal: 480, protein_g: 17, carbs_g: 64, fat_g: 17, prefs: [...V, "dairy_free", "nut_free"], goodFor: ["hypertension", "relaxation"] },
  { id: "salmon-poke", name: "Salmon poke bowl with brown rice & edamame", meal: "lunch", kcal: 550, protein_g: 34, carbs_g: 58, fat_g: 20, prefs: [...FISH, "dairy_free", "nut_free"], goodFor: ["focus"] },
  { id: "tofu-rice-noodles", name: "Tofu & vegetable rice-noodle stir-fry (no garlic or onion)", meal: "lunch", kcal: 490, protein_g: 24, carbs_g: 62, fat_g: 16, prefs: [...V, "gluten_free", "dairy_free", "nut_free"], goodFor: ["ibs"] },
  { id: "turkey-lettuce-wraps", name: "Turkey, lettuce & tomato wraps", meal: "lunch", kcal: 380, protein_g: 34, carbs_g: 10, fat_g: 22, prefs: [...MEAT, "gluten_free", "dairy_free", "nut_free", "low_carb"], goodFor: ["diabetes", "focus", "ibs"] },
  // dinner
  { id: "salmon-sweet-potato", name: "Baked salmon, sweet potato & broccoli", meal: "dinner", kcal: 550, protein_g: 36, carbs_g: 46, fat_g: 24, prefs: [...FISH, "gluten_free", "dairy_free", "nut_free"], goodFor: ["diabetes", "hypertension", "focus", "relaxation"] },
  { id: "chicken-brown-rice", name: "Chicken, brown rice & roasted vegetables", meal: "dinner", kcal: 570, protein_g: 42, carbs_g: 58, fat_g: 18, prefs: [...MEAT, "gluten_free", "dairy_free", "nut_free"], goodFor: ["diabetes", "hypertension"] },
  { id: "bean-chili", name: "Bean & vegetable chili (no added salt)", meal: "dinner", kcal: 510, protein_g: 26, carbs_g: 70, fat_g: 14, prefs: [...V, "gluten_free", "dairy_free", "nut_free"], goodFor: ["diabetes", "hypertension"] },
  { id: "fish-potato-beans", name: "Grilled white fish, potatoes & green beans", meal: "dinner", kcal: 490, protein_g: 36, carbs_g: 44, fat_g: 18, prefs: [...FISH, "gluten_free", "dairy_free", "nut_free"], goodFor: ["ibs", "hypertension", "relaxation"] },
  { id: "turkey-zoodles", name: "Turkey meatballs, zucchini noodles & tomato sauce", meal: "dinner", kcal: 460, protein_g: 38, carbs_g: 22, fat_g: 24, prefs: [...MEAT, "gluten_free", "dairy_free", "nut_free", "low_carb"], goodFor: ["diabetes", "focus"] },
  { id: "tofu-spinach-rice", name: "Tofu, spinach & sesame stir-fry with brown rice", meal: "dinner", kcal: 530, protein_g: 26, carbs_g: 60, fat_g: 20, prefs: [...V, "dairy_free", "nut_free"], goodFor: ["relaxation", "hypertension"] },
  { id: "chickpea-curry", name: "Chickpea & spinach curry with brown rice", meal: "dinner", kcal: 540, protein_g: 20, carbs_g: 78, fat_g: 16, prefs: [...V, "gluten_free", "dairy_free", "nut_free"], goodFor: ["hypertension", "relaxation", "diabetes"] },
  { id: "veg-frittata", name: "Vegetable frittata with a big green salad", meal: "dinner", kcal: 420, protein_g: 26, carbs_g: 14, fat_g: 28, prefs: [...VEG, "gluten_free", "nut_free", "low_carb"], goodFor: ["diabetes", "focus", "ibs"] },
  { id: "beef-stir-fry", name: "Lean beef & vegetable stir-fry with rice", meal: "dinner", kcal: 590, protein_g: 40, carbs_g: 60, fat_g: 20, prefs: [...MEAT, "gluten_free", "dairy_free", "nut_free"], goodFor: ["focus"] },
  // snacks
  { id: "apple-pb", name: "Apple & peanut butter", meal: "snack", kcal: 190, protein_g: 5, carbs_g: 24, fat_g: 9, prefs: [...V, "gluten_free", "dairy_free"], goodFor: ["diabetes", "focus"] },
  { id: "hummus-veg", name: "Hummus with carrot & cucumber sticks", meal: "snack", kcal: 180, protein_g: 6, carbs_g: 18, fat_g: 9, prefs: [...V, "gluten_free", "dairy_free", "nut_free"], goodFor: ["hypertension", "diabetes"] },
  { id: "almonds", name: "Handful of unsalted almonds", meal: "snack", kcal: 180, protein_g: 6, carbs_g: 6, fat_g: 15, prefs: [...V, "gluten_free", "dairy_free", "low_carb"], goodFor: ["diabetes", "hypertension", "relaxation", "focus"] },
  { id: "ricecake-strawberry", name: "Rice cakes, peanut butter & strawberries", meal: "snack", kcal: 210, protein_g: 7, carbs_g: 26, fat_g: 9, prefs: [...V, "gluten_free", "dairy_free"], goodFor: ["ibs"] },
  { id: "cottage-berries", name: "Cottage cheese & berries", meal: "snack", kcal: 180, protein_g: 22, carbs_g: 14, fat_g: 4, prefs: [...VEG, "gluten_free", "nut_free", "low_carb"], goodFor: ["diabetes", "focus"] },
  { id: "kiwi-seeds", name: "Kiwi & pumpkin seeds", meal: "snack", kcal: 210, protein_g: 9, carbs_g: 22, fat_g: 10, prefs: [...V, "gluten_free", "dairy_free", "nut_free"], goodFor: ["ibs", "relaxation"] },
];

/** Ideas that fit every food preference, best condition match first. */
export function mealIdeas(o: { prefs: FoodPref[]; conditions: ConditionId[]; meal?: MealSlot; condition?: ConditionId }): MealIdea[] {
  return MEAL_IDEAS
    .filter((m) => (!o.meal || m.meal === o.meal) && o.prefs.every((p) => m.prefs.includes(p)) && (!o.condition || m.goodFor.includes(o.condition)))
    .map((m) => ({ m, score: m.goodFor.filter((c) => o.conditions.includes(c)).length }))
    .sort((a, b) => b.score - a.score)
    .map(({ m }) => m);
}

/** The meal slot a quick idea most likely belongs to right now. */
export function slotForHour(hour: number, logged: Set<MealSlot>): MealSlot {
  if (hour < 11 && !logged.has("breakfast")) return "breakfast";
  if (hour < 15 && !logged.has("lunch")) return "lunch";
  if (hour >= 17 && !logged.has("dinner")) return "dinner";
  return "snack";
}
