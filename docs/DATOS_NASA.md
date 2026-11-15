# NASA data used in Survival Mars

**Survival Mars** is a browser game for kids aged 7 to 12: they run a base on the **NE Syrtis plateau, Isidis Planitia (Mars)**
for 15 sols. Every game mechanic is anchored in real NASA data or findings, and players can see them inside the game
(the **NASA** button opens "What is real in this game?", and the "Did you know?" and "Real science" cards each show their source).

> Game: https://survival-mars.pages.dev · Code: `src/data/` (every value names its source)

## 1. Summary: which data drives which mechanic

| NASA dataset / source | Type | Game mechanic | Why |
|---|---|---|---|
| **DONKI: solar flares** | Recent query, cache or historical archive, always labelled on screen; **plus a fresh query every 10 minutes during the game** | Difficulty of the exercises, class and date of the flares used, the "Solar activity" indicator and the solar alert | Real observations inspire training scenarios where players choose between **taking shelter or keeping working**. It is not a forecast of particles or doses on Mars. |
| **Curiosity RAD** (Hassler et al. 2014) | Stored | Daily background radiation, mission limit, shielding by sections, crew dosimeters | 0.67 mSv/day measured on the surface of Mars. The crew adds radiation every sol; spacewalks and flares add more. |
| **OSDR RadLab** (ISS dosimetry) | Stored (queried through the RadLab API) | Space Station vs. Mars comparison | About 0.3 mGy/day absorbed dose on the ISS (REM detector, Columbus module, April 2022). Explains how Mars compares with the Station. |
| **OSDR space biology studies** | Stored | "Real science" card after each sol | When something happens (a flare, low food, low oxygen, days indoors), the game shows a finding from a real study with its OSD-xxx ID. |
| **NE Syrtis, Mars 2020 finalist site** / Mars Trek | Stored | Base location, terrain (mesas and the Isidis rim), sol length, sunlight | NE Syrtis (~18° N, 77° E) was one of NASA's 3 finalist landing sites for Perseverance. Isidis basin about 3,960 million years old; olivine-rich rocks altered to carbonate by water. A sol lasts 24 h 39 min; Mars gets ~43% of Earth's sunlight. |
| **MOXIE** (Perseverance) | Stored | Water ice turned into oxygen; life support | MOXIE made 122 g of O2 from the Martian air: making oxygen on site is real. |
| **Opportunity** (end of mission, 2018) | Stored | Global dust storm (3 sols, on a different day each game) | Dust covered its panels and it ran out of power. In the game: retract the panels or risk them. |
| **MRO / HiRISE** (new impacts) | Stored | Micrometeorite event | More than 200 new craters per year: the thin atmosphere does not stop small rocks. |
| **Mars solar conjunction** | Stored | Sols 10 and 11 without communication | About every 2 years NASA pauses commands for about 2 weeks. |
| **Communication delay** (NASA HRP) | Stored | "Ask for help" button that answers the next sol | 4 to 24 minutes each way: the crew has to decide on its own. |
| **Fission Surface Power** | Stored | The base's mini reactor (constant power) | Power by day, by night and during storms. |
| **Veggie / VEG-05** (ISS) | Stored | Greenhouse | Growing food under LED lights is real. |
| **ISS water (98% recycled)** | Stored | Life support / recycler failure event | Water is almost fully recycled; a failure is an emergency. |

**Live vs. stored:** only DONKI is queried live: on load (last 30 days, with a 6-hour cache and three sources, see 2.1) and then
**every 10 minutes during the game** (last 2 days, no cache). Everything else (Curiosity doses, RadLab, OSDR studies, site data) is
**stored** in the code with its source. If no DONKI source answers (no internet or an exhausted key), the game uses **real historical**
flares (for example the X9.0 of October 3, 2024) and says so clearly ("historical archive"), never "live", as the challenge asks.

## 2. Details by source

### 2.1 DONKI: solar flares and provenance
- First source: `https://api.nasa.gov/DONKI/FLR?startDate=…&endDate=…&api_key=…` (last 30 days). Code: `src/data/donki.js`.
- Second source if the first fails: DONKI notifications, `https://api.nasa.gov/DONKI/notifications?type=FLR&…`. They only include the
  **strong** flares NASA announced (class M5 and above); the game says so on screen ("strong flares (M5 or above)"). The class and peak
  time of each flare are taken (one per *Activity ID*). This source was added because on November 15, 2026 the `DONKI/FLR` route of
  api.nasa.gov answered 404 while the rest of DONKI worked.
- Third source: `https://kauai.ccmc.gsfc.nasa.gov/DONKI/WS/get/FLR` (no key). Some networks, such as the university network we tested
  from, cut the connection to this server.
