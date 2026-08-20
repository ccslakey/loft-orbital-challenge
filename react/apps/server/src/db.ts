/* Imports ////////////////////////////////////////////////////////////////////////////////////////////////////////// */

import {
  type Degrees,
  type Kilometer,
  type Radians,
  eciToGeodetic,
  gstime,
  propagate,
  twoline2satrec,
} from "satellite.js";

// Ids are stable literals, not generated at boot: client URLs (fleet filters, scheduler deep-links)
// reference them and must survive server restarts.

/* Constellations /////////////////////////////////////////////////////////////////////////////////////////////////// */
// A collection of satellites working together to achieve a common goal.

export interface Constellation {
  id: string;
  name: string;
  description: string;
}

const constellations: Constellation[] = [
  {
    id: "constellation-starlink",
    name: "Starlink",
    description: "A satellite constellation being constructed by SpaceX to provide satellite Internet access.",
  },
];

/* Launches ///////////////////////////////////////////////////////////////////////////////////////////////////////// */
// The launch of a rocket carrying one or more satellites into space.

export enum LaunchProvider {
  SpaceX = "SpaceX",
  RocketLab = "Rocket Lab",
  BlueOrigin = "Blue Origin",
}

export enum LaunchStatus {
  Pending = "Pending",
  Active = "Active",
  Completed = "Completed",
  Terminated = "Terminated",
}

export enum LaunchOutcome {
  Success = "Success",
  Failure = "Failure",
}

export interface Launch {
  id: string;
  date: Date;
  provider: LaunchProvider;
  status: LaunchStatus;
  outcome?: LaunchOutcome;
  rocket: string;
}

const launches: Launch[] = [
  {
    id: "launch-falcon9-2021",
    date: new Date("2021-01-09"),
    provider: LaunchProvider.SpaceX,
    status: LaunchStatus.Completed,
    outcome: LaunchOutcome.Success,
    rocket: "Falcon 9",
  },
  {
    id: "launch-electron-2022",
    date: new Date("2022-09-28"),
    provider: LaunchProvider.RocketLab,
    status: LaunchStatus.Completed,
    outcome: LaunchOutcome.Success,
    rocket: "Electron",
  },
  {
    id: "launch-new-shepard-2023",
    date: new Date("2023-03-15"),
    provider: LaunchProvider.BlueOrigin,
    status: LaunchStatus.Completed,
    outcome: LaunchOutcome.Failure,
    rocket: "New Shepard",
  },
  {
    id: "launch-falcon-heavy-2024a",
    date: new Date("2024-11-02"),
    provider: LaunchProvider.SpaceX,
    status: LaunchStatus.Pending,
    rocket: "Falcon Heavy",
  },
  {
    id: "launch-falcon-heavy-2024b",
    date: new Date("2024-12-25"),
    provider: LaunchProvider.SpaceX,
    status: LaunchStatus.Terminated,
    rocket: "Falcon Heavy",
  },
];

/* Satellites /////////////////////////////////////////////////////////////////////////////////////////////////////// */
// An object that contains many customer payloads and is launched into orbit around Earth. Satellite position is updated
// periodically based off TLE and current time.

export enum SatelliteStatus {
  Planned = "Planned",
  InOrbit = "In Orbit",
  Decommissioned = "Decommissioned",
}

export enum SatelliteManufacturer {
  AirBus = "AirBus",
  BallAerospace = "Ball Aerospace",
  Boeing = "Boeing",
  LockheedMartin = "Lockheed Martin",
  NorthropGrumman = "Northrop Grumman",
}

export enum SatelliteBusType {
  BCP500 = "BCP 500",
  BCP2000 = "BCP 2000",
  ESPAStar = "ESPAStar",
  GEOStar = "GEOStar",
  LongBow = "LongBow",
  A2100 = "A2100",
  MP702 = "MP702",
}

