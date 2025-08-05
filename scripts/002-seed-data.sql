-- Insert sample league metadata (from real JSON data)
INSERT INTO league_metadata (league_id, league_name, total_entries, current_event) 
VALUES (33122, 'La Jungla LV - Premier Legue', 32, 38) 
ON CONFLICT (league_id) DO UPDATE SET
    league_name = EXCLUDED.league_name,
    total_entries = EXCLUDED.total_entries,
    current_event = EXCLUDED.current_event,
    last_updated = NOW();

-- Insert all 32 teams from the real league standings JSON
INSERT INTO teams (id, entry_name, player_name, total, event_total, rank, last_rank) VALUES
(7342331, 'BIELSISMO', 'Augusto Zegarra', 2553, 70, 1, 1),
(262619, 'Bisnietos de Erasmo', 'Eric Wong', 2522, 53, 2, 2),
(68175, 'POLERO FC', 'Heinz Andre', 2504, 55, 3, 4),
(212673, 'Kimmish', 'Ismael Abdala', 2497, 45, 4, 3),
(748251, 'La Gravesinha SC', 'Nicanor Vilchez', 2484, 66, 5, 5),
(200662, 'Matitor FC', 'Rodrigo Vallejos', 2476, 60, 6, 6),
(89341, 'Dashiki', 'Erik Nestorovic', 2449, 55, 7, 8),
(1135705, 'Bipolardos', 'Paul Tejeda', 2441, 67, 8, 9),
(1147014, 'yoviyova', 'Yovan Samardzich', 2440, 67, 9, 10),
(542746, 'Música', 'Michael Stephenson', 2437, 41, 10, 7),
(147329, 'Cápac F.C.', 'Ennio Pinasco', 2413, 74, 11, 14),
(119790, 'PrettyFly4aWhiteKai', 'Arturo Accame', 2409, 57, 12, 11),
(4910796, 'Bash FC', 'Bruno Asin', 2406, 66, 13, 13),
(1417733, 'Tunesquad', 'Jose Luis Miranda', 2396, 70, 14, 16),
(170000, 'La Morrineta', 'Alex Morris', 2395, 68, 15, 15),
(522926, 'Nachito fest', 'Nashir Saba', 2394, 48, 16, 12),
(310530, 'Cuadrado', 'Alfonso De La Piedra', 2378, 56, 17, 17),
(4414028, 'Los Cuánticos', 'Sebastian Salinas', 2367, 47, 18, 18),
(1938206, 'Carlitos FC', 'Carlos Sedó', 2349, 49, 19, 19),
(2072180, 'El Pullet', 'Sebastian Benavides', 2340, 58, 20, 20),
(7221003, 'PUERTA CHOLA', 'Steve Ocampo', 2323, 69, 21, 22),
(1429857, 'El de abajo no sabe', 'Angel Pinasco', 2313, 55, 22, 21),
(180956, 'La Misilera FC', 'Bruno Tomatis', 2281, 37, 23, 23),
(4043515, 'Lisu FC', 'Felipe Graña', 2257, 45, 24, 25),
(2154820, 'El 11 de Van Bastian', 'Pierre Montauban', 2241, 30, 25, 24),
(5177462, 'FC GDF', 'Gaspare Dalla Francesca', 2237, 49, 26, 26),
(1293971, 'Peñascus Punch', 'Eduardo Rehder', 2193, 52, 27, 27),
(7257253, 'CHARA', 'Franco Massa', 2113, 49, 28, 28),
(5165770, 'Cañete FC', 'Jan Nemi', 2065, 58, 29, 29),
(5655413, 'Binho F.C.', 'Robin Vargas', 2019, 67, 30, 31),
(4952123, 'CHASQUY FC', 'Alonso Gonzales', 2018, 51, 31, 30),
(8423125, 'Busby Cricket Club', 'Gregory Leon', 1974, 56, 32, 32)
ON CONFLICT (id) DO UPDATE SET
    entry_name = EXCLUDED.entry_name,
    player_name = EXCLUDED.player_name,
    total = EXCLUDED.total,
    event_total = EXCLUDED.event_total,
    rank = EXCLUDED.rank,
    last_rank = EXCLUDED.last_rank,
    updated_at = NOW();

