// src/storage/database.ts

import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import path from 'path';
import fs from 'fs';

let dbInstance: Database | null = null;

export const getDatabase = async (): Promise<Database> => {
    if (dbInstance) return dbInstance;

    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }

    const dbPath = path.join(dataDir, 'pnrs_database.db');

    dbInstance = await open({
        filename: dbPath,
        driver: sqlite3.Database
    });

    await dbInstance.get('PRAGMA foreign_keys = ON');

    // 1. Crear tabla pnr_tickets con campos de Mock por Ambiente (Timestamps)
    await dbInstance.exec(`
        CREATE TABLE IF NOT EXISTS pnr_tickets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            flight_type TEXT NOT NULL,
            pnr TEXT NOT NULL,
            surname TEXT NOT NULL,
            is_amadeus TEXT DEFAULT 'NOT',
            user_creation TEXT,
            user_abm TEXT,
            mocked_at_int DATETIME DEFAULT NULL,
            mocked_at_pre DATETIME DEFAULT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `);

    // 2. Crear tabla pnr_segments con Disruption, Schedule y nuevos Estados
    await dbInstance.exec(`
        CREATE TABLE IF NOT EXISTS pnr_segments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ticket_id INTEGER NOT NULL,
            direction TEXT NOT NULL,
            sequence INTEGER NOT NULL,
            flight TEXT NOT NULL,
            origin_from TEXT NOT NULL,
            destination_to TEXT NOT NULL,
            date TEXT NOT NULL,
            time TEXT,
            arrival_time TEXT,
            flight_class TEXT,
            rerouting TEXT,
            disruption_type TEXT,
            schedule_change_type TEXT DEFAULT NULL,
            is_invoiced TEXT DEFAULT 'NOT',
            export_data TEXT,
            status TEXT DEFAULT 'FREE_TO_USE',
            FOREIGN KEY (ticket_id) REFERENCES pnr_tickets(id) ON DELETE CASCADE
        );
    `);

    // 3. MIGRACIÓN AUTOMÁTICA (Para bases de datos SQLite ya creadas)
    await applyMigrations(dbInstance);

    return dbInstance;
};

/**
 * Función auxiliar para alterar tablas existentes sin perder datos (Migración defensiva)
 */
async function applyMigrations(db: Database) {
    // --- Migraciones para pnr_tickets ---
    const ticketColumns = await db.all(`PRAGMA table_info(pnr_tickets)`);
    const ticketColumnNames = ticketColumns.map(c => c.name);

    if (!ticketColumnNames.includes('mocked_at_int')) {
        await db.exec(`ALTER TABLE pnr_tickets ADD COLUMN mocked_at_int DATETIME DEFAULT NULL;`);
    }
    if (!ticketColumnNames.includes('mocked_at_pre')) {
        await db.exec(`ALTER TABLE pnr_tickets ADD COLUMN mocked_at_pre DATETIME DEFAULT NULL;`);
    }

    // --- Migraciones para pnr_segments ---
    const segmentColumns = await db.all(`PRAGMA table_info(pnr_segments)`);
    const segmentColumnNames = segmentColumns.map(c => c.name);

    if (!segmentColumnNames.includes('schedule_change_type')) {
        await db.exec(`ALTER TABLE pnr_segments ADD COLUMN schedule_change_type TEXT DEFAULT NULL;`);
    }

    // --- Actualización de datos antiguos (Refactorización de nombres de Estados) ---
    await db.exec(`UPDATE pnr_segments SET status = 'FREE_TO_USE' WHERE status = 'FREE';`);
    await db.exec(`UPDATE pnr_segments SET status = 'RESERVE_TO_USE' WHERE status = 'IN_USED';`);

    // --- Crear Índices de Rendimiento ---
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_pnr_tickets_pnr ON pnr_tickets(pnr);`);
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_pnr_segments_status ON pnr_segments(status);`);
    
}
