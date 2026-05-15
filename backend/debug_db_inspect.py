import sqlite3
conn = sqlite3.connect('vanavil.db')
cur = conn.cursor()
print('tables:')
for row in cur.execute("SELECT name FROM sqlite_master WHERE type='table';"):
    print(row)
print('\nTasks:')
for row in cur.execute('SELECT id, task_name, start_date, end_date, max_stars FROM tasks'):
    print(row)
print('\nTask Levels:')
for row in cur.execute('SELECT id, task_id, level FROM task_levels'):
    print(row)
print('\nUsers:')
for row in cur.execute('SELECT id, full_name, email, level FROM users'):
    print(row)
conn.close()
