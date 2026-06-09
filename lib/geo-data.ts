import { NuclearFacility, MilitaryBase, UnderseaCable } from './types';

// ============================================================
// NUCLEAR FACILITIES — 80+ worldwide
// ============================================================
export const NUCLEAR_FACILITIES: NuclearFacility[] = [
  // USA
  { name: 'Vogtle', lat: 33.1415, lng: -81.7630, country: 'USA', type: 'plant', status: 'active' },
  { name: 'Palo Verde', lat: 33.3886, lng: -112.8615, country: 'USA', type: 'plant', status: 'active' },
  { name: 'Watts Bar', lat: 35.6031, lng: -84.7891, country: 'USA', type: 'plant', status: 'active' },
  { name: 'Diablo Canyon', lat: 35.2107, lng: -120.8553, country: 'USA', type: 'plant', status: 'active' },
  { name: 'Indian Point', lat: 41.2698, lng: -73.9522, country: 'USA', type: 'plant', status: 'decommissioned' },
  { name: 'Los Alamos', lat: 35.8440, lng: -106.2873, country: 'USA', type: 'weapons', status: 'active' },
  { name: 'Sandia National Labs', lat: 34.9607, lng: -106.5100, country: 'USA', type: 'weapons', status: 'active' },
  { name: 'Oak Ridge', lat: 35.9310, lng: -84.3100, country: 'USA', type: 'enrichment', status: 'active' },
  { name: 'Pantex', lat: 35.3175, lng: -101.5566, country: 'USA', type: 'weapons', status: 'active' },
  { name: 'Hanford', lat: 46.5507, lng: -119.4880, country: 'USA', type: 'waste', status: 'active' },
  { name: 'Savannah River', lat: 33.3372, lng: -81.7370, country: 'USA', type: 'weapons', status: 'active' },
  { name: 'Y-12 Security Complex', lat: 36.0100, lng: -84.2536, country: 'USA', type: 'weapons', status: 'active' },
  // France
  { name: 'Gravelines', lat: 51.0151, lng: 2.1053, country: 'France', type: 'plant', status: 'active' },
  { name: 'Paluel', lat: 49.8592, lng: 0.6333, country: 'France', type: 'plant', status: 'active' },
  { name: 'Cattenom', lat: 49.4069, lng: 6.2158, country: 'France', type: 'plant', status: 'active' },
  { name: 'La Hague', lat: 49.6781, lng: -1.8803, country: 'France', type: 'enrichment', status: 'active' },
  { name: 'Flamanville', lat: 49.5375, lng: -1.8814, country: 'France', type: 'plant', status: 'under_construction' },
  { name: 'Tricastin', lat: 44.3336, lng: 4.7317, country: 'France', type: 'enrichment', status: 'active' },
  // UK
  { name: 'Hinkley Point C', lat: 51.2084, lng: -3.1306, country: 'UK', type: 'plant', status: 'under_construction' },
  { name: 'Sellafield', lat: 54.4203, lng: -3.4983, country: 'UK', type: 'waste', status: 'active' },
  { name: 'Sizewell B', lat: 52.2155, lng: 1.6195, country: 'UK', type: 'plant', status: 'active' },
  { name: 'AWE Aldermaston', lat: 51.3625, lng: -1.1497, country: 'UK', type: 'weapons', status: 'active' },
  // Russia
  { name: 'Novovoronezh', lat: 51.2706, lng: 39.2142, country: 'Russia', type: 'plant', status: 'active' },
  { name: 'Kursk NPP', lat: 51.6725, lng: 35.6064, country: 'Russia', type: 'plant', status: 'active' },
  { name: 'Leningrad NPP', lat: 59.8350, lng: 29.0458, country: 'Russia', type: 'plant', status: 'active' },
  { name: 'Sarov (Arzamas-16)', lat: 54.9350, lng: 43.3233, country: 'Russia', type: 'weapons', status: 'active' },
  { name: 'Mayak', lat: 55.7131, lng: 60.8431, country: 'Russia', type: 'weapons', status: 'active' },
  { name: 'Seversk', lat: 56.6003, lng: 84.8867, country: 'Russia', type: 'enrichment', status: 'active' },
  { name: 'Novaya Zemlya', lat: 73.3717, lng: 55.2917, country: 'Russia', type: 'weapons', status: 'active' },
  { name: 'Kaliningrad NPP', lat: 54.1678, lng: 22.0728, country: 'Russia', type: 'plant', status: 'under_construction' },
  // Ukraine
  { name: 'Zaporizhzhia NPP', lat: 47.5069, lng: 34.5853, country: 'Ukraine', type: 'plant', status: 'active' },
  { name: 'Rivne NPP', lat: 51.3306, lng: 25.8953, country: 'Ukraine', type: 'plant', status: 'active' },
  { name: 'South Ukraine NPP', lat: 47.8150, lng: 31.2178, country: 'Ukraine', type: 'plant', status: 'active' },
  { name: 'Khmelnytskyi NPP', lat: 50.3014, lng: 26.6489, country: 'Ukraine', type: 'plant', status: 'active' },
  { name: 'Chernobyl', lat: 51.3894, lng: 30.0989, country: 'Ukraine', type: 'waste', status: 'decommissioned' },
  // China
  { name: 'Daya Bay', lat: 22.5969, lng: 114.5453, country: 'China', type: 'plant', status: 'active' },
  { name: 'Taishan', lat: 21.9111, lng: 112.9792, country: 'China', type: 'plant', status: 'active' },
  { name: 'Tianwan', lat: 34.6867, lng: 119.4603, country: 'China', type: 'plant', status: 'active' },
  { name: 'Lop Nor', lat: 41.5481, lng: 88.7281, country: 'China', type: 'weapons', status: 'active' },
  { name: 'Lanzhou GDR', lat: 36.0928, lng: 103.7861, country: 'China', type: 'enrichment', status: 'active' },
  // Japan
  { name: 'Fukushima Daiichi', lat: 37.4211, lng: 141.0328, country: 'Japan', type: 'plant', status: 'decommissioned' },
  { name: 'Kashiwazaki-Kariwa', lat: 37.4286, lng: 138.5978, country: 'Japan', type: 'plant', status: 'active' },
  { name: 'Rokkasho', lat: 40.9569, lng: 141.3236, country: 'Japan', type: 'enrichment', status: 'active' },
  // South Korea
  { name: 'Kori/Shin-Kori', lat: 35.3200, lng: 129.2783, country: 'South Korea', type: 'plant', status: 'active' },
  { name: 'Hanul', lat: 37.0928, lng: 129.3836, country: 'South Korea', type: 'plant', status: 'active' },
  // India
  { name: 'Kudankulam', lat: 8.1711, lng: 77.7106, country: 'India', type: 'plant', status: 'active' },
  { name: 'Tarapur', lat: 19.8306, lng: 72.6506, country: 'India', type: 'plant', status: 'active' },
  { name: 'Bhabha Centre', lat: 19.0075, lng: 72.9156, country: 'India', type: 'research', status: 'active' },
  // Pakistan
  { name: 'Kahuta', lat: 33.5836, lng: 73.3881, country: 'Pakistan', type: 'enrichment', status: 'active' },
  { name: 'Khushab', lat: 32.0200, lng: 72.2250, country: 'Pakistan', type: 'weapons', status: 'active' },
  // Israel
  { name: 'Dimona', lat: 31.0019, lng: 35.1467, country: 'Israel', type: 'weapons', status: 'active' },
  // Iran
  { name: 'Bushehr', lat: 28.8311, lng: 50.8878, country: 'Iran', type: 'plant', status: 'active' },
  { name: 'Natanz', lat: 33.7242, lng: 51.7267, country: 'Iran', type: 'enrichment', status: 'active' },
  { name: 'Fordow', lat: 34.8803, lng: 51.5842, country: 'Iran', type: 'enrichment', status: 'active' },
  { name: 'Isfahan UCF', lat: 32.6731, lng: 51.6650, country: 'Iran', type: 'enrichment', status: 'active' },
  // North Korea
  { name: 'Yongbyon', lat: 39.7958, lng: 125.7558, country: 'North Korea', type: 'weapons', status: 'active' },
  { name: 'Punggye-ri', lat: 41.2825, lng: 129.0947, country: 'North Korea', type: 'weapons', status: 'active' },
  // Others
  { name: 'Barakah', lat: 23.9575, lng: 52.2575, country: 'UAE', type: 'plant', status: 'active' },
  { name: 'Akkuyu', lat: 36.1444, lng: 33.5281, country: 'Turkey', type: 'plant', status: 'under_construction' },
  { name: 'Paks', lat: 46.5722, lng: 18.8544, country: 'Hungary', type: 'plant', status: 'active' },
  { name: 'Cernavoda', lat: 44.3206, lng: 28.0581, country: 'Romania', type: 'plant', status: 'active' },
  { name: 'Olkiluoto', lat: 61.2353, lng: 21.4472, country: 'Finland', type: 'plant', status: 'active' },
  { name: 'Koeberg', lat: -33.6769, lng: 18.4331, country: 'South Africa', type: 'plant', status: 'active' },
  { name: 'Angra', lat: -23.0083, lng: -44.4572, country: 'Brazil', type: 'plant', status: 'active' },
  { name: 'Atucha', lat: -33.9667, lng: -59.2083, country: 'Argentina', type: 'plant', status: 'active' },
];

