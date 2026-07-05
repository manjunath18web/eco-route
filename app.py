import random
import smtplib
import csv
import io
import time
from email.mime.text import MIMEText
from flask import Flask, render_template, request, redirect, url_for, session, flash, jsonify, make_response
import sqlite3
from werkzeug.security import generate_password_hash, check_password_hash
from geopy.geocoders import Nominatim

app = Flask(__name__)
app.secret_key = "eco_secret_key" 

# --- SMTP Configurations for Email OTP ---
SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 587
SENDER_EMAIL = "ecoroute.project5@gmail.com"   
SENDER_PASSWORD = "dkznodeexzrwthay"       

# Authorized Admin List (Linked directly to your project email)
ADMIN_LIST = [SENDER_EMAIL]

# Initialize Geocoder
geolocator = Nominatim(user_agent="eco_travel_app")

def get_db_connection():
    conn = sqlite3.connect('users.db')
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    conn.execute('''CREATE TABLE IF NOT EXISTS users 
                 (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE, password TEXT)''')
    
    # Check if the Admin profile exists in the users table, if not, create it with your password
    admin_user = conn.execute("SELECT * FROM users WHERE username = ?", (SENDER_EMAIL,)).fetchone()
    if not admin_user:
        hashed_admin_password = generate_password_hash("ecoroute@4889")
        conn.execute("INSERT INTO users (username, password) VALUES (?, ?)", (SENDER_EMAIL, hashed_admin_password))
        conn.commit()
    
    try:
        conn.execute('''CREATE TABLE IF NOT EXISTS travel_history 
                      (id INTEGER PRIMARY KEY AUTOINCREMENT, 
                       user_id INTEGER, 
                       start_loc TEXT, 
                       dest_loc TEXT, 
                       vehicle TEXT, 
                       timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                       FOREIGN KEY (user_id) REFERENCES users (id))''')
    except sqlite3.OperationalError:
        pass 
        
    conn.commit()
    conn.close()

init_db()

# --- Helper Function for Reverse Geocoding ---
def get_place_name(coords_string):
    try:
        if "," in coords_string:
            location = geolocator.reverse(coords_string, language='en', timeout=10)
            if location:
                return location.address
        return coords_string
    except:
        return coords_string 

# --- Helper Function to Send OTP via Email ---
def send_otp_email(receiver_email, otp_code):
    try:
        msg = MIMEText(f"Hello,\n\nYour One-Time Password (OTP) to reset your EcoRoute Explorer password is: {otp_code}\n\nThis code is valid for this session only.")
        msg['Subject'] = "EcoRoute Explorer - Password Reset OTP"
        msg['From'] = SENDER_EMAIL
        msg['To'] = receiver_email

        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()
        # Clean up spatial formatting errors if passwords are pasted with trailing whitespaces
        server.login(SENDER_EMAIL, SENDER_PASSWORD.replace(" ", ""))
        server.sendmail(SENDER_EMAIL, receiver_email, msg.as_string())
        server.close()
        return True
    except Exception as e:
        print(f"SMTP Error: {e}")
        return False

@app.route('/')
def login_page():
    if 'user' in session:
        return redirect(url_for('admin_dashboard')) if session['user'] in ADMIN_LIST else redirect(url_for('index'))
    return render_template('login.html')

@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        username = request.form['username']
        password = generate_password_hash(request.form['password'])
        try:
            conn = get_db_connection()
            conn.execute("INSERT INTO users (username, password) VALUES (?, ?)", (username, password))
            conn.commit()
            conn.close()
            flash("✅ Registration successful! Please login.")
            return redirect(url_for('login_page'))
        except sqlite3.IntegrityError:
            flash("❌ Username already exists.")
    return render_template('register.html')

