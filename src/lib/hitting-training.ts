export const HITTING_CHAIN_STEPS = [
  {
    id: "grip",
    title: "Grip",
    cue: "Shake hands with the bat.",
    body: "Fingers, not palms. Line up the door-knocking knuckles. A light grip helps the bat move fast.",
    kidCheck: "Loose hands, fast bat.",
  },
  {
    id: "stance",
    title: "Stance",
    cue: "Balanced like an infielder.",
    body: "Feet slightly wider than shoulders, knees bent, and both eyes seeing the pitcher. Keep a little more weight on the back foot.",
    kidCheck: "Ready feet, quiet head.",
  },
  {
    id: "load",
    title: "Negative Move (Load)",
    cue: "Pull back the slingshot.",
    body: "Shift weight to the back leg and let the hands move back/down slightly. This creates the coil before the swing.",
    kidCheck: "Load slow, swing fast.",
  },
  {
    id: "stride",
    title: "Positive Move (Stride)",
    cue: "Short, soft step.",
    body: "Step toward the pitcher without jumping or opening early. Keep the front shoulder closed longer.",
    kidCheck: "Small step, big power.",
  },
  {
    id: "rotate",
    title: "Rotational Phase",
    cue: "Hips lead the chain.",
    body: "Hips go first, then shoulders and hands. Stay connected and drive from the ground up.",
    kidCheck: "Hips fire, hands follow.",
  },
  {
    id: "finish",
    title: "Finish",
    cue: "Extend, then wrap.",
    body: "Extend the bat toward the pitcher first, then finish around the back shoulder. Stay balanced and squish the bug with the back foot.",
    kidCheck: "Strong finish, steady feet.",
  },
] as const;

export const DAILY_HITTING_REMINDER =
  "Grip -> Stance -> Load -> Stride -> Rotate & Connect -> Extend & Finish.";

export const ANALYSIS_STRENGTHS = [
  "Athletic base on the balls of her feet with good energy.",
  "Full commitment to contact and rotation through the ball.",
  "Mostly level bat path through the zone - great for hard line drives.",
  "Decent grip with hands staying together.",
] as const;

export const ANALYSIS_AREAS = [
  {
    title: "Stance & Setup",
    issue: "Feet a bit narrow, back foot flat, bat wrapped too far behind head (longer path).",
    fix: "Widen stance slightly wider than shoulders. Slight knee bend (ready position). Keep bat more upright or ~45° with knob pointing toward pitcher. Weight slightly on back foot.",
  },
  {
    title: "Load/Stride",
    issue: "Early bat forward (casting), stride a bit long/open causing front side to collapse or pull off. Hips fire but upper body gets ahead (arm-y swing).",
    fix: "Shorter, softer stride (toe tap or small step). Load hands back/down while shifting weight to back leg (create coil). Keep front shoulder closed longer. Use core/hips more than just arms.",
  },
  {
    title: "Contact & Extension",
    issue: "Good extension but reaching a little; bat slightly above ball plane (topping risk). Back foot spinning off early.",
    fix: "Level or very slight upward path through the ball. Eyes locked on ball longer. Firm front leg brace at contact (not collapsing).",
  },
  {
    title: "Follow-Through",
    issue: "Excellent full rotation and finish wrapped around back. Minor off-balance at end.",
    fix: "Land with back foot up on toe (\"squish the bug\") and stay balanced for better power transfer and consistency.",
  },
] as const;

export const TARGETED_DRILLS = [
  {
    name: "Dry Swings (No Ball)",
    shortName: "Dry swings",
    reps: "50-100 reps",
    fixes: "Long arm path, casting, stride timing",
    chain: "Load -> Stride -> Rotate",
    instructions:
      "Focus on short stride + \"knob to the ball\". Hands lead, barrel stays back until late. Use a mirror or phone video.",
  },
  {
    name: "Tee Work Progression",
    shortName: "Tee progression",
    reps: "3 zones, 8-12 swings each",
    fixes: "Topping risk, bat path, timing",
    chain: "Grip -> Stance -> Contact",
    instructions:
      "Move the tee inside/middle/outside. Add high tee + low tee to groove a level path through the ball.",
  },
  {
    name: "Load Drill",
    shortName: "Step-and-swing load",
    reps: "3 sets of 8",
    fixes: "Long stride, early front side, sequencing",
    chain: "Load -> Stride -> Rotate",
    instructions:
      "\"Step and swing\" - small stride, pause, then explode. Feel hips rotate before hands.",
  },
  {
    name: "One-Handed Swings",
    shortName: "One-hand swings",
    reps: "10-15 each hand",
    fixes: "Extension, barrel control, arm-y swing",
    chain: "Contact -> Finish",
    instructions:
      "Top hand only for extension. Bottom hand only for control. Keep the swing smooth and balanced.",
  },
  {
    name: "Bat Speed Warm-Up",
    shortName: "Bat speed warm-up",
    reps: "2 light rounds",
    fixes: "Bat speed, loose hands, confidence",
    chain: "Grip -> Finish",
    instructions:
      "Use a weighted bat, broomstick, or regular bat for dry swings if available. Stay loose, quick, and relaxed.",
  },
] as const;

