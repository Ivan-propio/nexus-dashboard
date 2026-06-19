// Nexus Luxembourg 2026 — Package Catalog (source of truth)
// Extracted from official BDC template PDFs

export const ISSUER = {
    name: 'Nexus2050 G.I.E.',
    address: '10 rue des Gaulois',
    postalCity: 'L-1618 Luxembourg',
    phone: '20 70 70 1',
    email: 'hello@nexusluxembourg.com',
    registration: '2023 8100 039',
    rcs: 'C180',
    iban: 'LU07 0019 7555 1724 5000',
    bic: 'BCEELULL',
    vat: 'LU35412583'
};

export const BANNER_PRICES = {
    A: { dimensions: '238 x 189 cm', price: 100, mandatory: true },
    B: { dimensions: '238 x 38 cm',  price: 35,  mandatory: true },
    C: { dimensions: '238 x 189 cm', price: 100, mandatory: false }
};

export const CATEGORIES = [
    { id: 'exhibitor', label: 'Exhibitor', icon: 'storefront' },
    { id: 'dinner',    label: 'Closing Seated Dinner', icon: 'restaurant' },
    { id: 'pavilion',  label: 'Destination/Incubator Pavilion', icon: 'apartment' },
    { id: 'speaker',   label: 'Speaker', icon: 'mic' }
];