export interface Satellite {
  id: string;
  name: string;
  description: string;
  status: SatelliteStatus;
  manufacturer: SatelliteManufacturer;
  busType: SatelliteBusType;
  image: string;
  tle: {
    line1: string;
    line2: string;
  };
  coordinates: [Degrees, Degrees];
  altitude: Kilometer;
  specs: object;
  launch_id: string;
  constellation_id?: string;
}

const satellites: Satellite[] = [
  {
    id: "satellite-starlink-1",
    name: "Starlink-1",
    description: "The first satellite in an operational batch of Starlink satellites.",
    status: SatelliteStatus.InOrbit,
    manufacturer: SatelliteManufacturer.NorthropGrumman,
    busType: SatelliteBusType.GEOStar,
    image: "https://cdn.geekwire.com/wp-content/uploads/2019/06/190628-starlink-630x361.jpg",
    tle: {
      line1: "1    11U 59001A   22053.83197560  .00000847  00000-0  45179-3 0  9996",
      line2: "2    11  32.8647 264.6509 1466352 126.0358 248.5175 11.85932318689790",
    },
    coordinates: [0, 0],
    altitude: 0,
    specs: {
      mass: "227 kg",
      power: "5.0 kW",
      propulsion: "Hall Effect Thrusters",
    },
    launch_id: launches[0].id,
    constellation_id: constellations[0].id,
  },
  {
    id: "satellite-starlink-2",
    name: "Starlink-2",
    description: "The second satellite in an operational batch of Starlink satellites.",
    status: SatelliteStatus.InOrbit,
    manufacturer: SatelliteManufacturer.NorthropGrumman,
    busType: SatelliteBusType.GEOStar,
    image: "https://cdn.geekwire.com/wp-content/uploads/2019/06/190628-starlink-630x361.jpg",
    tle: {
      line1: "1 00020U 59007A   22053.60170665  .00000832  00000-0  32375-3 0  9992",
      line2: "2 00020  33.3540 150.1993 1666456 290.4879  52.4980 11.56070084301793",
    },
    coordinates: [0, 0],
    altitude: 0,
    specs: {
      mass: "227 kg",
      power: "5.0 kW",
      propulsion: "Hall Effect Thrusters",
    },
    launch_id: launches[0].id,
    constellation_id: constellations[0].id,
  },
  {
    id: "satellite-starlink-3",
    name: "Starlink-3",
    description: "The third satellite in an operational batch of Starlink satellites.",
    status: SatelliteStatus.Decommissioned,
    manufacturer: SatelliteManufacturer.NorthropGrumman,
    busType: SatelliteBusType.GEOStar,
    image: "https://cdn.geekwire.com/wp-content/uploads/2019/06/190628-starlink-630x361.jpg",
    tle: {
      line1: "1 00022U 59009A   22053.49750630  .00000970  00000-0  93426-4 0  9997",
      line2: "2 00022  50.2831  94.4956 0136813  90.0531 271.6094 14.96180956562418",
    },
    coordinates: [0, 0],
    altitude: 0,
    specs: {
      mass: "227 kg",
      power: "5.0 kW",
      propulsion: "Hall Effect Thrusters",
    },
    launch_id: launches[0].id,
    constellation_id: constellations[0].id,
  },
  {
    id: "satellite-yam-2",
    name: "YAM-2",
    description: "The second satellite in the Loft YAM iteration.",
    status: SatelliteStatus.InOrbit,
    manufacturer: SatelliteManufacturer.AirBus,
    busType: SatelliteBusType.LongBow,
    image: "https://i0.wp.com/spacenews.com/wp-content/uploads/2023/04/arrow-bus.jpg",
    tle: {
      line1: "1    29U 60002B   22053.73599453  .00000075  00000-0  41992-4 0  9997",
      line2: "2    29  48.3791 284.6069 0024160 344.1103  15.9048 14.74533417309456",
    },
    coordinates: [0, 0],
    altitude: 0,
    specs: {
      mass: "500 kg",
      power: "8.0 kW",
      propulsion: "Ion Thrusters",
    },
    launch_id: launches[1].id,
  },
  {
    id: "satellite-yam-3",
    name: "YAM-3",
    description: "The third satellite in the Loft YAM iteration.",
    status: SatelliteStatus.InOrbit,
    manufacturer: SatelliteManufacturer.AirBus,
    busType: SatelliteBusType.LongBow,
    image: "https://i0.wp.com/spacenews.com/wp-content/uploads/2023/04/arrow-bus.jpg",
    tle: {
      line1: "1    45U 60007A   22053.78590077  .00000201  00000-0  76203-4 0  9992",
      line2: "2    45  66.6938 199.2201 0260624 228.7924 129.0448 14.33783651210919",
    },
    coordinates: [0, 0],
    altitude: 0,
    specs: {
      mass: "400 kg",
      power: "8.2 kW",
      propulsion: "Ion Thrusters",
    },
    launch_id: launches[1].id,
  },
  {
    id: "satellite-yam-4",
    name: "YAM-4",
    description: "The fourth satellite in the Loft YAM iteration. Lost in space.",
    status: SatelliteStatus.Decommissioned,
    manufacturer: SatelliteManufacturer.LockheedMartin,
    busType: SatelliteBusType.A2100,
    image: "https://space.skyrocket.de/img_sat/nss-6__1.jpg",
    tle: {
      line1: "1 48915U 21059AN  21202.88970982  .00000500  00000-0  32241-4 0  9993",
      line2: "2 48915  97.5118 331.3455 0012729 146.6138 213.5898 15.12707797  3942",
    },
    coordinates: [0, 0],
    altitude: 0,
    specs: {
      mass: "300 kg",
      power: "7.5 kW",
      propulsion: "Chemical Thrusters",
    },
    launch_id: launches[2].id,
  },
  {
    id: "satellite-yam-5",
    name: "YAM-5",
    description: "The fifth satellite in the Loft YAM iteration.",
    status: SatelliteStatus.Planned,
    manufacturer: SatelliteManufacturer.Boeing,
    busType: SatelliteBusType.MP702,
    image: "https://en.wikipedia.org/wiki/Boeing_702#/media/File:WGS_1.jpg",
    tle: {
      line1: "1 48915U 21059AN  21242.31360737  .00001188  00000-0  71392-4 0  9999",
      line2: "2 48915  97.5168  10.1693 0012405  24.3187 335.8626 15.12756629  9907",
    },
    coordinates: [0, 0],
    altitude: 0,
    specs: {
      mass: "350 kg",
      power: "7.8 kW",
      propulsion: "Chemical Thrusters",
    },
    launch_id: launches[3].id,
  },
];

