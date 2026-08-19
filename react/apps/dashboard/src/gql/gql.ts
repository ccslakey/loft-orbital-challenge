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
    "\n  query Reports($perPage: Int!, $page: Int!, $sortField: String!, $sortOrder: String!) {\n    allReports(page: $page, perPage: $perPage, sortField: $sortField, sortOrder: $sortOrder) {\n      id\n      title\n      type\n      date\n      content\n      employee_id\n      groundStation_id\n      satellite_id\n      Comments {\n        id\n        date\n        content\n        Employee {\n        id\n        name\n        role\n      }\n      }\n      Employee {\n        id\n        name\n        role\n      }\n      GroundStation {\n        id\n        name\n        network\n        status\n        image\n      }\n      Satellite {\n        id\n        name\n        description\n        status\n        busType\n        manufacturer\n      }\n    }\n  }\n": typeof types.ReportsDocument,
    "\n  query Employees {\n    allEmployees(sortField: \"name\", sortOrder: \"asc\") {\n      id\n      name\n      role\n    }\n  }\n": typeof types.EmployeesDocument,
    "\n  mutation CreateComment($content: String!, $date: Date!, $employee_id: ID!, $report_id: ID!) {\n    createComment(content: $content, date: $date, employee_id: $employee_id, report_id: $report_id) {\n      id\n      content\n      date\n      report_id\n      Employee {\n        id\n        name\n        role\n      }\n    }\n  }\n": typeof types.CreateCommentDocument,
};
const documents: Documents = {
    "\n  query FleetSummary {\n    _allSatellitesMeta {\n      count\n    }\n  }\n": types.FleetSummaryDocument,
    "\n  query SatelliteOverview($perPage: Int!, $page: Int!) {\n    allSatellites(perPage: $perPage, page: $page, sortField: \"name\", sortOrder: \"asc\") {\n      id\n      name\n      status\n      altitude\n      coordinates\n      tle\n      Constellation {\n        id\n        name\n      }\n      Launch {\n        id\n        rocket\n        provider\n      }\n    }\n  }\n": types.SatelliteOverviewDocument,
    "\n  query SatelliteDetail($id: ID!) {\n    Satellite(id: $id) {\n      id\n      name\n      description\n      status\n      manufacturer\n      busType\n      image\n      altitude\n      coordinates\n      tle\n      specs\n      Constellation {\n        id\n        name\n        description\n      }\n      Launch {\n        id\n        date\n        rocket\n        provider\n        status\n        outcome\n      }\n      Payloads {\n        id\n        name\n        status\n        category\n        Customer {\n          id\n          name\n        }\n      }\n    }\n  }\n": types.SatelliteDetailDocument,
    "\n  query GroundStations($perPage: Int!, $page: Int!) {\n    allGroundStations(perPage: $perPage, page: $page, sortField: \"name\", sortOrder: \"asc\") {\n      id\n      name\n      status\n      network\n      coordinates\n    }\n  }\n": types.GroundStationsDocument,
    "\n  query Reports($perPage: Int!, $page: Int!, $sortField: String!, $sortOrder: String!) {\n    allReports(page: $page, perPage: $perPage, sortField: $sortField, sortOrder: $sortOrder) {\n      id\n      title\n      type\n      date\n      content\n      employee_id\n      groundStation_id\n      satellite_id\n      Comments {\n        id\n        date\n        content\n        Employee {\n        id\n        name\n        role\n      }\n      }\n      Employee {\n        id\n        name\n        role\n      }\n      GroundStation {\n        id\n        name\n        network\n        status\n        image\n      }\n      Satellite {\n        id\n        name\n        description\n        status\n        busType\n        manufacturer\n      }\n    }\n  }\n": types.ReportsDocument,
    "\n  query Employees {\n    allEmployees(sortField: \"name\", sortOrder: \"asc\") {\n      id\n      name\n      role\n    }\n  }\n": types.EmployeesDocument,
    "\n  mutation CreateComment($content: String!, $date: Date!, $employee_id: ID!, $report_id: ID!) {\n    createComment(content: $content, date: $date, employee_id: $employee_id, report_id: $report_id) {\n      id\n      content\n      date\n      report_id\n      Employee {\n        id\n        name\n        role\n      }\n    }\n  }\n": types.CreateCommentDocument,
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
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query Reports($perPage: Int!, $page: Int!, $sortField: String!, $sortOrder: String!) {\n    allReports(page: $page, perPage: $perPage, sortField: $sortField, sortOrder: $sortOrder) {\n      id\n      title\n      type\n      date\n      content\n      employee_id\n      groundStation_id\n      satellite_id\n      Comments {\n        id\n        date\n        content\n        Employee {\n        id\n        name\n        role\n      }\n      }\n      Employee {\n        id\n        name\n        role\n      }\n      GroundStation {\n        id\n        name\n        network\n        status\n        image\n      }\n      Satellite {\n        id\n        name\n        description\n        status\n        busType\n        manufacturer\n      }\n    }\n  }\n"): (typeof documents)["\n  query Reports($perPage: Int!, $page: Int!, $sortField: String!, $sortOrder: String!) {\n    allReports(page: $page, perPage: $perPage, sortField: $sortField, sortOrder: $sortOrder) {\n      id\n      title\n      type\n      date\n      content\n      employee_id\n      groundStation_id\n      satellite_id\n      Comments {\n        id\n        date\n        content\n        Employee {\n        id\n        name\n        role\n      }\n      }\n      Employee {\n        id\n        name\n        role\n      }\n      GroundStation {\n        id\n        name\n        network\n        status\n        image\n      }\n      Satellite {\n        id\n        name\n        description\n        status\n        busType\n        manufacturer\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query Employees {\n    allEmployees(sortField: \"name\", sortOrder: \"asc\") {\n      id\n      name\n      role\n    }\n  }\n"): (typeof documents)["\n  query Employees {\n    allEmployees(sortField: \"name\", sortOrder: \"asc\") {\n      id\n      name\n      role\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation CreateComment($content: String!, $date: Date!, $employee_id: ID!, $report_id: ID!) {\n    createComment(content: $content, date: $date, employee_id: $employee_id, report_id: $report_id) {\n      id\n      content\n      date\n      report_id\n      Employee {\n        id\n        name\n        role\n      }\n    }\n  }\n"): (typeof documents)["\n  mutation CreateComment($content: String!, $date: Date!, $employee_id: ID!, $report_id: ID!) {\n    createComment(content: $content, date: $date, employee_id: $employee_id, report_id: $report_id) {\n      id\n      content\n      date\n      report_id\n      Employee {\n        id\n        name\n        role\n      }\n    }\n  }\n"];

export function graphql(source: string) {
  return (documents as any)[source] ?? {};
}

export type DocumentType<TDocumentNode extends DocumentNode<any, any>> = TDocumentNode extends DocumentNode<  infer TType,  any>  ? TType  : never;