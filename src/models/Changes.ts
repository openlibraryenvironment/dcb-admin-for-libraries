interface UpdateChanges {
	new_values: Record<string, string>;
	old_values: Record<string, string>;
}

type InsertChanges = Record<string, string>;

export type Changes = UpdateChanges | InsertChanges;
