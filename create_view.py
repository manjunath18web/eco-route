import sqlite3

conn = sqlite3.connect('users.db')
cursor = conn.cursor()

# Drop the view if it exists, then create the new readable log view
cursor.execute("DROP VIEW IF EXISTS readable_travel_history;")
cursor.execute('''
    CREATE VIEW readable_travel_history AS
    SELECT 
        travel_history.id AS Trip_ID,
        users.username AS User_Name,
        travel_history.start_loc AS Starting_Point,
        travel_history.dest_loc AS Destination,
        travel_history.vehicle AS Transport,
        travel_history.timestamp AS Time
    FROM travel_history
    JOIN users ON travel_history.user_id = users.id;
''')

conn.commit()
conn.close()
print("✅ Neat Readable View Created Successfully!")