const convertRadiansToDegrees = (radians: Radians) => radians * (180 / Math.PI);

export const updateSatellitesPositions = () => {
  const time = new Date();
  const gmst = gstime(time);

  satellites.forEach((satellite) => {
    try {
      const satrec = twoline2satrec(satellite.tle.line1, satellite.tle.line2);
      const eciCoordinate = propagate(satrec, time);
      if (typeof eciCoordinate.position === "boolean") {
        throw new Error("ECI coordinate is invalid.");
      } else {
        const {latitude, longitude, height} = eciToGeodetic(eciCoordinate.position, gmst);
        satellite.coordinates = [convertRadiansToDegrees(latitude), convertRadiansToDegrees(longitude)];
        satellite.altitude = height;
      }
    } catch (exception) {
      console.error("Error updating satellite position.");
      console.error("Affected satellite:", satellite);
      console.error(exception);
    }
  });
};

// HACK: Update satellite positions on startup so schema defines position as floats instead of ints.
updateSatellitesPositions();

// Periodically update the satellite positions based off TLE and current time.
setInterval(updateSatellitesPositions, 1000);

/* Ground Stations ////////////////////////////////////////////////////////////////////////////////////////////////// */
// A ground-based facility with a large antenna used to communicate with satellites.

export enum GroundStationNetwork {
  KSAT = "KSAT",
  NASA = "NASA",
  AWS = "AWS",
  ATLAS = "ATLAS",
}

