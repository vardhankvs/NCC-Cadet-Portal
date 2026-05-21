import admin from 'firebase-admin';
import fs from 'fs';

const serviceAccount = JSON.parse(fs.readFileSync('e:/Projects/NCC/debugMap.cjs', 'utf-8')); 
// Wait, I need a valid service account. I'll just check what files the user has.