@app.route('/login', methods=['POST'])
def do_login():
    username = request.form['username']
    password = request.form['password']
    role = request.form.get('role', 'user')
    
    conn = get_db_connection()
    user = conn.execute("SELECT * FROM users WHERE username=?", (username,)).fetchone()
    conn.close()
    
    if user and check_password_hash(user['password'], password):
        if role == 'admin' and username not in ADMIN_LIST:
            flash("🚫 Access Denied: Administrator privileges required.")
            return redirect(url_for('login_page'))
        
        session['user'] = username
        session['user_id'] = user['id']
        return redirect(url_for('admin_dashboard')) if role == 'admin' else redirect(url_for('index'))
    
    flash("❌ Invalid username or password")
    return redirect(url_for('login_page'))

@app.route('/forgot', methods=['GET', 'POST'])
def forgot_password():
    if request.method == 'POST':
        if 'request_otp' in request.form:
            username = request.form['username']
            
            conn = get_db_connection()
            user = conn.execute("SELECT * FROM users WHERE username=?", (username,)).fetchone()
            conn.close()
            
            if user:
                otp = str(random.randint(100000, 999999))
                session['reset_otp'] = otp
                session['reset_user'] = username
                
                if send_otp_email(username, otp):
                    flash("📩 Verification code sent! Please check your registered email inbox.")
                    return render_template('forgot.html', otp_sent=True)
                else:
                    flash("❌ Failed to send OTP email. Please check your system configuration.")
                    return render_template('forgot.html', otp_sent=False)
            else:
                flash("❌ This Gmail ID is not registered in our system.")
                return render_template('forgot.html', otp_sent=False)
        
        elif 'verify_otp' in request.form:
            user_otp = request.form['otp']
            new_password = request.form['new_password']
            confirm_password = request.form['confirm_password']
            
            if new_password != confirm_password:
                flash("❌ New Password and Confirm Password do not match!")
                return render_template('forgot.html', otp_sent=True)
                
            if 'reset_otp' in session and session['reset_otp'] == user_otp:
                username = session.get('reset_user')
                hashed_password = generate_password_hash(new_password)
                
                conn = get_db_connection()
                conn.execute("UPDATE users SET password=? WHERE username=?", (hashed_password, username))
                conn.commit()
                conn.close()
                
                session.pop('reset_otp', None)
                session.pop('reset_user', None)
                
                flash("✅ Password updated successfully! Please login.")
                return redirect(url_for('login_page'))
            else:
                flash("❌ Invalid OTP code. Verification failed.")
                return render_template('forgot.html', otp_sent=True)
                
    return render_template('forgot.html', otp_sent=False)

@app.route('/index')
def index():
    if 'user' not in session:
        return redirect(url_for('login_page'))
    return render_template('index.html')

@app.route('/save_history', methods=['POST'])
def save_history():
    if 'user_id' not in session:
        return jsonify({"status": "error", "message": "Unauthorized"}), 401
    
    data = request.get_json()
    raw_start = data.get('start')
    raw_dest = data.get('end')
    vehicle = data.get('vehicle')

    start_loc = get_place_name(raw_start)
    dest_loc = get_place_name(raw_dest)

    if start_loc and dest_loc:
        try:
            conn = get_db_connection()
            conn.execute("INSERT INTO travel_history (user_id, start_loc, dest_loc, vehicle) VALUES (?, ?, ?, ?)",
                         (session['user_id'], start_loc, dest_loc, vehicle))
            conn.commit()
            conn.close()
            return jsonify({"status": "success", "converted_start": start_loc})
        except Exception as e:
            return jsonify({"status": "error", "message": str(e)}), 500
    
    return jsonify({"status": "error", "message": "Invalid data"}), 400

@app.route('/history')
def history():
    if 'user_id' not in session:
        return redirect(url_for('login_page'))
    
    conn = get_db_connection()
    travels = conn.execute("SELECT * FROM travel_history WHERE user_id = ? ORDER BY timestamp DESC", 
                         (session['user_id'],)).fetchall()
    conn.close()
    return render_template('history.html', travels=travels)

@app.route('/route')
def route_page():
    if 'user' not in session:
        return redirect(url_for('login_page'))
    return render_template('route.html')

