/* eslint-disable */
import * as types from './graphql';
import { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';

/**
 * Map of all GraphQL operations in the project.
 *
 * This map has several performance disadvantages:
 * 1. It is not tree-shakeable, so it will include all operations in the project.
 * 2. It is not minifiable, so the string of a GraphQL query will be multiple times inside the bundle.
 * 3. It does not support dead code elimination, so it will add unused operations.
 *
 * Therefore it is highly recommended to use the babel or swc plugin for production.
 * Learn more about it here: https://the-guild.dev/graphql/codegen/plugins/presets/preset-client#reducing-bundle-size
 */
type Documents = {
    "\n  query FleetSummary {\n    _allSatellitesMeta {\n      count\n    }\n  }\n": typeof types.FleetSummaryDocument,
    "\n  query SatelliteOverview($perPage: Int!, $page: Int!) {\n    allSatellites(perPage: $perPage, page: $page, sortField: \"name\", sortOrder: \"asc\") {\n      id\n      name\n      status\n      altitude\n      coordinates\n      tle\n      Constellation {\n        id\n        name\n      }\n      Launch {\n        id\n        rocket\n        provider\n      }\n    }\n  }\n": typeof types.SatelliteOverviewDocument,
    "\n  query SatelliteDetail($id: ID!) {\n    Satellite(id: $id) {\n      id\n      name\n      description\n      status\n      manufacturer\n      busType\n      image\n      altitude\n      coordinates\n      tle\n      specs\n      Constellation {\n        id\n        name\n        description\n      }\n      Launch {\n        id\n        date\n        rocket\n        provider\n        status\n        outcome\n      }\n      Payloads {\n        id\n        name\n        status\n        category\n        Customer {\n          id\n          name\n        }\n      }\n    }\n  }\n": typeof types.SatelliteDetailDocument,
    "\n  query GroundStations($perPage: Int!, $page: Int!) {\n    allGroundStations(perPage: $perPage, page: $page, sortField: \"name\", sortOrder: \"asc\") {\n      id\n      name\n      status\n      network\n      coordinates\n    }\n  }\n": typeof types.GroundStationsDocument,
};
const documents: Documents = {
    "\n  query FleetSummary {\n    _allSatellitesMeta {\n      count\n    }\n  }\n": types.FleetSummaryDocument,
    "\n  query SatelliteOverview($perPage: Int!, $page: Int!) {\n    allSatellites(perPage: $perPage, page: $page, sortField: \"name\", sortOrder: \"asc\") {\n      id\n      name\n      status\n      altitude\n      coordinates\n      tle\n      Constellation {\n        id\n        name\n      }\n      Launch {\n        id\n        rocket\n        provider\n      }\n    }\n  }\n": types.SatelliteOverviewDocument,
    "\n  query SatelliteDetail($id: ID!) {\n    Satellite(id: $id) {\n      id\n      name\n      description\n      status\n      manufacturer\n      busType\n      image\n      altitude\n      coordinates\n      tle\n      specs\n      Constellation {\n        id\n        name\n        description\n      }\n      Launch {\n        id\n        date\n        rocket\n        provider\n        status\n        outcome\n      }\n      Payloads {\n        id\n        name\n        status\n        category\n        Customer {\n          id\n          name\n        }\n      }\n    }\n  }\n": types.SatelliteDetailDocument,
    "\n  query GroundStations($perPage: Int!, $page: Int!) {\n    allGroundStations(perPage: $perPage, page: $page, sortField: \"name\", sortOrder: \"asc\") {\n      id\n      name\n      status\n      network\n      coordinates\n    }\n  }\n": types.GroundStationsDocument,
};

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 *
 *
 * @example
 * ```ts
 * const query = graphql(`query GetUser($id: ID!) { user(id: $id) { name } }`);
 * ```
 *
 * The query argument is unknown!
 * Please regenerate the types.
 */
export function graphql(source: string): unknown;

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query FleetSummary {\n    _allSatellitesMeta {\n      count\n    }\n  }\n"): (typeof documents)["\n  query FleetSummary {\n    _allSatellitesMeta {\n      count\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query SatelliteOverview($perPage: Int!, $page: Int!) {\n    allSatellites(perPage: $perPage, page: $page, sortField: \"name\", sortOrder: \"asc\") {\n      id\n      name\n      status\n      altitude\n      coordinates\n      tle\n      Constellation {\n        id\n        name\n      }\n      Launch {\n        id\n        rocket\n        provider\n      }\n    }\n  }\n"): (typeof documents)["\n  query SatelliteOverview($perPage: Int!, $page: Int!) {\n    allSatellites(perPage: $perPage, page: $page, sortField: \"name\", sortOrder: \"asc\") {\n      id\n      name\n      status\n      altitude\n      coordinates\n      tle\n      Constellation {\n        id\n        name\n      }\n      Launch {\n        id\n        rocket\n        provider\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query SatelliteDetail($id: ID!) {\n    Satellite(id: $id) {\n      id\n      name\n      description\n      status\n      manufacturer\n      busType\n      image\n      altitude\n      coordinates\n      tle\n      specs\n      Constellation {\n        id\n        name\n        description\n      }\n      Launch {\n        id\n        date\n        rocket\n        provider\n        status\n        outcome\n      }\n      Payloads {\n        id\n        name\n        status\n        category\n        Customer {\n          id\n          name\n        }\n      }\n    }\n  }\n"): (typeof documents)["\n  query SatelliteDetail($id: ID!) {\n    Satellite(id: $id) {\n      id\n      name\n      description\n      status\n      manufacturer\n      busType\n      image\n      altitude\n      coordinates\n      tle\n      specs\n      Constellation {\n        id\n        name\n        description\n      }\n      Launch {\n        id\n        date\n        rocket\n        provider\n        status\n        outcome\n      }\n      Payloads {\n        id\n        name\n        status\n        category\n        Customer {\n          id\n          name\n        }\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GroundStations($perPage: Int!, $page: Int!) {\n    allGroundStations(perPage: $perPage, page: $page, sortField: \"name\", sortOrder: \"asc\") {\n      id\n      name\n      status\n      network\n      coordinates\n    }\n  }\n"): (typeof documents)["\n  query GroundStations($perPage: Int!, $page: Int!) {\n    allGroundStations(perPage: $perPage, page: $page, sortField: \"name\", sortOrder: \"asc\") {\n      id\n      name\n      status\n      network\n      coordinates\n    }\n  }\n"];

export function graphql(source: string) {
  return (documents as any)[source] ?? {};
}

export type DocumentType<TDocumentNode extends DocumentNode<any, any>> = TDocumentNode extends DocumentNode<  infer TType,  any>  ? TType  : never;