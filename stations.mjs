// Station order follows the TTC's November 2026 service summary.
// Coordinates are schematic and use the same point for all lines at a station.
const line1 = [
  'Vaughan Metropolitan Centre', 'Highway 407', 'Pioneer Village', 'York University', 'Finch West',
  'Downsview Park', 'Sheppard West', 'Wilson', 'Yorkdale', 'Lawrence West', 'Glencairn', 'Cedarvale',
  'St Clair West', 'Dupont', 'Spadina', 'St George', 'Museum', 'Queen’s Park', 'St Patrick',
  'Osgoode', 'St Andrew', 'Union', 'King', 'Queen', 'TMU', 'College', 'Wellesley',
  'Bloor–Yonge', 'Rosedale', 'Summerhill', 'St Clair', 'Davisville', 'Eglinton',
  'Lawrence', 'York Mills', 'Sheppard–Yonge', 'North York Centre', 'Finch',
];
const line2 = [
  'Kipling', 'Islington', 'Royal York', 'Old Mill', 'Jane', 'Runnymede', 'High Park',
  'Keele', 'Dundas West', 'Lansdowne', 'Dufferin', 'Ossington', 'Christie', 'Bathurst',
  'Spadina', 'St George', 'Bay (Yorkville)', 'Bloor–Yonge', 'Sherbourne', 'Castle Frank',
  'Broadview', 'Chester', 'Pape', 'Donlands', 'Greenwood', 'Coxwell', 'Woodbine',
  'Main Street', 'Victoria Park', 'Warden', 'Kennedy',
];
const line4 = ['Sheppard–Yonge', 'Bayview', 'Bessarion', 'Leslie', 'Don Mills'];
const line5 = [
  'Mount Dennis', 'Keelesdale', 'Caledonia', 'Fairbank', 'Oakwood', 'Cedarvale',
  'Forest Hill', 'Chaplin', 'Avenue', 'Eglinton', 'Mount Pleasant', 'Leaside', 'Laird',
  'Sunnybrook Park', 'Don Valley', 'Aga Khan Park & Museum', 'Wynford', 'Sloane',
  'O’Connor', 'Pharmacy', 'Hakimi Lebovic', 'Golden Mile', 'Birchmount', 'Ionview', 'Kennedy',
];
const line6 = [
  'Humber College', 'Westmore', 'Martin Grove', 'Albion', 'Stevenson', 'Mount Olive',
  'Rowntree Mills', 'Pearldale', 'Duncanwoods', 'Milvan Rumike', 'Emery', 'Signet Arrow',
  'Norfinch Oakdale', 'Jane and Finch', 'Driftwood', 'Tobermory', 'Sentinel', 'Finch West',
];

export const mapSize = { width: 1060, height: 674 };
export const lines = [
  { number: 1, name: 'Yonge–University', color: '#ffd15e', names: line1 },
  { number: 2, name: 'Bloor–Danforth', color: '#64e4ae', names: line2 },
  { number: 4, name: 'Sheppard', color: '#dcacff', names: line4 },
  { number: 5, name: 'Eglinton', color: '#ffa16e', names: line5 },
  { number: 6, name: 'Finch West', color: '#a7bfda', names: line6 },
];

const line1Y = [
  44, 74, 103, 131, 157, 181, 205, 229, 253, 277, 301, 325, 367, 404, 449, 449,
  478, 506, 534, 562, 590, 625, 590, 562, 534, 506, 478, 449, 424, 399, 374, 350,
  325, 272, 216, 112, 77, 44,
];
const coordinates = [
  line1Y.map((y, index) => [index <= 14 ? 478 : index <= 20 ? 509 : index === 21 ? 540 : 571, y]),
  line2.map((_, index) => [44 + index * 31, index === 30 ? 387 : index === 29 ? 420 : 449]),
  line4.map((_, index) => [571 + index * 85, 112]),
  [288, 326, 364, 402, 440, 478, 501, 524, 548, 571, 596, 621, 646, 671, 696,
    721, 746, 771, 796, 821, 846, 871, 896, 921, 974].map((x, index) => [x, index === 24 ? 387 : 325]),
  line6.map((_, index) => [44 + index * (434 / 17), 157]),
];

export function stationId(name) {
  return name.toLowerCase().replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/-$/, '');
}

const withoutStepFreeAccess = new Set(['King', 'Museum', 'Islington', 'Old Mill']);
export const stations = new Map();
for (const [lineIndex, line] of lines.entries()) {
  line.stops = line.names.map((name, index) => {
    const id = stationId(name);
    if (!stations.has(id)) {
      stations.set(id, {
        id, name, point: coordinates[lineIndex][index],
        stepFree: !withoutStepFreeAccess.has(name), lines: [],
      });
    }
    stations.get(id).lines.push(line.number);
    return id;
  });
}