// ============================================================
// MILITARY BASES — Major global installations
// ============================================================
export const MILITARY_BASES: MilitaryBase[] = [
  // US Bases (Global)
  { name: 'Ramstein AB', lat: 49.4369, lng: 7.6003, country: 'Germany', operator: 'USAF', type: 'air' },
  { name: 'Aviano AB', lat: 46.0319, lng: 12.5964, country: 'Italy', operator: 'USAF', type: 'air' },
  { name: 'Incirlik AB', lat: 37.0022, lng: 35.4250, country: 'Turkey', operator: 'USAF/NATO', type: 'air' },
  { name: 'Al Udeid AB', lat: 25.1175, lng: 51.3150, country: 'Qatar', operator: 'USAF', type: 'air' },
  { name: 'Al Dhafra AB', lat: 24.2481, lng: 54.5472, country: 'UAE', operator: 'USAF', type: 'air' },
  { name: 'Camp Humphreys', lat: 36.9633, lng: 127.0317, country: 'South Korea', operator: 'US Army', type: 'army' },
  { name: 'Kadena AB', lat: 26.3516, lng: 127.7670, country: 'Japan', operator: 'USAF', type: 'air' },
  { name: 'Yokosuka Naval', lat: 35.2836, lng: 139.6644, country: 'Japan', operator: 'USN', type: 'naval' },
  { name: 'Diego Garcia', lat: -7.3195, lng: 72.4229, country: 'BIOT', operator: 'USN/USAF', type: 'joint' },
  { name: 'Guam (Andersen)', lat: 13.5839, lng: 144.9244, country: 'Guam', operator: 'USAF', type: 'air' },
  { name: 'Pearl Harbor', lat: 21.3442, lng: -157.9726, country: 'USA', operator: 'USN', type: 'naval' },
  { name: 'Norfolk Naval', lat: 36.9478, lng: -76.3031, country: 'USA', operator: 'USN', type: 'naval' },
  { name: 'Camp Lemonnier', lat: 11.5475, lng: 43.1492, country: 'Djibouti', operator: 'USN', type: 'joint' },
  { name: 'Rota Naval', lat: 36.6392, lng: -6.3494, country: 'Spain', operator: 'USN', type: 'naval' },
  { name: 'Sigonella NAS', lat: 37.4017, lng: 14.9222, country: 'Italy', operator: 'USN', type: 'air' },
  { name: 'Thule AB', lat: 76.5312, lng: -68.7032, country: 'Greenland', operator: 'USSF', type: 'space' },
  { name: 'Pine Gap', lat: -23.7993, lng: 133.7367, country: 'Australia', operator: 'CIA/NSA', type: 'joint' },
  // Russia
  { name: 'Kaliningrad', lat: 54.7104, lng: 20.4522, country: 'Russia', operator: 'Russian Navy', type: 'naval' },
  { name: 'Sevastopol', lat: 44.6054, lng: 33.5224, country: 'Crimea', operator: 'Russian Navy', type: 'naval' },
  { name: 'Tartus Naval', lat: 34.8869, lng: 35.8867, country: 'Syria', operator: 'Russian Navy', type: 'naval' },
  { name: 'Khmeimim AB', lat: 35.4009, lng: 35.9486, country: 'Syria', operator: 'RuAF', type: 'air' },
  { name: 'Murmansk (Northern Fleet)', lat: 68.9585, lng: 33.0827, country: 'Russia', operator: 'Russian Navy', type: 'naval' },
  { name: 'Vladivostok (Pacific Fleet)', lat: 43.1056, lng: 131.8735, country: 'Russia', operator: 'Russian Navy', type: 'naval' },
  { name: 'Engels AB', lat: 51.4833, lng: 46.2000, country: 'Russia', operator: 'RuAF', type: 'air' },
  // China
  { name: 'Yulin Naval (Hainan)', lat: 18.2267, lng: 109.5500, country: 'China', operator: 'PLAN', type: 'naval' },
  { name: 'Fiery Cross Reef', lat: 9.5500, lng: 112.8833, country: 'SCS', operator: 'PLA', type: 'joint' },
  { name: 'Subi Reef', lat: 10.9200, lng: 114.0833, country: 'SCS', operator: 'PLA', type: 'joint' },
  { name: 'Mischief Reef', lat: 9.9167, lng: 115.5333, country: 'SCS', operator: 'PLA', type: 'joint' },
  { name: 'Djibouti Support Base', lat: 11.5900, lng: 43.0700, country: 'Djibouti', operator: 'PLA', type: 'naval' },
  // NATO Europe
  { name: 'RAF Lakenheath', lat: 52.4093, lng: 0.5610, country: 'UK', operator: 'USAF', type: 'air' },
  { name: 'Ämari AB', lat: 59.2603, lng: 24.2086, country: 'Estonia', operator: 'NATO', type: 'air' },
  { name: 'Redzikowo', lat: 54.4753, lng: 17.1000, country: 'Poland', operator: 'NATO', type: 'missile' },
  { name: 'Deveselu', lat: 44.0667, lng: 24.2833, country: 'Romania', operator: 'NATO', type: 'missile' },
  // Middle East
  { name: 'Prince Sultan AB', lat: 24.0600, lng: 47.5800, country: 'Saudi Arabia', operator: 'RSAF/USAF', type: 'air' },
  { name: 'Nevatim AB', lat: 31.2083, lng: 34.9378, country: 'Israel', operator: 'IAF', type: 'air' },
  { name: 'Hatzerim AB', lat: 31.2350, lng: 34.6622, country: 'Israel', operator: 'IAF', type: 'air' },
  // India
  { name: 'INS Kadamba', lat: 14.8019, lng: 74.0553, country: 'India', operator: 'Indian Navy', type: 'naval' },
  { name: 'Andaman & Nicobar', lat: 11.6234, lng: 92.7265, country: 'India', operator: 'Indian Armed Forces', type: 'joint' },
  // Iran
  { name: 'Bandar Abbas', lat: 27.1832, lng: 56.2666, country: 'Iran', operator: 'IRIN', type: 'naval' },
  { name: 'Isfahan AFB', lat: 32.7500, lng: 51.8667, country: 'Iran', operator: 'IRIAF', type: 'air' },
  // Others
  { name: 'Changi Naval', lat: 1.3667, lng: 104.0000, country: 'Singapore', operator: 'RSN', type: 'naval' },
  { name: 'HMAS Stirling', lat: -32.2333, lng: 115.6833, country: 'Australia', operator: 'RAN', type: 'naval' },
];

