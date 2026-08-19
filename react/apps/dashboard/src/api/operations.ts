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
        rocket
        provider
      }
      Payloads {
        id
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
        description
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
        category
        Customer {
          id
          name
        }
      }
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

/* Contacts ///////////////////////////////////////////////////////////////////////////////////////////////////////// */

export const CONTACTS_QUERY = graphql(`
  query Contacts($perPage: Int!, $page: Int!) {
    allContacts(perPage: $perPage, page: $page, sortField: "date", sortOrder: "desc") {
      id
      date
      type
      executionScript
      configuration
      Satellite {
        id
        name
        status
        tle
      }
      GroundStation {
        id
        name
        status
        coordinates
      }
      Payload {
        id
        name
        category
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

/* reports /////////////////////////////////////////////////////////////////////////////////////////////////// */

export const REPORTS_QUERY = graphql(`
  query Reports($perPage: Int!, $page: Int!, $sortField: String!, $sortOrder: String!) {
    allReports(page: $page, perPage: $perPage, sortField: $sortField, sortOrder: $sortOrder) {
      id
      title
      type
      date
      content
      employee_id
      groundStation_id
      satellite_id
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
        network
        status
        image
      }
      Satellite {
        id
        name
        description
        status
        busType
        manufacturer
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