export const PACKAGES = [
    // ═══════════════════════════════════════════
    // EXHIBITOR (7 packages)
    // ═══════════════════════════════════════════
    {
        id: 'exhibitor-lead',
        category: 'exhibitor',
        name: 'Lead Partner',
        priceHT: 53500,
        vatRate: 17,
        hasBanners: true,
        standM2: 37.5,
        furniture: [
            '2x 55" TV Screens',
            '1x Welcome desk & 2x Stools',
            '1x Refrigerator',
            '1x Coat hanger',
            '1x Table & 4x Chairs',
            '3x Lockers',
            '6x Electrical outlets (240 V)'
        ],
        talks: [
            '2 × 15-minute Keynotes or Fireside Chats',
            '1 × participation in Panel discussion'
        ],
        tickets: [
            '2 Speaker Sanctuary Tickets',
            'Up to 25 Attendees Tickets',
            'Up to 6 Two-Day Exhibitor Tickets'
        ],
        dinner: '2 tables of 8 guests each',
        dinnerLabel: 'Closing Seated Dinner',
        visibility: [
            'Logo integrated: Entrance / Website (home page) / 3 newsletters (incl. post-event)',
            'Name integrated: Floorplan, After-movie',
            'Social Media: one individual post announcing your attendance at Nexus (optional - with a quote from Key Opinion Leader of your company)',
            'Website & apps: presentation page in the official app and on the website including programme and matchmaking zone',
            'At Nexus: 44 x 44 cm signage with full color-logo of your company',
            'One page (1 full page ad or 1 page editorial) in post-event magazine to be sent on Oct. 2026 and announcing 2027 edition'
        ],
        leadGeneration: [
            'Networking and lead generation opportunities (2 breakfasts, 2 lunches, 2 evening cocktails)',
            'Matchmaking Zone - Go International Business Meetings',
            'Digital matchmaking platform'
        ],
        bonus: '15% discount in any other Nexus Luxembourg 2026 operation: additional table at seated dinner, employer branding/student entrances, tickets, magazine advertising, etc'
    },
    {
        id: 'exhibitor-premier',
        category: 'exhibitor',
        name: 'Premier Partner',
        priceHT: 31700,
        vatRate: 17,
        hasBanners: true,
        standM2: 25,
        furniture: [
            '2x 55" TV Screens',
            '1x Welcome desk & 2x Stools',
            '1x Refrigerator',
            '1x Coat hanger',
            '1x Table & 4x Chairs',
            '3x Lockers',
            '6x Electrical outlets (240 V)'
        ],
        talks: [
            '2 × 15-minute Keynotes or Fireside Chats',
            '1 × participation in Panel discussion'
        ],
        tickets: [
            '2 Speaker Sanctuary Tickets',
            'Up to 25 Attendees Tickets',
            'Up to 6 Two-Day Exhibitor Tickets'
        ],
        dinner: '2 tables of 8 guests each',
        dinnerLabel: 'Closing Seated Dinner',
        visibility: [
            'Logo integrated: Entrance / Website (home page) / 3 newsletters (incl. post-event)',
            'Name integrated: Floorplan, After-movie',
            'Social Media: one individual post announcing your attendance at Nexus (optional - with a quote from Key Opinion Leader of your company)',
            'Website & apps: presentation page in the official app and on the website including programme and matchmaking zone',
            'At Nexus: 44 x 44 cm signage with full color-logo of your company',
            'One page (1 full page ad or 1 page editorial) in post-event magazine to be sent on Oct. 2026 and announcing 2027 edition'
        ],
        leadGeneration: [
            'Networking and lead generation opportunities (2 breakfasts, 2 lunches, 2 evening cocktails)',
            'Matchmaking Zone - Go International Business Meetings',
            'Digital matchmaking platform'
        ],
        bonus: '15% discount in any other Nexus Luxembourg 2026 operation: additional table at seated dinner, employer branding/student entrances, tickets, magazine advertising, etc'
    },
    {
        id: 'exhibitor-major',
        category: 'exhibitor',
        name: 'Major Partner',
        priceHT: 19200,
        vatRate: 17,
        hasBanners: true,
        standM2: 18.75,
        furniture: [
            '1x 55" TV Screen',
            '1x Welcome desk & 2x Stools',
            '1x Coat hanger',
            '1x Table & 4x Chairs',
            '2x Lockers',
            '3x Electrical outlets (240 V)'
        ],
        talks: [
            '1 × 15-minute Keynote or Fireside Chat',
            '1 × participation in Panel discussion'
        ],
        tickets: [
            '1 Speaker Sanctuary Ticket',
            'Up to 15 Attendees Tickets',
            'Up to 3 Two-Day Exhibitor Tickets'
        ],
        dinner: '1 table of 8 guests',
        dinnerLabel: 'Closing Seated Dinner',
        visibility: [
            'Logo integrated: Entrance / 2 newsletters',
            'Name integrated: Floorplan, After-movie',
            'Social Media: one individual post announcing your attendance at Nexus only if providing a quote otherwise integrated in a carrousel post',
            'Website & apps: presentation page in the official app and on the website including programme and matchmaking zone',
            'At Nexus: 44 x 44 cm signage with full color-logo of your company'
        ],
        leadGeneration: [
            'Networking and lead generation opportunities (2 breakfasts, 2 lunches, 2 evening cocktails)',
            'Matchmaking Zone - Go International Business Meetings',
            'Digital matchmaking platform'
        ],
        bonus: '15% discount in any other Nexus Luxembourg 2026 operation: additional table at seated dinner, employer branding/student entrances, tickets, magazine advertising, etc'
    },
    {
        id: 'exhibitor-key',
        category: 'exhibitor',
        name: 'Key Partner',
        priceHT: 13000,
        vatRate: 17,
        hasBanners: true,
        standM2: 12.5,
        furniture: [
            '1x 55" TV Screen',
            '1x Welcome desk & 4x Stools',
            '1x High table',
            '1x Locker',
            '3x Electrical outlets (240 V)'
        ],
        talks: [
            '1 × 15-minute Keynote or Fireside Chat'
        ],
        tickets: [
            'Up to 15 Attendees Tickets',
            'Up to 3 Two-Day Exhibitor Tickets'
        ],
        dinner: null,
        dinnerLabel: null,
        visibility: [
            'Logo integrated: 1 newsletter',
            'Name integrated: Entrance, Floorplan, After-movie',
            'Social Media: one individual post announcing your attendance at Nexus only if providing a quote otherwise integrated in a carrousel post',
            'Website & apps: presentation page in the official app and on the website including programme and matchmaking zone',
            'At Nexus: 44 x 44 cm signage with full color-logo of your company'
        ],
        leadGeneration: [
            'Networking and lead generation opportunities (2 breakfasts, 2 lunches, 2 evening cocktails)',
            'Matchmaking Zone - Go International Business Meetings',
            'Digital matchmaking platform'
        ],
        bonus: '10% discount in any other Nexus Luxembourg 2026 operation: additional table at seated dinner, employer branding/student entrances, tickets, magazine advertising, etc'
    },
    {
        id: 'exhibitor-startup',
        category: 'exhibitor',
        name: 'Single Stand (Start-up)',
        priceHT: 6380,
        vatRate: 17,
        hasBanners: true,
        standM2: 6.25,
        furniture: [
            '1x Welcome desk & 2x Stools',
            '1x Electrical outlet (240 V)'
        ],
        talks: [],
        tickets: [
            'Up to 5 Attendees Tickets',
            'Up to 3 Exhibitor Tickets'
        ],
        dinner: null,
        dinnerLabel: null,
        visibility: [
            'Name integrated: Entrance, Floorplan',
            'Website & apps: presentation page in the official app and on the website including programme and matchmaking zone'
        ],
        leadGeneration: [
            'Networking and lead generation opportunities (2 breakfasts, 2 lunches, 2 evening cocktails)',
            'Matchmaking Zone - Go International Business Meetings',
            'Digital matchmaking platform'
        ],
        bonus: '10% discount in any other Nexus Luxembourg 2026 operation: additional table at seated dinner, employer branding/student entrances, tickets, magazine advertising, etc'
    },
    {
        id: 'exhibitor-association',
        category: 'exhibitor',
        name: 'Association Package',
        priceHT: 8500,
        vatRate: 17,
        hasBanners: true,
        standM2: 12.5,
        furniture: [
            '1x 55" TV Screen',
            '1x Welcome desk & 4x Stools',
            '1x High table',
            '1x Locker',
            '3x Electrical outlets (240 V)'
        ],
        talks: [
            '1 × 15-minute Keynote or Fireside Chat'
        ],
        tickets: [
            'Up to 15 Attendees Tickets',
            'Up to 3 Two-Day Exhibitor Tickets'
        ],
        dinner: '1 seat at the closing dinner',
        dinnerLabel: 'Closing Seated Dinner',
        visibility: [
            'Logo integrated: 1 newsletter',
            'Name integrated: Entrance, Floorplan, After-movie',
            'Social Media: one individual post announcing your attendance at Nexus only if providing a quote otherwise integrated in a carrousel post',
            'Website & apps: presentation page in the official app and on the website including programme and matchmaking zone',
            'At Nexus: 44 x 44 cm signage with full color-logo of your company'
        ],
        leadGeneration: [
            'Networking and lead generation opportunities (2 breakfasts, 2 lunches, 2 evening cocktails)',
            'Matchmaking Zone - Go International Business Meetings',
            'Digital matchmaking platform'
        ],
        bonus: '10% discount in any other Nexus Luxembourg 2026 operation: additional table at seated dinner, employer branding/student entrances, tickets, magazine advertising, etc'
    },
    {
        id: 'exhibitor-students',
        category: 'exhibitor',
        name: 'Students Tickets Sponsorship',
        priceHT: 5900,
        vatRate: 17,
        hasBanners: false,
        standM2: null,
        furniture: [],
        talks: [],
        tickets: [
            'Up to 100 sponsored tickets for students'
        ],
        dinner: null,
        dinnerLabel: null,
        visibility: [
            'Logo and name integrated in all communications related to the Talent Avenue programme (website, app, newsletter, social media)',
            'Company profiles displayed on screens at Luxembourg Makes It Happen pavilion',
            'The "Top Tech & Leadership Jobs in Luxembourg" wall',
            'A dedicated 1m x 1m space featuring their logo, open positions, and a QR code directing students to their job offers on AEOM'
        ],
        leadGeneration: [
            'Matchmaking Zone - Go International Business Meetings',
            'Digital matchmaking platform'
        ],
        bonus: null,
        specialLabel: 'Talent Avenue programme',
        specialItems: [
            'Organised bus tours take students to visit sponsoring companies, offering a direct insight into Luxembourg\'s leading workplaces and career opportunities'
        ]
    },

    // ═══════════════════════════════════════════
    // CLOSING SEATED DINNER (4 packages)
    // ═══════════════════════════════════════════
    {
        id: 'dinner-exclusive',
        category: 'dinner',
        name: 'Exclusive Partner',
        priceHT: 50000,
        vatRate: 17,
        hasBanners: false,
        standM2: null,
        furniture: [],
        talks: [],
        tickets: [
            'Up to 5 Speaker Sanctuary Tickets (Two-Day-Access)',
            'Up to 40 Attendees Tickets'
        ],
        dinner: '5 tables of 8 guests each',
        dinnerLabel: 'Closing Seated Dinner',
        visibility: [
            'Logo integrated: On screens during Ceremony & dinner',
            'Logo integrated: 3 Newsletters (incl. post-event)',
            'Print advertising (specifically on dinner)',
            'Name integrated: After-movie',
            'Website & apps: presentation page in the official app and on the website including programme and matchmaking zone',
            'Social Media: individual post (optional KOL quote)',
            'Special mention in post-event magazine (Oct. 2026, announcing 2027 edition)'
        ],
        leadGeneration: [
            'Matchmaking Zone - Go International Business Meetings',
            'Digital matchmaking platform'
        ],
        bonus: '15% discount in any other Nexus Luxembourg 2026 operation (additional tables, employer branding/student entrances, tickets, etc.)'
    },
    {
        id: 'dinner-copartner',
        category: 'dinner',
        name: 'Co-Partner',
        priceHT: 25000,
        vatRate: 17,
        hasBanners: false,
        standM2: null,
        furniture: [],
        talks: [],
        tickets: [
            'Up to 3 Speaker Sanctuary Tickets (Two-Day-Access)',
            'Up to 25 Attendees Tickets'
        ],
        dinner: '3 tables of 8 guests each',
        dinnerLabel: 'Closing Seated Dinner',
        visibility: [
            'Logo integrated: On screens during Ceremony & dinner',
            'Logo integrated: 2 Newsletters (incl. post-event)',
            'Print advertising (specifically on dinner)',
            'Name integrated: After-movie',
            'Website & apps: presentation page in the official app and on the website including programme and matchmaking zone',
            'Social Media: individual post (optional KOL quote)',
            'Special mention in post-event magazine (Oct. 2026, announcing 2027 edition)'
        ],
        leadGeneration: [
            'Matchmaking Zone - Go International Business Meetings',
            'Digital matchmaking platform'
        ],
        bonus: '15% discount in any other Nexus Luxembourg 2026 operation (additional tables, employer branding/student entrances, tickets, etc.)'
    },
    {
        id: 'dinner-single-early',
        category: 'dinner',
        name: 'Single Table (Until April)',
        priceHT: 3500,
        vatRate: 17,
        hasBanners: false,
        standM2: null,
        furniture: [],
        talks: [],
        tickets: [
            'Up to 8 Attendees Tickets'
        ],
        dinner: '1 table of 8 guests',
        dinnerLabel: 'Closing Seated Dinner',
        visibility: [],
        leadGeneration: [
            'Matchmaking Zone - Go International Business Meetings',
            'Digital matchmaking platform'
        ],
        bonus: null
    },
    {
        id: 'dinner-single-late',
        category: 'dinner',
        name: 'Single Table (From May)',
        priceHT: 3950,
        vatRate: 17,
        hasBanners: false,
        standM2: null,
        furniture: [],
        talks: [],
        tickets: [
            'Up to 8 Attendees Tickets'
        ],
        dinner: '1 table of 8 guests',
        dinnerLabel: 'Closing Seated Dinner',
        visibility: [],
        leadGeneration: [
            'Matchmaking Zone - Go International Business Meetings',
            'Digital matchmaking platform'
        ],
        bonus: null
    },

    // ═══════════════════════════════════════════
    // DESTINATION/INCUBATOR PAVILION (4 packages)
    // ═══════════════════════════════════════════
    {
        id: 'pavilion-s',
        category: 'pavilion',
        name: 'Pack S',
        priceHT: 5380,
        vatRate: 17,
        hasBanners: true,
        standM2: 6.25,
        furniture: [
            '1x Welcome desk & 2x Stools',
            '1x Electrical outlet (240 V)'
        ],
        talks: [
            'Up to 3 minutes pitch session for Startups & Scaleups in dedicated stages (if selected for one of the 10 topics)'
        ],
        tickets: [
            'Up to 5 Attendees Tickets',
            'Up to 3 Exhibitor Tickets'
        ],
        dinner: null,
        dinnerLabel: null,
        visibility: [
            'Name integrated: Entrance, Floorplan',
            'Social Media: 1 joint carrousel post',
            'Website & apps: presentation page in official app and website',
            'At Nexus: 44 x 44 cm signage with full color logo'
        ],
        leadGeneration: [
            'Matchmaking Zone - Go International Business Meetings',
            'Digital matchmaking platform'
        ],
        bonus: '10% discount in any other Nexus Luxembourg 2026 operation (additional dinner table, employer branding/student entrances, tickets, etc.)'
    },
    {
        id: 'pavilion-m',
        category: 'pavilion',
        name: 'Pack M',
        priceHT: 11000,
        vatRate: 17,
        hasBanners: true,
        standM2: 12.5,
        furniture: [
            '1x 55" TV Screen',
            '1x Welcome desk & 4x Stools',
            '1x High table',
            '1x Locker',
            '3x Electrical outlets (240 V)'
        ],
        talks: [
            'Up to 3 minutes pitch session for Startups & Scaleups in dedicated stages (if selected for one of the 10 topics)'
        ],
        tickets: [
            'Up to 15 Attendees Tickets',
            'Up to 3 Two-Day Exhibitor Tickets'
        ],
        dinner: null,
        dinnerLabel: null,
        visibility: [
            'Logo integrated: 1 newsletter',
            'Name integrated: Entrance, Floorplan, After-movie',
            'Social Media: 1 joint carrousel post',
            'Website & apps: presentation page in official app and website',
            'At Nexus: 44 x 44 cm signage with full color logo'
        ],
        leadGeneration: [
            'Matchmaking Zone - Go International Business Meetings',
            'Digital matchmaking platform'
        ],
        bonus: '10% discount in any other Nexus Luxembourg 2026 operation (additional dinner table, employer branding/student entrances, tickets, etc.)'
    },
    {
        id: 'pavilion-l',
        category: 'pavilion',
        name: 'Pack L',
        priceHT: 16200,
        vatRate: 17,
        hasBanners: true,
        standM2: 18.75,
        furniture: [
            '1x 55" TV Screen',
            '1x Welcome desk & 2x Stools',
            '1x Coat hanger',
            '1x Table & 4x Chairs',
            '2x Lockers',
            '3x Electrical outlets (240 V)'
        ],
        talks: [
            'Up to 3 minutes pitch session for Startups & Scaleups in dedicated stages (if selected for one of the 10 topics)'
        ],
        tickets: [
            '1 Speaker Sanctuary Ticket',
            'Up to 15 Attendees Tickets',
            'Up to 4 Two-Day Exhibitor Tickets'
        ],
        dinner: '2 seats at Closing Seated Dinner',
        dinnerLabel: 'Closing Seated Dinner',
        visibility: [
            'Logo integrated: Entrance, 1 newsletter',
            'Name integrated: Floorplan, After-movie',
            'Social Media: 1 individual post (only if providing a quote, otherwise in carrousel)',
            'Website & apps: presentation page in official app and website',
            'At Nexus: 44 x 44 cm signage with full color logo'
        ],
        leadGeneration: [
            'Matchmaking Zone - Go International Business Meetings',
            'Digital matchmaking platform'
        ],
        bonus: '10% discount in any other Nexus Luxembourg 2026 operation (additional dinner table, employer branding/student entrances, tickets, etc.)'
    },
    {
        id: 'pavilion-premium',
        category: 'pavilion',
        name: 'Premium (XL)',
        priceHT: 31700,
        vatRate: 17,
        hasBanners: true,
        standM2: 25,
        furniture: [
            '2x 55" TV Screens',
            '1x Welcome desk & 2x Stools',
            '1x Refrigerator',
            '1x Coat hanger',
            '1x Table & 4x Chairs',
            '3x Lockers',
            '6x Electrical outlets (240 V)'
        ],
        talks: [
            'Up to 3 minutes pitch session for Startups & Scaleups in dedicated stages (if selected for one of the 10 topics)'
        ],
        tickets: [
            '2 Speaker Sanctuary Tickets',
            'Up to 25 Attendees Tickets',
            'Up to 6 Two-Day Exhibitor Tickets'
        ],
        dinner: '2 tables of 8 guests each',
        dinnerLabel: 'Closing Seated Dinner',
        visibility: [
            'Logo integrated: Entrance / Website (home page) / 3 newsletters (incl. post-event)',
            'Name integrated: Floorplan, After-movie',
            'Social Media: one individual post (optional KOL quote)',
            'Website & apps: presentation page in official app and website including programme and matchmaking zone',
            'At Nexus: 44 x 44 cm signage with full color-logo',
            'One page in post-event magazine (Oct. 2026, announcing 2027 edition)'
        ],
        leadGeneration: [
            'Networking and lead generation opportunities (2 breakfasts, 2 lunches, 2 evening cocktails)',
            'Matchmaking Zone - Go International Business Meetings',
            'Digital matchmaking platform'
        ],
        bonus: '15% discount in any other Nexus Luxembourg 2026 operation'
    },

    // ═══════════════════════════════════════════
    // SPEAKER (2 packages)
    // ═══════════════════════════════════════════
    {
        id: 'speaker-spotlight1',
        category: 'speaker',
        name: 'Expert Spotlight 1',
        priceHT: 6380,
        vatRate: 17,
        hasBanners: false,
        standM2: null,
        furniture: [],
        talks: [
            '2 × 15-minute talks on one of the Main Stages'
        ],
        tickets: [
            '2 Speaker Sanctuary Tickets (Two-Day-Access)'
        ],
        dinner: null,
        dinnerLabel: null,
        visibility: [],
        leadGeneration: [],
        bonus: null
    },
    {
        id: 'speaker-spotlight2',
        category: 'speaker',
        name: 'Expert Spotlight 2',
        priceHT: 6380,
        vatRate: 17,
        hasBanners: false,
        standM2: null,
        furniture: [],
        talks: [
            '2 × 15-minute talks on one of the Main Stages'
        ],
        tickets: [
            '2 Speaker Sanctuary Tickets (Two-Day-Access)'
        ],
        dinner: null,
        dinnerLabel: null,
        visibility: [],
        leadGeneration: [],
        bonus: null
    }
];

export function getPackageById(id) {
    return PACKAGES.find(p => p.id === id);
}

export function getPackagesByCategory(category) {
    return PACKAGES.filter(p => p.category === category);
}