- **Recent query:** answer obtained on this load. **Stored query:** cache of up to six hours. Both show the original query time.
  **Historical archive:** fallback when NASA cannot be reached.
- If the query returns zero events, the empty list is kept. A scripted exercise may use a historical example, labelled as such; those
  examples are never mixed with the query results.
- Risk formula: `risk = 0.6 + 0.08 × (M flares) + 0.4 × (X flares)`, clamped to [0.6, 2.5].
  It is a **game difficulty** formula, not a scientific risk model for Mars. It affects random events and the spacewalk; the scripted
  events (storm, flares, dust devil, recycler failure) fall on days drawn at random for each game.
- Every flare event uses a **real flare** from the list (class and date) and shows it:
  *"Based on a real flare NASA detected on …"*. Particle arrival and the scenario's dose are simulated: they are not scientifically
  derived from the flare class.
- **Watching during the game** (`src/ui/alerta-solar.js`): one minute after starting and then every 10 minutes, the game queries DONKI
  for the last 2 days, **without cache** (same source order: FLR list, notifications, CCMC server). If an **M or X** flare appears that
  was not in the initial load, it shows the alert *"NASA DONKI detected a class … flare"*, raises the game risk with the same formula and
  asks whether the crew keeps working or goes back to the shelter. If DONKI does not answer, nothing happens: the game goes on.
  It does not query in demo mode (`?demo=1`).
- **Permanent indicator:** shows the state of the Sun and the mission risk (low, medium or high), or "SOLAR ALERT" if the loaded real
  data contain an M or X flare from the last 3 days. Tapping it opens the data panel.
- **Drill** (`?alerta=1`): for presentations. Shows an alert with an example M5.0 flare and the **DRILL** label on the indicator and the
  alert; it is never presented as live data.
- **During the spacewalk**, the dose per second outside is multiplied by a factor of 0.85 to 1.4 depending on that risk (`factorRiesgo`
  in `src/world3d/eva.js`), and the radiation meter shows the level: low, medium, high, or danger if a flare is under way. It is a game rule.
- Source: https://kauai.ccmc.gsfc.nasa.gov/DONKI/ · API: https://api.nasa.gov
- Curated fallback: [X9.0 of October 3, 2024](https://svs.gsfc.nasa.gov/14701/) and [X8.7 of May 14, 2024](https://svs.gsfc.nasa.gov/14592/),
  both with NASA SDO publications. Entries without a specific verification were removed from the previous archive.

### 2.2 Radiation (Curiosity RAD, RadLab and reference values)
| Value | Real data | In the game | Source |
|---|---|---|---|
| Surface of Mars | 0.67 mSv/day (Gale crater, Aug 2012 to Jun 2013) | 0.7 mSv per sol | Hassler et al. 2014, *Science* 343: https://ntrs.nasa.gov/citations/20180007641 |
| Trip to Mars | ~1.8 mSv/day | Educational fact | Curiosity RAD (cruise) |
| Space Station | ~0.3 mGy/day absorbed dose (REM detector, Columbus module, April 1 to 7, 2022) | "What is real?" panel (comparison) | RadLab API: https://visualization.osdr.nasa.gov/radlab/ (query by the team) |
| Earth | ~2.4 mSv/year (world average natural radiation) | "100 days on Earth" comparison | UNSCEAR 2008: https://www.unscear.org/ |
| NASA career limit | less than 600 mSv | Educational fact | NASA-STD-3001, summarized in the OCHMO *Radiation Protection Technical Brief*: https://www.nasa.gov/wp-content/uploads/2023/03/radiation-protection-technical-brief-ochmo.pdf |
| **Game mission limit** | n/a | **60 mSv** (simplified) | Game design |
| Extra dose per flare without shelter | Highly variable in reality | X: 50 · M: 25 · C: 8 mSv × atmosphere 0.5 × shielding | **Simplified**: it only keeps the order X > M > C |

### 2.3 Crew dosimeters and shielding by sections (game rules built on real data)
- **Dosimeters:** the crew (Lía, Kofi, Mei and Teo) has a dose per person. Each sol's background radiation (0.7 mSv, from Curiosity RAD,
  reduced by the shielding) and flares without shelter add to **everyone**; a spacewalk's dose adds **only to whoever went out**, and
  cleaning the panels adds to whoever has the lowest dose. The mission limit (60 mSv, simplified) applies per person: the value shown is
  the highest dose. Code: `dosisATodos`, `dosisA` and `menorDosis` in `src/sim/motor.js`.
