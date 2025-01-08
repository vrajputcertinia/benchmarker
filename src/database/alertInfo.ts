/** @ignore */
/**
 * Copyright (c) 2025 Certinia, Inc. All rights reserved.
 */
import { getConnection } from './connection';

export async function getAverageLimitValuesFromDB(
  flowActionPairs: { flowName: string; actionName: string }[]
) {
  const connection = await getConnection();

  // Generate the query for all flow-action pairs
  const flowActionConditions = flowActionPairs
    .map(pair => `('${pair.flowName}', '${pair.actionName}')`)
    .join(', ');

  const query = `
    SELECT
      flow_name,
      action,
      ROUND(AVG(dml_statements)::numeric, 0) AS dmlavg,
      ROUND(AVG(soql_queries)::numeric, 0) AS soqlavg,
      ROUND(AVG(cpu_time)::numeric, 0) AS cpuavg,
      ROUND(AVG(dml_rows)::numeric, 0) AS dmlrowavg,
      ROUND(AVG(heap_size)::numeric, 0) AS heapavg,
      ROUND(AVG(query_rows)::numeric, 0) AS soqlrowavg
    FROM performance.test_result
    WHERE (create_date_time >= CURRENT_TIMESTAMP - INTERVAL '10 DAYS')
      AND (flow_name, action) IN (${flowActionConditions})
      AND (error IS NULL OR error = '')
    GROUP BY flow_name, action
  `;

  const resultsMap: {
    [key: string]: {
      dmlavg: number;
      soqlavg: number;
      cpuavg: number;
      dmlrowavg: number;
      heapavg: number;
      soqlrowavg: number;
    };
  } = {};

  try {
    const result = await connection.query(query);

    // Populate the results map
    result.forEach(
      (row: {
        flow_name: string;
        action: string;
        dmlavg: number;
        soqlavg: number;
        cpuavg: number;
        dmlrowavg: number;
        heapavg: number;
        soqlrowavg: number;
      }) => {
        const key = `${row.flow_name}_${row.action}`;
        resultsMap[key] = {
          dmlavg: row.dmlavg ?? 0,
          soqlavg: row.soqlavg ?? 0,
          cpuavg: row.cpuavg ?? 0,
          dmlrowavg: row.dmlrowavg ?? 0,
          heapavg: row.heapavg ?? 0,
          soqlrowavg: row.soqlrowavg ?? 0,
        };
      }
    );

    return resultsMap;
  } catch (error) {
    console.error('Error in fetching the average values: ', error);
    return {};
  }
}
