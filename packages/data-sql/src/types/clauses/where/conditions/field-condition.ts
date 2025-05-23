import type { AbstractSqlQuerySelectNode } from '../../select.js';

/**
 * Condition to filter rows where two columns of different tables are equal.
 * Mainly used for JOINs.
 */
export interface SqlConditionFieldNode {
	type: 'condition-field';
	operation: 'eq';
	target: AbstractSqlQuerySelectNode;
	compareTo: AbstractSqlQuerySelectNode;
}