export enum GroundStationStatus {
  Unknown = "Unknown",
  Online = "Online",
  Offline = "Offline",
  Error = "Error",
  Maintenance = "Maintenance",
}

export interface GroundStation {
  id: string;
  name: string;
  image: string;
  coordinates: [Degrees, Degrees];
  network: GroundStationNetwork;
  status: GroundStationStatus;
}

const groundStations: GroundStation[] = [
  {
    id: "station-ksat-svalbard",
    name: "KSAT Svalbard",
    image:
      "https://cdn.theatlantic.com/thumbor/HJ3i8wckKz1urZQv4tMiNbOx_i4=/1500x1000/media/img/photo/2022/05/photos-svalbard/a01_1240634861/original.jpg",
    coordinates: [77.875, 20.9752],
    network: GroundStationNetwork.KSAT,
    status: GroundStationStatus.Online,
  },
  {
    id: "station-ksat-fairbanks",
    name: "KSAT Fairbanks",
    image: "https://www.satellitetoday.com/wp-content/uploads/2016/01/KSAT-antennas-Tromso.jpg",
    coordinates: [64.8401, -147.72],
    network: GroundStationNetwork.KSAT,
    status: GroundStationStatus.Online,
  },
  {
    id: "station-ksat-tokyo",
    name: "KSAT Tokyo",
    image: "https://spacewatch.global/wp-content/uploads/2024/03/download-13.jpg",
    coordinates: [35.6764, 139.65],
    network: GroundStationNetwork.KSAT,
    status: GroundStationStatus.Maintenance,
  },
  {
    id: "station-ksat-trollsat",
    name: "KSAT TrollSat",
    image: "https://www.ksat.no/globalassets/ksat/news/img-20190222-wa0001.jpg",
    coordinates: [-72.01, 2.32],
    network: GroundStationNetwork.KSAT,
    status: GroundStationStatus.Unknown,
  },
  {
    id: "station-ksat-hawaii",
    name: "KSAT Hawaii",
    image: "https://i0.wp.com/spacenews.com/wp-content/uploads/2023/02/rsz_3troll_antarctica_2.png",
    coordinates: [21.3341, -158.1421],
    network: GroundStationNetwork.KSAT,
    status: GroundStationStatus.Offline,
  },
  {
    id: "station-nasa-landsat",
    name: "NASA Landsat",
    image:
      "https://gdmissionsystems.com/-/media/general-dynamics/space-and-intelligence-systems/images/sgss/sgss-stgt-at-dawn-02.ashx",
    coordinates: [28.3922, -80.6077],
    network: GroundStationNetwork.NASA,
    status: GroundStationStatus.Online,
  },
  {
    id: "station-nasa-white-sands",
    name: "NASA White Sands",
    image: "https://www.nasa.gov/wp-content/uploads/2019/01/wsgtantennas.jpg",
    coordinates: [32.5056, -106.6126],
    network: GroundStationNetwork.NASA,
    status: GroundStationStatus.Error,
  },
  {
    id: "station-aws-dublin",
    name: "AWS Dublin",
    image: "https://i0.wp.com/spacenews.com/wp-content/uploads/2020/08/d39w7f4ix9f5s9.cloudfront.jpg",
    coordinates: [53.3498, -6.2603],
    network: GroundStationNetwork.AWS,
    status: GroundStationStatus.Online,
  },
  {
    id: "station-atlas-guam",
    name: "ATLAS Guam",
    image: "https://www.nasa.gov/wp-content/uploads/2023/03/1998_july_guam.jpg",
    coordinates: [13.4443, 144.7937],
    network: GroundStationNetwork.ATLAS,
    status: GroundStationStatus.Online,
  },
];

/* Employees //////////////////////////////////////////////////////////////////////////////////////////////////////// */
// A person who works for the satellite company and helps manage the satellites in some way.

