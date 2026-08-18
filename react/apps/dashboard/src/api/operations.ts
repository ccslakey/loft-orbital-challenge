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
        rocket
        provider
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

