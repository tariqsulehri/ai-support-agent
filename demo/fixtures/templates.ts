/**
 * Conversation templates per trade, used by the seed to generate realistic US records.
 * `{city}`, `{state}` and `{street}` are filled per conversation.
 */
import type { Trade } from './demo-data'

export type Intent = 'buying_interest' | 'support' | 'information' | 'meeting_request' | 'complaint'
export type Category = 'support_request' | 'pricing_inquiry' | 'general_inquiry' | 'job_or_hiring' | 'other'

export interface Template {
  trade: Trade
  service: string
  category: Category
  intent: Intent
  quality: Record<'hot' | 'warm' | 'cold', number>
  urgency: 'high' | 'medium' | 'low'
  weight: number
  ask: string
  answer: string
  summary: string
  keyPoints: string[]
  nextSteps: string[]
  /** Commercial customers get a company name. */
  commercial?: boolean
}

const t = (x: Template) => x

export const TEMPLATES: Template[] = [
  // ── HVAC ────────────────────────────────────────────────────────────────────
  t({ trade: 'hvac', service: 'AC repair', category: 'support_request', intent: 'buying_interest', urgency: 'high', weight: 6,
    quality: { hot: 8, warm: 2, cold: 0 },
    ask: "Our AC is blowing warm air and it's over 95 outside. Can you send someone today?",
    answer: 'So sorry! Check the thermostat is on Cool and the breaker is on. I have a technician today 12-2 PM. Can I get your name, phone, email and address?',
    summary: '{name} in {city}, {state} reported the AC blowing warm air during a heat wave and booked a same-day repair at {street}.',
    keyPoints: ['AC blowing warm air', 'Same-day repair booked', 'Heat advisory in effect'],
    nextSteps: ['Dispatch technician', 'Text arrival window'] }),
  t({ trade: 'hvac', service: 'Heating & furnace repair', category: 'support_request', intent: 'buying_interest', urgency: 'high', weight: 3,
    quality: { hot: 6, warm: 3, cold: 1 },
    ask: 'The furnace is making a loud banging noise and there is no heat. Kids are home. Help?',
    answer: 'Let us get you warm. Turn the system off for now. Our first heating slot is 8-10 AM tomorrow, or an emergency visit tonight. Which works?',
    summary: '{name} in {city}, {state} has a banging furnace with no heat and requested the earliest visit at {street}.',
    keyPoints: ['Furnace banging, no heat', 'Children at home', 'Asked about emergency fee'],
    nextSteps: ['Confirm emergency or morning slot', 'Send technician profile'] }),
  t({ trade: 'hvac', service: 'New HVAC system', category: 'pricing_inquiry', intent: 'buying_interest', urgency: 'low', weight: 4,
    quality: { hot: 4, warm: 5, cold: 1 },
    ask: 'Our system is 18 years old. What would a new high-efficiency AC and furnace run? Do you finance?',
    answer: 'A comfort advisor can measure your home and give you options with upfront pricing, and financing is available. When could they stop by?',
    summary: '{name} in {city}, {state} is replacing an 18-year-old system and wants a free in-home estimate with financing options.',
    keyPoints: ['Full system replacement', 'Interested in financing', 'Asked about utility rebates'],
    nextSteps: ['Schedule comfort advisor', 'Send financing and rebate info'] }),
  t({ trade: 'hvac', service: 'HVAC maintenance plan', category: 'general_inquiry', intent: 'meeting_request', urgency: 'low', weight: 2,
    quality: { hot: 2, warm: 6, cold: 2 },
    ask: 'Do you have a maintenance plan? I want a tune-up before summer.',
    answer: 'Yes! Our membership includes two tune-ups a year and priority scheduling. Want me to book your first tune-up?',
    summary: '{name} in {city}, {state} asked about the maintenance membership and a pre-summer tune-up.',
    keyPoints: ['Interested in membership', 'Pre-season tune-up'],
    nextSteps: ['Book tune-up', 'Enroll in membership'] }),
  t({ trade: 'hvac', service: 'AC repair', category: 'support_request', intent: 'buying_interest', urgency: 'medium', weight: 2, commercial: true,
    quality: { hot: 5, warm: 4, cold: 1 },
    ask: "I manage a restaurant and our walk-in area's rooftop unit keeps tripping. Can you look at it this week?",
    answer: 'Absolutely, we service commercial rooftop units. I can get a technician out tomorrow morning. What is the business name and address?',
    summary: '{name} from {company} in {city}, {state} needs a commercial rooftop unit inspected after repeated trips.',
    keyPoints: ['Commercial rooftop unit', 'Repeated breaker trips', 'Potential service contract'],
    nextSteps: ['Schedule commercial tech', 'Propose maintenance contract'] }),

  // ── Plumbing ────────────────────────────────────────────────────────────────
  t({ trade: 'plumbing', service: 'Plumbing repair', category: 'support_request', intent: 'buying_interest', urgency: 'high', weight: 5,
    quality: { hot: 8, warm: 2, cold: 0 },
    ask: 'A pipe burst under the kitchen sink and water is everywhere! Can someone come now?',
    answer: 'Shut off the valve under the sink, or the main by the meter. Our on-call plumber can be there within the hour. Name, phone and address?',
    summary: '{name} in {city}, {state} reported a burst pipe under the kitchen sink and requested an emergency plumber at {street}.',
    keyPoints: ['Burst pipe, active leak', 'Emergency visit', 'Shut-off guidance given'],
    nextSteps: ['Dispatch on-call plumber', 'Call with ETA'] }),
  t({ trade: 'plumbing', service: 'Water heater install', category: 'pricing_inquiry', intent: 'buying_interest', urgency: 'medium', weight: 4,
    quality: { hot: 5, warm: 4, cold: 1 },
    ask: 'Our water heater is 12 years old and leaking a little at the bottom. Should we replace it? Tankless?',
    answer: 'At 12 years with a leak, replacement is usually the smart move. A plumber can quote tank and tankless options on site. Want a visit tomorrow?',
    summary: '{name} in {city}, {state} has a leaking 12-year-old water heater and wants quotes for tank vs tankless.',
    keyPoints: ['Leaking 12-year-old tank', 'Considering tankless', 'Wants financing'],
    nextSteps: ['Book estimate', 'Send tankless brochure'] }),
  t({ trade: 'plumbing', service: 'Drain cleaning', category: 'support_request', intent: 'support', urgency: 'medium', weight: 3,
    quality: { hot: 3, warm: 5, cold: 2 },
    ask: 'Our main drain keeps backing up into the tub. Do you do camera inspections?',
    answer: 'Yes, we clear the line and camera-inspect it so we find the cause. I can book you for this afternoon or tomorrow morning.',
    summary: '{name} in {city}, {state} has a recurring main drain backup and booked a cleaning with camera inspection.',
    keyPoints: ['Recurring backup', 'Camera inspection requested'],
    nextSteps: ['Book drain service', 'Quote camera inspection'] }),
  t({ trade: 'plumbing', service: 'Sewer line repair', category: 'pricing_inquiry', intent: 'buying_interest', urgency: 'medium', weight: 1,
    quality: { hot: 4, warm: 4, cold: 2 },
    ask: 'The yard is soggy and smells near the sewer cleanout. Is that a broken line?',
    answer: 'It might be. A camera inspection will show exactly where. We also offer trenchless repair. Can I schedule an inspection?',
    summary: '{name} in {city}, {state} suspects a broken sewer line and requested a camera inspection.',
    keyPoints: ['Possible sewer break', 'Interested in trenchless'],
    nextSteps: ['Schedule camera inspection'] }),

  // ── Electrical ──────────────────────────────────────────────────────────────
  t({ trade: 'electrical', service: 'EV charger install', category: 'pricing_inquiry', intent: 'buying_interest', urgency: 'low', weight: 4,
    quality: { hot: 5, warm: 4, cold: 1 },
    ask: 'We just bought a Tesla. Can you install a Level 2 charger in the garage? Will our panel handle it?',
    answer: 'Congrats! We install Level 2 chargers and check the panel capacity during the estimate. Want a free on-site estimate this week?',
    summary: '{name} in {city}, {state} wants a Level 2 EV charger installed in the garage and a panel capacity check.',
    keyPoints: ['New EV owner', 'Level 2 charger', 'Panel capacity check'],
    nextSteps: ['Book estimate', 'Send charger options'] }),
  t({ trade: 'electrical', service: 'Panel upgrade', category: 'pricing_inquiry', intent: 'buying_interest', urgency: 'medium', weight: 3,
    quality: { hot: 4, warm: 5, cold: 1 },
    ask: 'Our breakers trip whenever the AC and dryer run. Do we need a 200 amp panel upgrade?',
    answer: 'Frequent trips often mean the panel is maxed out. A master electrician can assess it and quote a 200 amp upgrade. When works for you?',
    summary: '{name} in {city}, {state} has frequent breaker trips and asked about a 200A panel upgrade.',
    keyPoints: ['Frequent breaker trips', '200A upgrade discussed'],
    nextSteps: ['Schedule electrician assessment'] }),
  t({ trade: 'electrical', service: 'Electrical repair', category: 'support_request', intent: 'buying_interest', urgency: 'high', weight: 3,
    quality: { hot: 7, warm: 3, cold: 0 },
    ask: 'Half the outlets in the house stopped working and one smells like burning. What should I do?',
    answer: 'Please turn off that circuit at the breaker and do not use the outlet. I can send an electrician this afternoon. Name and address?',
    summary: '{name} in {city}, {state} reported dead outlets and a burning smell; an urgent electrician visit was booked at {street}.',
    keyPoints: ['Burning smell, safety risk', 'Multiple dead outlets', 'Same-day visit'],
    nextSteps: ['Dispatch electrician', 'Safety follow-up call'] }),
  t({ trade: 'electrical', service: 'Generator install', category: 'general_inquiry', intent: 'information', urgency: 'low', weight: 1,
    quality: { hot: 1, warm: 4, cold: 5 },
    ask: 'After the last storm we lost power for two days. How do whole-home generators work?',
    answer: 'A standby generator switches on automatically within seconds of an outage. We size it to your home during a free estimate.',
    summary: '{name} in {city}, {state} asked how whole-home standby generators work after a long outage.',
    keyPoints: ['Storm outage', 'Researching standby generators'],
    nextSteps: ['Send generator guide', 'Offer free estimate'] }),

  // ── Other trades (other tenants) ────────────────────────────────────────────
  t({ trade: 'roofing', service: 'Storm damage repair', category: 'support_request', intent: 'buying_interest', urgency: 'high', weight: 4,
    quality: { hot: 7, warm: 3, cold: 0 },
    ask: 'Last night\'s storm tore shingles off and the ceiling has a water spot. Do you work with insurance?',
    answer: 'Yes, we help with insurance claims. We can tarp the roof today and inspect the damage. Name, phone and address?',
    summary: '{name} in {city}, {state} has storm damage with a ceiling leak and needs a tarp plus an insurance inspection.',
    keyPoints: ['Storm damage, active leak', 'Insurance claim'], nextSteps: ['Send crew to tarp', 'Book inspection'] }),
  t({ trade: 'roofing', service: 'Roof inspection', category: 'general_inquiry', intent: 'meeting_request', urgency: 'low', weight: 2,
    quality: { hot: 2, warm: 6, cold: 2 },
    ask: 'We are buying a house and want the roof inspected before closing.',
    answer: 'Smart move. We can inspect within 48 hours and send a photo report. What is the property address?',
    summary: '{name} in {city}, {state} requested a pre-purchase roof inspection.', keyPoints: ['Pre-purchase inspection'],
    nextSteps: ['Schedule inspection'] }),
  t({ trade: 'pest', service: 'Termite inspection', category: 'support_request', intent: 'buying_interest', urgency: 'medium', weight: 3,
    quality: { hot: 5, warm: 4, cold: 1 },
    ask: 'I found mud tubes on the foundation. Could that be termites?',
    answer: 'Mud tubes are a common sign of subterranean termites. We can inspect this week at no charge. Can I get your details?',
    summary: '{name} in {city}, {state} found mud tubes and booked a free termite inspection.', keyPoints: ['Possible termites'],
    nextSteps: ['Book inspection'] }),
  t({ trade: 'pest', service: 'Rodent removal', category: 'support_request', intent: 'buying_interest', urgency: 'medium', weight: 2,
    quality: { hot: 4, warm: 5, cold: 1 },
    ask: 'We hear scratching in the attic at night. Probably mice. Can you help?',
    answer: 'Yes, we inspect, remove and seal entry points. I can book a technician tomorrow.',
    summary: '{name} in {city}, {state} hears rodents in the attic and booked an inspection.', keyPoints: ['Attic rodents'],
    nextSteps: ['Schedule technician'] }),
  t({ trade: 'dental', service: 'New patient exam', category: 'general_inquiry', intent: 'meeting_request', urgency: 'low', weight: 4,
    quality: { hot: 3, warm: 6, cold: 1 },
    ask: 'Are you taking new patients? I have Delta Dental PPO.',
    answer: 'We are, and we are in network with Delta Dental PPO. I can book a new patient exam and cleaning. What day works?',
    summary: '{name} in {city}, {state} is a new patient with Delta Dental PPO and requested an exam and cleaning.',
    keyPoints: ['New patient', 'In-network insurance'], nextSteps: ['Book new patient exam'] }),
  t({ trade: 'dental', service: 'Emergency dental visit', category: 'support_request', intent: 'buying_interest', urgency: 'high', weight: 2,
    quality: { hot: 7, warm: 3, cold: 0 },
    ask: 'I cracked a tooth and it really hurts. Can I be seen today?',
    answer: 'I am sorry! We keep emergency slots open. I can get you in at 3:30 PM today. Can I get your name and phone?',
    summary: '{name} in {city}, {state} cracked a tooth and booked a same-day emergency visit.', keyPoints: ['Cracked tooth, pain'],
    nextSteps: ['Confirm 3:30 PM slot'] }),
  t({ trade: 'locksmith', service: 'Lockout service', category: 'support_request', intent: 'buying_interest', urgency: 'high', weight: 3,
    quality: { hot: 8, warm: 2, cold: 0 },
    ask: 'I am locked out of my apartment. How fast can you get here?',
    answer: 'A technician can be there in about 30 minutes. What is the address?',
    summary: '{name} in {city}, {state} was locked out and requested a technician.', keyPoints: ['Lockout'], nextSteps: ['Dispatch'] }),
  t({ trade: 'moving', service: 'Local move', category: 'pricing_inquiry', intent: 'buying_interest', urgency: 'low', weight: 3,
    quality: { hot: 3, warm: 5, cold: 2 },
    ask: 'We are moving a 2-bedroom apartment across town next month. Can I get a quote?',
    answer: 'Happy to help! A coordinator can do a quick video walkthrough for an exact quote. When is a good time?',
    summary: '{name} in {city}, {state} requested a quote for a 2-bedroom local move.', keyPoints: ['2-bedroom move'],
    nextSteps: ['Schedule video walkthrough'] }),

  // ── Shared across trades ────────────────────────────────────────────────────
  ...(['hvac', 'plumbing', 'electrical', 'roofing', 'pest', 'dental', 'locksmith', 'moving'] as Trade[]).flatMap((trade) => [
    t({ trade, service: 'General question', category: 'general_inquiry', intent: 'information', urgency: 'low', weight: 1,
      quality: { hot: 0, warm: 3, cold: 7 },
      ask: 'Do you work weekends? Just asking for later.',
      answer: 'Yes, we have weekend hours and emergency service 24/7.',
      summary: 'A visitor from {city}, {state} asked about weekend hours.', keyPoints: ['Hours question'], nextSteps: ['None needed'] }),
    t({ trade, service: 'Careers', category: 'job_or_hiring', intent: 'information', urgency: 'low', weight: 0.4,
      quality: { hot: 0, warm: 1, cold: 9 },
      ask: 'Are you hiring technicians? I have 5 years of experience.',
      answer: 'We are always looking for great people! I will pass your details to our hiring manager.',
      summary: '{name} in {city}, {state} asked about technician jobs.', keyPoints: ['Job inquiry'], nextSteps: ['Forward to hiring manager'] }),
  ]),
]