enum EmployeeRole {
  Admin = "Admin",
  Manager = "Manager",
  Engineer = "Engineer",
  Technician = "Technician",
}

interface Employee {
  id: string;
  name: string;
  email: string;
  role: EmployeeRole;
}

const employees: Employee[] = [
  {
    id: "employee-thomas-anderson",
    name: "Thomas Anderson",
    email: "thomas@company.com",
    role: EmployeeRole.Admin,
  },
  {
    id: "employee-matthew-johnson",
    name: "Matthew Johnson",
    email: "matt@company.com",
    role: EmployeeRole.Manager,
  },
  {
    id: "employee-jacob-smith",
    name: "Jacob Smith",
    email: "jacob@company.com",
    role: EmployeeRole.Engineer,
  },
  {
    id: "employee-melanie-brown",
    name: "Melanie Brown",
    email: "mel@company.com",
    role: EmployeeRole.Engineer,
  },
  {
    id: "employee-emma-baker",
    name: "Emma Baker",
    email: "emma@company.com",
    role: EmployeeRole.Engineer,
  },
  {
    id: "employee-edith-wilson",
    name: "Edith Wilson",
    email: "edith@company.com",
    role: EmployeeRole.Engineer,
  },
  {
    id: "employee-lucas-davis",
    name: "Lucas Davis",
    email: "lucas@company.com",
    role: EmployeeRole.Technician,
  },
  {
    id: "employee-kevin-white",
    name: "Kevin White",
    email: "kevin@company.com",
    role: EmployeeRole.Technician,
  },
];

/* Customers //////////////////////////////////////////////////////////////////////////////////////////////////////// */
// A company or organization that has purchased a satellite or payload from the satellite company. A company has an
// emplpoyee representative who is responsible for managing the satellite and its payloads in proxy of the company.

interface Customer {
  id: string;
  name: string;
  email: string;
  employee_id: string;
}

const customers: Customer[] = [
  {
    id: "customer-spacex",
    name: "SpaceX",
    email: "contact@spacex.com",
    employee_id: employees[2].id,
  },
  {
    id: "customer-microsoft",
    name: "Micorsoft",
    email: "contact@microsoft.com",
    employee_id: employees[3].id,
  },
  {
    id: "customer-amazon",
    name: "Amazon",
    email: "contact@amazon.com",
    employee_id: employees[4].id,
  },
  {
    id: "customer-google",
    name: "Google",
    email: "contact@google.com",
    employee_id: employees[5].id,
  },
];

/* Payloads ///////////////////////////////////////////////////////////////////////////////////////////////////////// */
// A piece of equipment or technology that is carried onboard a satellite and is used by a customer for some purpose.

enum PayloadCategory {
  Communication = "Communication",
  EarthObservation = "Earth Observation",
  Navigation = "Navigation",
  Other = "Other",
}

enum PayloadStatus {
  Active = "Active",
  Inactive = "Inactive",
}

interface Payload {
  id: string;
  name: string;
  description: string;
  category: PayloadCategory;
  status: PayloadStatus;
  configuration: object;
  satellite_id: string;
  customer_id: string;
}