- **Why:** real astronauts wear personal dosimeters, NASA has a per-person career limit (600 mSv) and applies the **ALARA** principle
  (as low as reasonably achievable). Choosing who goes out to share the dose is how the game lets players practise that idea; it does
  **not** describe an official procedure for assigning spacewalks.
- **Shielding by sections** (B key, `src/ui/construccion.js` and `MISION.construccion` in `src/sim/config.js`): each section protects
  differently, so choosing the order is a real decision and starting with the cheapest one is not always best.

  | Section | Cost | Blocks of the daily background (cosmic rays) | Blocks of a solar flare |
  |---|---|---|---|
  | North wall | 3 bags | 15% | 5% |
  | South wall | 3 bags | 15% | 5% |
  | East and west walls | 4 bags | 20% | 10% |
  | Roof | 4 bags | 10% | 40% |
  | **All 4 together** | 14 bags | **60%, so 40% gets in** | **60%, so 40% gets in** |

  With all 4 sections, 40% gets in (= `RADIACION.atenuacionBlindaje`) for both the daily dose and flares. Daily dose when building in the
  order north, south, sides, roof: 0.70 → 0.60 → 0.49 → 0.35 → 0.28 mSv per sol. An X1.0 flare without shelter gives 23 mSv with no
  shielding; 14 with only the roof; 20 with only the east and west walls. Code: `factorBlindaje(S, 'fondo' | 'llamarada')`,
  `radiacionInterior` and `dosisLlamarada` in `src/sim/motor.js`; test in `tests/mecanicas.mjs` ("techo vs. paredes").