-- Insert detailed team summaries for Erik Nestorovic (from his history JSON)
INSERT INTO team_summaries (team_id, event_number, points, transfers, transfers_cost, overall_rank, value, bank, chip_used) VALUES
(89341, 38, 55, 2, 0, 296692, 1055, 57, 'bboost'),
(89341, 37, 48, 0, 0, 284370, 1054, 55, NULL),
(89341, 36, 60, 2, 0, 266418, 1053, 55, NULL),
(89341, 35, 52, 2, 0, 296463, 1061, 17, NULL),
(89341, 34, 107, 0, 0, 322625, 1065, 8, 'freehit'),
(89341, 33, 83, 1, 0, 572268, 1061, 8, NULL),
(89341, 32, 75, 0, 0, 717373, 1055, 3, NULL),
(89341, 31, 71, 0, 0, 716801, 1050, 3, NULL),
(89341, 30, 50, 0, 0, 1089561, 1041, 11, 'wildcard'),
(89341, 29, 37, 3, 0, 1093996, 1053, 4, NULL),
(89341, 28, 48, 1, 0, 925976, 1058, 17, NULL),
(89341, 27, 51, 0, 0, 753620, 1058, 16, NULL),
(89341, 26, 86, 0, 0, 687683, 1056, 16, NULL),
(89341, 25, 102, 2, 0, 781875, 1056, 16, '3xc'),
(89341, 24, 109, 0, 0, 946247, 1059, 3, NULL),
(89341, 23, 58, 2, 0, 804826, 1058, 3, NULL),
(89341, 22, 50, 3, 0, 740820, 1053, 4, NULL),
(89341, 21, 64, 0, 0, 785395, 1052, 22, NULL),
(89341, 20, 69, 0, 0, 730461, 1049, 22, NULL),
(89341, 19, 82, 0, 0, 772914, 1045, 22, NULL),
(89341, 18, 65, 2, 4, 864146, 1041, 22, NULL),
(89341, 17, 73, 1, 0, 847857, 1037, 2, NULL),
(89341, 16, 44, 1, 0, 759537, 1036, 1, NULL),
(89341, 15, 56, 1, 0, 611594, 1032, 10, NULL),
(89341, 14, 73, 1, 0, 631273, 1028, 26, NULL),
(89341, 13, 82, 2, 0, 782552, 1024, 51, NULL),
(89341, 12, 41, 4, 0, 1070519, 1028, 4, NULL),
(89341, 11, 78, 0, 0, 619514, 1027, 22, NULL),
(89341, 10, 44, 1, 0, 1302484, 1024, 22, NULL),
(89341, 9, 60, 1, 0, 1307362, 1021, 23, NULL),
(89341, 8, 41, 2, 0, 1266378, 1018, 1, NULL),
(89341, 7, 44, 0, 0, 1371772, 1017, 0, NULL),
(89341, 6, 52, 0, 0, 1153464, 1018, 0, NULL),
(89341, 5, 60, 0, 0, 1089527, 1012, 0, NULL),
(89341, 4, 49, 0, 0, 824349, 1007, 0, 'wildcard'),
(89341, 3, 72, 0, 0, 525028, 1005, 20, NULL),
(89341, 2, 91, 1, 0, 279372, 1001, 20, NULL),
(89341, 1, 71, 0, 0, 1216977, 1000, 0, NULL)
ON CONFLICT (team_id, event_number) DO UPDATE SET
    points = EXCLUDED.points,
    transfers = EXCLUDED.transfers,
    transfers_cost = EXCLUDED.transfers_cost,
    overall_rank = EXCLUDED.overall_rank,
    value = EXCLUDED.value,
    bank = EXCLUDED.bank,
    chip_used = EXCLUDED.chip_used;