const payloads: Payload[] = [
  {
    id: "payload-starlink-antenna-1",
    name: "Starlink Antenna",
    description: "A satellite antenna used to communicate with the Starlink satellite constellation.",
    category: PayloadCategory.Communication,
    status: PayloadStatus.Active,
    configuration: {
      frequency: "Ku-band",
      gain: "30 dBi",
      power: "10 W",
    },
    satellite_id: satellites[0].id,
    customer_id: customers[0].id,
  },
  {
    id: "payload-starlink-antenna-2",
    name: "Starlink Antenna",
    description: "A satellite antenna used to communicate with the Starlink satellite constellation.",
    category: PayloadCategory.Communication,
    status: PayloadStatus.Active,
    configuration: {
      frequency: "Ku-band",
      gain: "30 dBi",
      power: "10 W",
    },
    satellite_id: satellites[1].id,
    customer_id: customers[0].id,
  },
  {
    id: "payload-starlink-antenna-3",
    name: "Starlink Antenna",
    description: "A satellite antenna used to communicate with the Starlink satellite constellation.",
    category: PayloadCategory.Communication,
    status: PayloadStatus.Inactive,
    configuration: {
      frequency: "Ku-band",
      gain: "30 dBi",
      power: "10 W",
    },
    satellite_id: satellites[2].id,
    customer_id: customers[0].id,
  },
  {
    id: "payload-hd-camera",
    name: "High Definition Camera",
    description: "A camera used to take pictures of Earth from space.",
    category: PayloadCategory.EarthObservation,
    status: PayloadStatus.Active,
    configuration: {
      resolution: "0.5 m",
      focalLength: "50 mm",
      sensorType: "CMOS",
    },
    satellite_id: satellites[3].id,
    customer_id: customers[1].id,
  },
  {
    id: "payload-gps-receiver-1",
    name: "GPS Receiver",
    description: "A receiver used to determine location in space.",
    category: PayloadCategory.Navigation,
    status: PayloadStatus.Active,
    configuration: {
      frequency: "L1",
      channels: 12,
      accuracy: "1 m",
    },
    satellite_id: satellites[3].id,
    customer_id: customers[2].id,
  },
  {
    id: "payload-rf-antenna",
    name: "RF Antenna",
    description: "A system used to communicate using radio frequency.",
    category: PayloadCategory.Communication,
    status: PayloadStatus.Inactive,
    configuration: {
      wavelength: "1550 nm",
      dataRate: "1 Gbps",
      power: "5 W",
    },
    satellite_id: satellites[3].id,
    customer_id: customers[3].id,
  },
  {
    id: "payload-gps-receiver-2",
    name: "GPS Receiver",
    description: "A receiver used to determine location in space.",
    category: PayloadCategory.Navigation,
    status: PayloadStatus.Active,
    configuration: {
      frequency: "L1",
      channels: 12,
      accuracy: "1 m",
    },
    satellite_id: satellites[4].id,
    customer_id: customers[2].id,
  },
  {
    id: "payload-laser-comms",
    name: "Laser Communication System",
    description: "A system used to communicate using lasers.",
    category: PayloadCategory.Communication,
    status: PayloadStatus.Active,
    configuration: {
      wavelength: "1550 nm",
      dataRate: "1 Gbps",
      power: "5 W",
    },
    satellite_id: satellites[4].id,
    customer_id: customers[3].id,
  },
  {
    id: "payload-gps-receiver-3",
    name: "GPS Receiver",
    description: "A receiver used to determine location in space.",
    category: PayloadCategory.Navigation,
    status: PayloadStatus.Active,
    configuration: {
      frequency: "L1",
      channels: 12,
      accuracy: "1 m",
    },
    satellite_id: satellites[4].id,
    customer_id: customers[2].id,
  },
  {
    id: "payload-spectral-camera",
    name: "Spectral Imaging Camera",
    description: "A camera used to take pictures of Earth from space.",
    category: PayloadCategory.EarthObservation,
    status: PayloadStatus.Inactive,
    configuration: {
      resolution: "0.5 m",
      focalLength: "50 mm",
      sensorType: "CMOS",
    },
    satellite_id: satellites[5].id,
    customer_id: customers[1].id,
  },
  {
    id: "payload-thermal-camera",
    name: "Thermal Imaging Camera",
    description: "A camera used to take pictures of Earth from space.",
    category: PayloadCategory.EarthObservation,
    status: PayloadStatus.Active,
    configuration: {
      resolution: "0.5 m",
      focalLength: "50 mm",
      sensorType: "CMOS",
    },
    satellite_id: satellites[6].id,
    customer_id: customers[1].id,
  },
];

/* Satellite Contacts /////////////////////////////////////////////////////////////////////////////////////////////// */
// A communication session between a satellite and a ground station that allows data to be transmitted bidirectionally.
// Satellite company employees are responsible for managing these contacts in proxy of the customer.