- **Why (real physics, simplified):** the Martian atmosphere is thin straight up and very thick towards the horizon.
  At Gale, the air column is about **21 g/cm² looking straight up and about 400 g/cm² near the horizon**
  ([Khaksarighiri et al. 2023, *JGR Planets*, "The Zenith-Angle Dependence of the Downward Radiation Dose Rate on the Martian
  Surface"](https://macau.uni-kiel.de/servlets/MCRFileNodeServlet/macau_derivate_00007955/JGR%20Planets%20-%202023%20-%20Khaksarighiri%20-%20The%20Zenith%E2%80%90Angle%20Dependence%20of%20the%20Downward%20Radiation%20Dose%20Rate%20on%20the%20Martian%20Surface.pdf)).
  - **Cosmic rays** (daily background) are very energetic and come from many directions; according to the same study, the protons that
    contribute most to the dose arrive quite inclined (close to 74° from the zenith). That is why, in the game, the **walls** block more of
    the daily background.
  - **Solar flare** particles have less energy: the long, slanted air path stops them much more than the short path straight up, so they
    arrive mostly **from above**. That is why, in the game, the **roof** blocks more of a flare. The Martian ground already protects from
    below.
  - **Simplified game rule:** the percentages in the table are made up so the idea is easy to grasp; they are not a measurement.
    Covering a habitat with regolith is an idea NASA has studied to protect against radiation
    (Simonsen et al., *Space radiation shielding for a Martian habitat*: https://ntrs.nasa.gov/citations/19900062325).
- **Regolith:** collected on the spacewalk (4-item backpack) and deposited when entering the base (1 item = 1 bag).

### 2.4 NASA OSDR studies shown in the game
Found with the OSDR search API (`https://osdr.nasa.gov/osdr/data/search`). Every card links to the study page.

| Study | What it found (summary) | When it appears in the game |
|---|---|---|
| [OSD-566](https://osdr.nasa.gov/bio/repo/data/studies/OSD-566) | Immune and hormonal responses of mice to ionizing radiation | After a flare |
| [OSD-343](https://osdr.nasa.gov/bio/repo/data/studies/OSD-343) | Mitochondrial stress as a central effect of spaceflight (59 astronauts plus the Twins Study) | When oxygen drops below 50 |
| [OSD-766](https://osdr.nasa.gov/bio/repo/data/studies/OSD-766) | VEG-05: tomatoes grown for 101 days on the ISS under different LED lights | When food drops below 30 |
| [OSD-678](https://osdr.nasa.gov/bio/repo/data/studies/OSD-678) | CARA: light guides the growth of Arabidopsis in space | Additional food finding |
| [OSD-342](https://osdr.nasa.gov/bio/repo/data/studies/OSD-342) | Rodent Research-19: muscle and bone loss in 33 days | When the crew stays indoors for several sols ("exercise" topic) |
| [OSD-177](https://osdr.nasa.gov/bio/repo/data/studies/OSD-177) | *Fusarium* fungus on the Veggie zinnias | After a plant disease event ("pest" topic) |
| [OSD-87](https://osdr.nasa.gov/bio/repo/data/studies/OSD-87) | Changes in the retina of mice (STS-135) | Available ("eyes" topic) |
| [OSD-360](https://osdr.nasa.gov/bio/repo/data/studies/OSD-360) | Low doses of space radiation change the chemistry of the spleen (mice) | Radiation |
| [OSD-334](https://osdr.nasa.gov/bio/repo/data/studies/OSD-334) | Heavy particles and damage to heart tissue | Radiation |
| [OSD-146](https://osdr.nasa.gov/bio/repo/data/studies/OSD-146) | Radiation changes gut bacteria | Radiation |
| [OSD-268](https://osdr.nasa.gov/bio/repo/data/studies/OSD-268) | Veggie red lettuce: microbes and nutrients | Food |
| [OSD-772](https://osdr.nasa.gov/bio/repo/data/studies/OSD-772) | PH-04: chile peppers grown on the Space Station (2021) | Food |
| [OSD-615](https://osdr.nasa.gov/bio/repo/data/studies/OSD-615) | Without gravity, root cell walls change | Food |

The 13 findings are shuffled at the start of every game.

### 2.5 Other verified data
| Fact in the game | Source |
|---|---|
| NE Syrtis: Mars 2020 finalist (with Jezero and Columbia Hills) | https://astrobiology.nasa.gov/news/scientists-shortlist-three-landing-sites-for-mars-2020/ |
| Jezero floor ~2,600 m below the reference level (Isidis, low area) | https://www.esa.int/ESA_Multimedia/Images/2021/02/Topographic_map_of_Jezero_crater_and_surrounds |
| Interactive map of the base (Location button) | NASA Mars Trek, centred at ~18.2° N, 77.3° E |
| Isidis basin (~3,960 Ma), Syrtis lavas (~3,700 Ma), olivine to carbonate | https://www.brown.edu/news/2017-04-20/syrtis |
| Sol = 24 h 39 min | Martian solar day (24 h 39 min 35 s) |
| MOXIE: 122 g of oxygen | https://www.nasa.gov/missions/mars-2020-perseverance/perseverance-rover/nasas-oxygen-generating-experiment-moxie-completes-mars-mission/ |
| ISS recycles 98% of its water | https://www.nasa.gov/missions/station/iss-research/nasa-achieves-water-recovery-milestone-on-international-space-station/ |
| Opportunity and the 2018 storm | https://science.nasa.gov/mission/mer-opportunity/ |
| More than 200 new craters per year on Mars | https://www.jpl.nasa.gov/news/nasa-probe-counts-space-rock-impacts-on-mars/ |
| Solar conjunction (~2 weeks every ~2 years) | https://www.nasa.gov/solar-system/whats-mars-solar-conjunction-and-why-does-it-matter/ |
| 4 to 24 minute delay | https://www.nasa.gov/hrp/hazard-distance-from-earth/ |
| Fission Surface Power reactors | https://www.nasa.gov/exploration-systems-development-mission-directorate/fission-surface-power/ |
| Veggie (lettuce, kale, zinnias) | https://www.nasa.gov/exploration-research-and-technology/growing-plants-in-space/ |
| Final report comparison: 1 chest X-ray ≈ 0.1 mSv | FDA / RadiologyInfo.org (medical reference, not NASA) |

## 3. Simplifications (stated openly)
So that a 7-year-old can understand the trade-off, some numbers are simplified. We list them so they can be checked:
- **Power** (kWh per sol from panels, reactor and systems) and **oxygen and food** (in %): game numbers, not real engineering values.
  They do keep the real proportions: panels on Mars produce less than on Earth (~43% of the light) and a dust storm leaves them close to zero.
- **Fixed 12-minute delay** (the real one varies from ~4 to ~24 minutes depending on where the planets are).
- **Mission limit: 60 mSv** (NASA's real career limit is 600 mSv). It is lowered so that radiation matters within 15 sols.
- **Science goal** (60 points for Commander, 35 for Cadet): a game rule chosen so that playing it safe earns one star and higher scores
  require taking some risk (more power to the lab or spacewalks for rocks).
- **Dose per flare**: X > M > C is a game difficulty rule. A flare's class alone does not determine a dose on Mars; particle arrival
  depends on other factors. Shelter and shielding reduce exposure in the educational model.
- **Per-person dosimeters and shielding by sections**: the dose sharing, the per-section percentages and the 0.85 to 1.4 spacewalk factor
  are game rules so that the trade-off is understandable; they are not measurements.
- **Ice at NE Syrtis**: on the real Mars, surface ice is more common far from the equator; the game places it near the base so it can be
  played. The ice card says so ("especially far from the equator").
