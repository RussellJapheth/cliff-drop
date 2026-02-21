import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';

export const messages = sqliteTable('messages', {
    id: text('id').primaryKey(),
    type: text('type', { enum: ['text', 'file', 'link'] }).notNull(),
    content: text('content'),
    fileName: text('file_name'),
    mimeType: text('mime_type'),
    size: integer('size'),
    groupId: text('group_id'),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
}, (table) => [
    index('messages_created_at_idx').on(table.createdAt),
    index('messages_group_id_idx').on(table.groupId)
]);

export const sessions = sqliteTable('sessions', {
    id: text('id').primaryKey(),
    expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
});

export const account = sqliteTable('account', {
    id: integer('id').primaryKey(),
    passwordHash: text('password_hash').notNull()
});

export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
export type Session = typeof sessions.$inferSelect;