-- Insert sample team summaries for a few other teams (estimated data)
INSERT INTO team_summaries (team_id, event_number, points, transfers, transfers_cost, overall_rank, value, bank, chip_used) VALUES
(7342331, 38, 70, 1, 0, 125000, 1050, 15, NULL), -- Augusto Zegarra
(262619, 38, 53, 0, 0, 180000, 1045, 25, NULL), -- Eric Wong
(68175, 38, 55, 2, 8, 160000, 1048, 12, NULL), -- Heinz Andre
(212673, 38, 45, 1, 4, 200000, 1042, 18, 'TC'), -- Ismael Abdala
(748251, 38, 66, 0, 0, 140000, 1052, 8, NULL), -- Nicanor Vilchez
(200662, 38, 60, 1, 4, 170000, 1046, 22, NULL), -- Rodrigo Vallejos
(1135705, 38, 67, 2, 0, 190000, 1049, 5, NULL), -- Paul Tejeda
(1147014, 38, 67, 1, 0, 195000, 1051, 12, NULL), -- Yovan Samardzich
(542746, 38, 41, 0, 0, 220000, 1038, 35, NULL), -- Michael Stephenson
(147329, 38, 74, 3, 12, 150000, 1055, 2, 'BB') -- Ennio Pinasco
ON CONFLICT (team_id, event_number) DO UPDATE SET
    points = EXCLUDED.points,
    transfers = EXCLUDED.transfers,
    transfers_cost = EXCLUDED.transfers_cost,
    overall_rank = EXCLUDED.overall_rank,
    value = EXCLUDED.value,
    bank = EXCLUDED.bank,
    chip_used = EXCLUDED.chip_used;

-- Insert Erik's complete chips usage history (from his history JSON)
INSERT INTO chips (team_id, chip_type, event_number, used_at) VALUES
(89341, 'wildcard', 4, '2024-09-03T22:10:22.228115Z'),
(89341, '3xc', 25, '2025-02-13T18:02:27.839640Z'),
(89341, 'wildcard', 30, '2025-03-31T20:17:49.958251Z'),
(89341, 'manager', 31, '2025-04-04T11:45:48.246695Z'),
(89341, 'freehit', 34, '2025-04-25T01:54:46.527296Z'),
(89341, 'bboost', 38, '2025-05-21T12:46:29.454945Z')
ON CONFLICT DO NOTHING;

-- Insert some chips for other teams (estimated based on common usage patterns)
INSERT INTO chips (team_id, chip_type, event_number, used_at) VALUES
(7342331, 'wildcard', 8, '2024-10-01T12:00:00Z'),
(7342331, '3xc', 24, '2025-01-25T15:30:00Z'),
(7342331, 'freehit', 33, '2025-04-15T18:45:00Z'),
(262619, 'wildcard', 4, '2024-09-05T14:20:00Z'),
(262619, 'bboost', 26, '2025-02-28T16:10:00Z'),
(262619, 'freehit', 35, '2025-05-01T12:30:00Z'),
(68175, '3xc', 12, '2024-11-20T19:15:00Z'),
(68175, 'wildcard', 30, '2025-04-01T11:45:00Z'),
(68175, 'freehit', 36, '2025-05-08T14:20:00Z'),
(212673, 'wildcard', 6, '2024-09-25T13:30:00Z'),
(212673, 'TC', 38, '2025-05-25T17:00:00Z'),
(748251, 'bboost', 15, '2024-12-10T20:30:00Z'),
(748251, 'wildcard', 28, '2025-03-15T16:45:00Z'),
(200662, '3xc', 20, '2025-01-10T14:15:00Z'),
(200662, 'wildcard', 32, '2025-04-10T12:00:00Z'),
(147329, 'wildcard', 10, '2024-11-01T15:20:00Z'),
(147329, 'BB', 38, '2025-05-25T18:30:00Z')
ON CONFLICT DO NOTHING;