# --- CHANGED & EXPANDED ROUTE FOR SLIDE REQUIREMENTS ---
@app.route('/admin_dashboard')
def admin_dashboard():
    if 'user' not in session or session['user'] not in ADMIN_LIST:
        return redirect(url_for('login_page'))
    
    # Track backend DB latency for System Health calculation
    start_time = time.time()
    
    conn = get_db_connection()
    users = conn.execute("SELECT id, username FROM users").fetchall()
    
    logs = conn.execute('''
        SELECT users.username, travel_history.start_loc, travel_history.dest_loc, 
               travel_history.vehicle, travel_history.timestamp as local_time
        FROM travel_history 
        JOIN users ON travel_history.user_id = users.id 
        ORDER BY travel_history.timestamp DESC
    ''').fetchall()
    
    # 1. Macro-Analytics: Calculate total CO2 emissions saved over the entire platform
    total_trips = len(logs)
    # Assumes an average system savings coefficient of 2.45 kg CO2 per eco-friendly route optimized
    total_co2_saved = round(total_trips * 2.45, 2)
    
    # 2. System Health: Calculate processing time variables
    db_load_query = conn.execute("SELECT count(*) FROM users").fetchone()
    conn.close()
    
    db_latency = round((time.time() - start_time) * 1000, 2) # Latency in milliseconds
    
    # Simulate API load check parameters 
    api_response_time = round(random.uniform(15.0, 45.0), 1)
    database_load_percentage = min(100, max(2, int(total_trips * 0.4) + 5))

    return render_template(
        'admin.html', 
        users=users, 
        logs=logs,
        total_co2_saved=total_co2_saved,
        total_trips=total_trips,
        db_latency=db_latency,
        api_response_time=api_response_time,
        db_load=database_load_percentage
    )

# --- NEW ROUTE: EXPORT CAPABILITIES FOR LOCAL MUNICIPALITIES ---
@app.route('/admin/export_traffic_trends')
def export_traffic_trends():
    if 'user' not in session or session['user'] not in ADMIN_LIST:
        return "Unauthorized Access", 401
        
    conn = get_db_connection()
    logs = conn.execute('''
        SELECT users.username, travel_history.start_loc, travel_history.dest_loc, 
               travel_history.vehicle, travel_history.timestamp
        FROM travel_history 
        JOIN users ON travel_history.user_id = users.id 
        ORDER BY travel_history.timestamp DESC
    ''').fetchall()
    conn.close()
    
    # Generate CSV stream cleanly in memory
    si = io.StringIO()
    cw = csv.writer(si)
    
    # Header metadata matching traffic analysis requirements
    cw.writerow(['Registered Username', 'Departure Point (Start Location)', 'Destination Arrival Point', 'Eco Transit Mode Used', 'System Timestamp Recorded'])
    
    for log in logs:
        cw.writerow([log['username'], log['start_loc'], log['dest_loc'], log['vehicle'], log['timestamp']])
        
    response = make_response(si.getvalue())
    response.headers["Content-Disposition"] = "attachment; filename=municipality_traffic_trends.csv"
    response.headers["Content-type"] = "text/csv"
    return response

@app.route('/delete_user/<int:user_id>', methods=['POST'])
def delete_user(user_id):
    if 'user' not in session or session['user'] not in ADMIN_LIST:
        flash("Unauthorized")
        return redirect(url_for('login_page'))
    
    conn = get_db_connection()
    conn.execute("DELETE FROM travel_history WHERE user_id = ?", (user_id,))
    conn.execute("DELETE FROM users WHERE id = ?", (user_id,))
    conn.commit()
    conn.close()
    flash("🗑️ User and their history deleted successfully.")
    return redirect(url_for('admin_dashboard'))

@app.route('/logout')
def logout():
    session.clear()
    flash("👋 Logged out successfully")
    return redirect(url_for('login_page'))

if __name__ == '__main__':
    app.run(debug=True)