export const FIRST_NAMES = ['James', 'Mary', 'Robert', 'Patricia', 'John', 'Jennifer', 'Michael', 'Linda', 'David', 'Elizabeth',
  'William', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica', 'Thomas', 'Sarah', 'Chris', 'Karen', 'Daniel', 'Lisa',
  'Matthew', 'Nancy', 'Anthony', 'Ashley', 'Mark', 'Emily', 'Carlos', 'Maria', 'Jose', 'Sofia', 'Kevin', 'Megan', 'Brian',
  'Rachel', 'Tyler', 'Lauren', 'DeShawn', 'Aaliyah', 'Wei', 'Priya', 'Andre', 'Brittany', 'Hunter', 'Kayla']
export const LAST_NAMES = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez',
  'Hernandez', 'Lopez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Thompson', 'White',
  'Harris', 'Clark', 'Lewis', 'Robinson', 'Walker', 'Young', 'Allen', 'King', 'Wright', 'Scott', 'Nguyen', 'Patel', 'Carter']
export const STREET_NAMES = ['Oak', 'Maple', 'Cedar', 'Elm', 'Pecan', 'Magnolia', 'Willow', 'Preston', 'Lakeview', 'Sunset',
  'Ridge', 'Meadow', 'Highland', 'Park', 'Chestnut', 'Hillcrest', 'Main', 'Brookside']