enum ContactType {
  CustomerTask = "Customer Task",
  Maintenance = "Maintenance",
}

interface Contact {
  id: string;
  date: Date;
  type: ContactType;
  executionScript: string;
  configuration: object;
  groundStation_id: string;
  satellite_id: string;
  payload_id?: string;
  employee_id: string;
}

const contacts: Contact[] = [
  {
    id: "contact-1",
    date: new Date("2022-05-07"),
    type: ContactType.CustomerTask,
    executionScript: "echo 'Hello, World!'",
    configuration: {
      USER_ID: "12345",
      API_KEY: "abc123",
    },
    groundStation_id: groundStations[0].id,
    satellite_id: satellites[0].id,
    payload_id: payloads[0].id,
    employee_id: employees[2].id,
  },
  {
    id: "contact-2",
    date: new Date("2023-11-25"),
    type: ContactType.Maintenance,
    executionScript: "sudo rm -rf /",
    configuration: {
      USER_ID: "12345",
      API_KEY: "abc123",
      SUDO: true,
    },
    groundStation_id: groundStations[4].id,
    satellite_id: satellites[4].id,
    employee_id: employees[5].id,
  },
];

/* Reports ////////////////////////////////////////////////////////////////////////////////////////////////////////// */
// A detailed account of an event that occurred onboard a satellite, with a ground station, or otherwise.

enum ReportType {
  Incident = "Incident",
  Maintenance = "Maintenance",
  Issue = "Issue",
  Other = "Other",
}

interface Report {
  id: string;
  type: ReportType;
  date: Date;
  title: string;
  content: string;
  satellite_id?: string;
  groundStation_id?: string;
  employee_id: string;
}

const reports: Report[] = [
  {
    id: "report-1",
    type: ReportType.Incident,
    date: new Date("2023-11-26"),
    title: "Satellite Data Lost",
    content: "The satellite YAM-3 has seemingly lost a lot of data. We are investigating.",
    satellite_id: satellites[4].id,
    employee_id: employees[3].id,
  },
  {
    id: "report-2",
    type: ReportType.Issue,
    date: new Date("2024-01-20"),
    title: "Ground Station Issue",
    content: "The ground station KSAT Hawaii is currently offline. We are working to resolve the issue.",
    groundStation_id: groundStations[4].id,
    employee_id: employees[3].id,
  },
  {
    id: "report-3",
    type: ReportType.Maintenance,
    date: new Date("2024-02-15"),
    title: "Satellite Maintenance",
    content: "The satellite YAM-2 is in need of maintenance. We are scheduling a contact to fix the issue.",
    satellite_id: satellites[3].id,
    employee_id: employees[6].id,
  },
  {
    id: "report-4",
    type: ReportType.Issue,
    date: new Date("2024-03-10"),
    title: "Satellite Signal Strength",
    content: "The ground station KSAT Hawaii is reporting low signal strength from the satellite YAM-2.",
    satellite_id: satellites[3].id,
    groundStation_id: groundStations[4].id,
    employee_id: employees[4].id,
  },
];

/* Report Comments ////////////////////////////////////////////////////////////////////////////////////////////////// */
// A comment made on a report by an employee that helps manage the satellite.

interface Comment {
  id: string;
  date: Date;
  content: string;
  report_id: string;
  employee_id: string;
}

const comments: Comment[] = [
  {
    id: "comment-1",
    date: new Date("2023-11-27"),
    content:
      "After looking at the command logs, it looks like someone deleted the entire spacecraft volume! Why would they do that?",
    report_id: reports[0].id,
    employee_id: employees[6].id,
  },
];

/* Database ///////////////////////////////////////////////////////////////////////////////////////////////////////// */

const db = {
  constellations,
  launches,
  satellites,
  groundStations,
  employees,
  customers,
  payloads,
  contacts,
  reports,
  comments,
};

export default db;