// ============================================================
// UNDERSEA CABLES — Major routes
// ============================================================
export const UNDERSEA_CABLES: UnderseaCable[] = [
  // Trans-Atlantic
  { name: 'MAREA', coordinates: [[39.1,-74.8],[37.0,-25.0],[43.3,-2.9]], owners: 'Microsoft/Meta', lengthKm: 6600 },
  { name: 'Grace Hopper', coordinates: [[39.5,-74.1],[51.0,1.3],[42.5,-2.5]], owners: 'Google', lengthKm: 6250 },
  { name: 'Dunant', coordinates: [[40.5,-73.8],[47.0,-3.5]], owners: 'Google', lengthKm: 6400 },
  { name: 'Amitié', coordinates: [[40.3,-73.9],[47.5,-3.2],[51.8,4.5]], owners: 'Google/Meta/Vodafone', lengthKm: 6800 },
  { name: 'AEC-1 (Atlantic Express)', coordinates: [[39.5,-74.5],[51.5,-9.8],[43.3,-2.5]], owners: 'Aqua Comms', lengthKm: 5500 },
  { name: 'Havfrue/AEC-2', coordinates: [[40.1,-73.9],[57.0,8.5],[55.6,13.0]], owners: 'Aqua Comms/Google', lengthKm: 7200 },
  { name: 'TAT-14', coordinates: [[40.9,-72.7],[50.7,-1.5],[53.5,8.0],[57.7,11.9]], owners: 'Consortium', lengthKm: 15400 },
  { name: 'AC-1 (Atlantic Crossing)', coordinates: [[40.7,-73.8],[50.6,-1.6],[53.5,6.7]], owners: 'Telia/GTT', lengthKm: 14000 },
  // Trans-Pacific
  { name: 'PLCN (Pacific Light)', coordinates: [[33.7,-118.3],[22.3,114.1]], owners: 'Google/Meta', lengthKm: 12800 },
  { name: 'Japan-US Cable', coordinates: [[34.7,137.0],[33.7,-118.3]], owners: 'NTT/KDDI', lengthKm: 21000 },
  { name: 'FASTER', coordinates: [[35.3,139.3],[45.5,-124.0]], owners: 'Google/KDDI/SingTel', lengthKm: 11600 },
  { name: 'SJC (Southeast Asia-Japan)', coordinates: [[1.3,103.8],[22.3,114.1],[35.6,139.7]], owners: 'Consortium', lengthKm: 8900 },
  { name: 'APG (Asia Pacific Gateway)', coordinates: [[1.3,103.8],[10.8,106.6],[22.3,114.1],[25.0,121.5],[35.7,139.7]], owners: 'Consortium', lengthKm: 10400 },
  { name: 'Curie', coordinates: [[33.7,-118.3],[-33.0,-71.6]], owners: 'Google', lengthKm: 10476 },
  { name: 'Southern Cross NEXT', coordinates: [[-33.8,151.2],[-36.8,174.8],[-33.4,-70.6],[33.7,-118.3]], owners: 'Spark/Telstra/Verizon', lengthKm: 15840 },
  // Mediterranean
  { name: 'SEA-ME-WE 6', coordinates: [[1.3,103.8],[13.1,80.3],[25.0,55.3],[30.0,32.3],[38.0,23.7],[43.3,5.4]], owners: 'Consortium', lengthKm: 19200 },
  { name: 'AAE-1 (Asia Africa Europe)', coordinates: [[1.3,103.8],[13.0,80.3],[25.0,55.3],[12.6,43.1],[30.0,32.3],[36.8,10.2],[38.7,-9.1],[43.3,5.4]], owners: 'Consortium', lengthKm: 25000 },
  // Africa
  { name: '2Africa', coordinates: [[-33.9,18.4],[-4.3,15.3],[6.5,3.4],[14.7,-17.4],[33.6,-7.6],[36.8,10.2],[30.1,32.3],[25.0,55.3],[1.3,103.8]], owners: 'Meta', lengthKm: 45000 },
  { name: 'Equiano', coordinates: [[38.7,-9.1],[28.0,-15.5],[6.5,3.4],[-4.3,15.3],[-33.9,18.4]], owners: 'Google', lengthKm: 12000 },
  // Asia-Middle East
  { name: 'FLAG (Fiber Optic Link)', coordinates: [[51.5,-0.1],[38.0,23.7],[30.1,32.3],[25.0,55.3],[22.3,72.8],[1.3,103.8],[35.6,139.7]], owners: 'Global Cloud Xchange', lengthKm: 28000 },
  // Arctic
  { name: 'Far North Fiber', coordinates: [[60.4,5.3],[64.1,-21.9],[63.8,-20.3],[70.0,-50.0],[69.0,33.0],[35.7,139.7]], owners: 'Far North Digital/Cinia', lengthKm: 16500 },
  // South America
  { name: 'EllaLink', coordinates: [[38.7,-9.1],[28.1,-15.4],[-2.5,-44.3],[-23.0,-43.2]], owners: 'EllaLink', lengthKm: 6000 },
  { name: 'SACS (South Atlantic)', coordinates: [[-8.8,13.2],[-2.5,-44.3]], owners: 'Angola Cables', lengthKm: 6200 },
  // Strait chokepoints
  { name: 'Strait of Hormuz cables', coordinates: [[26.5,56.0],[25.5,55.5],[25.0,54.5]], owners: 'Various', lengthKm: 300 },
  { name: 'Strait of Malacca cables', coordinates: [[1.3,103.8],[2.5,101.5],[5.3,100.3]], owners: 'Various', lengthKm: 900 },
];