export const STREET_TYPES = ['St', 'Ave', 'Dr', 'Ln', 'Blvd', 'Ct', 'Way', 'Rd']
export const COMPANIES = ['Main Street Diner', 'Oakwood Apartments', 'Bright Smiles Pediatrics', 'Lakeside Office Park',
  'Riverbend HOA', 'Corner Market', 'Summit Fitness', 'Heritage Church']

/** Metro suburbs so records feel local, by tenant city. */
export const SUBURBS: Record<string, string[]> = {
  Dallas: ['Dallas', 'Plano', 'Frisco', 'McKinney', 'Irving', 'Arlington', 'Richardson', 'Garland', 'Fort Worth', 'Allen'],
  Austin: ['Austin', 'Round Rock', 'Cedar Park', 'Pflugerville', 'Georgetown'],
  Atlanta: ['Atlanta', 'Marietta', 'Alpharetta', 'Decatur', 'Roswell'],
  Phoenix: ['Phoenix', 'Scottsdale', 'Mesa', 'Tempe', 'Chandler', 'Gilbert'],
  Chicago: ['Chicago', 'Evanston', 'Oak Park', 'Naperville', 'Skokie'],
  Tampa: ['Tampa', 'St. Petersburg', 'Clearwater', 'Brandon'],
  Denver: ['Denver', 'Aurora', 'Lakewood', 'Littleton', 'Boulder'],
  'San Francisco': ['San Francisco', 'Oakland', 'Daly City', 'San Mateo'],
}
