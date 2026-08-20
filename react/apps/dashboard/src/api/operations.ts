/* Imports ////////////////////////////////////////////////////////////////////////////////////////////////////////// */

import {graphql} from "@/gql";

/* Shell //////////////////////////////////////////////////////////////////////////////////////////////////////////// */

export const FLEET_SUMMARY_QUERY = graphql(`
  query FleetSummary {
    _allSatellitesMeta {
      count
    }
  }
`);

/* Fleet //////////////////////////////////////////////////////////////////////////////////////////////////////////// */
// json-graphql-server ignores perPage unless page is also sent.

export const SATELLITE_OVERVIEW_QUERY = graphql(`
  query SatelliteOverview($perPage: Int!, $page: Int!) {
    allSatellites(perPage: $perPage, page: $page, sortField: "name", sortOrder: "asc") {
      id
      name
      status
      altitude
      coordinates
      tle
      Constellation {
        id
        name
      }
      Launch {
        id
        date
        status
      }
      Payloads {
        id
        name
        category
        status
        Customer {
          id
          name
        }
      }
    }
  }
`);

export const SATELLITE_DETAIL_QUERY = graphql(`
  query SatelliteDetail($id: ID!) {
    Satellite(id: $id) {
      id
      name
      description
      status
      manufacturer
      busType
      image
      altitude
      coordinates
      tle
      specs
      Constellation {
        id
        name
      }
      Launch {
        id
        date
        rocket
        provider
        status
        outcome
      }
      Payloads {
        id
        name
        status
        Customer {
          id
          name
        }
      }
    }
  }
`);

// Position-cadence fields only, for the 5 s poll; merges into the Satellite entity SATELLITE_DETAIL_QUERY
// rendered once, so description/image/specs are not re-fetched every tick.
export const SATELLITE_POSITION_QUERY = graphql(`
  query SatellitePosition($id: ID!) {
    Satellite(id: $id) {
      id
      status
      altitude
      coordinates
      tle
    }
  }
`);

// Contacts and reports for one satellite, fetched apart from SATELLITE_DETAIL_QUERY so its position poll
// does not re-fetch them every tick. Both normalize into the same Satellite cache entity.
export const SATELLITE_ACTIVITY_QUERY = graphql(`
  query SatelliteActivity($id: ID!) {
    Satellite(id: $id) {
      id
      Contacts {
        id
        date
        type
        GroundStation {
          id
          name
          status
          coordinates
        }
        Payload {
          id
          name
        }
        Employee {
          id
          name
        }
      }
      Reports {
        id
        title
        type
        date
        content
        Employee {
          id
          name
          role
        }
        Comments {
          id
          date
          content
          Employee {
            id
            name
            role
          }
        }
      }
    }
  }
`);

// Lean variant for pages that only propagate positions (MapPage, GroundStationPage); omits Constellation,
// Launch, and Payloads to reduce payload size against a real API with per-field resolver costs.
export const MAP_SATELLITES_QUERY = graphql(`
  query MapSatellites($perPage: Int!, $page: Int!) {
    allSatellites(perPage: $perPage, page: $page, sortField: "name", sortOrder: "asc") {
      id
      name
      status
      altitude
      coordinates
      tle
    }
  }
`);

/* Ground segment /////////////////////////////////////////////////////////////////////////////////////////////////// */

export const GROUND_STATIONS_QUERY = graphql(`
  query GroundStations($perPage: Int!, $page: Int!) {
    allGroundStations(perPage: $perPage, page: $page, sortField: "name", sortOrder: "asc") {
      id
      name
      status
      network
      coordinates
    }
  }
`);

// Stations don't move and their status changes rarely, so one unpolled query carries the site plus its
// contacts and reports (reverse relations), unlike the satellite page's polling/static split.
export const GROUND_STATION_DETAIL_QUERY = graphql(`
  query GroundStationDetail($id: ID!) {
    GroundStation(id: $id) {
      id
      name
      status
      network
      coordinates
      Contacts {
        id
        date
        type
        Satellite {
          id
          name
          status
          tle
        }
        Payload {
          id
          name
        }
        Employee {
          id
          name
        }
      }
      Reports {
        id
        title
        type
        date
        content
        Employee {
          id
          name
          role
        }
        Comments {
          id
          date
          content
          Employee {
            id
            name
            role
          }
        }
      }
    }
  }
`);

/* Contacts ///////////////////////////////////////////////////////////////////////////////////////////////////////// */

export const CONTACTS_QUERY = graphql(`
  query Contacts($perPage: Int!, $page: Int!) {
    allContacts(perPage: $perPage, page: $page, sortField: "date", sortOrder: "desc") {
      id
      date
      type
      Satellite {
        id
        name
        status
        tle
      }
      GroundStation {
        id
        name
        coordinates
      }
      Payload {
        id
        name
        Customer {
          id
          name
        }
      }
      Employee {
        id
        name
        role
      }
    }
  }
`);

export const CREATE_CONTACT = graphql(`
  mutation CreateContact(
    $date: Date!
    $type: String!
    $executionScript: String!
    $configuration: JSON!
    $groundStation_id: ID!
    $satellite_id: ID!
    $payload_id: ID
    $employee_id: ID!
  ) {
    createContact(
      date: $date
      type: $type
      executionScript: $executionScript
      configuration: $configuration
      groundStation_id: $groundStation_id
      satellite_id: $satellite_id
      payload_id: $payload_id
      employee_id: $employee_id
    ) {
      id
      date
      type
      satellite_id
      groundStation_id
    }
  }
`);

/* reports /////////////////////////////////////////////////////////////////////////////////////////////////// */

export const REPORTS_QUERY = graphql(`
  query Reports($perPage: Int!, $page: Int!, $sortField: String!, $sortOrder: String!) {
    allReports(page: $page, perPage: $perPage, sortField: $sortField, sortOrder: $sortOrder) {
      id
      title
      type
      date
      content
      Comments {
        id
        date
        content
        Employee {
          id
          name
          role
        }
      }
      Employee {
        id
        name
        role
      }
      GroundStation {
        id
        name
        status
      }
      Satellite {
        id
        name
        status
      }
    }
  }
`);

export const EMPLOYEES_QUERY = graphql(`
  query Employees {
    allEmployees(sortField: "name", sortOrder: "asc") {
      id
      name
      role
    }
  }
`);

export const CREATE_COMMENT = graphql(`
  mutation CreateComment($content: String!, $date: Date!, $employee_id: ID!, $report_id: ID!) {
    createComment(content: $content, date: $date, employee_id: $employee_id, report_id: $report_id) {
      id
      content
      date
      report_id
      Employee {
        id
        name
        role
      }
    }
  }
`);