export const CORE_DRILLS = [
  {
    name: "Basic Tee",
    chain: "Grip, Stance, Contact",
    fixes: "Level bat path and eyes on the ball",
    how: "Set the tee around belly-button to mid-thigh height. Hit firm line drives up the middle.",
  },
  {
    name: "Freeze / Load-Hold",
    chain: "Load, Stride",
    fixes: "Long stride and early front side",
    how: "Load, step, freeze for one second, then swing. Check balance before the swing.",
  },
  {
    name: "Knob to Knee",
    chain: "Load, Rotate",
    fixes: "Casting and long arm path",
    how: "Feel the knob work toward the front knee before the barrel releases.",
  },
  {
    name: "Happy Gilmore",
    chain: "Rhythm, Stride",
    fixes: "Timing, athletic flow",
    how: "Use a slow walk-in step to feel rhythm. Keep it safe, controlled, and balanced.",
  },
  {
    name: "Half Turns / See Saw / Bat Path",
    chain: "Rotate, Contact",
    fixes: "Hips-before-hands sequencing and bat path",
    how: "Turn halfway, check connection, then finish through the ball. Keep the barrel working through the zone.",
  },
  {
    name: "One-Hand Swings",
    chain: "Contact, Finish",
    fixes: "Extension and barrel control",
    how: "Top hand for extension; bottom hand for control. Keep reps small and clean.",
  },
  {
    name: "Weighted + Regular Tee",
    chain: "Grip, Rotate, Finish",
    fixes: "Bat speed and confidence",
    how: "Take a few controlled warm-up swings, then switch back to regular bat and feel quick.",
  },
  {
    name: "Dry Swings with Knob Cue",
    chain: "Load, Stride, Rotate",
    fixes: "Compact hands and less casting",
    how: "No ball. Say \"knob to the ball\" and keep the barrel back until late.",
  },
  {
    name: "Tee Progression by Zones",
    chain: "Stance, Contact",
    fixes: "Inside/middle/outside coverage",
    how: "Move the tee to inside, middle, and outside spots. Match where the ball is pitched.",
  },
  {
    name: "Step-and-Swing Load Drill",
    chain: "Load, Stride, Rotate",
    fixes: "Lower-body drive and sequencing",
    how: "Small stride, pause, then swing with hips first.",
  },
] as const;

export const WEEKLY_HITTING_SCHEDULE = [
  {
    day: "Day 1",
    focus: "Setup + compact hands",
    plan: "Grip check, Basic Tee, Dry Swings with Knob Cue",
    issues: "Bat wrap, long arm path, casting",
  },
  {
    day: "Day 2",
    focus: "Load + short stride",
    plan: "Freeze / Load-Hold, Step-and-Swing Load Drill, Tee Progression",
    issues: "Long/open stride and front side pulling off",
  },
  {
    day: "Day 3",
    focus: "Hips before hands",
    plan: "Half Turns, Knob to Knee, One-Hand Swings",
    issues: "Arm-y swing and sequencing",
  },
  {
    day: "Bonus",
    focus: "Fun confidence round",
    plan: "Happy Gilmore, favorite tee zone, video one swing",
    issues: "Rhythm, balance, and swing review",
  },
] as const;

export const MONTHLY_PROGRESSIONS = [
  {
    phase: "Week 1",
    goal: "Own the setup",
    details: "Grip, stance, and short stride. Praise contact first, then tweak one small thing.",
  },
  {
    phase: "Week 2",
    goal: "Compact hands",
    details: "Knob cue, dry swings, and tee work. Reduce casting and long arm path.",
  },
  {
    phase: "Week 3",
    goal: "Sequence the chain",
    details: "Hips before hands. Step-and-swing load drill and half turns.",
  },
  {
    phase: "Week 4",
    goal: "Balance + line drives",
    details: "Hold the finish, squish the bug, and compare side/front video clips.",
  },
] as const;

export const VIDEO_RESOURCES = [
  {
    title: "Mike Candrea Fundamentals",
    url: "https://www.youtube.com/watch?v=pUa2OEo8HSI",
    description: "Big-picture fundamentals from an Olympic coach.",
  },
  {
    title: "Hitting Vault Slow to Fast",
    url: "https://www.youtube.com/watch?v=XLpTXJbet58",
    description: "See how a swing builds from slow moves to game speed.",
  },
  {
    title: "Bat Path / Elite Explanation",
    url: "https://www.youtube.com/watch?v=1d6PYsgMbho",
    description: "A clear look at how the barrel travels through the zone.",
  },
  {
    title: "CamWood Knob to Knee",
    url: "https://www.youtube.com/watch?v=xkzIDikmzZ4",
    description: "Helpful cue for compact hands and less casting.",
  },
  {
    title: "Happy Gilmore Timing Drill",
    url: "https://www.youtube.com/watch?v=7_HNs0u-TxE",
    description: "A fun rhythm drill when balance stays in control.",
  },
  {
    title: "AnaMarie Bruni 3 Simple Tee Drills",
    url: "https://www.youtube.com/watch?v=_TICurMOZzo",
    description: "Simple tee-work ideas for home practice.",
  },
  {
    title: "Hitting Vault Youth Drills Article",
    url: "https://thehittingvault.com/softball-hitting-drills-for-youth/",
    description: "Extra youth softball hitting drill ideas.",
  },
  {
    title: "Bonus Slow-Motion Swing Example",
    url: "https://www.youtube.com/watch?v=UpWZxonsMig",
    description:
      "Great for comparing your own swing. You can also search \"softball swing slow motion kids\" for more 8U/10U models.",
  },
] as const;

export const PRACTICAL_TIPS = [
  "Tee height: Belly-button to mid-thigh level (strike zone).",
  "Grip check: Knuckles lined up, light grip.",
  "Mental cue: \"See the ball, hit the ball, rotate hard.\"",
  "Mental cue: \"Hands to the ball, hips fire.\"",
  "Video yourself from side and front. Compare to slow-motion examples.",
  "Keep it fun - praise effort and contact first, tweak one thing per session.",
] as const;
